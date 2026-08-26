import { PASTA_DECIMALS } from "./constants";

const D = BigInt(10 ** PASTA_DECIMALS);

export type TierNumber = 1 | 2 | 3 | 4 | 5;

export type TierDef = {
  label: string;
  minAmount: bigint;       // raw token units
  minAmountDisplay: string; // human-readable
  minDays: number;
  color: string;
  bgColor: string;
};

export const TIERS: Record<TierNumber, TierDef> = {
  1: {
    label: "Core Admin / CEO",
    minAmount: 100_000_000n * D,
    minAmountDisplay: "100M",
    minDays: 365,
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.15)",
  },
  2: {
    label: "Senior Moderator",
    minAmount: 75_000_000n * D,
    minAmountDisplay: "75M",
    minDays: 180,
    color: "#8b5cf6",
    bgColor: "rgba(139, 92, 246, 0.15)",
  },
  3: {
    label: "Moderator",
    minAmount: 50_000_000n * D,
    minAmountDisplay: "50M",
    minDays: 90,
    color: "#3b82f6",
    bgColor: "rgba(59, 130, 246, 0.15)",
  },
  4: {
    label: "Community Moderator",
    minAmount: 25_000_000n * D,
    minAmountDisplay: "25M",
    minDays: 30,
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.15)",
  },
  5: {
    label: "Verified Investor",
    minAmount: 0n,
    minAmountDisplay: "Any",
    minDays: 1,
    color: "#e2e8f0",
    bgColor: "rgba(226, 232, 240, 0.12)",
  },
};
