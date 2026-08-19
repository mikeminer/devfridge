import { COOKER_DECIMALS } from "../lib/cooker";

export type CookedMint = {
  mint: string;
  name: string;
  symbol: string;
  signature: string;
};

type Props = {
  clusterLabel: string;
  connected: boolean;
  busy: boolean;
  error?: string;
  cooked: CookedMint | null;
  mintHref: (mint: string) => string;
  txHref: (signature: string) => string;
  onConnect: () => void;
  onCook: (fields: { name: string; symbol: string; supply: string }) => void;
  onUseInFridge: (mint: string) => void;
};

export default function Cooker(props: Props) {
  return (
    <section className={`cooker-stage ${props.busy ? "is-cooking" : ""}`} id="cooker">
      <div className="cooker">
        <div className="cooktop">
          <div className="grate" />
          <div className="burners">
            <span className="burner lit"><i /><i /><em /></span>
            <span className="burner"><i /><i /></span>
            <span className="burner"><i /><i /></span>
            <span className="burner"><i /><i /></span>
          </div>
          <div className="knob-rail">
            <span className="knob" />
            <span className="knob is-on" />
            <span className="knob" />
            <span className="knob" />
          </div>
        </div>

        <div className="range-body">
          <div className="range-steel" />
          <p className="range-brand">
            DEVFRIDGE RANGE
            <small>{props.clusterLabel} · Token-2022</small>
          </p>
          <p className="range-lede">
            Cook a meme mint, then put it in the Fridge. Test networks only.
          </p>

          <form
            className="oven"
            onSubmit={(e) => {
              e.preventDefault();
              if (!props.connected) {
                props.onConnect();
                return;
              }
              const data = new FormData(e.currentTarget);
              props.onCook({
                name: String(data.get("name") ?? ""),
                symbol: String(data.get("symbol") ?? ""),
                supply: String(data.get("supply") ?? ""),
              });
            }}
          >
            <div className="oven-glass">
              <label htmlFor="cooker-name">Name</label>
              <input
                id="cooker-name"
                name="name"
                type="text"
                maxLength={32}
                placeholder="FridgeCoin"
                autoComplete="off"
              />
              <div className="cooker-row">
                <div>
                  <label htmlFor="cooker-symbol">Ticker</label>
                  <input
                    id="cooker-symbol"
                    name="symbol"
                    type="text"
                    maxLength={10}
                    placeholder="FRDG"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label htmlFor="cooker-supply">Supply</label>
                  <input
                    id="cooker-supply"
                    name="supply"
                    type="text"
                    inputMode="decimal"
                    defaultValue="1000000000"
                    placeholder="1000000000"
                  />
                </div>
              </div>
              <p className="range-hint">{COOKER_DECIMALS} decimals · minted to your wallet</p>
              {props.error && <div className="banner bad">{props.error}</div>}
              {props.cooked && (
                <div className="cooked-plate">
                  <strong>
                    {props.cooked.symbol} · {props.cooked.name}
                  </strong>
                  <a
                    className="mono"
                    href={props.mintHref(props.cooked.mint)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {props.cooked.mint}
                  </a>
                  <div className="cooked-actions">
                    <a href={props.txHref(props.cooked.signature)} target="_blank" rel="noreferrer">
                      Receipt
                    </a>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => props.onUseInFridge(props.cooked!.mint)}
                    >
                      Use in fridge
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button className="cook-btn" type="submit" disabled={props.busy}>
              {props.busy
                ? "Cooking…"
                : props.connected
                  ? "Cook Token-2022"
                  : "Connect to cook"}
            </button>
          </form>
        </div>
        <div className="cooker-feet">
          <i />
          <i />
        </div>
      </div>
    </section>
  );
}
