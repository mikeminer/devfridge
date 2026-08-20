"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PASTA_MINT } from "@/lib/constants";
import { parseMint } from "@/lib/format";

export default function SearchBar({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState("");

  function go(mint: string) {
    const v = parseMint(mint);
    if (!v) {
      setError("Invalid Solana address — paste the mint or a pump.fun / Dexscreener link");
      return;
    }
    setError("");
    setValue(v);
    router.push(`/t/${v}`);
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
      >
        <input
          className="ice-input font-mono text-sm sm:text-base"
          placeholder="Mint, pump.fun link, or Dexscreener URL"
          value={value}
          onChange={(e) => setValue(e.target.value.trim())}
          onPaste={(e) => {
            const parsed = parseMint(e.clipboardData.getData("text"));
            if (parsed) {
              e.preventDefault();
              setValue(parsed);
              window.setTimeout(() => go(parsed), 0);
            }
          }}
        />
        <button className="fridge-key fridge-key-primary px-8" type="submit">
          Scan
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <button type="button" className="fridge-chip" onClick={() => go(PASTA_MINT)}>
          $PASTA
        </button>
      </div>
    </div>
  );
}
