"use client";

import { useState } from "react";
import { logoForAsset, portraitForAsset, type EcoAsset } from "@/lib/ecosystem";

export default function MagnetImage({
  asset,
  size = 72,
}: {
  asset: EcoAsset;
  size?: number;
}) {
  const logo = logoForAsset(asset);
  const portrait = portraitForAsset(asset);
  const [src, setSrc] = useState(logo);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="grid place-items-center rounded-xl bg-navy text-sm font-bold text-ice"
        style={{ width: size, height: size }}
        aria-hidden
      >
        {asset.name.slice(0, 1)}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`${asset.name} logo`}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="rounded-xl object-cover bg-navy"
      onError={() => {
        if (portrait && src !== portrait) setSrc(portrait);
        else setFailed(true);
      }}
    />
  );
}
