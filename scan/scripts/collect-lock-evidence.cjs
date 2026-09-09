// Node >=24. Run from scan/: node scripts/collect-lock-evidence.cjs LOCK_PDA [output.json]
const fs = require('node:fs');
const { collectLockEvidence, collectCanonicalPool } = require('../lib/solana-evidence.ts');

async function main() {
  const address = process.argv[2];
  if (!address) throw new Error('Usage: node scripts/collect-lock-evidence.cjs LOCK_PDA [output.json]; set SOLANA_RPC_URL');
  const endpoint = process.env.SOLANA_RPC_URL;
  if (!endpoint) throw new Error('Set SOLANA_RPC_URL to a Solana mainnet read-only RPC endpoint');
  const rpc = async (method, params) => {
    const res = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
    const data = await res.json();
    // Do not echo provider error strings or URLs: they may contain credentials.
    if (data.error || !data.result) throw new Error(`RPC failed for ${method}`);
    return data.result;
  };
  const lock = await collectLockEvidence(rpc, address);
  const poolReads = [];
  const recordRpc = async (method, params) => {
    const result = await rpc(method, params);
    poolReads.push({ method, params, result });
    return result;
  };
  const pool = lock.evidence ? await collectCanonicalPool(recordRpc, lock.evidence.mint) : null;
  const output = JSON.stringify({ lock, pool, poolReads }, null, 2) + '\n';
  if (process.argv[3]) fs.writeFileSync(process.argv[3], output);
  else process.stdout.write(output);
}
main().catch(err => { console.error(err.message); process.exitCode = 1; });
