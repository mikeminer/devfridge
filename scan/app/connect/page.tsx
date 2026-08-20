import type { Metadata } from "next";
import ConnectBoard from "@/components/ConnectBoard";

export const metadata: Metadata = {
  title: "connect.devfridge.cool — Official DevFridge contacts",
  description:
    "The only official meeting point for DevFridge and $PASTA. Do not trust any other contact.",
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
