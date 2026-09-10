"use client";

import {
  ASSETS,
  blockscoutToken,
  logoForMint,
  ponsUrl,
  pumpUrl,
  solscanToken,
  type EcoAsset,
} from "@/lib/ecosystem";
import CopyButton from "./CopyButton";
import styles from "./ecosystem.module.css";

export default function RegistryWall({
  chain,
  kinds,
}: {
  chain?: "solana" | "robinhood";
  kinds?: EcoAsset["kind"][];
}) {
  const rows = ASSETS.filter((a) => {
    if (kinds && !kinds.includes(a.kind)) return false;
    if (chain === "solana") return Boolean(a.solana);
    if (chain === "robinhood") return Boolean(a.robinhood);
    return true;
  });
  return (
    <div className={styles.magnets}>
      {rows.map((asset) => (
        <article key={asset.id} id={asset.id} className={styles.magnet}>
          <div className={styles.magnetHead}>
            {asset.solana ? (
              <img src={logoForMint(asset.solana)} alt="" />
            ) : (
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-navy text-ice">$</div>
            )}
            <div>
              <h3 className="font-bold">{asset.name}</h3>
              <p className="text-sm text-mute">{asset.chant}</p>
              {asset.collision && (
                <span className={styles.stripe}>Ticker collision — match the full CA</span>
              )}
            </div>
          </div>
          {asset.cultural && (
            <p className="text-xs text-mute">Cultural token. Not vault equity. Not a return.</p>
          )}
          {asset.solana && (!chain || chain === "solana") && (
            <ChainRow
              network="Solana · Token-2022"
              symbol={asset.solanaSymbol}
              address={asset.solana}
              market={pumpUrl(asset.solana)}
              explorer={solscanToken(asset.solana)}
              marketLabel="pump.fun"
            />
          )}
          {asset.robinhood && (!chain || chain === "robinhood") && (
            <ChainRow
              network="Robinhood Chain · 4663"
              symbol={asset.rhSymbol}
              address={asset.robinhood}
              market={ponsUrl(asset.robinhood)}
              explorer={blockscoutToken(asset.robinhood)}
              marketLabel="Pons"
            />
          )}
        </article>
      ))}
    </div>
  );
}

function ChainRow({
  network,
  symbol,
  address,
  market,
  explorer,
  marketLabel,
}: {
  network: string;
  symbol: string;
  address: string;
  market: string;
  explorer: string;
  marketLabel: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-navy/60 p-3">
      <p className="text-[10px] font-bold tracking-[0.16em] text-ice">
        {network} · ${symbol}
      </p>
      <p className={styles.mono}>{address}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <CopyButton value={address} />
        <a className="fridge-key" href={explorer} target="_blank" rel="noreferrer">
          Explorer
        </a>
        <a className="fridge-key" href={market} target="_blank" rel="noreferrer">
          {marketLabel}
        </a>
      </div>
    </div>
  );
}
