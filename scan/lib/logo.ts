const GATEWAYS = [
  "https://w3s.link/ipfs/",
  "https://nftstorage.link/ipfs/",
  "https://dweb.link/ipfs/",
  "https://ipfs.io/ipfs/",
];

const SOLANA_MINT = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function validMint(mint: string | null | undefined): string | null {
  const value = (mint ?? "").trim();
  return SOLANA_MINT.test(value) ? value : null;
}

function ipfsResource(uri: string): { cid: string; path: string } | null {
  try {
    const url = new URL(uri);
    let cid: string | undefined, path = "";
    if (url.protocol === "ipfs:") {
      const pieces = `${url.hostname}${url.pathname}`.replace(/^ipfs\//, "").split("/");
      cid = pieces.shift(); path = pieces.length ? `/${pieces.join("/")}` : "";
    } else if (["https:", "http:"].includes(url.protocol)) {
      const match = url.pathname.match(/^\/ipfs\/([a-zA-Z0-9]+)(\/.*)?$/);
      const subdomain = url.hostname.match(/^([a-zA-Z0-9]+)\.ipfs\./);
      if (match) { cid = match[1]; path = match[2] ?? ""; }
      else if (subdomain) { cid = subdomain[1]; path = url.pathname === "/" ? "" : url.pathname; }
    }
    return cid && /^[a-zA-Z0-9]{46,90}$/.test(cid) ? { cid, path } : null;
  } catch { return null; }
}

export function ipfsCid(uri: string): string | null {
  return ipfsResource(uri)?.cid ?? null;
}

export function rewriteUri(uri: string): string {
  const resource = ipfsResource(uri);
  if (resource) return `${GATEWAYS[0]}${resource.cid}${resource.path}`;
  if (uri.startsWith("ar://")) return `https://arweave.net/${uri.slice("ar://".length)}`;
  return uri;
}

export function publicLogoUrl(uri: string | null | undefined, mint?: string): string | null {
  if (!uri) return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:image/")) return trimmed;
  // Normalize stored feed entries as well as newly fetched metadata; invalidate old failed responses.
  if (trimmed.startsWith("/api/logo?")) {
    const url = new URL(trimmed, "https://scan.devfridge.cool");
    const safeMint = validMint(mint);
    if (safeMint) url.searchParams.set("mint", safeMint);
    url.searchParams.set("v", "3");
    return url.pathname + url.search;
  }
  const resource = ipfsResource(trimmed);
  if (resource) {
    const safeMint = validMint(mint);
    return `/api/logo?cid=${encodeURIComponent(resource.cid)}${resource.path ? `&path=${encodeURIComponent(resource.path)}` : ""}${safeMint ? `&mint=${encodeURIComponent(safeMint)}` : ""}&v=3`;
  }
  const abs = rewriteUri(trimmed);
  if (abs.startsWith("https://") || abs.startsWith("http://")) {
    return `/api/logo?url=${encodeURIComponent(abs)}&v=3`;
  }
  return null;
}

export function logoFetchList(cid?: string, rawUrl?: string, path = "", mint?: string): string[] {
  const urls: string[] = [];
  if (path && (!path.startsWith("/") || path.startsWith("//") || /[?#\\\r\n]/.test(path) || path.length > 2048)) return [];
  if (cid && /^[a-zA-Z0-9]{46,90}$/.test(cid)) {
    const safeMint = validMint(mint);
    if (safeMint && !path) {
      urls.push(`https://images.pump.fun/coin-image/${safeMint}?variant=256x256&ipfs=${encodeURIComponent(cid)}`);
    }
    for (const g of GATEWAYS) urls.push(`${g}${cid}${path}`);
  }
  if (rawUrl) {
    const abs = rewriteUri(rawUrl);
    if (abs.startsWith("https://")) urls.push(abs);
    const resource = ipfsResource(abs);
    if (resource) {
      for (const g of GATEWAYS) {
        const u = `${g}${resource.cid}${resource.path}`;
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
