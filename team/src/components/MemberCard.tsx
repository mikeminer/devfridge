import type { TeamMemberWithVerification } from "../hooks/useTeamMembers";
import type { TierNumber } from "../config/tiers";
import { PASTA_DECIMALS } from "../config/constants";
import { RoleBadge } from "./RoleBadge";
import { LockStatus } from "./LockStatus";

type Props = {
  member: TeamMemberWithVerification;
};

function shortKey(key: string): string {
  return key.slice(0, 4) + "\u2026" + key.slice(-4);
}

function formatAmount(raw: bigint): string {
  const whole = raw / BigInt(10 ** PASTA_DECIMALS);
  if (whole >= 1_000_000n) return (Number(whole) / 1_000_000).toFixed(1) + "M";
  if (whole >= 1_000n) return (Number(whole) / 1_000).toFixed(0) + "K";
  return whole.toString();
}

export function MemberCard({ member }: Props) {
  const v = member.verification;
  const status = member.loading ? "loading" : v?.status ?? "no-lock";

  return (
    <div className="member-card">
      <div className="member-card-header">
        <div>
          {member.displayName && (
            <p className="member-name">{member.displayName}</p>
          )}
          <p className="member-wallet">{shortKey(member.wallet)}</p>
        </div>
        <RoleBadge tier={member.tier as TierNumber} role={member.role} />
      </div>

      <LockStatus status={status} />

      {v && !member.loading && (
        <div className="member-stats">
          {v.lockedAmount > 0n && (
            <div>
              <span className="label">Locked:</span>
              <span className="value">{formatAmount(v.lockedAmount)} PASTA</span>
            </div>
          )}
          {v.daysRemaining > 0 && (
            <div>
              <span className="label">Remaining:</span>
              <span className="value">{v.daysRemaining} days</span>
            </div>
          )}
          {v.lockDurationDays > 0 && (
            <div>
              <span className="label">Lock duration:</span>
              <span className="value">{Math.round(v.lockDurationDays)} days</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
