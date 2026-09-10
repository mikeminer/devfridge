import type { Metadata } from "next";
import JsonLd from "@/components/ecosystem/JsonLd";
import { ECO_ORIGIN } from "@/lib/ecosystem";

export const metadata: Metadata = {
  metadataBase: new URL(ECO_ORIGIN),
  title: {
    default: "DevFridge ecosystem — the kitchen map",
    template: "%s · DevFridge ecosystem",
  },
  description:
    "How DevFridge products connect on Solana and Robinhood Chain. Fridge locks, Scanner, $PASTA burns, Trust Me Capital, ten character tokens. Ticker ≠ identity.",
  alternates: { canonical: ECO_ORIGIN },
  openGraph: {
    type: "website",
    url: ECO_ORIGIN,
    siteName: "DevFridge ecosystem",
    title: "DevFridge ecosystem — the kitchen, not the logo cloud",
    description:
      "Two networks. Separate assets. Live evidence with timestamps. Official contacts only on connect.devfridge.cool.",
    images: [{ url: "https://devfridge.cool/brand/logo-lockup.jpg", width: 1200, height: 630, alt: "DevFridge" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DevFridge ecosystem",
    description: "The kitchen map of Fridge, Scan, $PASTA, Trust Me Capital, and the ten-character cast.",
    images: ["https://devfridge.cool/brand/logo-lockup.jpg"],
  },
  robots: { index: true, follow: true },
};

export default function EcosystemLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd />
      {children}
    </>
  );
}
