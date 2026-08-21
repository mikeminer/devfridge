import type { Metadata } from "next";
import WorldApp from "@/components/world/WorldApp";

export const metadata: Metadata = {
  title: "world.devfridge.cool — Fridge metaverse",
  description:
    "A shooter inside the Fridge. Your faction is the Token-2022 you locked with the highest USD value. You cannot kill your own mint.",
};

export default function WorldPage() {
  return <WorldApp />;
}
