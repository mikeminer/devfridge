import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import WalletProviders from "@/components/WalletProviders";
import SiteNav from "@/components/SiteNav";

const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://scan.devfridge.cool"),
  title: {
    default: "DevFridge Scan | Solana token risk scanner",
    template: "%s | DevFridge Scan",
  },
  description:
    "Analyze Solana token authorities, holder concentration, market signals, and live DevFridge Token-2022 timelocks.",
  applicationName: "DevFridge Scan",
  keywords: [
    "Solana token scanner",
    "Solana risk scanner",
    "Token-2022 timelock",
    "Solana mint authority",
    "Solana freeze authority",
  ],
  authors: [{ name: "DevFridge", url: "https://devfridge.cool" }],
  creator: "DevFridge",
  publisher: "DevFridge",
  alternates: { canonical: "https://scan.devfridge.cool" },
  openGraph: {
    type: "website",
    url: "https://scan.devfridge.cool",
    siteName: "DevFridge Scan",
    title: "DevFridge Scan | Solana token risk scanner",
    description:
      "Analyze Solana token authorities, holder concentration, market signals, and live on-chain timelocks.",
    images: [
      {
        url: "https://devfridge.cool/brand/logo-lockup.jpg",
        width: 1200,
        height: 630,
        alt: "DevFridge Scan",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DevFridge Scan | Solana token risk scanner",
    description:
      "Analyze Solana token authorities, holder concentration, market signals, and live on-chain timelocks.",
    images: ["https://devfridge.cool/brand/logo-lockup.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "technology",
  icons: { icon: "https://devfridge.cool/brand/logo-mark.jpg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${space.variable} font-sans antialiased`}>
        <WalletProviders>
          <SiteNav />
          {children}
        </WalletProviders>
      </body>
    </html>
  );
}
