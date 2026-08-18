import { useState } from "react";
import { fallbackGlyph, imageCandidates } from "../lib/tokenMeta";

type Props = {
  src?: string | null;
  symbol: string;
  className?: string;
};

export default function TokenLogo({ src, symbol, className }: Props) {
  const candidates = imageCandidates(src);
  const [index, setIndex] = useState(0);
  const url = candidates[index];

  if (!url) {
    return <span className={`jar-glyph ${className ?? ""}`}>{fallbackGlyph(symbol)}</span>;
  }

  return (
    <>
      <img
        className={className}
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setIndex((n) => n + 1)}
      />
      <span className={`jar-glyph fallback ${index >= candidates.length ? "show" : ""}`}>
        {fallbackGlyph(symbol)}
      </span>
    </>
  );
}
