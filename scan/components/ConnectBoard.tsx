"use client";

import { useState } from "react";
import {
  CONNECT_ORIGIN,
  OFFICIAL_CHAIN,
  OFFICIAL_SITES,
  OFFICIAL_SOCIAL,
  type OfficialLink,
} from "@/lib/contacts";

export default function ConnectBoard() {
  return (
    <div className="grid gap-5">
      <section className="ice-card border-caution/50 p-6">
        <p className="text-[10px] font-bold tracking-[0.22em] text-caution">OFFICIAL DOOR ONLY</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Meet us here. Nowhere else.</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink">
          <strong>connect.devfridge.cool</strong> is the only official meeting point for DevFridge
          and $PASTA. Do not use any other site, Telegram, Discord, chat, handle, or DM that is not
          listed on this page.
        </p>
        <ul className="mt-4 grid gap-2 text-sm text-mute">
          <li>Nobody from DevFridge will DM you first.</li>
          <li>Nobody will ask for a seed, private key, or “wallet verification”.</li>
          <li>If a link is not on this page, it is not us — treat it as a scam.</li>
        </ul>
        <p className="mt-4 font-mono text-xs text-ice">{CONNECT_ORIGIN}</p>
      </section>

      <Group title="Official sites" items={OFFICIAL_SITES} />
      <Group title="Talk & listings" items={OFFICIAL_SOCIAL} />
      <Group title="On-chain" items={OFFICIAL_CHAIN} copyable />
    </div>
  );
}

function Group({
  title,
  items,
  copyable,
}: {
  title: string;
  items: OfficialLink[];
  copyable?: boolean;
}) {
  return (
    <section className="ice-card p-5">
      <p className="text-[10px] font-bold tracking-[0.2em] text-ice">{title.toUpperCase()}</p>
      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <Row key={item.href} item={item} copyable={copyable} />
        ))}
      </div>
    </section>
  );
}

function Row({ item, copyable }: { item: OfficialLink; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-navy/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold">{item.label}</p>
        <p className="truncate font-mono text-xs text-mute">{item.hint}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {copyable && item.copy && (
          <button
            type="button"
            className="fridge-key"
            onClick={() => {
              void navigator.clipboard.writeText(item.copy || "").then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1400);
              });
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
        <a className="fridge-key fridge-key-primary" href={item.href} target="_blank" rel="noreferrer">
          Open
        </a>
      </div>
    </div>
  );
}
