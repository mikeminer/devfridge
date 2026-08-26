import { SCAN_API_URL, PASTA_MINT } from "../config/constants";
import { TIERS, type TierNumber } from "../config/tiers";

type LockResponse = {
  address: string;
  depositor: string;
  mint: string;
  amount: string;
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
      // Check if there are any locks at all (expired)
      if (data.locks && data.locks.length > 0) {
        return { status: "expired", bestLock: data.bestLock, lockedAmount: 0n, daysRemaining: 0, lockDurationDays: 0 };
      }
      return { status: "no-lock", bestLock: null, lockedAmount: 0n, daysRemaining: 0, lockDurationDays: 0 };
    }

    // Find qualifying locks: duration >= tier minimum
    const qualifying = data.activeLocks.filter((lock) => {
      const durationDays = (lock.unlockAt - lock.createdAt) / 86400;
      return durationDays >= tierDef.minDays;
    });

    if (qualifying.length === 0) {
      return {
        status: "insufficient",
        bestLock: data.bestLock,
        lockedAmount: BigInt(data.bestLock?.amount || "0"),
        daysRemaining: data.daysRemaining,
        lockDurationDays: data.bestLock
          ? (data.bestLock.unlockAt - data.bestLock.createdAt) / 86400
          : 0,
      };
    }

    // Sum qualifying lock amounts
    const totalAmount = qualifying.reduce(
      (sum, lock) => sum + BigInt(lock.amount),
      0n
    );

    // Best qualifying lock (furthest unlock)
    const best = qualifying.sort((a, b) => b.unlockAt - a.unlockAt)[0];
    const durationDays = (best.unlockAt - best.createdAt) / 86400;
    const now = Math.floor(Date.now() / 1000);
    const daysRemaining = Math.floor((best.unlockAt - now) / 86400);

    if (totalAmount < tierDef.minAmount) {
      return {
        status: "insufficient",
        bestLock: best,
        lockedAmount: totalAmount,
        daysRemaining,
        lockDurationDays: durationDays,
      };
    }

    return {
      status: "verified",
      bestLock: best,
      lockedAmount: totalAmount,
      daysRemaining,
      lockDurationDays: durationDays,
    };
  } catch {
    return { status: "no-lock", bestLock: null, lockedAmount: 0n, daysRemaining: 0, lockDurationDays: 0 };
  }
}
