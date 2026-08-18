import type { MintInfo } from "../lib/fridge";
import { formatAmount, shortKey } from "../lib/fridge";
import TokenLogo from "./TokenLogo";

const PRESETS: { label: string; seconds: number }[] = [
  { label: "1h", seconds: 3600 },
  { label: "1d", seconds: 86400 },
  { label: "7d", seconds: 86400 * 7 },
  { label: "30d", seconds: 86400 * 30 },
  { label: "90d", seconds: 86400 * 90 },
  { label: "1y", seconds: 86400 * 365 },
];

type Props = {
  connected: boolean;
  mintInput: string;
  onMintInput: (v: string) => void;
  onLookup: () => void;
  mintInfo: (MintInfo & { image?: string | null }) | null;
  mintError: string;
  amount: string;
  onAmount: (v: string) => void;
  unlockLocal: string;
  onUnlockLocal: (v: string) => void;
  onPreset: (seconds: number) => void;
  busy: boolean;
  onCreate: () => void;
};

export default function StockPanel(props: Props) {
  const { mintInfo } = props;
  return (
    <section className="stock-panel">
      <header>
        <p className="eyebrow">Stock DevFridge</p>
        <h2>Too many tokens? Fridge them.</h2>
        <p className="lede">
          Paste a mint, set how long it stays frozen, and put it on a shelf. Redeeming
          takes a 2% fee that automatically buys and burns $PASTA.
        </p>
      </header>

      {!props.connected && (
        <p className="hint">Connect Phantom to start stocking.</p>
      )}

      <label htmlFor="mint">Mint address</label>
      <div className="row">
        <input
          id="mint"
          type="text"
          placeholder="Token-2022 mint"
          value={props.mintInput}
          onChange={(e) => props.onMintInput(e.target.value)}
        />
        <button className="ghost" type="button" onClick={props.onLookup}>
          Lookup
        </button>
      </div>
      {props.mintError && <div className="banner bad">{props.mintError}</div>}

      {mintInfo && (
        <div className="mint-card">
          <div className="mint-logo" style={{ background: "#163039" }}>
            <TokenLogo src={mintInfo.image} symbol={mintInfo.symbol} />
          </div>
          <div>
            <div className="symbol">
              {mintInfo.symbol} · {mintInfo.name}
            </div>
            <div className="mono muted">{shortKey(mintInfo.mint)}</div>
          </div>
          <div className="mint-bal">
            <div>{formatAmount(mintInfo.balance, mintInfo.decimals)}</div>
            <div className="muted">in wallet</div>
          </div>
        </div>
      )}

      {mintInfo?.transferHook && (
        <div className="banner warn">
          Transfer hook detected. Extra accounts are attached; some hooks may still reject.
        </div>
      )}

      <label htmlFor="amount">Amount</label>
      <div className="row">
        <input
          id="amount"
          type="text"
          inputMode="decimal"
          placeholder="0.0"
          value={props.amount}
          onChange={(e) => props.onAmount(e.target.value)}
        />
        <button
          className="max"
          type="button"
          disabled={!mintInfo}
          onClick={() =>
            mintInfo && props.onAmount(formatAmount(mintInfo.balance, mintInfo.decimals))
          }
        >
          Max
        </button>
      </div>

      <label htmlFor="unlock">Unlock</label>
      <div className="presets">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => props.onPreset(p.seconds)}>
            {p.label}
          </button>
        ))}
      </div>
      <input
        id="unlock"
        type="datetime-local"
        value={props.unlockLocal}
        onChange={(e) => props.onUnlockLocal(e.target.value)}
      />

      <button
        className="primary"
        type="button"
        disabled={props.busy || !props.connected || !mintInfo || mintInfo.nonTransferable}
        onClick={props.onCreate}
      >
        {props.busy ? "Waiting for Phantom…" : "Put in the fridge"}
      </button>
    </section>
  );
}
