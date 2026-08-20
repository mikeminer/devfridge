"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PASTA_MINT } from "@/lib/constants";
import { parseMint } from "@/lib/format";

const KEY = "scan.recent";

export default function SearchBar({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [recent, setRecent] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      setRecent(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setRecent([]);
    }
  }, []);

  function go(mint: string) {
    const v = parseMint(mint);
    if (!v) {
      setError("Invalid Solana address — paste the mint or a pump.fun / Dexscreener link");
      return;
    }
    setError("");
    setValue(v);
    const next = [v, ...recent.filter((x) => x !== v)].slice(0, 5);
    localStorage.setItem(KEY, JSON.stringify(next));
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
          Demo $PASTA
        </button>
        {recent.map((m) => (
          <button
            key={m}
            type="button"
            className="fridge-chip font-mono"
            onClick={() => go(m)}
          >
            {m.slice(0, 4)}…{m.slice(-4)}
          </button>
        ))}
      </div>
    </div>
  );
}
