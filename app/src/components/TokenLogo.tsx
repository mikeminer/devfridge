import { useEffect, useState } from "react";
import { fallbackGlyph, imageCandidates } from "../lib/tokenMeta";

type Props = {
  src?: string | null;
  mint?: string;
  symbol: string;
  className?: string;
};

export default function TokenLogo({ src, mint, symbol, className }: Props) {
  const candidates = imageCandidates(src, mint);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [src, mint]);

  const url = candidates[index];
  const failed = !url || index >= candidates.length;

  return (
    <>
      {!failed && (
        <img
          className={className}
          src={url}
          alt=""
          decoding="async"
          onError={() => setIndex((n) => n + 1)}
        />
      )}
      <span className={`jar-glyph fallback ${failed ? "show" : ""}`}>
        {fallbackGlyph(symbol)}
      </span>
    </>
  );
}
