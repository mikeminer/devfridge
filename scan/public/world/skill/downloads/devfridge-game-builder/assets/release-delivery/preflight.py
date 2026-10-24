#!/usr/bin/env python3
"""Inspect APKs and block release when identity, version or device evidence is missing."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import zipfile

sys.dont_write_bytecode = True
HEX = re.compile(r"[0-9a-f]{64}")


class Blocked(ValueError):
    pass


def digest(path):
    result = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def read_json(path):
    if Path(path).stat().st_size > 16 * 1024 * 1024:
        raise Blocked("Report exceeds the bounded JSON size.")
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_new(path, value, protected=()):
    destination = Path(path).absolute()
    if destination.is_symlink() or destination.resolve() in {Path(p).resolve() for p in protected}:
        raise Blocked("Output must not replace an input.")
    # Exclusive creation also prevents accidental replacement of an earlier report.
    with destination.open("x", encoding="utf-8") as stream:
        json.dump(value, stream, indent=2)
        stream.write("\n")


def command(program, args):
    executable = shutil.which(str(program)) or str(Path(program).absolute())
    if not Path(executable).is_file():
        raise Blocked("Required Android/Node executable is unavailable.")
    argv = [executable, *map(str, args)]
    # Windows SDK launchers are .bat files. Never pass shell metacharacters to them.
    if Path(executable).suffix.lower() in {".bat", ".cmd"} and any(re.search(r'[&|<>^%!\r\n"]', item) for item in argv):
        raise Blocked("Use SDK/APK paths without shell metacharacters for Windows launchers.")
    try:
        result = subprocess.run(argv, shell=False, capture_output=True, text=True, timeout=90)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise Blocked("Required inspection command could not complete.") from error
    if result.returncode:
        # Tool output can contain environment values or private paths. Do not echo it.
        raise Blocked("Required inspection command failed; inspect locally without publishing its raw logs.")
    return result.stdout.strip()


def inspect_apk(apk, apkanalyzer, apksigner, run=command):
    apk = Path(apk).resolve(strict=True)
    before = digest(apk)
    summary = run(apkanalyzer, ["apk", "summary", apk]).split(maxsplit=2)
    if len(summary) != 3 or not summary[1].isdigit():
        raise Blocked("APK summary could not be parsed.")
    debug = run(apkanalyzer, ["manifest", "debuggable", apk]).lower()
    if debug not in {"true", "false"}:
        raise Blocked("APK debuggable state is unknown.")
    signing = run(apksigner, ["verify", "--verbose", "--print-certs", apk])
    certificates = sorted(set(value.lower() for value in re.findall(r"Signer #\d+ certificate SHA-256 digest:\s*([A-Fa-f0-9]{64})", signing)))
    if not certificates or re.search(r"CN\s*=\s*Android Debug", signing, re.I):
        raise Blocked("No release signing certificate was verified.")
    with zipfile.ZipFile(apk) as archive:
        abis = sorted({name.split("/")[1] for name in archive.namelist() if name.startswith("lib/") and name.endswith(".so") and len(name.split("/")) >= 3})
    if before != digest(apk):
        raise Blocked("APK changed while being inspected.")
    return {"schemaVersion": 1, "producer": "devfridge-android-tools-v1", "recordedAt": datetime.now(timezone.utc).isoformat(),
            "artifact": {"sha256": before, "size": apk.stat().st_size}, "packageName": summary[0],
            "versionCode": int(summary[1]), "versionName": summary[2], "debuggable": debug == "true",
            "signatureVerified": True, "certSha256": certificates, "abis": abis,
            "evidenceTools": ["apkanalyzer apk summary", "apkanalyzer manifest debuggable", "apksigner verify --verbose --print-certs"]}


def check_report(apk, report):
    if report.get("schemaVersion") != 1 or report.get("producer") != "devfridge-android-tools-v1":
        raise Blocked("Use an emitted Android tools report, not guessed APK metadata.")
    if report.get("artifact") != {"sha256": digest(apk), "size": Path(apk).stat().st_size}:
        raise Blocked("APK report does not match the current artifact bytes.")
    if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+", report.get("packageName", "")):
        raise Blocked("Invalid Android package in the report.")
    if type(report.get("versionCode")) is not int or not 0 < report["versionCode"] <= 2100000000 or not report.get("versionName"):
        raise Blocked("Missing or invalid Android version metadata.")
    certs = report.get("certSha256")
    if not isinstance(certs, list) or not certs or any(not isinstance(c, str) or not HEX.fullmatch(c) for c in certs):
        raise Blocked("Missing release certificate evidence.")
    if report.get("debuggable") is not False or report.get("signatureVerified") is not True:
        raise Blocked("A verified non-debug release APK is required.")
    if not isinstance(report.get("abis"), list) or (report["abis"] and "arm64-v8a" not in report["abis"]):
        raise Blocked("Native libraries must support arm64-v8a.")


def check_update(candidate, previous, published):
    if candidate["packageName"] != previous["packageName"] or set(candidate["certSha256"]) != set(previous["certSha256"]):
        raise Blocked("Update package/certificate differs from the released APK. Restore the original identity; do not replace the key.")
    required = {"schemaVersion", "packageName", "versionCode", "versionName", "apkSha256", "certSha256", "sourceUrl", "observedAt"}
    if not required.issubset(published) or published["schemaVersion"] != 1:
        raise Blocked("A current published-release observation is required.")
    if not re.fullmatch(r"https://publish\.solanamobile\.com/[^\s]+", published["sourceUrl"]):
        raise Blocked("Published-release evidence must name the publisher portal page.")
    try:
        age = (datetime.now(timezone.utc) - datetime.fromisoformat(published["observedAt"].replace("Z", "+00:00"))).total_seconds()
    except (ValueError, TypeError):
        raise Blocked("Published-release observation needs a timezone-aware timestamp.")
    if not 0 <= age <= 86400:
        raise Blocked("Refresh the published-release observation within 24 hours.")
    if any(published[key] != previous[key] for key in ["packageName", "versionCode", "versionName"]) or published["apkSha256"] != previous["artifact"]["sha256"] or set(published["certSha256"]) != set(previous["certSha256"]):
        raise Blocked("Previous APK does not match the observed published release.")
    if candidate["versionCode"] <= published["versionCode"]:
        raise Blocked("Increment versionCode above the published value, rebuild and re-inspect the exact signed APK.")
    if candidate["versionName"] == published["versionName"]:
        raise Blocked("Update versionName and release notes, then rebuild and re-inspect.")


def check_performance(report, artifact_sha256, node="node", run=command):
    gate = Path(__file__).resolve().parents[1] / "release-capture" / "performance-gate.mjs"
    if not Path(report).is_file() or not gate.is_file():
        raise Blocked("Physical Seeker performance evidence and the performance gate are required for release.")
    result = json.loads(run(node, [gate, "--report", Path(report).resolve(), "--artifact-sha256", artifact_sha256, "--platform", "seeker", "--max-age-hours", "24"]))
    if result.get("schemaVersion") != 1 or result.get("status") != "passed" or result.get("releaseReady") is not True or result.get("performancePassed") is not True or result.get("artifactSha256") != artifact_sha256 or result.get("platform") != "seeker":
        raise Blocked("Performance/physical Seeker release evidence is blocked or incomplete.")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="action", required=True)
    inspect = sub.add_parser("inspect", help="Emit hash-bound metadata; this alone never authorizes release.")
    inspect.add_argument("--apk", required=True, type=Path)
    inspect.add_argument("--apkanalyzer", required=True)
    inspect.add_argument("--apksigner", required=True)
    inspect.add_argument("--output", required=True, type=Path)
    release = sub.add_parser("check", help="Compare a new APK with the actual published APK and run the mandatory device gate.")
    for name in ["candidate", "candidate-report", "previous", "previous-report", "published-record", "performance-report", "output"]:
        release.add_argument("--" + name, required=True, type=Path)
    release.add_argument("--node", default="node")
    args = parser.parse_args()
    try:
        if args.action == "inspect":
            report = inspect_apk(args.apk, args.apkanalyzer, args.apksigner)
            write_new(args.output, report, [args.apk])
            print("APK metadata inspected. Release readiness not checked.")
        else:
            candidate, previous = read_json(args.candidate_report), read_json(args.previous_report)
            check_report(args.candidate, candidate)
            check_report(args.previous, previous)
            check_update(candidate, previous, read_json(args.published_record))
            performance = check_performance(args.performance_report, candidate["artifact"]["sha256"], args.node)
            report = {"schemaVersion": 1, "status": "passed", "artifact": candidate["artifact"], "packageName": candidate["packageName"],
                      "versionCode": candidate["versionCode"], "versionName": candidate["versionName"], "certSha256": candidate["certSha256"],
                      "recordedAt": datetime.now(timezone.utc).isoformat(), "performance": performance,
                      "statusScope": "APK update identity and performance; not publication authorization or Store approval"}
            write_new(args.output, report, [args.candidate, args.candidate_report, args.previous, args.previous_report, args.published_record, args.performance_report])
            print("APK update preflight passed. Follow the release review and authorization steps before submission.")
        return 0
    except (Blocked, OSError, ValueError, KeyError, TypeError, zipfile.BadZipFile) as error:
        print(str(error) if isinstance(error, Blocked) else "Preflight blocked: invalid or unavailable input; inspect locally without sharing raw logs.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
