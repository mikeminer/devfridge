import type { MetadataRoute } from "next";
import { SCAN_URL } from "@/lib/constants";
import { DOCS_ORIGIN } from "@/lib/docs";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: [`${SCAN_URL}/sitemap.xml`, `${DOCS_ORIGIN}/sitemap.xml`],
  };
}
