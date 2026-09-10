import { INTEGRITY } from "@/lib/ecosystem";
import styles from "./ecosystem.module.css";

export default function IntegrityFooter() {
  return (
    <section className={styles.integrity} aria-label="Claims guardrails">
      <p className={styles.kicker}>Open book</p>
      <ul className="mt-2 grid gap-2">
        {INTEGRITY.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-mute">
        Ticker ≠ identity. Match the network and the full address.{" "}
        <a className="text-ice hover:underline" href="https://connect.devfridge.cool">
          Official contacts
        </a>
        {" · "}
        Too many tokens? Fridge them.
      </p>
    </section>
  );
}
