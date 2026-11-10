import type { Metadata } from "next";
import NewsletterSignup, { pressTranscriptCopy } from "@/components/world/NewsletterSignup";

export const metadata: Metadata = {
  metadataBase: new URL("https://press.devfridge.cool"),
  applicationName: "DevFridge Press",
  title: { absolute: "Interview transcript — press.devfridge.cool" },
  description: "Subscribe to the newsletter. The transcript is sent to all subscribers as an exclusive preview, before it is published on press.devfridge.cool.",
  alternates: { canonical: "https://press.devfridge.cool" },
  openGraph: {
    type: "website",
    url: "https://press.devfridge.cool",
    title: "Get the interview transcript",
    description: "Subscribe to the newsletter. The transcript is sent to all subscribers as an exclusive preview, before it is published on press.devfridge.cool.",
    images: [{ url: "https://devfridge.cool/brand/logo-lockup.jpg" }],
    siteName: "DevFridge Press",
  },
  twitter: {
    card: "summary_large_image",
    title: "Get the interview transcript",
    description: "Subscribe to the newsletter. The transcript is sent to all subscribers as an exclusive preview, before it is published on press.devfridge.cool.",
    images: ["https://devfridge.cool/brand/logo-lockup.jpg"],
  },
};

export default function PressPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <p className="mb-6 text-xs font-bold tracking-[0.22em] text-ice">PRESS.DEVFRIDGE.COOL</p>
      <h1 className="text-4xl font-bold tracking-tight text-white">Get the interview transcript.</h1>
      <p className="mt-4 text-base leading-6 text-mute">
        Subscribe to the newsletter. The transcript is sent as a newsletter to all subscribers, as an exclusive preview, before it is published on press.devfridge.cool.
      </p>
      <NewsletterSignup copy={pressTranscriptCopy} />
    </main>
  );
}
