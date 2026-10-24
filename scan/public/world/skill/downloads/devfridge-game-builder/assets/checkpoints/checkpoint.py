"""Immutable, secret-checked stage snapshots. No Git mutations or automatic restore."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import tempfile
import uuid
import zipfile

MAX_FILES = 128
MAX_FILE = 16 * 1024 * 1024
MAX_TOTAL = 64 * 1024 * 1024
DENY = {'.git', '.aws', '.codex', '.agents', '.devfridge-progress', 'node_modules', '__pycache__'}
PRIVATE_SUFFIXES = {'.jks', '.keystore', '.pem', '.key', '.p12', '.pfx', '.mobileprovision'}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def is_archive(data):
    return data.startswith((b'PK\x03\x04', b'PK\x05\x06', b'PK\x07\x08')) or zipfile.is_zipfile(io.BytesIO(data))


def scanner():
    spec = importlib.util.spec_from_file_location('checkpoint_secret_scan', Path(__file__).resolve().parents[1] / 'check-no-secrets.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def safe_name(name):
    if not isinstance(name, str) or '\\' in name or ':' in name or '\x00' in name:
        raise ValueError('Use relative POSIX file paths')
    p = PurePosixPath(name)
    if p.is_absolute() or not p.parts or str(p) != name or any(x in ('.', '..') for x in p.parts):
        raise ValueError('Unsafe snapshot path')
    for part in p.parts:
        lower = part.lower()
        if (lower in DENY or lower.startswith('.env') or lower.endswith((' ', '.'))
                or re.fullmatch(r'(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?', lower)
                or any(word in lower for word in ('credentials', 'keypair', 'seed-phrase', 'session-cookie'))
                or Path(lower).suffix in PRIVATE_SUFFIXES):
            raise ValueError('Private or unsupported snapshot path')
    return p


def safe_file(root, name):
    p = safe_name(name)
    cursor = root
    for part in p.parts:
        cursor = cursor / part
        if cursor.is_symlink() or (hasattr(cursor, 'is_junction') and cursor.is_junction()):
            raise ValueError('Snapshot inputs must not contain links/junctions')
    if not cursor.resolve().is_relative_to(root.resolve()) or not cursor.is_file():
        raise ValueError('Selected file missing or outside project')
    if cursor.stat().st_size > MAX_FILE:
        raise ValueError('Snapshot file exceeds 16 MiB; use source/artifact hashes instead')
    return cursor


def clean_metadata(spec):
    out = {}
    for key in ('stage', 'summary', 'nextAction'):
        value = spec.get(key)
        if not isinstance(value, str) or not value.strip() or len(value) > 8000:
            raise ValueError('Missing or oversized ' + key)
        out[key] = value
    out['decisions'] = spec.get('decisions', [])
    out['blockers'] = spec.get('blockers', [])
    if any(not isinstance(out[k], list) or any(not isinstance(v, str) or len(v) > 8000 for v in out[k]) for k in ('decisions', 'blockers')):
        raise ValueError('Decisions and blockers must be string lists')
    checks = spec.get('checks')
    if not isinstance(checks, list) or not checks:
        raise ValueError('Record checks, including honestly skipped checks')
    out['checks'] = []
    for check in checks:
        if not isinstance(check, dict) or check.get('status') not in ('passed', 'failed', 'skipped'):
            raise ValueError('Invalid check result')
        for key in ('command', 'result'):
            if not isinstance(check.get(key), str) or not check[key].strip() or len(check[key]) > 8000:
                raise ValueError('Each check needs its command and actual result')
        out['checks'].append({key: check[key] for key in ('command', 'status', 'result')})
    # Optional recorded identifier, never execute text supplied in a snapshot.
    revision = spec.get('sourceRevision')
    if revision is not None and not re.fullmatch(r'[a-fA-F0-9]{40,64}', revision):
        raise ValueError('sourceRevision must be an actual commit hash or omitted')
    out['sourceRevision'] = revision
    return out


def save(root, spec, output):
    root = Path(root).resolve(strict=True)
    output = Path(output).absolute()
    if output.exists() or output.is_symlink() or output.suffix != '.zip' or not output.parent.is_dir():
        raise ValueError('Use a new .zip path in an existing directory')
    metadata = clean_metadata(spec)
    names = spec.get('files')
    if not isinstance(names, list) or not 1 <= len(names) <= MAX_FILES or not all(isinstance(n, str) for n in names):
        raise ValueError('Select 1–128 source files explicitly')
    if len({n.casefold() for n in names}) != len(names):
        raise ValueError('Duplicate or case-colliding snapshot files')
    secret = scanner()
    exact = secret.env_secrets([])
    payload = {}
    total = 0
    for name in names:
        path = safe_file(root, name)
        data = path.read_bytes()
        total += len(data)
        if len(data) > MAX_FILE or total > MAX_TOTAL:
            raise ValueError('Snapshot exceeds size budget')
        if secret.contains_secret(data, exact) or is_archive(data):
            raise ValueError('Snapshot contains a possible secret or archive; select source files only')
        payload[name] = data
    metadata.update(schemaVersion=1, createdAt=datetime.now(timezone.utc).isoformat(),
                    checkpointId=uuid.uuid4().hex,
                    files=[{'path': name, 'bytes': len(data), 'sha256': digest(data)} for name, data in payload.items()])
    manifest = (json.dumps(metadata, indent=2) + '\n').encode()
    if len(manifest) > 1024 * 1024 or secret.contains_secret(manifest, exact):
        raise ValueError('Checkpoint notes contain a possible secret or exceed size budget')
    fd, temp = tempfile.mkstemp(prefix='.checkpoint-', suffix='.tmp', dir=output.parent)
    os.close(fd)
    try:
        with zipfile.ZipFile(temp, 'w', zipfile.ZIP_DEFLATED) as z:
            for name, data in payload.items():
                z.writestr('files/' + name, data)
            z.writestr('checkpoint.json', manifest)
            z.writestr('checkpoint.sha256', digest(manifest) + '\n')
        verify(temp)
        # Rename refuses overwrite on Windows; the unique destination is also checked above.
        if output.exists():
            raise ValueError('Checkpoint destination was created during save')
        os.link(temp, output)  # Exclusive create on Windows and POSIX, never overwrite a racing writer.
    finally:
        Path(temp).unlink(missing_ok=True)
    return metadata


def verify(archive, root=None, include_payload=False):
    with zipfile.ZipFile(archive) as z:
        infos = z.infolist()
        if len(infos) > MAX_FILES + 2 or sum(i.file_size for i in infos) > MAX_TOTAL + 1024 * 1024:
            raise ValueError('Archive exceeds snapshot budget')
        if len({i.filename.casefold() for i in infos}) != len(infos):
            raise ValueError('Duplicate archive entries')
        if any(i.file_size > MAX_FILE or i.flag_bits & 1 or (i.external_attr >> 16) & 0o170000 == 0o120000 for i in infos):
            raise ValueError('Unsafe archive entry')
        raw = z.read('checkpoint.json')
        if len(raw) > 1024 * 1024 or z.read('checkpoint.sha256').decode().strip() != digest(raw):
            raise ValueError('Checkpoint manifest checksum mismatch')
        metadata = json.loads(raw)
        if metadata.get('schemaVersion') != 1:
            raise ValueError('Unsupported checkpoint format')
        clean_metadata(metadata)
        files = metadata.get('files')
        if not isinstance(files, list) or not 1 <= len(files) <= MAX_FILES:
            raise ValueError('Invalid snapshot file list')
        expected = {'checkpoint.json', 'checkpoint.sha256'}
        changes = []
        payload = {}
        secret = scanner()
        exact = secret.env_secrets([])
        if secret.contains_secret(raw, exact):
            raise ValueError('Snapshot metadata contains a possible secret')
        for file in files:
            name = str(safe_name(file['path']))
            member = 'files/' + name
            if member in expected:
                raise ValueError('Duplicate manifest file')
            expected.add(member)
            data = z.read(member)
            if digest(data) != file['sha256'] or len(data) != file['bytes']:
                raise ValueError('Snapshot file checksum mismatch')
            if secret.contains_secret(data, exact) or is_archive(data):
                raise ValueError('Snapshot content failed secret/source checks')
            if include_payload:
                payload[name] = data
            if root:
                try:
                    current = safe_file(Path(root).resolve(), name).read_bytes()
                except (OSError, ValueError):
                    changes.append(name)
                else:
                    if digest(current) != file['sha256']:
                        changes.append(name)
        if set(z.namelist()) != expected:
            raise ValueError('Unexpected snapshot member')
        result = {'manifest': metadata, 'changedSinceCheckpoint': changes, 'valid': True}
        if include_payload:
            result['_payload'] = payload
        return result


def extract(archive, destination):
    checked = verify(archive, include_payload=True)
    payload = checked.pop('_payload')
    destination = Path(destination).absolute()
    if destination.exists() or destination.is_symlink() or not destination.parent.is_dir():
        raise ValueError('Recovery requires a new directory, never an existing checkout')
    temporary = Path(tempfile.mkdtemp(prefix='.checkpoint-recovery-', dir=destination.parent))
    try:
        for name, data in payload.items():
            path = temporary / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        temporary.rename(destination)
    finally:
        if temporary.exists():
            shutil.rmtree(temporary)
    return checked


def main():
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest='action', required=True)
    s = sub.add_parser('save')
    s.add_argument('--root', type=Path, required=True)
    s.add_argument('--spec', type=Path, required=True)
    s.add_argument('--out', type=Path, required=True)
    v = sub.add_parser('status')
    v.add_argument('archive', type=Path)
    v.add_argument('--root', type=Path)
    r = sub.add_parser('extract')
    r.add_argument('archive', type=Path)
    r.add_argument('--out', type=Path, required=True)
    args = p.parse_args()
    try:
        if args.action == 'save':
            result = save(args.root, json.loads(args.spec.read_text(encoding='utf-8')), args.out)
        elif args.action == 'status':
            result = verify(args.archive, args.root)
        else:
            result = extract(args.archive, args.out)
        print(json.dumps(result, indent=2))
    except (ValueError, OSError, KeyError, TypeError, zipfile.BadZipFile) as error:
        # No credentials or file content in failure diagnostics.
        p.exit(1, 'Checkpoint operation failed: ' + type(error).__name__ + '; verify inputs and size/secret/path constraints.\n')


if __name__ == '__main__':
    main()
