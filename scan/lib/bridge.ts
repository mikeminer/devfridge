export const ROBINHOOD_CHAIN_ID = 4663;
export const TMC_ROBINHOOD_ADDRESS = "0x5c845330b41D9Bef68B46DC254353A770f44dee8";
export const TMC_ROBINHOOD_GOVERNOR = "0x5D69C42A3a481d0CCFd88CFA8a2a08e2BF456134";
export const TMC_SOLANA_GOVERNOR = "GxPoKNX26GCisuH8Sdr8rtfZY98L5t5eegKtDzSA9P6W";
export const TMC_SOLANA_LEGACY_MINT = "EAkUGfkiAwthJmpci5o5UivzQr2YMnrg4EirEUMjpump";
export const TMC_DAILY_LIMIT = "1,000,000";

export type BridgeRoute = {
  symbol: string;
  name: string;
  canonical: "robinhood" | "solana";
  robinhoodToken: string;
  robinhoodGovernor: string;
  solanaGovernor: string;
  solanaLegacyMint: string;
  solanaMint?: string;
  evmAdapter?: string;
  solanaOftStore?: string;
  dailyLimit?: string;
  enabled: boolean;
};

const value = (name: string) => process.env[name]?.trim() || undefined;

export const TMC_ROUTE: BridgeRoute = {
  symbol: "TMC",
  name: "Trust Me Capital",
  canonical: "robinhood",
  robinhoodToken: TMC_ROBINHOOD_ADDRESS,
  robinhoodGovernor: TMC_ROBINHOOD_GOVERNOR,
  solanaGovernor: TMC_SOLANA_GOVERNOR,
  solanaLegacyMint: TMC_SOLANA_LEGACY_MINT,
  solanaMint: value("NEXT_PUBLIC_TMC_SOLANA_MINT"),
  evmAdapter: value("NEXT_PUBLIC_TMC_OFT_ADAPTER"),
  solanaOftStore: value("NEXT_PUBLIC_TMC_SOLANA_OFT_STORE"),
  dailyLimit: value("NEXT_PUBLIC_TMC_BRIDGE_DAILY_LIMIT") || TMC_DAILY_LIMIT,
  enabled: process.env.NEXT_PUBLIC_TMC_BRIDGE_ENABLED === "true",
};

export const routeReadiness = (route: BridgeRoute) => {
  const missing: string[] = [];
  if (!route.solanaMint) missing.push("Solana mint");
  if (!route.evmAdapter) missing.push("Robinhood OFT Adapter");
  if (!route.solanaOftStore) missing.push("Solana OFT Store");
  if (!route.dailyLimit) missing.push("rate limit");
  if (!route.enabled) missing.push("mainnet approval");
  return { ready: missing.length === 0, missing };
};
