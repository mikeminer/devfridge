import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import WalletProviders from "@/components/WalletProviders";

const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
});

export const metadata: Metadata = {
  title: "scan.devfridge.cool — Solana trust scanner",
  description:
    "The only token scanner that checks whether a dev timelocked supply in DevFridge. Powered by $PASTA buybacks.",
  icons: { icon: "https://devfridge.cool/brand/logo-mark.jpg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${space.variable} font-sans antialiased`}>
        <WalletProviders>{children}</WalletProviders>
      </body>
    </html>
  );
}
