import type { Metadata } from "next";
import ConnectBoard from "@/components/ConnectBoard";

export const metadata: Metadata = {
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
