import type { Metadata } from "next";
import TreasuryCrank from "@/components/TreasuryCrank";

export const metadata: Metadata = {
  title: "Treasury crank",
  robots: { index: false, follow: false },
};

export default function CrankPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16">
      <TreasuryCrank />
    </main>
  );
}
