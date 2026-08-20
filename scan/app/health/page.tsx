import type { Metadata } from "next";
import HealthBoard from "@/components/HealthBoard";

export const metadata: Metadata = {
  title: "health.devfridge.cool — DevFridge status",
  description: "Live health of DevFridge, the scanner, Solana RPC, and $PASTA price feeds.",
};

export default function HealthPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <p className="mb-6 text-xs font-bold tracking-[0.22em] text-ice">HEALTH.DEVFRIDGE.COOL</p>
      <HealthBoard />
      <footer className="mt-12 text-center text-xs text-mute">
        <a className="text-ice hover:underline" href="https://devfridge.cool">
          devfridge.cool
        </a>
        {" · "}
        <a className="text-ice hover:underline" href="https://scan.devfridge.cool">
          scanner
        </a>
        {" · "}
        Too many tokens? Fridge them.
      </footer>
    </main>
  );
}
