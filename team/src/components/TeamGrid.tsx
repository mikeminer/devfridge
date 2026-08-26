import type { TeamMemberWithVerification } from "../hooks/useTeamMembers";
import { MemberCard } from "./MemberCard";

type Props = {
  members: TeamMemberWithVerification[];
  loading: boolean;
};

export function TeamGrid({ members, loading }: Props) {
  if (loading) {
    return (
      <div className="team-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="member-card skeleton-card">
            <div className="skeleton-line skeleton-wide" />
            <div className="skeleton-line skeleton-medium" />
            <div className="skeleton-line skeleton-narrow" />
          </div>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="empty-state">
        <h3>No team members yet</h3>
        <p>The CEO can add team members via the admin panel.</p>
      </div>
    );
  }

  // Sort by tier (highest first)
  const sorted = [...members].sort((a, b) => a.tier - b.tier);

  return (
    <div className="team-grid">
      {sorted.map((m) => (
        <MemberCard key={m.wallet} member={m} />
      ))}
    </div>
  );
}
