"use client";

import { useState } from "react";
import { publicLogoUrl } from "../lib/logo";

export default function TokenLogo({
  src,
  symbol,
  size = "md",
}: {
  src: string | null | undefined;
  symbol: string;
  size?: "sm" | "md";
}) {
  const source = publicLogoUrl(src);
  return <LogoImage key={source || "missing"} src={source} symbol={symbol} size={size} />;
}

function LogoImage({ src, symbol, size }: { src: string | null; symbol: string; size: "sm" | "md" }) {
  const [failed, setFailed] = useState(false);
  const [retried, setRetried] = useState(false);
  const glyph = (symbol.replace(/[^A-Za-z0-9]/g, "").slice(0, 2) || "?").toUpperCase();
  const box = size === "sm" ? "h-10 w-10 rounded-xl text-xs" : "h-16 w-16 rounded-2xl text-base";
  if (!src || failed) {
    return (
      <div className={`grid place-items-center bg-fridge text-ice ${box}`}>{glyph}</div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={retried && src.startsWith("/api/logo?") ? `${src}&retry=1` : src}
      alt=""
      referrerPolicy="no-referrer"
      className={`${box} object-cover`}
      onError={() => {
        if (!retried && src.startsWith("/api/logo?")) setRetried(true);
        else setFailed(true);
      }}
    />
  );
}
