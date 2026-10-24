"""Build byte-reproducible public downloads from the maintained Agent Skill folder.

Python standard library only. Source files must be UTF-8/LF, enforced by the
scoped .gitattributes entries. Never rewrite vendored bytes while packaging.
"""
import argparse
from datetime import date
from pathlib import Path
import hashlib
import io
import json
import re
import zipfile
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
NAME = 'devfridge-game-builder'
SOURCE = ROOT / 'skills' / NAME
DEST = ROOT / 'scan/public/world/skill/downloads'
TEXT_SUFFIXES = {'.md', '.yaml', '.mjs', '.py', '.json', '.txt'}
BARE_NAMES = {'LICENSE', 'NOTICE'}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def build(source=SOURCE, dest=DEST):
    source, dest = Path(source).resolve(), Path(dest).resolve()
    if source == dest or dest.is_relative_to(source) or source.is_relative_to(dest):
        raise ValueError('Source and destination must be separate, non-nested directories')
    entry = (source / 'SKILL.md').read_text(encoding='utf-8')
    if not entry.startswith('---\n') or not re.search(r'^name: ' + re.escape(NAME) + r'$', entry, re.M):
        raise ValueError('Invalid skill name/frontmatter')
    frontmatter = entry.split('---', 2)[1]
    version_match = re.search(r'^  version: "(\d+\.\d+\.\d+)"$', frontmatter, re.M)
    reviewed_match = re.search(r'^  sources-reviewed: "(\d{4}-\d{2}-\d{2})"$', frontmatter, re.M)
    if not version_match or not reviewed_match:
        raise ValueError('Version and sources-reviewed metadata are required')
    version, reviewed_at = version_match[1], reviewed_match[1]
    reviewed = date.fromisoformat(reviewed_at)
    stamp = (reviewed.year, reviewed.month, reviewed.day, 0, 0, 0)
    if reviewed.year < 1980 or reviewed.year > 2107:
        raise ValueError('Review date is outside the ZIP timestamp range')

    entries = list(source.rglob('*'))
    if any(p.is_symlink() or '__pycache__' in p.parts for p in entries):
        raise ValueError('Symlinks and Python bytecode caches are not distributable')
    files = sorted((p for p in entries if p.is_file()), key=lambda p: p.relative_to(source).as_posix().lower())
    names = [p.relative_to(source).as_posix() for p in files]
    if len({name.lower() for name in names}) != len(names):
        raise ValueError('Case-colliding package paths')
    for path in files:
        if path.suffix not in TEXT_SUFFIXES and path.name not in BARE_NAMES:
            raise ValueError('Unexpected package file: ' + path.relative_to(source).as_posix())

    for document in [source / 'SKILL.md', *sorted((source / 'references').glob('*.md'))]:
        for link in re.findall(r'\[[^\]]+\]\(([^)]+)\)', document.read_text(encoding='utf-8')):
            target = link.strip().split(' "')[0].strip('<>')
            if re.match(r'^[a-z][a-z0-9+.-]*:', target, re.I) or target.startswith('#'):
                continue
            target = unquote(target.split('#')[0])
            resolved = (document.parent / target).resolve()
            if target and (not resolved.is_relative_to(source) or not resolved.exists()):
                raise ValueError('Missing or external local reference: ' + link)

    data_by_name = {}
    for relative, path in zip(names, files):
        data = path.read_bytes()
        data.decode('utf-8')
        if b'\r\n' in data:
            raise ValueError('Expected LF source bytes; check .gitattributes: ' + relative)
        data_by_name[relative] = data
    buffer = io.BytesIO()
    manifest = []
    with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for relative, data in data_by_name.items():
            info = zipfile.ZipInfo(f'{NAME}/{relative}', stamp)
            # Match the reviewed Windows archive on Linux CI as well.
            info.create_system = 0
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
            manifest.append({'path': relative, 'sha256': digest(data)})
    data = buffer.getvalue()
    release = {'name': NAME, 'version': version, 'reviewedAt': reviewed_at, 'bytes': len(data), 'sha256': digest(data), 'files': manifest}

    # Validate before writing. Refuse stale public members instead of silently
    # publishing files absent from the manifest or deleting unrelated content.
    public_root = dest / NAME
    if public_root.exists():
        public_entries = list(public_root.rglob('*'))
        if any(p.is_symlink() for p in public_entries):
            raise ValueError('Public download tree contains a symlink')
        stale = [p.relative_to(public_root).as_posix() for p in public_entries if p.is_file() and p.relative_to(public_root).as_posix() not in data_by_name]
        if stale:
            raise ValueError('Stale standalone download files require explicit cleanup: ' + ', '.join(stale))
    dest.mkdir(parents=True, exist_ok=True)
    for relative, payload in data_by_name.items():
        public = public_root / relative
        public.parent.mkdir(parents=True, exist_ok=True)
        public.write_bytes(payload)
    for ext in ('zip', 'skill'):
        (dest / f'{NAME}.{ext}').write_bytes(data)
    (dest / 'manifest.json').write_text(json.dumps(release, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'{len(files)} files, {len(data)} bytes, SHA-256 {release["sha256"]}')
    return release


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=SOURCE)
    parser.add_argument('--dest', type=Path, default=DEST)
    args = parser.parse_args()
    build(args.source, args.dest)
