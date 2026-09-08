import json
import unittest
from unittest.mock import patch

import contacts
from refresh import PASTA


def directory(handle='leader'):
    return ''.join(f'<section><p>{group}</p><div><div><div>{group} @{handle}</div><div><a href="https://t.me/{handle}">Open</a><a href="javascript:bad()">Bad</a></div></div></div></section>'
                   for group in ['OFFICIAL TELEGRAM BOT', 'OFFICIAL SITES', 'TALK &amp; LISTINGS'])


class ContactTests(unittest.TestCase):
    def test_visible_labels_and_safe_links(self):
        data = contacts.connect_contacts(directory())
        self.assertEqual(data['entries'][0]['url'], 'https://t.me/leader')
        self.assertIn('@leader', data['entries'][0]['label'])
        self.assertNotIn('javascript:', str(data))

    def test_layout_failure_retains_prior_contacts_and_date(self):
        config = {'contact_sources': {'connect': 'https://connect.devfridge.cool/', 'team': 'https://scan.devfridge.cool/api/team'}}
        previous = {'connect': {'data': contacts.connect_contacts(directory()), 'fetched_at': '2026-09-01T00:00:00Z'}}
        with patch.object(contacts, 'request', return_value='<html>Error</html>'):
            result = contacts.refresh_contacts(config, previous, '2026-09-09T00:00:00Z')
        self.assertEqual(result['connect']['status'], 'stale')
        self.assertEqual(result['connect']['data'], previous['connect']['data'])
        self.assertEqual(result['connect']['fetched_at'], previous['connect']['fetched_at'])
        self.assertEqual(result['team']['status'], 'unavailable')

    def test_successful_change_replaces_removed_contact(self):
        config = {'contact_sources': {'connect': 'https://connect.devfridge.cool/', 'team': 'https://scan.devfridge.cool/api/team'}}
        old = {'connect': {'data': contacts.connect_contacts(directory('old_leader')), 'fetched_at': '2026-09-01T00:00:00Z'}}
        with patch.object(contacts, 'request', side_effect=lambda url: directory('new_leader') if 'connect.' in url else '{"members":[]}'):
            result = contacts.refresh_contacts(config, old, '2026-09-09T00:00:00Z')
        self.assertEqual(result['connect']['status'], 'ok')
        self.assertNotIn('old_leader', str(result['connect']))
        self.assertIn('new_leader', str(result['connect']))
        self.assertEqual(result['connect']['fetched_at'], '2026-09-09T00:00:00Z')

    def test_team_roles_and_handles_preserved_without_inventing_links(self):
        data = contacts.team_contacts(json.dumps({'members': [{'wallet': PASTA, 'role': 'CEO', 'displayName': 'Example', 'socials': {'telegram': 'leader', 'discord': 'name', 'github': 'bad handle'}}]}))
        person = data['members'][0]
        self.assertEqual(person['role'], 'CEO')
        self.assertEqual(next(c for c in person['contacts'] if c['platform'] == 'telegram')['url'], 'https://t.me/leader')
        self.assertTrue(all(c['url'] is None for c in person['contacts'] if c['platform'] != 'telegram'))
        self.assertEqual(contacts.team_contacts('{"members":[]}')['members'], [])
        with self.assertRaises(ValueError):
            contacts.team_contacts('{}')


if __name__ == '__main__':
    unittest.main()
