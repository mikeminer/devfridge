"use client";

import { useEffect } from "react";
import type { RecentScan } from "@/lib/store";

export const RECENT_KEY = "scan.feed.recent";

export function readLocalRecent(): RecentScan[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const rows = raw ? (JSON.parse(raw) as RecentScan[]) : [];
    return Array.isArray(rows) ? rows.filter((r) => r && typeof r.mint === "string") : [];
  } catch {
    return [];
  }
}

export function writeLocalRecent(row: RecentScan) {
  const next = [row, ...readLocalRecent().filter((r) => r.mint !== row.mint)].slice(0, 20);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export default function RememberScan({ token }: { token: RecentScan }) {
  useEffect(() => {
    writeLocalRecent(token);
    void fetch("/api/feed/recent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(token),
    });
    // Identity is stable per mint; avoid rewriting on every server render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token.mint]);
  return null;
}
