import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('site_generator', HERE / 'generate-site.py')
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)


class SiteTests(unittest.TestCase):
    def setUp(self):
        self.config = json.loads((HERE / 'site.example.json').read_text())
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.dest = Path(self.tmp.name) / 'site'

    def ready(self):
        self.config.update(factsReviewed=True, origin='https://game.devfridge.cool', appName='Test game', publisherName='Test publisher', description='Synthetic fixture', supportEmail='support@game.devfridge.cool')
        for section in ('privacy', 'terms'):
            self.config[section] = {key: 'Synthetic test fact: ' + key for key in self.config[section]}
        # Synthetic test facts, never published or represented as reviewed legal content.
        return self.config

    def test_draft_pages_and_links(self):
        result = site.generate(self.config, self.dest, draft=True)
        self.assertTrue(result['draft'])
        self.assertEqual(len(result['files']), 5)
        for path in ('index.html', 'privacy/index.html', 'terms/index.html'):
            self.assertIn('noindex,nofollow', (self.dest / path).read_text())
        self.assertNotIn('Play the web game', (self.dest / 'index.html').read_text())

    def test_missing_facts_and_placeholder_domain_fail_closed(self):
        with self.assertRaises(ValueError):
            site.generate(self.config, self.dest)
        self.config['factsReviewed'] = True
        with self.assertRaises(ValueError):
            site.generate(self.config, self.dest)
        self.ready()
        del self.config['privacy']['retention']
        with self.assertRaises(ValueError):
            site.generate(self.config, self.dest)
        self.assertFalse(self.dest.exists())

    def test_hostile_prose_is_text_and_no_invented_prices(self):
        c = self.ready()
        c['appName'] = '<script>alert("x")</script>'
        result = site.generate(c, self.dest)
        page = (self.dest / 'index.html').read_text()
        self.assertNotIn('<script>', page)
        self.assertIn('&lt;script&gt;', page)
        self.assertNotIn('0.01 SOL', page)
        self.assertFalse(result['draft'])
        for name, digest in result['files'].items():
            self.assertEqual(site.hashlib.sha256((self.dest / name).read_bytes()).hexdigest(), digest)

    def test_bad_domains_and_mail(self):
        for url in ('https://127.0.0.1', 'https://evil.example', 'https://example.com.', 'https://user:pass@host.com', 'http://game.com', 'https://game.com/x', 'https://game.com?key=secret'):
            c = copy.deepcopy(self.ready())
            c['origin'] = url
            with self.subTest(url=url), self.assertRaises(ValueError):
                site.generate(c, self.dest)
        self.config['supportEmail'] = 'hi@example.com?bcc=evil@example.com'
        with self.assertRaises(ValueError):
            site.generate(self.config, self.dest)

    def test_reserved_email_and_lowercase_placeholders(self):
        for email in ('support@example.invalid', 'support@sub.example.com'):
            c = copy.deepcopy(self.ready())
            c['supportEmail'] = email
            with self.subTest(email=email), self.assertRaises(ValueError):
                site.generate(c, self.dest)
        self.ready()['terms']['law'] = 'replace with actual rules'
        with self.assertRaises(ValueError):
            site.generate(self.config, self.dest)

    def test_never_overwrites_and_bundled_has_no_web_game(self):
        site.generate(self.config, self.dest, draft=True)
        original = (self.dest / 'index.html').read_bytes()
        with self.assertRaises(ValueError):
            site.generate(self.ready(), self.dest)
        self.assertEqual((self.dest / 'index.html').read_bytes(), original)
        c = self.ready()
        c['playUrl'] = 'https://game.devfridge.cool'
        with self.assertRaises(ValueError):
            site.validate(c)


if __name__ == '__main__':
    unittest.main()
