import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import PastaWidget from "@/components/PastaWidget";
import Feeds from "@/components/Feeds";
import BoostSubscribe from "@/components/BoostSubscribe";
import { parseMint } from "@/lib/format";

export const metadata: Metadata = {
  title: "Solana token risk scanner",
  description:
    "Check Solana mint and freeze authorities, holder concentration, market signals, and live DevFridge Token-2022 timelocks.",
  alternates: { canonical: "https://scan.devfridge.cool" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "DevFridge Scan",
      url: "https://scan.devfridge.cool",
      description:
        "Solana token risk scanner for authorities, holder concentration, market signals, and live on-chain timelocks.",
      publisher: { "@type": "Organization", name: "DevFridge", url: "https://devfridge.cool" },
    },
    {
      "@type": "SoftwareApplication",
      name: "DevFridge Scan",
      applicationCategory: "SecurityApplication",
      operatingSystem: "Web",
      url: "https://scan.devfridge.cool",
      isAccessibleForFree: true,
      description:
        "Analyze Solana token authorities, holder concentration, market signals, and live DevFridge Token-2022 timelocks.",
      codeRepository: "https://github.com/mikeminer/devfridge",
    },
  ],
};

export default function HomePage({
  searchParams,
}: {
  searchParams?: { mint?: string };
}) {
  const q = parseMint(searchParams?.mint || "");
  if (q) redirect(`/t/${q}`);
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
          Solana token risk signals, with verifiable <span className="text-ice">timelocks</span>.
        </h1>
        <p className="mt-3 max-w-lg text-sm text-mute">
          Paste any Solana mint to inspect authorities, holder concentration, market data, and live
          DevFridge Token-2022 locks. Results are on-chain signals, not a safety guarantee.
        </p>
      </header>

      <SearchBar />

      <section className="mx-auto mt-6 max-w-3xl rounded-xl border border-ice/30 bg-ice/5 p-4 text-sm">
        <p className="font-semibold text-ice">Independent risk results</p>
        <p className="mt-1 text-mute">
          Paid placements never change a token&apos;s checks or risk grade. See the{" "}
          <a className="text-ice hover:underline" href="https://docs.devfridge.cool/methodology">
            public methodology
          </a>{" "}
          and{" "}
          <a className="text-ice hover:underline" href="https://docs.devfridge.cool/security">
            security status
          </a>
          .
        </p>
      </section>

      <div className="mx-auto mt-8 max-w-3xl">
        <Feeds />
      </div>
      <div className="mx-auto mt-10 max-w-3xl">
        <BoostSubscribe />
      </div>
      <div className="mx-auto mt-6 max-w-2xl">
        <PastaWidget />
      </div>
      <footer className="mt-16 text-center text-xs text-mute">
        <a className="text-ice hover:underline" href="https://devfridge.cool">
          devfridge.cool
        </a>
        {" · "}
        <a className="text-ice hover:underline" href="https://docs.devfridge.cool">
          docs
        </a>
        {" · "}
        Too many tokens? Fridge them.
      </footer>
    </main>
  );
}
