import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

HERE = Path(__file__).resolve().parent
PRIVATE_HEADER = '-----BEGIN ' + 'PRIVATE KEY-----'
spec = importlib.util.spec_from_file_location('checkpoint', HERE / 'checkpoint.py')
checkpoint = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checkpoint)


class CheckpointTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'src').mkdir()
        (self.root / 'src/main.ts').write_text('export const lives = 1;\n')
        self.spec = {'stage': 'loop', 'summary': 'Synthetic example', 'nextAction': 'Test touch input',
                     'checks': [{'command': 'fixture', 'status': 'skipped', 'result': 'Not a gameplay test'}],
                     'files': ['src/main.ts']}
        self.archive = self.root / 'snapshot.zip'

    def test_save_verify_changes_and_recover_without_overwrite(self):
        saved = checkpoint.save(self.root, self.spec, self.archive)
        checked = checkpoint.verify(self.archive, self.root)
        self.assertTrue(checked['valid'])
        self.assertEqual(checked['manifest'], saved)
        self.assertEqual(checked['changedSinceCheckpoint'], [])
        (self.root / 'src/main.ts').write_text('changed')
        self.assertEqual(checkpoint.verify(self.archive, self.root)['changedSinceCheckpoint'], ['src/main.ts'])
        recovered = self.root / 'recovered'
        checkpoint.extract(self.archive, recovered)
        self.assertEqual((recovered / 'src/main.ts').read_text(), 'export const lives = 1;\n')
        with self.assertRaises(ValueError):
            checkpoint.extract(self.archive, recovered)
        with self.assertRaises(ValueError):
            checkpoint.save(self.root, self.spec, self.archive)

    def test_secret_private_path_and_traversal_fail_without_output(self):
        for name in ('../outside.txt', 'C:/other.txt', '.env', 'credentials.json', 'id-keypair.json', 'src\\main.ts', 'src/main.ts/../main.ts'):
            self.spec['files'] = [name]
            with self.subTest(name=name), self.assertRaises(ValueError):
                checkpoint.save(self.root, self.spec, self.archive)
            self.assertFalse(self.archive.exists())
        self.spec['files'] = ['src/main.ts']
        (self.root / 'src/main.ts').write_text(PRIVATE_HEADER + '\nfixture\n')
        with self.assertRaises(ValueError):
            checkpoint.save(self.root, self.spec, self.archive)

    def test_interrupted_write_has_no_committed_snapshot(self):
        with patch.object(checkpoint.zipfile.ZipFile, 'writestr', side_effect=OSError('fixture interruption')):
            with self.assertRaises(OSError):
                checkpoint.save(self.root, self.spec, self.archive)
        self.assertFalse(self.archive.exists())
        self.assertEqual(list(self.root.glob('.checkpoint-*')), [])

    def test_tampered_member_is_rejected(self):
        checkpoint.save(self.root, self.spec, self.archive)
        with zipfile.ZipFile(self.archive) as z:
            members = {n: z.read(n) for n in z.namelist()}
        members['files/src/main.ts'] = b'tampered'
        altered = self.root / 'tampered.zip'
        with zipfile.ZipFile(altered, 'w') as z:
            for n, data in members.items():
                z.writestr(n, data)
        with self.assertRaises(ValueError):
            checkpoint.verify(altered)

    def test_notes_are_scanned_and_results_required(self):
        self.spec['summary'] = PRIVATE_HEADER
        with self.assertRaises(ValueError):
            checkpoint.save(self.root, self.spec, self.archive)
        self.spec['summary'] = 'fixture'
        self.spec['checks'] = []
        with self.assertRaises(ValueError):
            checkpoint.save(self.root, self.spec, self.archive)

    def test_prefixed_archive_is_not_a_source_snapshot(self):
        buffer = io.BytesIO()
        buffer.write(b'not-a-zip-header')
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr('hidden.txt', PRIVATE_HEADER)
        (self.root / 'src/main.ts').write_bytes(buffer.getvalue())
        with self.assertRaises(ValueError):
            checkpoint.save(self.root, self.spec, self.archive)

    def test_extraction_uses_the_verified_bytes(self):
        checkpoint.save(self.root, self.spec, self.archive)
        original_verify = checkpoint.verify
        def swapped(*args, **kwargs):
            result = original_verify(*args, **kwargs)
            self.archive.write_bytes(b'archive replaced after validation')
            return result
        with patch.object(checkpoint, 'verify', side_effect=swapped):
            checkpoint.extract(self.archive, self.root / 'recovered')
        self.assertEqual((self.root / 'recovered/src/main.ts').read_text(), 'export const lives = 1;\n')


if __name__ == '__main__':
    unittest.main()
