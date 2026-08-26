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

    // Weighted average remaining days and duration, weighted by amount
    const now = Math.floor(Date.now() / 1000);
    let weightedRemaining = 0;
    let weightedDuration = 0;
    const totalNum = Number(totalLocked);
    if (totalNum > 0) {
      for (const lock of data.activeLocks) {
        const amt = Number(toBigInt(lock.amount));
        const weight = amt / totalNum;
        const remaining = Math.max(0, lock.unlockAt - now) / 86400;
        const duration = (lock.unlockAt - lock.createdAt) / 86400;
        weightedRemaining += remaining * weight;
        weightedDuration += duration * weight;
      }
    }
    const daysRemaining = Math.floor(weightedRemaining);
    const durationDays = Math.round(weightedDuration);

    // Best lock by furthest unlock (for reference)
    const allSorted = [...data.activeLocks].sort((a, b) => b.unlockAt - a.unlockAt);
    const displayBest = allSorted[0];

    if (qualifying.length === 0) {
      return {
        status: "insufficient",
        bestLock: displayBest,
        lockedAmount: totalLocked,
        daysRemaining,
        lockDurationDays: durationDays,
      };
    }

    // Sum qualifying lock amounts for tier check
    const qualifyingAmount = qualifying.reduce(
      (sum, lock) => sum + toBigInt(lock.amount),
      0n
    );

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
