import type { Metadata } from "next";
import ComingSoon from "@/components/world/ComingSoon";

export const metadata: Metadata = {
  title: "The Meme World — Opening 1 October 2026",
  description:
    "Nine original Italian Brainrot characters enter the DevFridge universe on 1 October 2026.",
};

export default function WorldPage() {
  return <ComingSoon />;
}
