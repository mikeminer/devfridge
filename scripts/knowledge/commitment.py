"""Apply the public Team commitment criteria to dated SDK lock observations."""
import hashlib
import json
import re
from datetime import datetime

from refresh import PASTA, ROOT, request


def tier_requirements():
    source = (ROOT / 'team/src/config/tiers.ts').read_text(encoding='utf-8')
    constants = (ROOT / 'team/src/config/constants.ts').read_text(encoding='utf-8')
    decimals = int(re.search(r'PASTA_DECIMALS\s*=\s*(\d+)', constants)[1])
    rows = re.findall(r'(\d):\s*\{.*?minAmount:\s*([\d_]+)n(\s*\*\s*D)?\s*,.*?minDays:\s*(\d+)', source, re.S)
    tiers = {int(t): (int(amount.replace('_', '')) * (10**decimals if scale else 1), (int(days) - 1) * 86400) for t, amount, scale, days in rows}
    if set(tiers) != {1, 2, 3, 4, 5}:
        raise ValueError('Team tier policy changed; review verification parser')
    return tiers


def timestamp(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()


def verify_commitment(wallet, tier, stamp):
    if type(tier) is not int or tier not in {1, 2, 3, 4, 5}:
        raise ValueError('Unknown commitment tier')
    minimum, duration = tier_requirements()[tier]
    source = f'https://scan.devfridge.cool/api/sdk/check?wallet={wallet}&mint={PASTA}'
    payload = json.loads(request(source))
    current = timestamp(stamp)
    if payload.get('wallet') != wallet or payload.get('mint') != PASTA or not isinstance(payload.get('activeLocks'), list):
        raise ValueError('Commitment response identity mismatch')
    if not isinstance(payload.get('ts'), int) or abs(payload['ts'] - current) > 300:
        raise ValueError('Commitment response is not fresh')
    qualifying, addresses = [], set()
    for lock in payload['activeLocks']:
        if lock.get('depositor') != wallet or lock.get('mint') != PASTA:
            raise ValueError('Lock identity mismatch')
        address = lock.get('address', '')
        if not re.fullmatch(r'[1-9A-HJ-NP-Za-km-z]{32,44}', address) or address in addresses:
            raise ValueError('Invalid or duplicate lock identity')
        addresses.add(address)
        amount = str(lock.get('amount', ''))
        start, end = lock.get('createdAt'), lock.get('unlockAt')
        if not re.fullmatch(r'\d+', amount) or type(start) is not int or type(end) is not int or end <= start or start > current:
            raise ValueError('Malformed lock evidence')
        if int(amount) > 0 and end > current and end - start >= duration:
            qualifying.append({'address': address, 'amount_base_units': amount, 'created_at': start, 'unlock_at': end})
    total = sum(int(lock['amount_base_units']) for lock in qualifying)
    if not qualifying or total < minimum:
        return None
    return {'status': 'verified', 'checked_at': stamp, 'response_ts': payload['ts'], 'mint': PASTA, 'tier': tier,
            'source': source, 'minimum_amount_base_units': str(minimum), 'minimum_duration_seconds': duration,
            'qualifying_amount_base_units': str(total), 'qualifying_locks': qualifying,
            'valid_until': min(lock['unlock_at'] for lock in qualifying),
            'policy_source': 'https://github.com/mikeminer/devfridge/blob/master/team/src/lib/verify.ts',
            'policy_sha256': hashlib.sha256((ROOT / 'team/src/config/tiers.ts').read_bytes() + (ROOT / 'team/src/lib/verify.ts').read_bytes()).hexdigest()}


def verified_at(member, stamp):
    proof = member.get('commitment', {})
    try:
        age = timestamp(stamp) - timestamp(proof['checked_at'])
        return proof.get('status') == 'verified' and proof.get('mint') == PASTA and 0 <= age <= 36*3600 and proof['valid_until'] > timestamp(stamp)
    except (KeyError, TypeError, ValueError):
        return False
