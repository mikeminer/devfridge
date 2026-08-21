import type { Metadata } from "next";
import ComingSoon from "@/components/world/ComingSoon";

export const metadata: Metadata = {
  title: "world.devfridge.cool — Coming soon",
  description:
    "The Fridge metaverse opens 31 August 2026. Pastalovers vs The Shelf.",
};

export default function WorldPage() {
  return <ComingSoon />;
}
