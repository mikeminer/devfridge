import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from export_vault import export_vault


class ExportTests(unittest.TestCase):
    def test_export_is_complete_deterministic_and_excludes_private_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            data = root / 'knowledge/data'
            data.mkdir(parents=True)
            (data / 'snapshot.json').write_text(json.dumps({'attempted_at': '2026-09-08T12:00:00Z'}))
            (root / 'knowledge/index.md').write_bytes(b'# Vault\r\n')
            (root / '.env').write_text('PRIVATE_SECRET=not-public')
            result = export_vault(root)
            first = (data / 'vault.json').read_bytes()
            export_vault(root)
            self.assertEqual(first, (data / 'vault.json').read_bytes())
            self.assertEqual(len(result['files']), 1)
            self.assertEqual(result['files'][0]['text'], '# Vault\n')
            self.assertEqual(result['files'][0]['sha'], hashlib.sha256(b'# Vault\n').hexdigest())
            self.assertNotIn(b'PRIVATE_SECRET', first)


if __name__ == '__main__':
    unittest.main()
