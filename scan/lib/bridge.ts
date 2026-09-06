export const ROBINHOOD_CHAIN_ID = 4663;
export const TMC_ROBINHOOD_ADDRESS = "0x5c845330b41D9Bef68B46DC254353A770f44dee8";

export type BridgeRoute = {
  symbol: string;
  name: string;
  canonical: "robinhood" | "solana";
  robinhoodToken: string;
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
  solanaMint: value("NEXT_PUBLIC_TMC_SOLANA_MINT"),
  evmAdapter: value("NEXT_PUBLIC_TMC_OFT_ADAPTER"),
  solanaOftStore: value("NEXT_PUBLIC_TMC_SOLANA_OFT_STORE"),
  dailyLimit: value("NEXT_PUBLIC_TMC_BRIDGE_DAILY_LIMIT"),
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
