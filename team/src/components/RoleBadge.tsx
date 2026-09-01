import { TIERS, type TierNumber } from "../config/tiers";

type Props = {
  tier: TierNumber;
  role: string;
};

export function RoleBadge({ tier, role }: Props) {
  const tierDef = TIERS[tier];
  const displayRole = tier === 5 && role.trim().toLowerCase() === "verified investor"
    ? tierDef.label
    : role || tierDef.label;

  return (
    <span
      className="role-badge"
      style={{ background: tierDef.bgColor, color: tierDef.color }}
    >
      {displayRole}
    </span>
  );
}
