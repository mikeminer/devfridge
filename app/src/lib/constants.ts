import { PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

const PROGRAM_ID_FALLBACK = "9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6";

export const PROGRAM_ID = new PublicKey(
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_PROGRAM_ID) ||
    PROGRAM_ID_FALLBACK
);

export const TOKEN_2022 = TOKEN_2022_PROGRAM_ID;
export const LOCK_SEED = "lock";
export const BURN_SEED = "burn";
export const LOCK_ACCOUNT_SIZE = 8 + 32 + 32 + 8 + 8 + 8 + 1 + 8;
export const PASTA_MINT = new PublicKey("39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump");
export const PASTA_URL = "https://pump.fun/coin/39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump";

export const BUYBACK_GRADUATION_WARNING =
  "This token is still on the pump.fun bonding curve (not graduated to PumpSwap yet). Redeeming takes a 2% fee that Jupiter must swap into $PASTA and burn, and Jupiter has no route until graduation. Wait until this token graduates, then use Take it out. Your lock stays in the fridge until then.";
export const GITHUB_REPO = "https://github.com/mikeminer/devfridge";
export const LICENSE_URL = "https://github.com/mikeminer/devfridge/blob/master/LICENSE";
export const JUPITER_V6 = new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");
export const REDEMPTION_FEE_BPS = 200n;

export const ALCHEMY_API_KEY =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    (import.meta.env.VITE_ALCHEMY_API_KEY as string | undefined)) ||
  "";

function clusterEndpoint(cluster: "devnet" | "testnet" | "mainnet"): string {
  if (cluster === "testnet") return "https://api.testnet.solana.com";
  if (ALCHEMY_API_KEY) {
    const net = cluster === "devnet" ? "solana-devnet" : "solana-mainnet";
    return `https://${net}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
  }
  return cluster === "devnet"
    ? "https://api.devnet.solana.com"
    : "https://api.mainnet-beta.solana.com";
}

export const CLUSTERS = {
  devnet: {
    label: "Devnet",
    endpoint: clusterEndpoint("devnet"),
  },
  testnet: {
    label: "Testnet",
    endpoint: clusterEndpoint("testnet"),
  },
  mainnet: {
    label: "Mainnet",
    endpoint: clusterEndpoint("mainnet"),
  },
} as const;

export function isHttpEndpoint(url: string): boolean {
  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(url.trim());
}

export function looksLikeAlchemyKey(value: string): boolean {
  const v = value.trim();
  return /^[a-zA-Z0-9_-]{16,80}$/.test(v);
}

export function alchemyEndpoint(cluster: ClusterName, apiKey: string): string {
  if (cluster === "testnet") return "https://api.testnet.solana.com";
  const network = cluster === "devnet" ? "solana-devnet" : "solana-mainnet";
  return `https://${network}.g.alchemy.com/v2/${apiKey.trim()}`;
}

export function resolveRpcEndpoint(
  custom: string | null | undefined,
  cluster: ClusterName,
  _alchemyKey?: string | null
): string {
  const trimmed = (custom ?? "").trim();
  if (isHttpEndpoint(trimmed)) return trimmed.replace(/\/+$/, "");
  return CLUSTERS[cluster].endpoint;
}

export const RPC_FALLBACKS: Record<ClusterName, string[]> = {
  devnet: [
    ...(ALCHEMY_API_KEY
      ? [`https://solana-devnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`]
      : []),
    "https://api.devnet.solana.com",
  ],
  testnet: ["https://api.testnet.solana.com"],
  mainnet: [
    "https://api.mainnet-beta.solana.com",
    ...(ALCHEMY_API_KEY
      ? [`https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`]
      : []),
  ],
};

/** GPA listing: official first on mainnet (Alchemy getProgramAccounts is 429). */
export function listingRpcs(cluster: ClusterName): string[] {
  return RPC_FALLBACKS[cluster];
}

export type ClusterName = keyof typeof CLUSTERS;

export const PROGRAM_BY_CLUSTER: Record<ClusterName, string> = {
  devnet: PROGRAM_ID_FALLBACK,
  testnet: PROGRAM_ID_FALLBACK,
  mainnet: PROGRAM_ID_FALLBACK,
};

export function explorerProgramUrl(cluster: ClusterName, programId: string): string {
  const query = cluster === "mainnet" ? "" : `?cluster=${cluster}`;
  return `https://solscan.io/account/${programId}${query}`;
}

export function explorerTxUrl(cluster: ClusterName, signature: string): string {
  const query = cluster === "mainnet" ? "" : `?cluster=${cluster}`;
  return `https://solscan.io/tx/${signature}${query}`;
}

export const CREATE_LOCK_DISCRIMINATOR = Uint8Array.from([
  171, 216, 92, 167, 165, 8, 153, 90,
]);
export const CLAIM_DISCRIMINATOR = Uint8Array.from([
  62, 198, 214, 193, 213, 159, 108, 210,
]);
export const LOCK_ACCOUNT_DISCRIMINATOR = Uint8Array.from([
  8, 255, 36, 202, 210, 22, 57, 137,
]);
