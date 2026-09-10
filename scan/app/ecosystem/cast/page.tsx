import type { Metadata } from "next";
import IntegrityFooter from "@/components/ecosystem/IntegrityFooter";
import RegistryWall from "@/components/ecosystem/RegistryWall";
import WorldCountdown from "@/components/ecosystem/WorldCountdown";
import { ECO_ORIGIN } from "@/lib/ecosystem";
import styles from "@/components/ecosystem/ecosystem.module.css";

export const metadata: Metadata = {
  title: "Ten characters, twenty contracts",
  description:
    "Official DevFridge Italian brainrot cast on Solana Token-2022 and Robinhood Chain. Cultural tokens, not vault equity. $APE and $GMGN collide with unrelated tickers — match the full address.",
  alternates: { canonical: `${ECO_ORIGIN}/cast` },
};

export default function CastPage() {
  return (
    <div className={`${styles.shell} mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:py-12`}>
      <p className={styles.kicker}>CAST · TEN MEMES</p>
      <header>
        <h1 className="text-4xl font-bold sm:text-5xl">Cursed kitchen. Full addresses.</h1>
        <p className="mt-3 max-w-2xl text-mute">
          Ten original Italian brainrot characters, each with a Solana Token-2022 mint and a Robinhood
          Chain contract. Same ticker does not mean bridged or redeemable. $APE and $GMGN overlap
          unrelated names — the magnet is the CA.
        </p>
      </header>
      <WorldCountdown />
      <img
        src="https://world.devfridge.cool/world/brainrot-pose-banner-v1.png"
        alt="The ten DevFridge World characters posing together in front of the fridge"
        className="w-full rounded-3xl border border-line object-cover"
      />
      <RegistryWall kinds={["character"]} />
      <IntegrityFooter />
    </div>
  );
}
