import type { Metadata } from "next";
import ConnectBoard from "@/components/ConnectBoard";

export const metadata: Metadata = {
  metadataBase: new URL("https://connect.devfridge.cool"),
  applicationName: "DevFridge Connect",
  keywords: ["DevFridge", "Official contacts", "Brainrot", "Robinhood", "Pons", "Solana", "pump.fun", "Token-2022"],
  title: { absolute: "Official DevFridge contacts — connect.devfridge.cool" },
  description:
    "The only official meeting point for DevFridge and $PASTA. Do not trust any other contact.",
  alternates: { canonical: "https://connect.devfridge.cool" },
  openGraph: {
    type: "website",
    url: "https://connect.devfridge.cool",
    title: "Official DevFridge contacts",
    description: "Canonical public contacts for DevFridge, its scanner, repository, and community.",
    images: [{ url: "https://devfridge.cool/brand/logo-lockup.jpg" }],
    siteName: "DevFridge Connect",
  },
  twitter: {
    card: "summary_large_image",
    title: "Official DevFridge contacts",
    description: "Official DevFridge contacts, TMC on Robinhood, and the Brainrot token registry on Robinhood and Solana Token-2022.",
    images: ["https://devfridge.cool/brand/logo-lockup.jpg"],
  },
};

export default function ConnectPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <p className="mb-6 text-xs font-bold tracking-[0.22em] text-ice">CONNECT.DEVFRIDGE.COOL</p>
      <ConnectBoard />
      <footer className="mt-12 text-center text-xs text-mute">
        If it is not listed here, it is not official.
        {" · "}
        Too many tokens? Fridge them.
      </footer>
    </main>
  );
}
