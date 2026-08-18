import { useEffect, useState, type ReactNode } from "react";
import { PASTA_URL } from "../lib/constants";
import logoMark from "../assets/logo-mark.jpg";

/** Midnight at the start of 19 August 2026, Europe/Rome (CEST, UTC+2). */
export const COUNTDOWN_END_MS = Date.parse("2026-08-19T00:00:00+02:00");

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { days, hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds) };
}

export default function CountdownOverlay({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  if (now >= COUNTDOWN_END_MS) return <>{children}</>;

  const left = parts(COUNTDOWN_END_MS - now);

  return (
    <>
      <div className="countdown-veil" role="dialog" aria-modal="true" aria-label="DevFridge countdown">
        <div className="countdown-card">
          <img className="countdown-mark" src={logoMark} alt="DevFridge" />
          <p className="eyebrow">DevFridge</p>
          <h1>Too many tokens? Fridge them.</h1>
          <p className="lede">
            It opens by itself at midnight on 19 August 2026, Italian time.
          </p>
          <p className="countdown-live">
            Live appointment:{" "}
            <a href={PASTA_URL} target="_blank" rel="noreferrer">
              {PASTA_URL}
            </a>
          </p>
          <p className="countdown-credit">
            Developed for you by pappardelle.eth{" "}
            <span className="mono">GxPoKNX26GCisuH8Sdr8rtfZY98L5t5eegKtDzSA9P6W</span>{" "}
            with amore &lt;3
            <br />
            <a href="https://x.com/anonimocommando" target="_blank" rel="noreferrer">
              x.com/anonimocommando
            </a>
          </p>
          <div className="countdown-digits" aria-live="polite">
            {left.days > 0 && (
              <div>
                <strong>{String(left.days).padStart(2, "0")}</strong>
                <span>days</span>
              </div>
            )}
            <div>
              <strong>{left.hours}</strong>
              <span>hrs</span>
            </div>
            <div>
              <strong>{left.minutes}</strong>
              <span>min</span>
            </div>
            <div>
              <strong>{left.seconds}</strong>
              <span>sec</span>
            </div>
          </div>
        </div>
      </div>
      <div className="countdown-hidden" aria-hidden="true">
        {children}
      </div>
    </>
  );
}
