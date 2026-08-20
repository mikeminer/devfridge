export type Lang = "it" | "en";

const IT_HINT =
  /\b(ciao|grazie|perché|perche|come|quanto|aiuto|prezzo|frigo|token|scansiona|blocco)\b/i;

export function detectLang(text: string, languageCode?: string): Lang {
  if (IT_HINT.test(text)) return "it";
  if ((languageCode || "").toLowerCase().startsWith("it")) return "it";
  return "en";
}

export const say = {
  ciao: (l: Lang) => (l === "it" ? "Ciao! 🍝 Benvenuto in cucina." : "Ciao! 🍝 Welcome to the kitchen."),
  cooking: (l: Lang) =>
    l === "it" ? "Sto controllando il frigo..." : "One moment — the pasta is in the pot...",
  alDente: (l: Lang) => (l === "it" ? "Perfetto. Al dente." : "Perfetto. Al dente."),
  spoiled: (l: Lang) =>
    l === "it" ? "La pasta è andata a male 🍝" : "La pasta è andata a male 🍝",
  offline: (l: Lang) =>
    l === "it" ? "Il frigo è offline, riprova." : "The fridge is offline. Try again in a bit.",
  unknown: (l: Lang) =>
    l === "it" ? "Non conosco questo piatto. Prova /help." : "I don't know that dish. Try /help.",
  needMint: (l: Lang) =>
    l === "it"
      ? "Passami un mint, un link pump.fun o DexScreener. Esempio: /scan 39kMe...pump"
      : "Send a mint, a pump.fun link, or DexScreener. Example: /scan 39kMe...pump",
  invalid: (l: Lang) =>
    l === "it"
      ? "La pasta è andata a male.\nInvalid Solana address. Check the mint and try again."
      : "La pasta è andata a male.\nInvalid Solana address. Check the mint and try again.",
  rate: (l: Lang) =>
    l === "it"
      ? "Piano con il mestolo — un scan ogni 10 secondi."
      : "Easy with the ladle — one scan every 10 seconds.",
  fridged: (l: Lang) =>
    l === "it" ? "Questo token è ben conservato in frigo. ✓" : "This token is well chilled. ✓",
  notFridged: (l: Lang) =>
    l === "it" ? "Nessun frigo rilevato. Attenzione al dump." : "No fridge detected. Watch the dump.",
  thawed: (l: Lang) =>
    l === "it" ? "Il frigo è scongelato. Dev può prelevare ora." : "The fridge thawed. Dev can withdraw now.",
};
