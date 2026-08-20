import type { CheckLevel, SecurityCheck } from "@/lib/scan";

type TrustGrade = "A" | "B" | "C" | "D" | "E";

function gradeFromLevel(level: CheckLevel): TrustGrade {
  if (level === "safe") return "A";
  if (level === "caution") return "C";
  if (level === "danger") return "E";
  return "C";
}

function trustGrade(checks: SecurityCheck[]): TrustGrade {
  const pts = checks.reduce((sum, c) => {
    if (c.level === "danger") return sum + 4;
    if (c.level === "caution") return sum + 2;
    if (c.level === "unknown") return sum + 1;
    return sum;
  }, 0);
  if (pts === 0) return "A";
  if (pts <= 2) return "B";
  if (pts <= 4) return "C";
  if (pts <= 7) return "D";
  return "E";
}

const LETTERS: TrustGrade[] = ["A", "B", "C", "D", "E"];

const MEANING: Record<TrustGrade, string> = {
  A: "Excellent — cold and clean",
  B: "Good — a few warm spots",
  C: "Average — check the label",
  D: "Poor — high concentration / unlocked risk",
  E: "Bad — treat as a hot meal",
};

export default function SecurityGrid({ checks }: { checks: SecurityCheck[] }) {
  const overall = trustGrade(checks);
  return (
    <article className="nutri-label">
      <header className="nutri-head">
        <p className="nutri-kicker">Nutrition declaration</p>
        <h3>TRUST FACTS</h3>
        <p className="nutri-sub">Typical values per mint</p>
      </header>

      <div className="nutri-cols">
        <span>Nutrient</span>
        <span>Per mint</span>
        <span>Grade</span>
      </div>

      {checks.map((c) => {
        const grade = gradeFromLevel(c.level);
        return (
          <div key={c.id} className="nutri-row">
            <div>
              <p className="nutri-name">{c.label}</p>
              <p className="nutri-hint">{c.detail}</p>
            </div>
            <p className="nutri-amount">{c.amount || "—"}</p>
            <span className={`nutri-pill nutri-${grade}`}>{grade}</span>
          </div>
        );
      })}

      <footer className="nutri-foot">
        <p className="nutri-score-label">Trust-Score</p>
        <div className="nutri-scale" role="img" aria-label={`Trust-Score ${overall}`}>
          {LETTERS.map((letter) => (
            <span
              key={letter}
              className={`nutri-letter nutri-${letter} ${letter === overall ? "is-on" : ""}`}
            >
              {letter}
            </span>
          ))}
        </div>
        <p className="nutri-meaning">
          <strong>{overall}</strong> — {MEANING[overall]}
        </p>
        <p className="nutri-legal">
          * Fridge vaults excluded from holder %. LP lock is not a certified lab test. Reference
          intake of a fridged Token-2022 mint.
        </p>
      </footer>
    </article>
  );
}
