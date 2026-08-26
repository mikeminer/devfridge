import { TIERS, type TierNumber } from "../config/tiers";

type Props = {
  tier: TierNumber;
  role: string;
};

export function RoleBadge({ tier, role }: Props) {
  const tierDef = TIERS[tier];
  return (
    <span
      className="role-badge"
      style={{ background: tierDef.bgColor, color: tierDef.color }}
    >
      {role || tierDef.label}
    </span>
  );
}
