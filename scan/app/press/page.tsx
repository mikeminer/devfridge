import type { Metadata } from "next";
import NewsletterSignup, { pressTranscriptCopy } from "@/components/world/NewsletterSignup";

export const metadata: Metadata = {
  metadataBase: new URL("https://press.devfridge.cool"),
  applicationName: "DevFridge Press",
  title: { absolute: "Interview transcript — press.devfridge.cool" },
  description: "Subscribe on Paragraph to receive the DevFridge interview transcript.",
  alternates: { canonical: "https://press.devfridge.cool" },
  openGraph: {
    type: "website",
    url: "https://press.devfridge.cool",
    title: "Get the interview transcript",
    description: "Subscribe on Paragraph to receive the DevFridge interview transcript.",
    images: [{ url: "https://devfridge.cool/brand/logo-lockup.jpg" }],
    siteName: "DevFridge Press",
  },
  twitter: {
    card: "summary_large_image",
    title: "Get the interview transcript",
    description: "Subscribe on Paragraph to receive the DevFridge interview transcript.",
    images: ["https://devfridge.cool/brand/logo-lockup.jpg"],
  },
};

export default function PressPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <p className="mb-6 text-xs font-bold tracking-[0.22em] text-ice">PRESS.DEVFRIDGE.COOL</p>
      <h1 className="text-4xl font-bold tracking-tight text-white">Get the interview transcript.</h1>
      <p className="mt-4 text-base leading-6 text-mute">
        The transcript is sent by email through the same Paragraph list as DevFridge World.
      </p>
      <NewsletterSignup copy={pressTranscriptCopy} />
    </main>
  );
}
