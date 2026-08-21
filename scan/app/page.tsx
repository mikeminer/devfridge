import { redirect } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import PastaWidget from "@/components/PastaWidget";
import Feeds from "@/components/Feeds";
import BoostSubscribe from "@/components/BoostSubscribe";
import { parseMint } from "@/lib/format";

export default function HomePage({
  searchParams,
}: {
  searchParams?: { mint?: string };
}) {
  const q = parseMint(searchParams?.mint || "");
  if (q) redirect(`/t/${q}`);
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-14">
      <header className="mb-10 flex flex-col items-center text-center">
        <a href="/" className="mb-5">
          <img
            src="https://devfridge.cool/brand/logo-mark.jpg"
            alt="DevFridge"
            className="h-14 w-14 rounded-2xl object-cover"
          />
        </a>
        <p className="text-xs font-bold tracking-[0.22em] text-ice">SCAN.DEVFRIDGE.COOL</p>
        <h1 className="mt-3 max-w-xl text-3xl font-bold sm:text-5xl">
          The only scanner that checks if a dev <span className="text-ice">fridged</span> supply.
        </h1>
        <p className="mt-3 max-w-lg text-sm text-mute">
          Paste any Solana mint. We score mint/freeze, liquidity, and the verifiable 🧊 DevFridge
          timelock. Boost SOL buys $PASTA on Jupiter and burns it for the full package time.
        </p>
      </header>

      <div className="mx-auto mb-6 max-w-3xl">
        <Feeds />
      </div>
      <SearchBar />
      <div className="mx-auto mt-6 max-w-2xl">
        <PastaWidget />
      </div>
      <div className="mx-auto mt-10 max-w-3xl">
        <BoostSubscribe />
      </div>
      <footer className="mt-16 text-center text-xs text-mute">
        <a className="text-ice hover:underline" href="https://devfridge.cool">
          devfridge.cool
        </a>
        {" · "}
        Too many tokens? Fridge them.
      </footer>
    </main>
  );
}
