import type { VerificationStatus } from "../lib/verify";

type Props = {
  status: VerificationStatus | "loading";
  href?: string;
};

const LABELS: Record<VerificationStatus | "loading", string> = {
  verified: "Verified",
  expired: "Expired",
  insufficient: "Insufficient",
  "no-lock": "No Lock",
  loading: "Checking...",
};

export function LockStatus({ status, href }: Props) {
  const content = (
    <>
      <span className="dot" />
      {LABELS[status]}
    </>
  );

  if (status === "verified" && href) {
    return (
      <a
        className={`lock-status lock-status-link ${status}`}
        href={href}
        target="_blank"
        rel="noopener"
        aria-label="Verified — scan member wallet with DevFridge OSINT"
        title="Scan member wallet with DevFridge OSINT"
      >
        {content}
      </a>
    );
  }

  return <span className={`lock-status ${status}`}>{content}</span>;
}
