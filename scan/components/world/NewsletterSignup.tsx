"use client";

import { useRef, useState, type FormEvent } from "react";
import styles from "./runway.module.css";

const paragraphSubscribe = "https://paragraph.com/@0x5d69c42a3a481d0ccfd88cfa8a2a08e2bf456134/subscribe";

const worldCopy = {
  label: "World updates on Paragraph",
  intro: "Subscribe on Paragraph for World updates and insider perks.",
  cta: "Subscribe on Paragraph",
  success: "You are subscribed! World updates will arrive via Paragraph.",
  rateLimit: "Too many attempts. Please try again in 10 minutes.",
  error: "We could not confirm your subscription. Please try again or subscribe on Paragraph.",
  offline: "We could not confirm your subscription. Check your connection and try again, or subscribe on Paragraph.",
  emailLabel: "Your email",
  emailId: "world-newsletter-email",
  formId: "world-newsletter-form",
  consent: "I agree to receive DevFridge updates via Paragraph. Unsubscribe anytime.",
  pending: "Subscribing…",
  submit: "Subscribe by email",
  paragraph: "Prefer to subscribe on Paragraph? ↗",
  paragraphHref: paragraphSubscribe,
};

export type NewsletterCopy = typeof worldCopy;

export const pressTranscriptCopy: NewsletterCopy = {
  ...worldCopy,
  label: "Interview transcript newsletter",
  intro: "Subscribe to the newsletter.",
  cta: "Subscribe to the newsletter",
  success: "You are subscribed. The transcript will be sent to all subscribers as an exclusive preview, before it is published on press.devfridge.cool.",
  emailId: "press-newsletter-email",
  formId: "press-newsletter-form",
};

export default function NewsletterSignup({ copy = worldCopy }: { copy?: NewsletterCopy }) {
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
        setMessage(response.status === 429 ? copy.rateLimit : copy.error);
        return;
      }
      form.reset();
      setStatus("success");
      setMessage(copy.success);
    } catch {
      setStatus("error");
      setMessage(copy.offline);
    } finally {
      submitting.current = false;
    }
  }

  return (
    <aside className={styles.launchNewsletter} aria-label={copy.label}>
      <p>{copy.intro}</p>
      {!expanded ? (
        <button type="button" aria-expanded={false} aria-controls={copy.formId} onClick={() => setExpanded(true)}>{copy.cta}</button>
      ) : status === "success" ? (
        <p role="status">{message}</p>
      ) : (
        <form id={copy.formId} className={styles.newsletterForm} onSubmit={subscribe} aria-busy={status === "pending"}>
          <label htmlFor={copy.emailId}>{copy.emailLabel}</label>
          <input id={copy.emailId} name="email" type="email" autoComplete="email" inputMode="email" maxLength={254} placeholder="you@example.com" required autoFocus disabled={status === "pending"} />
          <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <label className={styles.newsletterConsent}><input name="consent" type="checkbox" required disabled={status === "pending"} />{copy.consent}</label>
          <button type="submit" disabled={status === "pending"}>{status === "pending" ? copy.pending : copy.submit}</button>
          {status === "error" && <p role="alert">{message}</p>}
          <a href={copy.paragraphHref} target="_blank" rel="noopener noreferrer">{copy.paragraph}</a>
        </form>
      )}
    </aside>
  );
}
