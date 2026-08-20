import BadgeGenerator from "@/components/BadgeGenerator";
import PastaWidget from "@/components/PastaWidget";
import { isMintAddress } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function BadgePage({
  searchParams,
}: {
  searchParams?: { mint?: string };
}) {
  const mint = searchParams?.mint && isMintAddress(searchParams.mint) ? searchParams.mint : "";
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Embed a live Fridge badge</h1>
      <p className="mt-2 text-sm text-mute">
        Free, verifiable on-chain. Drop an image tag on your site, Linktree, docs, or Telegram.
      </p>
      <div className="mt-6">
        <PastaWidget />
      </div>
      <div className="mt-6">
        <BadgeGenerator initialMint={mint} />
      </div>
    </main>
  );
}
