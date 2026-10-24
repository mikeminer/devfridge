#!/usr/bin/env python3
"""Scan release directories, APKs and ZIPs without ever printing secret values."""
import argparse
import io
import os
from pathlib import Path
import re
import sys
import zipfile

MAX_FILE = 64 * 1024 * 1024
MAX_TOTAL = 256 * 1024 * 1024
PLACEHOLDER = re.compile(r"^(?:<[^>]+>|\$\{[^}]+\}|YOUR_[A-Z_]+|example|changeme|REDACTED)$", re.I)
PATTERNS = [
    re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----"),
    re.compile(rb"https?://[^\s\"'<>]*(?:alchemy\.com/v2/|quiknode\.pro/)[A-Za-z0-9_-]{12,}", re.I),
    re.compile(rb"[?&](?:api[-_]?key|access[-_]?token)=[A-Za-z0-9_-]{12,}", re.I),
]
ARRAY = re.compile(rb"\[\s*(?:\d{1,3}\s*,\s*){63}\d{1,3}\s*\]")
ASSIGNMENT = re.compile(
    rb"(?i)(?<![A-Z0-9_])[\"']?(?:store_?password|key_?password|keystore_?password|"
    rb"(?:[A-Z0-9_]*_)?(?:API_KEY|PRIVATE_KEY|SEED_PHRASE))[\"']?"
    rb"(?:\s*[:=]\s*|\s+(?=[\"']))[\"']?([^\r\n\"'`,;}]+)"
)


def env_secrets(names):
    selected = set(names)
    selected.update(k for k in os.environ if re.search(r"RPC.*(?:URL|KEY)|(?:API_KEY|PRIVATE_KEY|KEYSTORE_PASSWORD|STORE_PASSWORD|KEY_PASSWORD)$", k, re.I))
    # Exact known secrets remain sensitive even when an owner chose a short one.
    return [os.environ[k].encode() for k in selected if k in os.environ and os.environ[k] and not PLACEHOLDER.fullmatch(os.environ[k])]


def contains_secret(data, exact):
    if any(value in data for value in exact) or any(p.search(data) for p in PATTERNS):
        return True
    for match in ARRAY.finditer(data):
        values = [int(v) for v in re.findall(rb"\d+", match.group())]
        if len(values) == 64 and all(0 <= v <= 255 for v in values):
            return True
    for match in ASSIGNMENT.finditer(data):
        value = match.group(1).decode("utf-8", "ignore").strip().rstrip(",")
        if value and value.lower() not in {"null", "none", "false", "true"} and not PLACEHOLDER.fullmatch(value) and not value.startswith(("process.env", "System.getenv", "os.environ", "${")):
            return True
    return False


def scan(path, extra_env=()):
    hits, errors = set(), set()
    exact, used = env_secrets(extra_env), 0

    def check(data, label, depth=0):
        nonlocal used
        used += len(data)
        if len(data) > MAX_FILE or used > MAX_TOTAL:
            errors.add(label)
            return
        suffix = Path(label.rsplit("!", 1)[-1]).suffix.lower()
        if suffix in {".jks", ".keystore", ".p12", ".pfx"} or contains_secret(data, exact):
            hits.add(label)
        # ZIP/APK archives may have a valid executable/self-extracting prefix.
        # Check the central directory rather than assuming a PK magic at byte 0.
        valid_zip = zipfile.is_zipfile(io.BytesIO(data))
        expected_zip = suffix in {".zip", ".apk", ".jar"} or data[:4] in {b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"}
        if expected_zip and not valid_zip:
            errors.add(label)
            return
        if valid_zip:
            if depth >= 3:
                errors.add(label)
                return
            try:
                with zipfile.ZipFile(io.BytesIO(data)) as archive:
                    for member in archive.infolist():
                        if member.is_dir():
                            continue
                        child = label + "!" + member.filename
                        if member.file_size > MAX_FILE or member.flag_bits & 1:
                            errors.add(child)
                            continue
                        check(archive.read(member), child, depth + 1)
            except (OSError, ValueError, RuntimeError, zipfile.BadZipFile):
                errors.add(label)

    paths = sorted(path.rglob("*")) if path.is_dir() else [path]
    for item in paths:
        if item.is_symlink():
            errors.add(str(item))
        elif item.is_file():
            try:
                if item.stat().st_size > MAX_FILE:
                    errors.add(str(item))
                else:
                    check(item.read_bytes(), str(item))
            except OSError:
                errors.add(str(item))
    if not path.exists():
        errors.add(str(path))
    return sorted(hits), sorted(errors)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path, help="Folder, APK, or ZIP. Encrypted/oversized/unreadable files fail closed.")
    parser.add_argument("--env-name", action="append", default=[], help="Also match this environment variable's value; never pass a secret as a CLI value.")
    if len(sys.argv) == 1:
        parser.print_help()
        return 0
    args = parser.parse_args()
    hits, errors = scan(args.path, args.env_name)
    for path in hits + errors:
        print(path)
    print(f"Secret scan: {len(hits)} matching paths; {len(errors)} unreadable or unscanned paths.")
    return 1 if hits or errors else 0


if __name__ == "__main__":
    sys.exit(main())
