import type { Metadata } from "next";
import BridgeBoard from "@/components/BridgeBoard";
import { TMC_ROUTE } from "@/lib/bridge";

export const metadata: Metadata = {
  title: { absolute: "DevFridge Bridge — canonical cross-chain token routes" },
  description:
    "Canonical LayerZero OFT routes between Robinhood Chain and Solana, protected by rate limits, published governance and emergency pause.",
  alternates: { canonical: "https://bridge.devfridge.cool" },
  openGraph: {
    type: "website",
    url: "https://bridge.devfridge.cool",
    title: "DevFridge Bridge",
    description: "Canonical token routes with rate limits, published governance and emergency pause.",
    images: [{ url: "https://devfridge.cool/brand/logo-lockup.jpg" }],
  },
};

export default function BridgePage() {
  return <BridgeBoard route={TMC_ROUTE} />;
}
