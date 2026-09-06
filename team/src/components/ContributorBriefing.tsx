import { useEffect, useRef, useState } from "react";
import { PASTA_MINT } from "../config/constants";

const PASTA_MODEL_URL = "https://pasta.devfridge.cool";
const VAULT_URL = "https://capital.devfridge.cool/vault";
const TOKEN_URL = `https://solscan.io/token/${PASTA_MINT}`;
const CHART_URL = "https://dexscreener.com/solana/5o5JBdWZd3zKE3JC8Tb81D3bph7bwxftvwLLRoZ1EqL5";

export function ContributorBriefing() {
  const [open, setOpen] = useState(true);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="contributor-briefing-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <section
        className="contributor-briefing"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contributor-briefing-title"
        aria-describedby="contributor-briefing-summary"
      >
        <div className="contributor-briefing-topline">
          <p>BEFORE YOU JOIN THE KITCHEN</p>
          <button
            ref={closeButtonRef}
            className="contributor-briefing-close"
            type="button"
            aria-label="Close contributor briefing"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>

        <h2 id="contributor-briefing-title">DevFridge is ownership, not employment.</h2>
        <p id="contributor-briefing-summary" className="contributor-briefing-lead">
          DevFridge does not hire or pay marketers. There is no salary and no per-campaign fee.
          Nobody gets paid to promote $PASTA — not you, not us.
        </p>

        <div className="contributor-briefing-copy">
          <p>
            The model is <strong>skin in the game</strong>. Contributors — our chefs — buy $PASTA
            and time-lock it on-chain in the DevFridge dapp. That public, verifiable commitment is
            what gives you a role in the ecosystem.
          </p>
          <p>
            Your upside follows the same conditions as everyone else&apos;s: you help grow something
            you own a piece of. If the products gain adoption and the ecosystem grows, your locked
            position may benefit. If they do not, it may not. Returns are never guaranteed, and the
            token can lose value.
          </p>
          <p>
            The team follows the same rule. We do not pay ourselves. We fund our own $PASTA
            accumulation from the Trust Me Capital vault on Hyperliquid, where the trading algorithm
            runs live. Fills, NAV and drawdown are published: when the book prints, we buy; when it
            does not, we do not.
          </p>
        </div>

        <div className="contributor-briefing-reading" aria-label="Required reading">
          <p>Read before deciding</p>
          <a href={PASTA_MODEL_URL} target="_blank" rel="noopener noreferrer">
            <span>$PASTA model</span>
            <small>Timelocks, utility and risk</small>
          </a>
          <a href={VAULT_URL} target="_blank" rel="noopener noreferrer">
            <span>Trust Me Capital vault</span>
            <small>Live record and methodology</small>
          </a>
        </div>

        <p className="contributor-briefing-question">
          Are you willing to buy and lock $PASTA, then build alongside us as an owner? If yes,
          welcome. If you are looking for a paid marketing gig, this is not it.
        </p>

        <div className="contributor-briefing-market">
          <span>Official $PASTA token</span>
          <a href={TOKEN_URL} target="_blank" rel="noopener noreferrer" title={PASTA_MINT}>
            {PASTA_MINT}
          </a>
          <a href={CHART_URL} target="_blank" rel="noopener noreferrer">
            View live chart ↗
          </a>
        </div>

        <button className="btn btn-primary contributor-briefing-accept" type="button" onClick={() => setOpen(false)}>
          I understand — enter Team
        </button>
      </section>
    </div>
  );
}
