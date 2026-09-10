"use client";

import { useState } from "react";
import { ROBINHOOD_TOKENS, SOLANA_TOKENS, type OfficialToken } from "@/lib/official-tokens";

const TOPSHELF_ADDRESS = "0xc1DB49694E0DB50778c333350C8A553fDE221989";
const TOPSHELF_EXPLORER = `https://robinhoodchain.blockscout.com/address/${TOPSHELF_ADDRESS}`;

function ProtocolContract() {
  const [status, setStatus] = useState("");
  return <article className="rounded-xl border border-caution/50 bg-navy/50 p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h4 className="font-semibold">TopShelf</h4><span className="text-xs font-bold text-caution">WORLD SCORE CONTRACT</span></div>
    <p className="mt-2 text-xs text-mute">Robinhood Chain · Mainnet 4663 · DevFridge World verified scores, seasonal rankings and claims.</p>
    <code className="mt-3 block break-all text-xs leading-relaxed text-ink">{TOPSHELF_ADDRESS}</code>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" className="fridge-key" aria-label="Copy TopShelf contract address" onClick={async () => {
        try { await navigator.clipboard.writeText(TOPSHELF_ADDRESS); setStatus("Address copied"); }
        catch { setStatus("Copy unavailable. Select the address above to copy it."); }
      }}>Copy address</button>
      <a className="fridge-key fridge-key-primary" href={TOPSHELF_EXPLORER} target="_blank" rel="noopener noreferrer">Blockscout ↗</a>
      <span role="status" className="text-xs text-mute">{status}</span>
    </div>
  </article>;
}

function TokenRow({ token, network }: { token: OfficialToken; network: "Robinhood" | "Solana" }) {
  const [status, setStatus] = useState("");
  const explorer = network === "Robinhood" ? "https://robinhoodchain.blockscout.com/token/" : "https://solscan.io/token/";
  const market = network === "Robinhood" ? "https://www.ponsfamily.com/launchpad/" : "https://pump.fun/coin/";
  return <li className="rounded-xl border border-line bg-navy/50 p-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h4 className="font-semibold">{token.name}</h4><span className="text-xs font-bold text-ice">${token.symbol}</span></div>
    {token.note && <p className="mt-2 text-xs text-caution">{token.note}</p>}
    <code className="mt-3 block break-all text-xs leading-relaxed text-ink">{token.address}</code>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" className="fridge-key" aria-label={`Copy ${token.symbol} ${network} contract address`} onClick={async () => {
        try { await navigator.clipboard.writeText(token.address); setStatus("Address copied"); }
        catch { setStatus("Copy unavailable. Select the address above to copy it."); }
      }}>Copy CA</button>
      <a className="fridge-key" href={explorer + token.address} target="_blank" rel="noopener noreferrer">Explorer ↗</a>
      <a className="fridge-key fridge-key-primary" href={market + token.address} target="_blank" rel="noopener noreferrer">{network === "Robinhood" ? "Pons" : "pump.fun"} ↗</a>
      <span role="status" className="text-xs text-mute">{status}</span>
    </div>
  </li>;
}

export default function OfficialTokens() {
  return <section id="approved-contracts" className="ice-card border-ice/50 p-5 sm:p-6" aria-labelledby="approved-contracts-title">
    <p className="text-[10px] font-bold tracking-[0.22em] text-ice">DEVFRIDGE OFFICIAL TOKEN REGISTRY</p>
    <h2 id="approved-contracts-title" className="mt-2 text-2xl font-bold">Approved contract addresses</h2>
    <p className="mt-3 text-sm leading-relaxed text-mute">The TopShelf game contract and the official DevFridge tokens are listed below. The ten Brainrot character tokens are deployed on Robinhood / Pons and Solana / pump.fun. All Solana character mints use Token-2022. Approval here identifies the DevFridge ecosystem; it is not approval by either network. Match both the network and the complete address.</p>
    <nav aria-label="Contract networks" className="my-5 flex flex-wrap gap-2"><a className="fridge-key" href="#world-contracts">World protocol · 1</a><a className="fridge-key" href="#robinhood-contracts">Robinhood tokens · {ROBINHOOD_TOKENS.length}</a><a className="fridge-key" href="#solana-contracts">Solana tokens · {SOLANA_TOKENS.length}</a></nav>
    <div id="world-contracts" className="mt-7 scroll-mt-6">
      <h3 className="mb-3 text-lg font-bold">DevFridge World · Robinhood Chain</h3>
      <ProtocolContract />
    </div>
    <div id="robinhood-contracts" className="mt-7 scroll-mt-6">
      <h3 className="mb-3 text-lg font-bold">Robinhood Chain · Mainnet 4663 <span className="text-sm font-normal text-mute">({ROBINHOOD_TOKENS.length})</span></h3>
      <ul className="grid gap-3" aria-label="Robinhood approved token addresses">{ROBINHOOD_TOKENS.map(token => <TokenRow key={token.address} token={token} network="Robinhood" />)}</ul>
    </div>
    <div id="solana-contracts" className="mt-7 scroll-mt-6">
      <h3 className="mb-3 text-lg font-bold">Solana · Mainnet · Token-2022 <span className="text-sm font-normal text-mute">({SOLANA_TOKENS.length})</span></h3>
      <ul className="grid gap-3" aria-label="Solana approved token addresses">{SOLANA_TOKENS.map(token => <TokenRow key={token.address} token={token} network="Solana" />)}</ul>
    </div>
  </section>;
}
