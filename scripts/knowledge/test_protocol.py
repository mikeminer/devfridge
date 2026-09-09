import base64
import json
import struct
import unittest
from unittest.mock import patch

import protocol
from refresh import PROGRAM, TOKEN2022, observed


def row(address, depositor, mint, unlock):
    raw=bytearray(105); raw[:8]=protocol.LOCK_DISC; raw[8:40]=bytes([depositor])*32; raw[40:72]=bytes([mint])*32
    struct.pack_into('<q',raw,88,unlock)
    return {'pubkey':address,'account':{'owner':PROGRAM,'data':[base64.b64encode(raw).decode(),'base64']}}


class ProtocolTests(unittest.TestCase):
    def test_note_is_stable_after_snapshot_json_round_trip(self):
        snapshot = {'protocol': {'activity': {'status': 'ok', 'fetched_at': '2026-09-09T00:00:00Z', 'attempted_at': '2026-09-09T00:00:00Z', 'data': {'slot': 42, 'active_locks': 3}}}}
        with patch.object(protocol, 'page') as page:
            protocol.render_protocol(snapshot, '2026-09-09T00:00:00Z')
            before = page.call_args
            protocol.render_protocol(json.loads(json.dumps(snapshot, sort_keys=True)), '2026-09-09T00:00:00Z')
            self.assertEqual(before, page.call_args)

    def test_counts_open_accounts_not_lifetime_or_external_users(self):
        payload={'context':{'slot':42},'value':[row('one',1,1,200),row('two',1,2,50),row('three',2,1,300)]}
        with patch.object(protocol,'rpc',return_value=payload): result=protocol.activity('https://example.test','1970-01-01T00:01:40Z')
        self.assertEqual((result['active_locks'],result['open_lock_accounts'],result['depositor_wallets'],result['unique_mints']),(2,3,2,2))
        self.assertIsNone(result['external_depositors']); self.assertIsNone(result['cumulative_fee_revenue'])
        payload['value'][0]['account']['owner']='wrong'
        with patch.object(protocol,'rpc',return_value=payload):
            with self.assertRaises(ValueError): protocol.activity('https://example.test','1970-01-01T00:01:40Z')

    def test_rpc_failure_does_not_become_zero_adoption_or_burned_lp(self):
        with patch.object(protocol,'rpc',side_effect=RuntimeError('RPC unavailable')):
            result=observed(None,'https://example.test',lambda:protocol.lp_evidence('https://example.test'),'2026-09-09T00:00:00Z')
        self.assertEqual(result['status'],'unavailable'); self.assertNotIn('data',result)
        with patch.object(protocol,'rpc',return_value={'context':{'slot':1},'value':None}):
            with self.assertRaises(ValueError): protocol.lp_evidence('https://example.test')

    def test_lp_zero_requires_observed_mint_and_expected_authority(self):
        payload={'context':{'slot':42},'value':{'owner':TOKEN2022,'data':{'parsed':{'type':'mint','info':{'supply':'0','decimals':9,'mintAuthority':protocol.POOL}}}}}
        with patch.object(protocol,'rpc',return_value=payload): result=protocol.lp_evidence('https://example.test')
        self.assertTrue(result['zero_supply']); self.assertEqual(result['slot'],42)
        payload['value']['data']['parsed']['info']['mintAuthority']='wrong'
        with patch.object(protocol,'rpc',return_value=payload):
            with self.assertRaises(ValueError): protocol.lp_evidence('https://example.test')
