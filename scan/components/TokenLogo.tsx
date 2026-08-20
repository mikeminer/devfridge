"use client";

import { useState } from "react";

export default function TokenLogo({
  src,
  symbol,
  size = "md",
}: {
  src: string | null | undefined;
  symbol: string;
  size?: "sm" | "md";
}) {
  const [failed, setFailed] = useState(false);
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
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      className={`${box} object-cover`}
      onError={() => setFailed(true)}
    />
  );
}
