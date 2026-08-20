"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PASTA_MINT } from "@/lib/constants";

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
    const v = mint.trim();
    if (v.length < 32) {
      setError("Invalid Solana address");
      return;
    }
    setError("");
    const next = [v, ...recent.filter((x) => x !== v)].slice(0, 8);
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
          placeholder="Enter token mint address..."
          value={value}
          onChange={(e) => setValue(e.target.value.trim())}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text").trim();
            if (text.length >= 32) {
              window.setTimeout(() => go(text), 0);
            }
          }}
        />
        <button
          className="rounded-2xl bg-ice px-6 py-3 font-semibold text-navy"
          type="submit"
        >
          Scan
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          className="rounded-full border border-line px-3 py-1 text-mute hover:text-ice"
          onClick={() => go(PASTA_MINT)}
        >
          Demo $PASTA
        </button>
        {recent.map((m) => (
          <button
            key={m}
            type="button"
            className="rounded-full border border-line px-3 py-1 font-mono text-mute hover:text-ice"
            onClick={() => go(m)}
          >
            {m.slice(0, 4)}…{m.slice(-4)}
          </button>
        ))}
      </div>
    </div>
  );
}
