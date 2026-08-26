import { SCAN_API_URL, PASTA_MINT } from "../config/constants";
import { TIERS, type TierNumber } from "../config/tiers";

type LockResponse = {
  address: string;
  depositor: string;
  mint: string;
  amount: string | number;
  createdAt: number;
  unlockAt: number;
  lockId: string;
};

type SdkCheckResponse = {
  wallet: string;
  mint: string;
  locks: LockResponse[];
  activeLocks: LockResponse[];
  bestLock: LockResponse | null;
  daysRemaining: number;
  ts: number;
};

export type VerificationStatus = "verified" | "expired" | "insufficient" | "no-lock";

export type VerificationResult = {
  status: VerificationStatus;
  bestLock: LockResponse | null;
  lockedAmount: bigint;
  daysRemaining: number;
  lockDurationDays: number;
};

function toBigInt(value: string | number): bigint {
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
}

export async function verifyMemberLock(
  wallet: string,
  tier: TierNumber
): Promise<VerificationResult> {
  const tierDef = TIERS[tier];

  try {
    const res = await fetch(
      `${SCAN_API_URL}/api/sdk/check?wallet=${wallet}&mint=${PASTA_MINT}`
    );
    if (!res.ok) {
      return { status: "no-lock", bestLock: null, lockedAmount: 0n, daysRemaining: 0, lockDurationDays: 0 };
    }

    const data = (await res.json()) as SdkCheckResponse;

    if (!data.activeLocks || data.activeLocks.length === 0) {
      if (data.locks && data.locks.length > 0) {
        return { status: "expired", bestLock: data.bestLock, lockedAmount: 0n, daysRemaining: 0, lockDurationDays: 0 };
      }
      return { status: "no-lock", bestLock: null, lockedAmount: 0n, daysRemaining: 0, lockDurationDays: 0 };
    }

    // Sum ALL active lock amounts (total locked PASTA for this wallet)
    const totalLocked = data.activeLocks.reduce(
      (sum, lock) => sum + toBigInt(lock.amount),
      0n
    );

    // Find qualifying locks: duration >= tier minimum (with 1-day tolerance for rounding)
    const minDurationSeconds = (tierDef.minDays - 1) * 86400;
    const qualifying = data.activeLocks.filter((lock) => {
      const durationSeconds = lock.unlockAt - lock.createdAt;
      return durationSeconds >= minDurationSeconds;
    });

    // Best lock by furthest unlock (across all active, for display)
    const allSorted = [...data.activeLocks].sort((a, b) => b.unlockAt - a.unlockAt);
    const displayBest = allSorted[0];
    const now = Math.floor(Date.now() / 1000);

    if (qualifying.length === 0) {
      return {
        status: "insufficient",
        bestLock: displayBest,
        lockedAmount: totalLocked,
        daysRemaining: Math.floor((displayBest.unlockAt - now) / 86400),
        lockDurationDays: (displayBest.unlockAt - displayBest.createdAt) / 86400,
      };
    }

    // Sum qualifying lock amounts for tier check
    const qualifyingAmount = qualifying.reduce(
      (sum, lock) => sum + toBigInt(lock.amount),
      0n
    );

    const daysRemaining = Math.floor((displayBest.unlockAt - now) / 86400);
    const durationDays = (displayBest.unlockAt - displayBest.createdAt) / 86400;

    if (qualifyingAmount < tierDef.minAmount) {
      return {
        status: "insufficient",
        bestLock: displayBest,
        lockedAmount: totalLocked,
        daysRemaining,
        lockDurationDays: durationDays,
      };
    }

    return {
      status: "verified",
      bestLock: displayBest,
      lockedAmount: totalLocked,
      daysRemaining,
      lockDurationDays: durationDays,
    };
  } catch {
    return { status: "no-lock", bestLock: null, lockedAmount: 0n, daysRemaining: 0, lockDurationDays: 0 };
  }
}
