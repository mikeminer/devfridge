export const config = { runtime: "edge" };

const CID_RE = /^[a-zA-Z0-9]{46,90}$/;
const GATEWAYS = [
  "https://w3s.link/ipfs/",
  "https://nftstorage.link/ipfs/",
  "https://dweb.link/ipfs/",
  "https://ipfs.io/ipfs/",
];

function allowedHost(host: string): boolean {
  return (
    host === "ipfs.io" ||
    host.endsWith(".ipfs.io") ||
    host.endsWith("w3s.link") ||
    host.endsWith("nftstorage.link") ||
    host.endsWith("dweb.link") ||
    host.endsWith("arweave.net") ||
    host.endsWith("jup.ag") ||
    host.endsWith("dexscreener.com")
  );
}

async function fetchImage(url: string): Promise<Response | null> {
  const res = await fetch(url, {
    headers: { accept: "image/*,*/*;q=0.8", "user-agent": "DevFridge/1.0" },
    redirect: "follow",
  });
  if (!res.ok) return null;
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) return null;
  const body = await res.arrayBuffer();
  return new Response(body, {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=86400, s-maxage=86400",
      "access-control-allow-origin": "*",
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const cid = (searchParams.get("cid") ?? "").trim();
  const raw = (searchParams.get("url") ?? "").trim();

  const urls: string[] = [];
  if (CID_RE.test(cid)) {
    for (const g of GATEWAYS) urls.push(`${g}${cid}`);
  } else if (raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === "https:" && allowedHost(parsed.hostname)) urls.push(parsed.toString());
    } catch {
      return new Response("bad url", { status: 400 });
    }
  } else {
    return new Response("missing cid", { status: 400 });
  }

  for (const url of urls) {
    try {
      const hit = await fetchImage(url);
      if (hit) return hit;
    } catch {
      // try next
    }
  }
  return new Response("not found", { status: 404 });
}
