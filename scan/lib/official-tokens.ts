import contracts from "@/components/world/runway-contracts.json";
import solana from "./brainrot-solana.json";
import { PASTA_MINT } from "./constants";
import { TMC_ROBINHOOD_ADDRESS, TMC_SOLANA_LEGACY_MINT } from "./bridge";

export type OfficialToken = { name: string; symbol: string; address: string; note?: string; market?: string; marketUrl?: string };

// DevFridge's published collection, not a chain-wide approval or wallet allowance.
export const ROBINHOOD_TOKENS: OfficialToken[] = [
  { name: "Trust Me Capital", symbol: "TMC", address: TMC_ROBINHOOD_ADDRESS },
  { name: "Rugarugo", symbol: "RUGARUGO", address: contracts.rugarugo },
  { name: "Aperitivo", symbol: "APE", address: contracts.aperitivo },
  { name: "FriedFomo", symbol: "FIFO", address: contracts.friedfomo },
  { name: "FudFusilli", symbol: "FUSILLI", address: contracts.fudfusilli },
  { name: "Lambocello", symbol: "LAMBOCELLO", address: contracts.lambocello },
  { name: "GmGnocco", symbol: "GMGN", address: contracts.gmgnocco },
  { name: "SerSugo", symbol: "SESU", address: contracts.sersugo },
  { name: "MoonZarella", symbol: "MOONZARELLA", address: contracts.moonzarella },
  { name: "Bonkatino", symbol: "BONKATINO", address: contracts.bonkatino },
  { name: "Ciccia Salsiccia", symbol: "CICCIA", address: contracts.ciccia },
];

export const SOLANA_TOKENS: OfficialToken[] = [
  { name: "PASTA", symbol: "PASTA", address: PASTA_MINT },
  ...Object.values(solana),
  { name: "Trust Me Capital", symbol: "TMC", address: TMC_SOLANA_LEGACY_MINT, note: "Legacy Solana mint · independent supply · not bridgeable" },
];
