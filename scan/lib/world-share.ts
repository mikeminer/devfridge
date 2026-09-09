import characters from "./brainrot-solana.json";

export const WORLD_BANNER = "https://world.devfridge.cool/world/brainrot-pose-banner-v1.png";
export const LAUNCH_POST = "Ten Italian brainrots. One chaotic kitchen. DevFridge World opens 1 October 2026. Which character are you bringing to the fridge? #ItalianBrainrot";
export const LAUNCH_LINK = "https://world.devfridge.cool/?share=brainrot-launch";
export const LAUNCH_X_URL = `https://x.com/intent/tweet?${new URLSearchParams({ text: LAUNCH_POST, url: LAUNCH_LINK })}`;

export function characterShare(id: string) {
  const validId = Object.prototype.hasOwnProperty.call(characters, id) ? id as keyof typeof characters : "rugarugo";
  const character = characters[validId];
  const url = `https://world.devfridge.cool/?${new URLSearchParams({ character: validId, share: "my-pick" })}`;
  const text = `I'm bringing ${character.name} to the fridge. Who's your pick?\nSolana CA: ${character.address}\n${character.marketUrl}\n#ItalianBrainrot #SolanaGems #SolanaCommunity #solanamemes`;
  return { id: validId, name: character.name, text, url, post: `${text}\n${url}`, x: `https://x.com/intent/tweet?${new URLSearchParams({ text, url })}` };
}
