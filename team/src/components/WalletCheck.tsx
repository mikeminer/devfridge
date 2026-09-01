import { useState, type FormEvent } from "react";
import { PASTA_DECIMALS, PASTA_MINT, SCAN_API_URL } from "../config/constants";

type Lock = {
  amount: string | number;
  unlockAt: number;
};

type CheckResponse = {
  wallet: string;
  locks: Lock[];
  activeLocks: Lock[];
  bestLock: Lock | null;
  daysRemaining: number;
  ts: number;
  error?: string;
};

function formatAmount(raw: bigint): string {
  const divisor = BigInt(10 ** PASTA_DECIMALS);
  const whole = raw / divisor;

  if (whole >= 1_000_000n) return `${(Number(whole) / 1_000_000).toFixed(1)}M`;
  if (whole >= 1_000n) return `${(Number(whole) / 1_000).toFixed(1)}K`;
  return whole.toLocaleString("en-US");
}

function totalActiveAmount(locks: Lock[]): bigint {
  return locks.reduce((total, lock) => {
    try {
      return total + BigInt(lock.amount);
    } catch {
      return total;
    }
  }, 0n);
}

function weightedAverageDaysRemaining(locks: Lock[], now: number): number {
  const totalAmount = totalActiveAmount(locks);
  if (totalAmount === 0n) return 0;

  const weightedSeconds = locks.reduce((total, lock) => {
    try {
      const amount = BigInt(lock.amount);
      const remainingSeconds = BigInt(Math.max(0, Math.floor(lock.unlockAt - now)));
      return total + amount * remainingSeconds;
    } catch {
      return total;
    }
  }, 0n);

  return Number(weightedSeconds / totalAmount / 86_400n);
}

export function WalletCheck() {
  const [wallet, setWallet] = useState("");
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedWallet = wallet.trim();

    if (!normalizedWallet) {
      setError("Enter a Solana wallet address.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const params = new URLSearchParams({ wallet: normalizedWallet, mint: PASTA_MINT });
      const response = await fetch(`${SCAN_API_URL}/api/sdk/check?${params.toString()}`);
      const data = (await response.json()) as CheckResponse;

      if (!response.ok) {
        throw new Error(data.error || "The wallet could not be checked.");
      }

      setResult(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The wallet could not be checked.");
    } finally {
      setLoading(false);
    }
  }

  const activeAmount = result ? totalActiveAmount(result.activeLocks) : 0n;
  const averageDaysRemaining = result
    ? weightedAverageDaysRemaining(result.activeLocks, result.ts)
    : 0;
  const status = result
    ? result.activeLocks.length > 0
      ? "FRIDGED"
      : result.locks.length > 0
        ? "EXPIRED"
        : "OPEN"
    : null;

  return (
    <div className="wallet-check" id="wallet-checker">
      <form className="wallet-check-form" onSubmit={checkWallet}>
        <label htmlFor="wallet-check-input">Check a wallet's $PASTA lock</label>
        <div className="wallet-check-controls">
          <input
            id="wallet-check-input"
            type="text"
            value={wallet}
            onChange={(event) => setWallet(event.target.value)}
            placeholder="Solana wallet address"
            spellCheck={false}
            autoComplete="off"
            aria-describedby="wallet-check-help"
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Checking…" : "Check wallet"}
          </button>
        </div>
        <p id="wallet-check-help">Checks $PASTA locks through the DevFridge SDK API without connecting a wallet.</p>
      </form>

      {error && <div className="wallet-check-message wallet-check-error" role="alert">{error}</div>}

      {result && status && (
        <div className={`wallet-check-result status-${status.toLowerCase()}`} aria-live="polite">
          <div>
            <span className="wallet-check-label">Status</span>
            <strong>{status}</strong>
          </div>
          <div>
            <span className="wallet-check-label">Active locks</span>
            <strong>{result.activeLocks.length}</strong>
          </div>
          <div>
            <span className="wallet-check-label">Locked</span>
            <strong>{formatAmount(activeAmount)} PASTA</strong>
          </div>
          <div>
            <span className="wallet-check-label">Weighted days remaining</span>
            <strong>{averageDaysRemaining}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
