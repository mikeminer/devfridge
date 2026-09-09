"""Dated protocol adoption and LP evidence, without revenue or ownership inference."""
import base64
import json
import struct
from datetime import datetime

from refresh import PROGRAM, TOKEN2022, observed, page, request, rpc, status_line

LP_MINT = '9Yi9cwm3Non7LoFkxC6eKgp38CSbbXPvYH3VTrz2KC4V'
POOL = '5o5JBdWZd3zKE3JC8Tb81D3bph7bwxftvwLLRoZ1EqL5'
LOCK_DISC = bytes([8, 255, 36, 202, 210, 22, 57, 137])


def activity(rpc_url, stamp):
    result = rpc(rpc_url, 'getProgramAccounts', [PROGRAM, {'encoding': 'base64', 'commitment': 'finalized', 'withContext': True, 'filters': [{'dataSize': 105}]}])
    if not isinstance(result.get('value'), list) or type(result.get('context', {}).get('slot')) is not int:
        raise ValueError('Missing finalized lock snapshot')
    current = datetime.fromisoformat(stamp.replace('Z', '+00:00')).timestamp()
    depositors, mints, addresses = set(), set(), set()
    count, active = 0, 0
    for row in result['value']:
        account = row['account']
        if account.get('owner') != PROGRAM or account['data'][1] != 'base64' or row['pubkey'] in addresses:
            raise ValueError('Invalid program-account evidence')
        addresses.add(row['pubkey'])
        data = base64.b64decode(account['data'][0], validate=True)
        if len(data) != 105:
            raise ValueError('Unexpected lock size')
        if data[:8] != LOCK_DISC:
            continue
        count += 1
        depositors.add(data[8:40]); mints.add(data[40:72])
        active += struct.unpack_from('<q', data, 88)[0] > current
    return {'program': PROGRAM, 'slot': result['context']['slot'], 'active_locks': active, 'open_lock_accounts': count,
            'depositor_wallets': len(depositors), 'unique_mints': len(mints),
            'scope': 'Currently open accounts, including expired unclaimed locks. Claimed/closed accounts are absent; these are not lifetime adoption counts.',
            'external_depositors': None, 'cumulative_fee_revenue': None}


def lp_evidence(rpc_url):
    result = rpc(rpc_url, 'getAccountInfo', [LP_MINT, {'encoding': 'jsonParsed', 'commitment': 'finalized'}])
    value = result.get('value') or {}
    parsed = value.get('data', {}).get('parsed', {})
    info = parsed.get('info', {})
    if value.get('owner') != TOKEN2022 or parsed.get('type') != 'mint' or not str(info.get('supply', '')).isdigit() or info.get('mintAuthority') != POOL or type(result.get('context', {}).get('slot')) is not int:
        raise ValueError('LP mint observation unavailable or identity changed')
    return {'pool': POOL, 'lp_mint': LP_MINT, 'owner_program': value['owner'], 'slot': result['context']['slot'],
            'supply_base_units': info['supply'], 'decimals': info['decimals'], 'mint_authority': info['mintAuthority'],
            'zero_supply': info['supply'] == '0', 'explorer': 'https://solscan.io/token/' + LP_MINT,
            'interpretation': 'Zero outstanding LP supply at observation for this mint. This is not a guarantee of future pool liquidity, price, or permanent absence of newly minted LP shares.'}


def reported_stats():
    data = json.loads(request('https://scan.devfridge.cool/api/stats'))
    balance = data.get('boostVaultLamports')
    if type(balance) is not int or balance < 0 or type(data.get('ts')) is not int:
        raise ValueError('Invalid stats response')
    return {'boost_vault_lamports': balance, 'reported_pasta_burned': data.get('pastaBurned'), 'source_timestamp_ms': data['ts'],
            'interpretation': 'The published stats implementation reads an incinerator token balance for pastaBurned. It is not a complete ledger of SPL Burn instructions. Vault balance and burn-token value do not establish cumulative fee revenue.'}


def refresh_protocol(config, old, stamp):
    url = config['solana_rpc']
    return {'activity': observed(old.get('activity'), url, lambda: activity(url, stamp), stamp),
            'lp': observed(old.get('lp'), url, lambda: lp_evidence(url), stamp),
            'reported_stats': observed(old.get('reported_stats'), 'https://scan.devfridge.cool/api/stats', reported_stats, stamp)}


def render_protocol(snapshot, stamp):
    records = snapshot.get('protocol', {})
    body = 'Evidence for community leaders evaluating a DevFridge integration. Counts are observations, not claims of outside adoption or revenue.\n\n'
    for name in ('activity', 'lp', 'reported_stats'):
        record = records.get(name, {})
        body += f"## {name.replace('_', ' ').title()}\n\n{status_line(record)}.\n\n"
        body += '```json\n' + json.dumps(record.get('data', {'status': 'unavailable'}), indent=2, ensure_ascii=False, sort_keys=True) + '\n```\n\n'
    body += '[Product pitch and pilot](./kol.md) · [Investor index](./index.md) · [Program source](https://github.com/mikeminer/devfridge/blob/master/programs/fridge/src/lib.rs) · [Stats implementation](https://github.com/mikeminer/devfridge/blob/master/scan/lib/stats.ts)\n'
    page('investor/protocol.md', 'Protocol adoption and PASTA LP evidence', body, stamp, 'Report')
