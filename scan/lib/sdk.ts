export const SDK_ORIGIN = "https://sdk.devfridge.cool";

export type SdkLink = {
  href: string;
  slug: string;
  title: string;
  nav: string;
  description: string;
};

export const SDK_PAGES: SdkLink[] = [
  {
    href: "/",
    slug: "",
    title: "DevFridge SDK",
    nav: "Overview",
    description:
      "Gate access to your site with on-chain Fridge timelocks. Users lock tokens to subscribe — longer locks mean fewer renewals.",
  },
];

export function sdkUrl(path: string): string {
  if (!path || path === "/") return SDK_ORIGIN;
  return `${SDK_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function sdkMeta(slug: string) {
  const page = SDK_PAGES.find((p) => p.slug === slug) || SDK_PAGES[0];
  const url = sdkUrl(page.href);
  return {
    title: `${page.title} — sdk.devfridge.cool`,
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      siteName: "DevFridge SDK",
      type: "website" as const,
      images: [{ url: "https://devfridge.cool/brand/logo-mark.jpg" }],
    },
    twitter: {
      card: "summary" as const,
      title: page.title,
      description: page.description,
    },
  };
}
