"""Build deterministic public downloads from the maintained Agent Skill folder."""
from pathlib import Path
import hashlib
import io
import json
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
NAME = 'devfridge-game-builder'
SOURCE = ROOT / 'skills' / NAME
DEST = ROOT / 'scan/public/world/skill/downloads'

def build():
    entry = (SOURCE / 'SKILL.md').read_text(encoding='utf-8')
    assert f'name: {NAME}' in entry and entry.startswith('---\n')
    for link in re.findall(r'\]\(([^)]+)\)', entry):
        if '://' not in link:
            assert (SOURCE / link).is_file(), f'Missing reference: {link}'
    files = sorted(p for p in SOURCE.rglob('*') if p.is_file())
    assert all(p.suffix in {'.md', '.yaml', '.mjs'} for p in files), 'Unexpected package file'
    buffer = io.BytesIO()
    manifest = []
    DEST.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(buffer, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            relative = path.relative_to(SOURCE).as_posix()
            data = path.read_bytes().replace(b'\r\n', b'\n')
            info = zipfile.ZipInfo(f'{NAME}/{relative}', (2026, 9, 22, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, data)
            public = DEST / NAME / relative
            public.parent.mkdir(parents=True, exist_ok=True)
            public.write_bytes(data)
            manifest.append({'path': relative, 'sha256': hashlib.sha256(data).hexdigest()})
    data = buffer.getvalue()
    for ext in ['zip', 'skill']:
        (DEST / f'{NAME}.{ext}').write_bytes(data)
    release = {'name':NAME, 'version':'1.0.0', 'reviewedAt':'2026-09-22', 'bytes':len(data), 'sha256':hashlib.sha256(data).hexdigest(), 'files':manifest}
    (DEST / 'manifest.json').write_text(json.dumps(release, indent=2)+'\n', encoding='utf-8')
    print(f'{len(files)} files, {len(data)} bytes, SHA-256 {release["sha256"]}')

if __name__ == '__main__':
    build()
