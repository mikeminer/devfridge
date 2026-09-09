import type { Metadata } from "next";
import ComingSoon from "@/components/world/ComingSoon";

export const metadata: Metadata = {
  metadataBase: new URL("https://world.devfridge.cool"),
  title: { absolute: "DevFridge World — The Italian Brainrot Game" },
  description:
    "Ten Italian brainrot characters. One chaotic kitchen. Merge your memes, fill the fridge and share your best score. Opening 1 October 2026.",
  applicationName: "DevFridge World",
  keywords: ["DevFridge World", "Italian Brainrot", "Cold Storage", "Meme Game", "Merge Game", "Kitchen Game"],
  category: "games",
  alternates: { canonical: "https://world.devfridge.cool/" },
  openGraph: {
    type: "website",
    url: "https://world.devfridge.cool/",
    siteName: "DevFridge World",
    title: "DevFridge World — The Italian Brainrot Game",
    description: "Ten Italian brainrot characters. One chaotic kitchen. Merge your memes, fill the fridge and share your best score. Opening 1 October 2026.",
    images: [{ url: "https://world.devfridge.cool/world/brainrot-pose-banner-v1.png", width: 1729, height: 910, type: "image/png", alt: "The ten DevFridge brainrot characters posing together in front of the fridge" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DevFridge World — The Italian Brainrot Game",
    description: "Ten Italian brainrot characters. One chaotic kitchen. Merge your memes, fill the fridge and share your best score. Opening 1 October 2026.",
    images: [{ url: "https://world.devfridge.cool/world/brainrot-pose-banner-v1.png", alt: "The ten DevFridge brainrot characters posing together in front of the fridge" }],
  },
};

export default function WorldPage() {
  return <ComingSoon />;
}
