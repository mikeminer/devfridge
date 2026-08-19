import { formatAmount } from "../lib/fridge";
import {
  frostHue,
  remainingLabel,
  type DecoratedLock,
} from "../lib/tokenMeta";
import TokenLogo from "./TokenLogo";

type Props = {
  open: boolean;
  onToggle: () => void;
  locks: DecoratedLock[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  now: number;
  loading?: boolean;
  serial: string;
  serialLabel: string;
  serialHref: string;
};

const SHELF_COUNT = 4;
const PER_SHELF = 3;

export default function Fridge({
  open,
  onToggle,
  locks,
  selected,
  onSelect,
  now,
  loading,
  serial,
  serialLabel,
  serialHref,
}: Props) {
  const shelves = Array.from({ length: SHELF_COUNT }, (_, i) =>
    locks.slice(i * PER_SHELF, i * PER_SHELF + PER_SHELF)
  );
  const overflow = locks.slice(SHELF_COUNT * PER_SHELF);

  return (
    <div className={`fridge-stage ${open ? "is-open" : "is-closed"}`}>
      <div className="fridge-glow" />
      <div className="fridge">
        <div className="fridge-body">
          <div className="fridge-steel top" />
          <div className="interior" aria-hidden={!open}>
            <div className="cavity-light" />
            <div className="frost-mist" />
            <div className="cavity">
              {loading ? (
                <div className="frost-loading" role="status" aria-live="polite">
                  <Snowflake />
                  <span>Chilling {serialLabel}…</span>
                </div>
              ) : (
                shelves.map((items, index) => (
                <div className="shelf" key={index}>
                  <div className="shelf-glass" />
                  <div className="shelf-row">
                    {items.length === 0 ? (
                      <div className="shelf-empty">
                        {index === 1 && locks.length === 0 ? "Nothing locked" : ""}
                      </div>
                    ) : (
                      items.map((lock, slot) => (
                        <TokenJar
                          key={lock.address.toBase58()}
                          lock={lock}
                          now={now}
                          selected={selected === lock.address.toBase58()}
                          delay={index * 80 + slot * 60}
                          onSelect={() =>
                            onSelect(
                              selected === lock.address.toBase58()
                                ? null
                                : lock.address.toBase58()
                            )
                          }
                        />
                      ))
                    )}
                  </div>
                </div>
              ))
              )}
              {overflow.length > 0 && (
                <div className="crisper">
                  {overflow.map((lock) => (
                    <TokenJar
                      key={lock.address.toBase58()}
                      lock={lock}
                      now={now}
                      compact
                      selected={selected === lock.address.toBase58()}
                      delay={240}
                      onSelect={() => onSelect(lock.address.toBase58())}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="door">
            <div className="door-face front">
              <button
                type="button"
                className="door-toggle"
                onClick={onToggle}
                tabIndex={open ? -1 : 0}
                aria-hidden={open}
                aria-expanded={open}
                aria-label={open ? "Close DevFridge" : "Open DevFridge"}
              >
                <div className="door-shine" />
                <div className="brand-plate">
                  <span>DEVFRIDGE</span>
                  <small>TOO MANY TOKENS?</small>
                </div>
                <div className="led">
                  <em>{loading ? "··" : locks.length.toString().padStart(2, "0")}</em>
                  <span>{loading ? "scan" : "chilled"}</span>
                </div>
                <div className="handle">
                  <i />
                </div>
                <div className="dispense" />
                <div className="note">open me</div>
              </button>
              <a
                className="serial-plate"
                href={serialHref}
                target="_blank"
                rel="noreferrer"
                title={`Open ${serialLabel} program on Solscan`}
                onClick={(e) => e.stopPropagation()}
              >
                <span>S/N {serialLabel}</span>
                <strong className="mono">{serial}</strong>
              </a>
            </div>
            <div className="door-face back">
              <button
                type="button"
                className="door-toggle"
                onClick={onToggle}
                tabIndex={open ? 0 : -1}
                aria-hidden={!open}
                aria-expanded={open}
                aria-label={open ? "Close DevFridge" : "Open DevFridge"}
              >
                <div className="door-bin">
                  <span>Keep frozen</span>
                  <span>until unlock</span>
                </div>
              </button>
            </div>
          </div>
          <div className="fridge-steel bottom" />
        </div>
        <div className="fridge-feet">
          <i />
          <i />
        </div>
      </div>
      <div className="floor-shadow" />
    </div>
  );
}

function Snowflake() {
  return (
    <svg className="snowflake" viewBox="0 0 64 64" aria-hidden="true">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M32 6v52M8.8 19l46.4 26M8.8 45l46.4-26" />
        <path d="M32 14l-5-5M32 14l5-5M32 50l-5 5M32 50l5 5" />
        <path d="M16.2 23.2l-7 .4M16.2 23.2l2.8-6.4M47.8 40.8l7-.4M47.8 40.8l-2.8 6.4" />
        <path d="M16.2 40.8l-7-.4M16.2 40.8l2.8 6.4M47.8 23.2l7 .4M47.8 23.2l-2.8-6.4" />
      </g>
    </svg>
  );
}

function TokenJar({
  lock,
  now,
  selected,
  onSelect,
  delay,
  compact,
}: {
  lock: DecoratedLock;
  now: number;
  selected: boolean;
  onSelect: () => void;
  delay: number;
  compact?: boolean;
}) {
  const ready = now >= lock.unlockAt;
  return (
    <button
      type="button"
      className={`jar ${ready ? "ready" : "frozen"} ${selected ? "selected" : ""} ${compact ? "compact" : ""}`}
      style={{ animationDelay: `${delay}ms`, ["--hue" as string]: frostHue(lock.mint.toBase58()) }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <span className="jar-glass">
        <TokenLogo src={lock.image} symbol={lock.symbol} />
        <span className="jar-frost" />
      </span>
      <span className="jar-meta">
        <strong>{lock.symbol}</strong>
        <small>{formatAmount(lock.amount, lock.decimals)}</small>
        <em>{remainingLabel(lock.unlockAt, now)}</em>
      </span>
    </button>
  );
}
