import type { MetadataRoute } from "next";
import { DOC_PAGES, DOCS_ORIGIN } from "@/lib/docs";
import { SCAN_URL } from "@/lib/constants";
import { ECO_ORIGIN } from "@/lib/ecosystem";

export default function sitemap(): MetadataRoute.Sitemap {
  const scan: MetadataRoute.Sitemap = [
    { url: SCAN_URL, changeFrequency: "hourly", priority: 1 },
    { url: `${SCAN_URL}/badge`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SCAN_URL}/connect`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SCAN_URL}/health`, changeFrequency: "daily", priority: 0.4 },
    { url: `${SCAN_URL}/stats`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SCAN_URL}/docs`, changeFrequency: "weekly", priority: 0.7 },
    { url: "https://bridge.devfridge.cool", changeFrequency: "daily", priority: 0.8 },
  ];
  const docs: MetadataRoute.Sitemap = DOC_PAGES.map((p) => ({
    url: `${DOCS_ORIGIN}${p.href === "/" ? "" : p.href}`,
    changeFrequency: "weekly" as const,
    priority: p.slug === "feature" ? 0.9 : p.slug ? 0.7 : 1,
  }));
  const eco: MetadataRoute.Sitemap = [
    { url: ECO_ORIGIN, changeFrequency: "hourly", priority: 1 },
    { url: `${ECO_ORIGIN}/solana`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${ECO_ORIGIN}/robinhood`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${ECO_ORIGIN}/cast`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${ECO_ORIGIN}/pasta`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${ECO_ORIGIN}/integrate`, changeFrequency: "weekly", priority: 0.7 },
  ];
  return [...scan, ...docs, ...eco];
}
