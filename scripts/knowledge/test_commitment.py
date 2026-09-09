import copy
import json
import unittest
from unittest.mock import patch

import commitment
import contacts
from refresh import PASTA

STAMP = '2026-09-09T00:00:00Z'
NOW = int(commitment.timestamp(STAMP))
WALLET = 'GxPoKNX26GCisuH8Sdr8rtfZY98L5t5eegKtDzSA9P6W'


def lock(amount='100000000000000', days=364, **overrides):
    return {'address': 'A'*32, 'depositor': WALLET, 'mint': PASTA, 'amount': amount,
            'createdAt': NOW-100, 'unlockAt': NOW-100+days*86400, **overrides}


def response(locks):
    return {'wallet': WALLET, 'mint': PASTA, 'ts': NOW, 'activeLocks': locks}


def verify(locks, tier=1):
    with patch.object(commitment, 'request', return_value=json.dumps(response(locks))):
        return commitment.verify_commitment(WALLET, tier, STAMP)


class CommitmentTests(unittest.TestCase):
    def test_tier_amounts_and_duration_tolerance_match_team(self):
        self.assertEqual(commitment.tier_requirements(), {1:(100_000_000*10**6,364*86400),2:(75_000_000*10**6,179*86400),3:(50_000_000*10**6,89*86400),4:(25_000_000*10**6,29*86400),5:(0,0)})
        self.assertEqual(verify([lock()])['status'], 'verified')
        self.assertIsNone(verify([lock(days=363)]))
        self.assertIsNone(verify([lock(amount='99999999999999')]))

    def test_only_qualifying_active_amounts_sum_with_exact_integer_precision(self):
        a=lock(amount='50000000000000'); b=lock(amount='50000000000000',address='B'*32)
        self.assertEqual(verify([a,b])['qualifying_amount_base_units'],'100000000000000')
        b['unlockAt']=NOW+86400
        self.assertIsNone(verify([a,b]))
        self.assertIsNone(verify([lock(unlockAt=NOW)],5))
        self.assertIsNone(verify([],5))
        self.assertIsNone(verify([lock(amount='0')],5))
        self.assertEqual(verify([lock(amount='1',days=1)],5)['status'],'verified')

    def test_other_identity_duplicate_and_stale_responses_do_not_verify(self):
        for entry in [lock(mint='wrong'),lock(depositor='B'*32),lock(amount='1.5')]:
            with self.assertRaises(ValueError): verify([entry])
        with self.assertRaises(ValueError): verify([lock(),lock()])
        payload=response([lock()]); payload['ts']=NOW-301
        with patch.object(commitment,'request',return_value=json.dumps(payload)):
            with self.assertRaises(ValueError): commitment.verify_commitment(WALLET,1,STAMP)

    def test_roster_only_contains_verified_profiles_and_request_failure_drops_old_profile(self):
        roster={'members':[{'wallet':WALLET,'role':'CEO','tier':1,'displayName':'example','socials':{}}]}
        with patch.object(contacts,'verify_commitment',return_value=None):
            self.assertEqual(contacts.team_contacts(json.dumps(roster),STAMP)['members'],[])
        with patch.object(contacts,'verify_commitment',side_effect=RuntimeError('provider down')):
            result=contacts.team_contacts(json.dumps(roster),STAMP)
            self.assertEqual(result['members'],[])
            self.assertEqual(result['verification_failures'],1)
        config={'contact_sources':{'connect':'https://connect.devfridge.cool/','team':'https://scan.devfridge.cool/api/team'}}
        previous={'team':{'status':'ok','data':roster,'fetched_at':STAMP}}
        with patch.object(contacts,'request',side_effect=RuntimeError('provider down')):
            result=contacts.refresh_contacts(config,previous,STAMP)['team']
        self.assertEqual(result['status'],'unavailable')
        self.assertNotIn('data',result)

    def test_expired_old_or_absent_proof_is_not_publishable(self):
        proof=verify([lock()]); member={'commitment':proof}
        self.assertTrue(commitment.verified_at(member,STAMP))
        self.assertFalse(commitment.verified_at(member,'2026-09-11T00:00:00Z'))
        expired=copy.deepcopy(member); expired['commitment']['valid_until']=NOW
        self.assertFalse(commitment.verified_at(expired,STAMP))
        self.assertFalse(commitment.verified_at({},STAMP))
