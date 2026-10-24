#!/usr/bin/env python3
"""Plan delivery; upload only explicit >25,000,000-byte artifacts to a private Drive folder."""
import argparse
from contextlib import contextmanager
from dataclasses import dataclass
import hashlib
import importlib.util
import io
import json
import math
import os
from pathlib import Path, PurePosixPath
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile

sys.dont_write_bytecode = True
THRESHOLD = 25_000_000  # Owner's delivery workflow, NOT a Solana dApp Store limit.
CHUNK = 4 * 1024 * 1024
MAX_BYTES = 2 * 1024 * 1024 * 1024
API = "https://www.googleapis.com/drive/v3/files"
UPLOAD = "https://www.googleapis.com/upload/drive/v3/files"
FIELDS = "id,name,size,sha256Checksum,parents,trashed,ownedByMe,mimeType,appProperties"
ID = re.compile(r"[A-Za-z0-9_-]{1,200}")
HEX = re.compile(r"[0-9a-f]{64}")
MIMES = {".apk": "application/vnd.android.package-archive", ".zip": "application/zip", ".png": "image/png",
         ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".mp4": "video/mp4",
         ".pdf": "application/pdf", ".txt": "text/plain", ".md": "text/markdown", ".json": "application/json", ".html": "text/html"}
PRIVATE_NAME = re.compile(r"(?:^|[._ -])(?:env|keystore|keypair|credentials?|secrets?|private[-_ ]?vault|private[-_ ]?key|oauth|token[-_ ]?cache)(?:$|[._ -])", re.I)
CREDENTIAL_ASSIGNMENT = re.compile(rb'''(?i)["']?(?:access_?token|refresh_?token|client_?secret|mnemonic|seed_?phrase)["']?\s*[:=]\s*["']?([^\r\n"'`,;}]+)''')
PUBLIC_DOT_NAMES = frozenset({".gitignore", ".gitattributes", ".github", ".dockerignore", ".editorconfig", ".node-version", ".nvmrc", ".env.example"})
PUBLIC_TEMPLATE_NAMES = frozenset({".env.example", "env.example.txt", "check-no-secrets.py"})


class DeliveryError(ValueError):
    pass


def sha256(path):
    result = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for data in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(data)
    return result.hexdigest()


def safe_name(name):
    parts = name.replace("\\", "/").split("/")
    if any(part in {"", ".", ".."} or (part.startswith(".") and part.casefold() not in PUBLIC_DOT_NAMES) or (PRIVATE_NAME.search(part) and part.casefold() not in PUBLIC_TEMPLATE_NAMES) or ":" in part or any(ord(c) < 32 for c in part) for part in parts):
        raise DeliveryError("Artifact/archive contains a prohibited private or unsafe path.")
    if PurePosixPath(name).is_absolute() or re.match(r"^[A-Za-z]:", name) or Path(name).suffix.lower() in {".jks", ".keystore", ".p12", ".pfx", ".pem", ".key"}:
        raise DeliveryError("Private key material and absolute archive paths cannot be delivered.")


def beneath(path, root):
    try:
        path.resolve().relative_to(root.resolve())
    except ValueError:
        raise DeliveryError("Artifact is outside its explicit release root.")


def no_links(path):
    for part in [path, *path.parents]:
        if part.is_symlink() or getattr(part, "is_junction", lambda: False)():
            raise DeliveryError("Symlink/junction paths are not accepted.")


def load_manifest(path):
    path = Path(path).resolve(strict=True)
    if path.stat().st_size > 1024 * 1024:
        raise DeliveryError("Manifest exceeds 1 MiB.")
    value = json.loads(path.read_text(encoding="utf-8"))
    if value.get("schemaVersion") != 1 or not isinstance(value.get("root"), str) or not isinstance(value.get("artifacts"), list) or not 1 <= len(value["artifacts"]) <= 100:
        raise DeliveryError("Manifest requires schemaVersion 1, root and 1–100 explicit artifacts.")
    root = path.parent / value["root"]
    no_links(root)
    root = root.resolve(strict=True)
    if not root.is_dir():
        raise DeliveryError("Release root must be a directory.")
    entries, seen, names = [], set(), set()
    for item in value["artifacts"]:
        if not isinstance(item, dict) or set(item) != {"path", "sha256", "size"} or not isinstance(item["path"], str):
            raise DeliveryError("Each artifact must contain only path, sha256 and size.")
        safe_name(item["path"])
        source = root / item["path"]
        no_links(source)
        beneath(source, root)
        source = source.resolve(strict=True)
        if not source.is_file() or source.suffix.lower() not in MIMES:
            raise DeliveryError("Only explicit release files of supported types can be delivered; never directories/globs.")
        if source in seen or source.name.casefold() in names:
            raise DeliveryError("Artifact paths and delivered basenames must be unique.")
        seen.add(source)
        names.add(source.name.casefold())
        if type(item["size"]) is not int or not 0 < item["size"] <= MAX_BYTES or item["size"] != source.stat().st_size or not isinstance(item["sha256"], str) or not HEX.fullmatch(item["sha256"]) or sha256(source) != item["sha256"]:
            raise DeliveryError("Artifact hash/size mismatch or unsupported size; regenerate the explicit manifest after review.")
        entries.append({**item, "source": source, "name": source.name, "mime": MIMES[source.suffix.lower()], "route": "drive" if item["size"] > THRESHOLD else "local"})
    return root, entries


def scan_artifacts(entries):
    scanner_path = Path(__file__).resolve().parents[1] / "check-no-secrets.py"
    spec = importlib.util.spec_from_file_location("release_secret_scanner", scanner_path)
    if spec is None or spec.loader is None:
        raise DeliveryError("The secret scanner is unavailable.")
    scanner = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(scanner)
    exact = scanner.env_secrets(["GOOGLE_DRIVE_ACCESS_TOKEN", "DAPP_STORE_API_KEY"])
    total = 0

    def inspect(stream, label, size, depth=0):
        nonlocal total
        safe_name(label)
        if size > MAX_BYTES or depth > 3:
            raise DeliveryError("Artifact is too large/deep to scan completely.")
        total += size
        if total > 4 * MAX_BYTES:
            raise DeliveryError("Release scan exceeded its bounded uncompressed byte budget.")
        carry, encoding = b"", None
        while True:
            data = stream.read(1024 * 1024)
            if not data:
                break
            if not carry:
                encoding = "utf-16-le" if data.startswith(b"\xff\xfe") else "utf-16-be" if data.startswith(b"\xfe\xff") else None
            sample = carry + data
            decoded = sample.decode(encoding, "ignore").encode("utf-8") if encoding else sample
            credential = False
            for match in CREDENTIAL_ASSIGNMENT.finditer(decoded):
                value = match[1].decode("utf-8", "ignore").strip()
                if value and not scanner.PLACEHOLDER.fullmatch(value) and value.lower() not in {"none", "null", "false", "true"} and not value.startswith(("process.env", "os.environ", "${")):
                    credential = True
            if credential or scanner.contains_secret(sample, exact) or (encoding and scanner.contains_secret(decoded, exact)):
                raise DeliveryError("Secret scan found protected data. No artifact was uploaded.")
            carry = (carry + data)[-8192:]
        stream.seek(0)
        archive_like = Path(label).suffix.lower() in {".apk", ".zip", ".jar"}
        prefix = stream.read(4)
        stream.seek(0)
        valid = zipfile.is_zipfile(stream)
        stream.seek(0)
        if not valid and (archive_like or prefix in {b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"}):
            raise DeliveryError("Invalid archive could not be scanned; delivery is blocked.")
        if valid:
            with zipfile.ZipFile(stream) as archive:
                if len(archive.infolist()) > 100000:
                    raise DeliveryError("Archive has too many entries to scan.")
                for member in archive.infolist():
                    safe_name(member.filename.rstrip("/"))
                    if member.flag_bits & 1 or (member.external_attr >> 16) & 0o170000 == 0o120000:
                        raise DeliveryError("Encrypted or symlink archive members cannot be scanned.")
                    if member.is_dir():
                        continue
                    if member.file_size > 256 * 1024 * 1024:
                        raise DeliveryError("Archive member exceeds the bounded scan size.")
                    # Seekable bounded memory buffer allows nested archive verification.
                    inspect(io.BytesIO(archive.read(member)), member.filename, member.file_size, depth + 1)

    for entry in entries:
        with entry["source"].open("rb") as stream:
            inspect(stream, entry["name"], entry["size"])


@dataclass
class Response:
    status: int
    headers: dict
    body: bytes = b""

    def json(self):
        return json.loads(self.body.decode("utf-8"))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class GoogleTransport:
    def __init__(self, access_token, timeout=30):
        if not access_token or any(c in access_token for c in "\r\n"):
            raise DeliveryError("Provide an authorized OAuth access token through GOOGLE_DRIVE_ACCESS_TOKEN.")
        self.token, self.timeout = access_token, timeout
        # Keep certificate/hostname verification, but never inherit SSLKEYLOGFILE.
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        context.load_default_certs()
        self.opener = urllib.request.build_opener(NoRedirect, urllib.request.HTTPSHandler(context=context))

    def request(self, method, url, headers=None, body=None):
        parsed = urllib.parse.urlsplit(url)
        if parsed.scheme != "https" or parsed.netloc != "www.googleapis.com" or not parsed.path.startswith(("/drive/v3/files", "/upload/drive/v3/files")) or parsed.fragment:
            raise DeliveryError("Refusing an unexpected Drive API/session destination.")
        request = urllib.request.Request(url, data=body, method=method, headers={"Authorization": "Bearer " + self.token, **(headers or {})})
        try:
            with self.opener.open(request, timeout=self.timeout) as result:
                return Response(result.status, dict(result.headers), result.read(2 * 1024 * 1024))
        except urllib.error.HTTPError as error:
            return Response(error.code, dict(error.headers), error.read(2 * 1024 * 1024))
        except (OSError, urllib.error.URLError):
            raise DeliveryError("Drive request outcome is unknown; retained state must be reconciled.") from None


class Drive:
    def __init__(self, transport, sleep=time.sleep):
        self.transport, self.sleep = transport, sleep

    def request(self, method, url, headers=None, body=None, retry_safe=False):
        for attempt in range(3):
            try:
                response = self.transport.request(method, url, headers, body)
                if not retry_safe or response.status not in {429, 500, 502, 503, 504}:
                    return response
            except DeliveryError:
                if not retry_safe:
                    raise
            if attempt < 2:
                self.sleep(2 ** attempt)
        raise DeliveryError("Drive request did not settle after bounded retries; retain state and retry later.")

    def get(self, file_id):
        response = self.request("GET", API + "/" + file_id + "?fields=" + urllib.parse.quote(FIELDS), retry_safe=True)
        if response.status == 404:
            return None
        if response.status != 200:
            raise DeliveryError("Drive metadata is unavailable; no new duplicate upload will be created.")
        return response.json()

    def private_permissions(self, file_id):
        token = None
        for _ in range(20):
            query = {"pageSize": 100, "fields": "nextPageToken,permissions(type,role)"}
            if token:
                query["pageToken"] = token
            response = self.request("GET", API + "/" + file_id + "/permissions?" + urllib.parse.urlencode(query), retry_safe=True)
            if response.status != 200:
                raise DeliveryError("Unable to verify private Drive permissions.")
            data = response.json()
            permissions = data.get("permissions")
            if not isinstance(permissions, list) or not permissions or any(p.get("type") != "user" or p.get("role") != "owner" for p in permissions):
                raise DeliveryError("Choose a private owner-only Drive folder; shared/public destinations are not accepted.")
            token = data.get("nextPageToken")
            if not token:
                return
        raise DeliveryError("Drive permission pagination exceeded its bound.")

    def check_folder(self, folder_id):
        if not ID.fullmatch(folder_id):
            raise DeliveryError("Invalid authorized folder ID.")
        folder = self.get(folder_id)
        if not folder or folder.get("trashed") is not False or folder.get("ownedByMe") is not True or folder.get("mimeType") != "application/vnd.google-apps.folder":
            raise DeliveryError("An existing private folder owned by this OAuth user is required.")
        self.private_permissions(folder_id)

    def generate_id(self):
        response = self.request("GET", API + "/generateIds?count=1&space=drive&type=files", retry_safe=True)
        if response.status != 200:
            raise DeliveryError("Could not reserve a Drive file ID.")
        ids = response.json().get("ids")
        if not isinstance(ids, list) or len(ids) != 1 or not ID.fullmatch(ids[0]):
            raise DeliveryError("Invalid generated Drive ID.")
        return ids[0]

    def verified(self, remote, entry, folder_id, file_id):
        if remote is None:
            return False
        if remote.get("id") != file_id or remote.get("name") != entry["name"] or remote.get("size") != str(entry["size"]) or remote.get("sha256Checksum") != entry["sha256"] or remote.get("parents") != [folder_id] or remote.get("trashed") is not False or remote.get("ownedByMe") is not True:
            raise DeliveryError("Remote artifact does not match expected SHA-256, size, name, owner and folder. Stop and reconcile.")
        self.private_permissions(file_id)
        return True


def save_state(path, state):
    # Never print or upload this private file: a resumable URL grants upload capability.
    no_links(path.parent)
    if path.is_symlink():
        raise DeliveryError("State file cannot be a symlink.")
    temporary = path.with_suffix(".tmp")
    descriptor = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            json.dump(state, stream)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


@contextmanager
def state_lock(path):
    lock = path.with_suffix(".lock")
    try:
        descriptor = os.open(lock, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        raise DeliveryError("Another delivery or stale lock exists. Reconcile its process before removing only that lock.")
    try:
        os.write(descriptor, str(os.getpid()).encode())
        yield
    finally:
        os.close(descriptor)
        lock.unlink()


def offset_from(response, size):
    raw = next((v for k, v in response.headers.items() if k.lower() == "range"), None)
    if raw is None:
        return 0
    match = re.fullmatch(r"bytes=0-(\d+)", raw)
    if not match or not 0 <= int(match[1]) < size:
        raise DeliveryError("Invalid upload progress response.")
    return int(match[1]) + 1


def upload(entry, folder_id, state_dir, drive):
    identity = {"folderId": folder_id, "sha256": entry["sha256"], "size": entry["size"], "name": entry["name"]}
    key = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
    path = state_dir / (key + ".json")
    with state_lock(path):
        if path.exists():
            no_links(path)
            if path.stat().st_size > 16384:
                raise DeliveryError("Invalid private delivery state.")
            state = json.loads(path.read_text(encoding="utf-8"))
            if state.get("schemaVersion") != 1 or state.get("identity") != identity or not ID.fullmatch(state.get("fileId", "")):
                raise DeliveryError("Delivery state identity mismatch.")
        else:
            state = {"schemaVersion": 1, "identity": identity, "fileId": drive.generate_id()}
            save_state(path, state)  # ID is durable BEFORE any file creation attempt.
        file_id = state["fileId"]
        if drive.verified(drive.get(file_id), entry, folder_id, file_id):
            state.pop("session", None)
            state["status"] = "verified"
            save_state(path, state)
            return file_id
        budget = math.ceil(entry["size"] / CHUNK) * 3 + 12
        stalled, last_offset = 0, -1
        deadline = time.monotonic() + 900
        with entry["source"].open("rb") as stream:
            while budget > 0:
                budget -= 1
                if time.monotonic() > deadline or stalled >= 5:
                    raise DeliveryError("Upload made no progress or reached its 15-minute deadline; retain state and resume later.")
                stalled += 1
                session = state.get("session")
                if not session:
                    metadata = {"id": file_id, "name": entry["name"], "parents": [folder_id], "mimeType": entry["mime"], "appProperties": {"devfridgeSha256": entry["sha256"]}}
                    try:
                        response = drive.request("POST", UPLOAD + "?uploadType=resumable", {"Content-Type": "application/json", "X-Upload-Content-Type": entry["mime"], "X-Upload-Content-Length": str(entry["size"])}, json.dumps(metadata).encode())
                    except DeliveryError:
                        response = Response(503, {})
                    if response.status not in {200, 201}:
                        if drive.verified(drive.get(file_id), entry, folder_id, file_id):
                            break
                        if response.status in {429, 500, 502, 503, 504}:
                            drive.sleep(1)
                            continue  # Same preallocated ID; never creates a duplicate.
                        raise DeliveryError("Upload initiation blocked; retain state and inspect authorization/status.")
                    session = next((v for k, v in response.headers.items() if k.lower() == "location"), None)
                    parsed = urllib.parse.urlsplit(session or "")
                    if parsed.scheme != "https" or parsed.netloc != "www.googleapis.com" or parsed.path != "/upload/drive/v3/files" or not parsed.query or parsed.fragment:
                        raise DeliveryError("Unexpected resumable session URL.")
                    state["session"] = session
                    save_state(path, state)
                # Always ask the server where to resume, including after an unknown PUT outcome.
                status = drive.request("PUT", session, {"Content-Length": "0", "Content-Range": "bytes */" + str(entry["size"])}, b"", retry_safe=True)
                if status.status in {200, 201}:
                    break
                if status.status in {404, 410}:
                    if drive.verified(drive.get(file_id), entry, folder_id, file_id):
                        break
                    state.pop("session", None)
                    save_state(path, state)
                    continue
                if status.status != 308:
                    raise DeliveryError("Upload status is unknown or unauthorized; retain state for reconciliation.")
                offset = offset_from(status, entry["size"])
                if offset > last_offset:
                    stalled, last_offset = 0, offset
                if offset >= entry["size"]:
                    raise DeliveryError("All bytes received but completion unconfirmed; retain state and retry later.")
                stream.seek(offset)
                chunk = stream.read(min(CHUNK, entry["size"] - offset))
                if not chunk:
                    raise DeliveryError("Local artifact changed during upload.")
                headers = {"Content-Type": entry["mime"], "Content-Length": str(len(chunk)), "Content-Range": f"bytes {offset}-{offset + len(chunk) - 1}/{entry['size']}"}
                try:
                    response = drive.request("PUT", session, headers, chunk)
                except DeliveryError:
                    continue  # Re-query this session; do not assume this chunk failed.
                if response.status in {200, 201}:
                    break
                if response.status not in {308, 429, 500, 502, 503, 504}:
                    raise DeliveryError("Upload interrupted; retain state instead of creating another file.")
            else:
                raise DeliveryError("Upload retry budget exhausted. Keep state for a later resume.")
        # Re-hash both ends. appProperties alone are not accepted as checksum evidence.
        if sha256(entry["source"]) != entry["sha256"] or entry["source"].stat().st_size != entry["size"]:
            raise DeliveryError("Local artifact changed; remote result is not verified.")
        if not drive.verified(drive.get(file_id), entry, folder_id, file_id):
            raise DeliveryError("Upload completion could not be verified. Keep state and reconcile.")
        state.pop("session", None)
        state["status"] = "verified"
        save_state(path, state)
        return file_id


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--apply", action="store_true", help="Upload selected large files only after existing owner authorization.")
    parser.add_argument("--folder-id", help="Explicit owner-authorized existing private Drive folder.")
    parser.add_argument("--state-directory", type=Path, help="Private local recovery directory outside the release root; never deliver it.")
    args = parser.parse_args()
    try:
        root, entries = load_manifest(args.manifest)
        scan_artifacts(entries)  # Validate EVERY selected artifact before the first network request.
        result = [{"path": item["path"], "sha256": item["sha256"], "size": item["size"], "route": item["route"]} for item in entries]
        if args.apply and any(item["route"] == "drive" for item in entries):
            if not args.folder_id or not args.state_directory:
                raise DeliveryError("An authorized private folder and private local state directory are required.")
            no_links(args.state_directory)
            state_dir = args.state_directory.resolve()
            if state_dir == root or root in state_dir.parents:
                raise DeliveryError("Recovery state must remain outside the release artifact root.")
            state_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
            drive = Drive(GoogleTransport(os.environ.get("GOOGLE_DRIVE_ACCESS_TOKEN", "")))
            drive.check_folder(args.folder_id)
            for item, delivered in zip(entries, result):
                if item["route"] == "drive":
                    # A second hash binds the scanned bytes immediately before network mutation.
                    if sha256(item["source"]) != item["sha256"]:
                        raise DeliveryError("Artifact changed after scanning; restart local review.")
                    file_id = upload(item, args.folder_id, state_dir, drive)
                    delivered.update({"status": "verified-private", "driveId": file_id, "url": "https://drive.google.com/file/d/" + file_id + "/view"})
        print(json.dumps({"schemaVersion": 1, "status": "delivered" if args.apply else "plan-only", "thresholdBytes": THRESHOLD, "artifacts": result}, indent=2))
        return 0
    except (DeliveryError, OSError, ValueError, KeyError, TypeError, zipfile.BadZipFile, RuntimeError) as error:
        print(str(error) if isinstance(error, DeliveryError) else "Delivery blocked: invalid/unreadable input. No raw API responses or credential values are logged.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
