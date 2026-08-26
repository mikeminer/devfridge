import { useCallback, useEffect, useState } from "react";
import { fetchTeam, type TeamMember } from "../lib/api";
import { verifyMemberLock, type VerificationResult } from "../lib/verify";
import type { TierNumber } from "../config/tiers";

export type TeamMemberWithVerification = TeamMember & {
  verification: VerificationResult | null;
  loading: boolean;
};

export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMemberWithVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const roster = await fetchTeam();
      // Set members with loading verification state
      const initial: TeamMemberWithVerification[] = roster.map((m) => ({
        ...m,
        verification: null,
        loading: true,
      }));
      setMembers(initial);
      setLoading(false);

      // Verify all locks in parallel
      const results = await Promise.allSettled(
        roster.map((m) => verifyMemberLock(m.wallet, m.tier as TierNumber))
      );

      setMembers((prev) =>
        prev.map((m, i) => ({
          ...m,
          verification:
            results[i].status === "fulfilled"
              ? results[i].value
              : { status: "no-lock" as const, bestLock: null, lockedAmount: 0n, daysRemaining: 0, lockDurationDays: 0 },
          loading: false,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  return { members, loading, error, reload: load };
}
