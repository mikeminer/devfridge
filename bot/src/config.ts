import "dotenv/config";

export const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
export const ALERTS_CHANNEL = process.env.TELEGRAM_ALERTS_CHANNEL_ID || "";
export const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
export const WEBHOOK_URL = process.env.WEBHOOK_URL || "";
export const PORT = Number(process.env.PORT || 8080);

export const HELIUS_KEY = process.env.HELIUS_API_KEY || "";
export const PROGRAM_ID =
  process.env.DEVFRIDGE_PROGRAM_ID || "9RY54dNPYTzDyh3TfFqDdt2b2KMM56KW1tw9erRTGQo6";
export const PASTA_MINT =
  process.env.PASTA_MINT || "39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump";
export const BURN_ADDRESS =
  process.env.BURN_ADDRESS || "1nc1nerator11111111111111111111111111111111";
export const TRUST_ME_VAULT =
  process.env.TRUST_ME_VAULT || "0xf8815770e046d32f606385700f3bc96ffbb4e879";
export const TRUST_ME_LEADER =
  process.env.TRUST_ME_LEADER || "0x5D69C42A3a481d0CCFd88CFA8a2a08e2BF456134";

export const SCANNER_URL = (process.env.SCANNER_URL || "https://scan.devfridge.cool").replace(/\/$/, "");
export const FRIDGE_URL = (process.env.FRIDGE_URL || "https://devfridge.cool").replace(/\/$/, "");
export const CONNECT_URL = (process.env.CONNECT_URL || "https://connect.devfridge.cool").replace(/\/$/, "");

export const LOCK_ACCOUNT_SIZE = 105;
export const LOCK_DISC = Uint8Array.from([8, 255, 36, 202, 210, 22, 57, 137]);

export function rpcUrl(): string {
  if (HELIUS_KEY) return `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;
  return "https://api.mainnet-beta.solana.com";
}
