import type { Metadata } from "next";
import BadgeGenerator from "@/components/BadgeGenerator";
import PastaWidget from "@/components/PastaWidget";
import { parseMint } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Embeddable Solana timelock badge",
  description:
    "Generate a free badge linked to a live DevFridge scan of a Solana Token-2022 timelock.",
  alternates: { canonical: "https://scan.devfridge.cool/badge" },
};

export default function BadgePage({
  searchParams,
}: {
  searchParams?: { mint?: string };
}) {
  const mint = parseMint(searchParams?.mint || "") || "";
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Embed a live Fridge badge</h1>
      <p className="mt-2 text-sm text-mute">
        Free, verifiable on-chain. The badge shows the token ticker and opens a live scan of
        that mint on scan.devfridge.cool in a new tab.
      </p>
      <div className="mt-6">
        <BadgeGenerator initialMint={mint} />
      </div>
      <p className="mt-4 text-xs text-mute">
        A badge confirms only the displayed on-chain lock state. It is not a security audit or token endorsement.
      </p>
      <div className="mt-6">
        <PastaWidget />
      </div>
    </main>
  );
}
