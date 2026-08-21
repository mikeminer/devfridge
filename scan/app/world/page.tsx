import type { Metadata } from "next";
import WorldApp from "@/components/world/WorldApp";

export const metadata: Metadata = {
  title: "world.devfridge.cool — Fridge metaverse",
  description:
    "A shooter inside the Fridge. Pastalovers lock $PASTA. The Shelf locks any other token. Teammates cannot kill each other.",
};

export default function WorldPage() {
  return <WorldApp />;
}
