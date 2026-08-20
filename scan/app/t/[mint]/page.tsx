import SearchBar from "@/components/SearchBar";
import PastaWidget from "@/components/PastaWidget";
import TrustReportView from "@/components/TrustReport";
import { scanMint } from "@/lib/scan";
import { addRecent } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function TokenPage({ params }: { params: { mint: string } }) {
  const mint = decodeURIComponent(params.mint);
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
          <TrustReportView report={report} />
        ) : null}
      </div>
    </main>
  );
}
