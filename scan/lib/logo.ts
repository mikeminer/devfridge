const GATEWAYS = [
  "https://w3s.link/ipfs/",
  "https://nftstorage.link/ipfs/",
  "https://dweb.link/ipfs/",
  "https://ipfs.io/ipfs/",
];

export function ipfsCid(uri: string): string | null {
  const match = uri.match(/(?:ipfs:\/\/|\/ipfs\/)([a-zA-Z0-9]+)/i);
  return match?.[1] ?? null;
}

export function rewriteUri(uri: string): string {
  const cid = ipfsCid(uri);
  if (cid) return `${GATEWAYS[0]}${cid}`;
  if (uri.startsWith("ar://")) return `https://arweave.net/${uri.slice("ar://".length)}`;
  return uri;
}

export function publicLogoUrl(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:image/")) return trimmed;
  const cid = ipfsCid(trimmed);
  if (cid) return `/api/logo?cid=${encodeURIComponent(cid)}`;
  const abs = rewriteUri(trimmed);
  if (abs.startsWith("https://") || abs.startsWith("http://")) {
    return `/api/logo?url=${encodeURIComponent(abs)}`;
  }
  return null;
}

export function logoFetchList(cid?: string, rawUrl?: string): string[] {
  const urls: string[] = [];
  if (cid && /^[a-zA-Z0-9]{46,90}$/.test(cid)) {
    for (const g of GATEWAYS) urls.push(`${g}${cid}`);
  }
  if (rawUrl) {
    const abs = rewriteUri(rawUrl);
    if (abs.startsWith("https://")) urls.push(abs);
    const fromAbs = ipfsCid(abs);
    if (fromAbs) {
      for (const g of GATEWAYS) {
        const u = `${g}${fromAbs}`;
        if (!urls.includes(u)) urls.push(u);
      }
    }
  }
  return [...new Set(urls)];
}

export function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd")) return true;
  return false;
}
