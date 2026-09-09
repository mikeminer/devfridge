"use client";

import { useRef, useState, type FormEvent } from "react";
import styles from "./runway.module.css";

export default function NewsletterSignup() {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const submitting = useRef(false);

  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("pending");
    setMessage("");
    try {
      const response = await fetch("/api/world/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), website: data.get("website"), consent: data.get("consent") === "on" }),
        signal: AbortSignal.timeout(25_000),
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) {
        setStatus("error");
        setMessage(response.status === 429 ? "Too many attempts. Please try again in 10 minutes." : "We could not confirm your subscription. Please try again or subscribe on Paragraph.");
        return;
      }
      form.reset();
      setStatus("success");
      setMessage("You are subscribed! World updates will arrive via Paragraph.");
    } catch {
      setStatus("error");
      setMessage("We could not confirm your subscription. Check your connection and try again, or subscribe on Paragraph.");
    } finally {
      submitting.current = false;
    }
  }

  return (
    <aside className={styles.launchNewsletter} aria-label="World updates on Paragraph">
      <p>Subscribe on Paragraph for World updates and insider perks.</p>
      {!expanded ? (
        <button type="button" aria-expanded={false} aria-controls="world-newsletter-form" onClick={() => setExpanded(true)}>Subscribe on Paragraph</button>
      ) : status === "success" ? (
        <p role="status">{message}</p>
      ) : (
        <form id="world-newsletter-form" className={styles.newsletterForm} onSubmit={subscribe} aria-busy={status === "pending"}>
          <label htmlFor="world-newsletter-email">Your email</label>
          <input id="world-newsletter-email" name="email" type="email" autoComplete="email" inputMode="email" maxLength={254} placeholder="you@example.com" required autoFocus disabled={status === "pending"} />
          <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <label className={styles.newsletterConsent}><input name="consent" type="checkbox" required disabled={status === "pending"} />I agree to receive DevFridge updates via Paragraph. Unsubscribe anytime.</label>
          <button type="submit" disabled={status === "pending"}>{status === "pending" ? "Subscribing…" : "Subscribe by email"}</button>
          {status === "error" && <p role="alert">{message}</p>}
          <a href="https://paragraph.com/@0x5d69c42a3a481d0ccfd88cfa8a2a08e2bf456134/subscribe" target="_blank" rel="noopener noreferrer">Prefer to subscribe on Paragraph? ↗</a>
        </form>
      )}
    </aside>
  );
}
