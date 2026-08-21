import { unstable_noStore as noStore } from "next/cache";
import type { Metadata } from "next";
import SearchBar from "@/components/SearchBar";
import PastaWidget from "@/components/PastaWidget";
import TrustReportView from "@/components/TrustReport";
import RememberScan from "@/components/RememberScan";
import { scanMint } from "@/lib/scan";
import { addRecent } from "@/lib/store";
import { parseMint } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export function generateMetadata({ params }: { params: { mint: string } }): Metadata {
  const mint = parseMint(decodeURIComponent(params.mint)) || decodeURIComponent(params.mint);
  return {
    title: `Live scan · ${mint.slice(0, 4)}…${mint.slice(-4)}`,
    robots: { index: true },
  };
}

export default async function TokenPage({ params }: { params: { mint: string } }) {
  noStore();
  const mint = parseMint(decodeURIComponent(params.mint)) || decodeURIComponent(params.mint);
  let report = null;
  let error = "";
  try {
    report = await scanMint(mint);
    await addRecent({
      mint: report.mint,
      name: report.identity.name,
      symbol: report.identity.symbol,
      image: report.identity.image,
      fridged: report.fridge.status === "fridged",
      scannedAt: Date.now(),
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Scan failed";
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <SearchBar initial={mint} />
      <div className="mt-4">
        <PastaWidget />
      </div>
      <div className="mt-6">
        {error ? (
          <div className="ice-card p-5 text-caution">{error}</div>
        ) : report ? (
          <>
            <RememberScan
              token={{
                mint: report.mint,
                name: report.identity.name,
                symbol: report.identity.symbol,
                image: report.identity.image,
                fridged: report.fridge.status === "fridged",
                scannedAt: Date.now(),
              }}
            />
            <TrustReportView report={report} />
          </>
        ) : null}
      </div>
    </main>
  );
}
