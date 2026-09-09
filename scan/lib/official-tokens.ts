import contracts from "@/components/world/runway-contracts.json";
import { TMC_ROBINHOOD_ADDRESS } from "./bridge";
import solana from "./brainrot-solana.json";

export type OfficialToken = { name: string; symbol: string; address: string; note?: string; market?: string; marketUrl?: string };

export const SOLANA_TOKENS: OfficialToken[] = [
  {
    name: "Trust Me Capital",
    symbol: "TMC",
    address: "EAkUGfkiAwthJmpci5o5UivzQr2YMnrg4EirEUMjpump",
    market: "pump.fun",
    marketUrl: "https://pump.fun/coin/EAkUGfkiAwthJmpci5o5UivzQr2YMnrg4EirEUMjpump",
  },
  ...Object.values(solana),
];

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
