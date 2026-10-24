#!/usr/bin/env python3
"""Offline synthetic release tests. No real Android device, Drive account or upload is used."""
import copy
from datetime import datetime, timezone, timedelta
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import unittest
from unittest.mock import patch
import urllib.parse
import zipfile

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import preflight
import drive_delivery as delivery


def now():
    return datetime.now(timezone.utc).isoformat()


class FakeGoogle:
    def __init__(self):
        self.calls, self.files, self.sessions = [], {}, {}
        self.generated = self.created = 0
        self.public = False
        self.lose_init = self.lose_chunk = self.lose_final = False
        self.corrupt_hash = self.fail_forever = False

    def request(self, method, url, headers=None, body=None):
        headers = headers or {}
        self.calls.append((method, url, headers.copy()))
        parsed = urllib.parse.urlsplit(url)
        query = urllib.parse.parse_qs(parsed.query)
        def response(code, data=None, headers=None):
            return delivery.Response(code, headers or {}, json.dumps(data).encode() if data is not None else b"")
        if parsed.path.endswith("/permissions"):
            return response(200, {"permissions": [{"type": "anyone" if self.public else "user", "role": "reader" if self.public else "owner"}]})
        if parsed.path.endswith("/generateIds"):
            self.generated += 1
            return response(200, {"ids": ["allocated-" + str(self.generated)]})
        if method == "GET":
            ident = parsed.path.rsplit("/", 1)[1]
            if ident == "private-folder":
                return response(200, {"id": ident, "mimeType": "application/vnd.google-apps.folder", "ownedByMe": True, "trashed": False})
            return response(200, self.files[ident]) if ident in self.files else response(404)
        if method == "POST":
            metadata = json.loads(body)
            self.created += 1
            if metadata["id"] in self.files:
                return response(409)
            if self.fail_forever:
                return response(503)
            session = "session-" + str(self.created)
            self.sessions[session] = {"metadata": metadata, "bytes": bytearray(), "size": int(headers["X-Upload-Content-Length"])}
            if self.lose_init:
                self.lose_init = False
                raise delivery.DeliveryError("Simulated lost initiation response")
            return response(200, headers={"Location": delivery.UPLOAD + "?uploadType=resumable&upload_id=" + session})
        if method == "PUT":
            session = self.sessions[query["upload_id"][0]]
            size, blob = session["size"], session["bytes"]
            if headers["Content-Range"].startswith("bytes */"):
                if len(blob) == size:
                    return response(200)
                return response(308, headers={"Range": "bytes=0-" + str(len(blob) - 1)} if blob else {})
            match = re.fullmatch(r"bytes (\d+)-(\d+)/(\d+)", headers["Content-Range"])
            assert match and int(match[1]) == len(blob) and int(match[2]) + 1 == len(blob) + len(body)
            blob.extend(body)
            if len(blob) == size:
                metadata = session["metadata"]
                self.files[metadata["id"]] = {**metadata, "size": str(size), "sha256Checksum": "f" * 64 if self.corrupt_hash else hashlib.sha256(blob).hexdigest(), "ownedByMe": True, "trashed": False}
                if self.lose_final:
                    self.lose_final = False
                    raise delivery.DeliveryError("Simulated completion response loss")
                return response(200)
            if self.lose_chunk:
                self.lose_chunk = False
                raise delivery.DeliveryError("Simulated chunk response loss")
            return response(308, headers={"Range": "bytes=0-" + str(len(blob) - 1)})
        raise AssertionError("Unexpected fake request")


class ReleaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(dir=os.environ.get("RELEASE_DELIVERY_TEST_TMP"))
        self.base = Path(self.tmp.name)
        self.root = self.base / "release"
        self.root.mkdir()
        self.state = self.base / "private-state"
        self.state.mkdir()

    def tearDown(self):
        self.tmp.cleanup()

    def artifact(self, name="preview.mp4", data=b"synthetic public bytes"):
        path = self.root / name
        path.write_bytes(data)
        return {"path": name, "sha256": delivery.sha256(path), "size": path.stat().st_size, "source": path, "name": name, "mime": delivery.MIMES[path.suffix], "route": "drive"}

    def manifest(self, entries):
        path = self.base / "manifest.json"
        path.write_text(json.dumps({"schemaVersion": 1, "root": "release", "artifacts": [{k: e[k] for k in ["path", "sha256", "size"]} for e in entries]}), encoding="utf-8")
        return path

    def metadata(self, path, code, name):
        return {"schemaVersion": 1, "producer": "devfridge-android-tools-v1", "recordedAt": now(), "artifact": {"sha256": preflight.digest(path), "size": path.stat().st_size}, "packageName": "it.example.game", "versionCode": code, "versionName": name, "certSha256": ["a" * 64], "debuggable": False, "signatureVerified": True, "abis": ["arm64-v8a"]}

    def test_update_rejects_identity_downgrade_and_forged_hash(self):
        previous = self.artifact("previous.apk")
        candidate = self.artifact("candidate.apk", b"different synthetic fixture")
        old, new = self.metadata(previous["source"], 4, "1.0"), self.metadata(candidate["source"], 5, "1.1")
        published = {"schemaVersion": 1, "packageName": old["packageName"], "versionCode": 4, "versionName": "1.0", "apkSha256": old["artifact"]["sha256"], "certSha256": old["certSha256"], "sourceUrl": "https://publish.solanamobile.com/dapp/it.example.game/releases", "observedAt": now()}
        preflight.check_report(candidate["source"], new)
        preflight.check_update(new, old, published)
        for key, value in [("packageName", "it.other.game"), ("certSha256", ["b" * 64]), ("versionCode", 4), ("versionName", "1.0")]:
            changed = {**new, key: value}
            with self.assertRaises(preflight.Blocked):
                preflight.check_update(changed, old, published)
        candidate["source"].write_bytes(b"altered")
        with self.assertRaises(preflight.Blocked):
            preflight.check_report(candidate["source"], new)

    def test_stale_published_record_and_debug_report_block(self):
        artifact = self.artifact()
        report = self.metadata(artifact["source"], 2, "2")
        for key, value in [("debuggable", True), ("signatureVerified", False), ("producer", "handwritten"), ("abis", ["x86"]), ("versionCode", True)]:
            with self.assertRaises(preflight.Blocked):
                preflight.check_report(artifact["source"], {**report, key: value})
        published = {"schemaVersion": 1, "packageName": report["packageName"], "versionCode": 2, "versionName": "2", "apkSha256": report["artifact"]["sha256"], "certSha256": report["certSha256"], "sourceUrl": "https://publish.solanamobile.com/dapp/it.example.game/releases", "observedAt": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()}
        with self.assertRaises(preflight.Blocked):
            preflight.check_update({**report, "versionCode": 3, "versionName": "3"}, report, published)

    def test_android_inspection_uses_tool_outputs_and_hashes(self):
        path = self.root / "fixture.apk"
        with zipfile.ZipFile(path, "w") as archive:
            archive.writestr("lib/arm64-v8a/libfixture.so", b"not executable test fixture")
        calls = []
        def fake(program, args):
            calls.append((program, args))
            if args[:2] == ["apk", "summary"]:
                return "it.example.game 6 1.2"
            if args[:2] == ["manifest", "debuggable"]:
                return "false"
            return "Signer #1 certificate SHA-256 digest: " + "a" * 64
        result = preflight.inspect_apk(path, "analyzer", "signer", fake)
        self.assertEqual(result["versionCode"], 6)
        self.assertEqual(result["abis"], ["arm64-v8a"])
        self.assertEqual(result["artifact"]["sha256"], preflight.digest(path))
        self.assertEqual(len(calls), 3)

    def test_preflight_does_not_overwrite_artifact_or_report(self):
        artifact = self.artifact()
        with self.assertRaises(preflight.Blocked):
            preflight.write_new(artifact["source"], {}, [artifact["source"]])
        path = self.base / "report.json"
        preflight.write_new(path, {})
        with self.assertRaises(FileExistsError):
            preflight.write_new(path, {"replaced": True})

    def test_performance_missing_or_unverified_blocks(self):
        with self.assertRaises(preflight.Blocked):
            preflight.check_performance(self.base / "missing.json", "a" * 64)
        report = self.base / "performance.json"
        report.write_text("{}")
        with patch.object(Path, "is_file", return_value=True):
            with self.assertRaises(preflight.Blocked):
                preflight.check_performance(report, "a" * 64, run=lambda p, a: json.dumps({"schemaVersion": 1, "status": "passed", "performancePassed": True, "releaseReady": False}))
            calls = []
            def fake(p, args):
                calls.append(args)
                return json.dumps({"schemaVersion": 1, "status": "passed", "performancePassed": True, "releaseReady": True, "artifactSha256": "a" * 64, "platform": "seeker"})
            preflight.check_performance(report, "a" * 64, run=fake)
            self.assertIn("--artifact-sha256", calls[0])
            self.assertIn("seeker", calls[0])

    def test_threshold_exact_and_over_are_routed_without_network(self):
        entries = []
        for name, size in [("exact.mp4", delivery.THRESHOLD), ("over.mp4", delivery.THRESHOLD + 1)]:
            path = self.root / name
            with path.open("wb") as stream:
                stream.truncate(size)
            entries.append({"path": name, "size": size, "sha256": delivery.sha256(path)})
        _, loaded = delivery.load_manifest(self.manifest(entries))
        self.assertEqual([e["route"] for e in loaded], ["local", "drive"])

    def test_manifest_blocks_escape_directory_duplicates_and_changed_artifact(self):
        artifact = self.artifact()
        for changed in [{**artifact, "path": "../outside.mp4"}, {**artifact, "path": "*.mp4"}, {**artifact, "sha256": "f" * 64}, {**artifact, "size": True}]:
            with self.assertRaises((delivery.DeliveryError, OSError)):
                delivery.load_manifest(self.manifest([changed]))
        with self.assertRaises(delivery.DeliveryError):
            delivery.load_manifest(self.manifest([artifact, artifact]))

    def test_secret_scan_rejects_plain_nested_private_and_corrupt_files(self):
        secret = ("store" + "Password") + " = \"" + "test-fixture-value" + "\""
        cases = [("notes.txt", secret.encode()), ("broken.zip", b"PK\x03\x04broken")]
        for name, data in cases:
            with self.assertRaises(delivery.DeliveryError):
                delivery.scan_artifacts([self.artifact(name, data)])
        output = io.BytesIO()
        with zipfile.ZipFile(output, "w") as archive:
            archive.writestr("private-vault/account.json", b"fixture")
        with self.assertRaises(delivery.DeliveryError):
            delivery.scan_artifacts([self.artifact("nested.zip", output.getvalue())])
        with self.assertRaises(delivery.DeliveryError):
            delivery.safe_name("signing.jks")
        with self.assertRaises(delivery.DeliveryError):
            delivery.safe_name("config/.env.production")

    def test_oauth_and_utf16_secrets_are_rejected(self):
        assignment = json.dumps({"access" + "_token": "synthetic-oauth-value"})
        for name, data in [("notes.json", assignment.encode()), ("notes.txt", assignment.encode("utf-16"))]:
            with self.assertRaises(delivery.DeliveryError):
                delivery.scan_artifacts([self.artifact(name, data)])

    def test_source_archive_allows_only_named_public_dot_metadata(self):
        output = io.BytesIO()
        with zipfile.ZipFile(output, "w") as archive:
            for name, data in [("source/.gitignore", "node_modules/\n"), ("source/.gitattributes", "* text=auto\n"), ("source/.github/workflows/check.yml", "name: checks\n"), ("source/.dockerignore", "node_modules/\n"), ("source/.editorconfig", "root = true\n"), ("source/.node-version", "24\n"), ("source/.nvmrc", "24\n"), ("source/.env.example", "PUBLIC_SITE=https://example.com\n"), ("source/env.example.txt", "PUBLIC_SITE=https://example.com\n"), ("source/check-no-secrets.py", "# public security checker\n")]:
                archive.writestr(name, data)
        delivery.scan_artifacts([self.artifact("source.zip", output.getvalue())])
        for name in ["source/.git/config", "source/.env", "source/.env.production", "source/.aws/config", "source/.private/account.json", "source/assets:private.txt"]:
            with self.assertRaises(delivery.DeliveryError):
                delivery.safe_name(name)
        secret = (("client" + "_secret") + "=" + "synthetic-sensitive-value").encode()
        bad = io.BytesIO()
        with zipfile.ZipFile(bad, "w") as archive:
            archive.writestr("source/.env.example", secret)
        with self.assertRaises(delivery.DeliveryError):
            delivery.scan_artifacts([self.artifact("unsafe-example.zip", bad.getvalue())])

    def test_scan_streams_above_64_mib_and_catches_cross_chunk_secret(self):
        path = self.root / "large.mp4"
        with path.open("wb") as stream:
            stream.truncate(65 * 1024 * 1024)
        entry = {"source": path, "name": path.name, "size": path.stat().st_size}
        delivery.scan_artifacts([entry])
        secret = (("store" + "Password") + " = '" + "fixture-password" + "'").encode()
        with path.open("r+b") as stream:
            stream.seek(1024 * 1024 - 4)
            stream.write(secret)
        with self.assertRaises(delivery.DeliveryError):
            delivery.scan_artifacts([entry])

    def test_private_folder_check_never_changes_permissions(self):
        fake = FakeGoogle()
        drive = delivery.Drive(fake, lambda _: None)
        drive.check_folder("private-folder")
        fake.public = True
        with self.assertRaises(delivery.DeliveryError):
            drive.check_folder("private-folder")
        self.assertFalse(any(method != "GET" for method, _, _ in fake.calls))

    def test_success_repeat_is_idempotent_and_keeps_local_file(self):
        entry = self.artifact()
        fake = FakeGoogle()
        drive = delivery.Drive(fake, lambda _: None)
        ident = delivery.upload(entry, "private-folder", self.state, drive)
        self.assertEqual(delivery.upload(entry, "private-folder", self.state, drive), ident)
        self.assertEqual(fake.generated, 1)
        self.assertEqual(fake.created, 1)
        self.assertEqual(len(fake.files), 1)
        self.assertTrue(entry["source"].exists())
        state = json.loads(next(self.state.glob("*.json")).read_text())
        self.assertNotIn("session", state)
        self.assertEqual(state["status"], "verified")

    def test_unknown_initiation_reuses_preallocated_id(self):
        entry = self.artifact()
        fake = FakeGoogle()
        fake.lose_init = True
        delivery.upload(entry, "private-folder", self.state, delivery.Drive(fake, lambda _: None))
        self.assertEqual(fake.generated, 1)
        self.assertEqual(len(fake.files), 1)

    def test_lost_chunk_and_final_responses_reconcile_without_duplicates(self):
        entry = self.artifact(data=b"fixture\x00" * (delivery.CHUNK // 8 + 9))
        fake = FakeGoogle()
        fake.lose_chunk = fake.lose_final = True
        delivery.upload(entry, "private-folder", self.state, delivery.Drive(fake, lambda _: None))
        self.assertEqual(fake.created, 1)
        self.assertEqual(len(fake.files), 1)
        uploads = [headers["Content-Range"] for method, _, headers in fake.calls if method == "PUT" and not headers["Content-Range"].startswith("bytes */")]
        self.assertEqual(len(uploads), 2)

    def test_remote_checksum_mismatch_and_persistent_failure_block(self):
        entry = self.artifact()
        fake = FakeGoogle()
        fake.corrupt_hash = True
        with self.assertRaises(delivery.DeliveryError):
            delivery.upload(entry, "private-folder", self.state, delivery.Drive(fake, lambda _: None))
        other = self.artifact("other.mp4")
        failing = FakeGoogle()
        failing.fail_forever = True
        with self.assertRaises(delivery.DeliveryError):
            delivery.upload(other, "private-folder", self.state, delivery.Drive(failing, lambda _: None))
        self.assertEqual(failing.generated, 1)
        self.assertLessEqual(failing.created, 5)

    def test_session_destination_cannot_send_oauth_to_other_hosts(self):
        transport = delivery.GoogleTransport("synthetic-test-token")
        for url in ["http://www.googleapis.com/drive/v3/files", "https://evil.example/upload/drive/v3/files", "https://www.googleapis.com.evil.example/drive/v3/files"]:
            with self.assertRaises(delivery.DeliveryError):
                transport.request("PUT", url)

    def test_busy_state_lock_cannot_allocate_second_upload(self):
        path = self.state / "example.json"
        with delivery.state_lock(path):
            with self.assertRaises(delivery.DeliveryError):
                with delivery.state_lock(path):
                    self.fail("Second uploader entered the same lock")


if __name__ == "__main__":
    unittest.main()
