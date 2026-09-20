export const config = { runtime: "edge" };

const CID_RE = /^[a-zA-Z0-9]{46,90}$/;
const GATEWAYS = [
  "https://w3s.link/ipfs/",
  "https://nftstorage.link/ipfs/",
  "https://dweb.link/ipfs/",
  "https://ipfs.io/ipfs/",
];

function allowedHost(host: string): boolean {
  return ["ipfs.io", "w3s.link", "nftstorage.link", "dweb.link", "arweave.net", "jup.ag", "dexscreener.com", "images.pump.fun"]
    .some(domain => host === domain || host.endsWith(`.${domain}`));
}

async function fetchImage(url: string, signal: AbortSignal): Promise<Response | null> {
  let res: Response | undefined;
  for (let redirect = 0; redirect < 5; redirect++) {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || (parsed.port && parsed.port !== "443") || !allowedHost(parsed.hostname)) return null;
    res = await fetch(url, {
      headers: { accept: "image/*,*/*;q=0.8", "user-agent": "DevFridge/1.0" },
      redirect: "manual", signal,
    });
    if (![301, 302, 303, 307, 308].includes(res.status)) break;
    const location = res.headers.get("location");
    await res.body?.cancel();
    if (!location) return null;
    url = new URL(location, url).toString();
  }
  if (!res?.ok) return null;
  let type = (res.headers.get("content-type") ?? "").split(";")[0].toLowerCase();
  if (!type.startsWith("image/") && type !== "application/octet-stream") { await res.body?.cancel(); return null; }
  const limit = 8_000_000;
  if (Number(res.headers.get("content-length")) > limit) { await res.body?.cancel(); return null; }
  const reader = res.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.byteLength;
    if (length > limit) { await reader.cancel(); return null; }
    chunks.push(chunk.value);
  }
  if (!length) return null;
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  if (type === "application/octet-stream") {
    type = body[0] === 255 && body[1] === 216 && body[2] === 255 ? "image/jpeg" :
      [137,80,78,71,13,10,26,10].every((v,i) => body[i] === v) ? "image/png" :
      /^GIF8[79]a$/.test(new TextDecoder().decode(body.slice(0,6))) ? "image/gif" :
      new TextDecoder().decode(body.slice(0,4)) === "RIFF" && new TextDecoder().decode(body.slice(8,12)) === "WEBP" ? "image/webp" : "";
    if (!type) return null;
  }
  return new Response(body, {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=86400, s-maxage=86400",
      "access-control-allow-origin": "*",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
    },
  });
}

export default async function handler(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const cid = (searchParams.get("cid") ?? "").trim();
  const raw = (searchParams.get("url") ?? "").trim();
  const mint = (searchParams.get("mint") ?? "").trim();
  const validMint = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint);

  const urls: string[] = [];
  if (validMint) urls.push(`https://images.pump.fun/coin-image/${mint}?variant=256x256${CID_RE.test(cid) ? `&ipfs=${encodeURIComponent(cid)}` : ""}`);
  if (CID_RE.test(cid)) {
    for (const g of GATEWAYS) urls.push(`${g}${cid}`);
  } else if (raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === "https:" && allowedHost(parsed.hostname)) urls.push(parsed.toString());
    } catch {
      return new Response("bad url", { status: 400 });
    }
  } else if (!validMint) {
    return new Response("missing cid", { status: 400 });
  }

  if (!urls.length) return new Response("bad url", { status: 400 });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    // A stalled public gateway must not hide an image already available from Pump.fun.
    return await Promise.any(urls.map(async url => {
      const image = await fetchImage(url, controller.signal);
      if (!image) throw Error("Image unavailable");
      return image;
    }));
  } catch {
    return new Response("not found", { status: 404, headers: { "cache-control": "no-store" } });
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}
