import type { VerificationStatus } from "../lib/verify";

type Props = {
  status: VerificationStatus | "loading";
};

const LABELS: Record<VerificationStatus | "loading", string> = {
  verified: "Verified",
  expired: "Expired",
  insufficient: "Insufficient",
  "no-lock": "No Lock",
  loading: "Checking...",
};

export function LockStatus({ status }: Props) {
  return (
    <span className={`lock-status ${status}`}>
      <span className="dot" />
      {LABELS[status]}
    </span>
  );
}
