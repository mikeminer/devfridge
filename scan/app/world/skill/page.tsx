import type { Metadata } from 'next';
import SkillLanding from '@/components/world/skill/SkillLanding';

const description = 'Turn your Pump.fun meme into a Three.js browser game. Download the DevFridge AI skill for Phantom, mobile controls and timelock access, with copyable prompts and game examples.';
export const metadata: Metadata = {
  title: { absolute: 'DevFridge Game Builder — AI Skill for Solana Games' }, description,
  alternates: { canonical: 'https://world.devfridge.cool/skill' },
  openGraph: { title: 'Your meme. A world to play.', description, url: 'https://world.devfridge.cool/skill', siteName: 'DevFridge World', images: ['https://world.devfridge.cool/world/brainrot-pose-banner-v1.png'] },
  twitter: { card: 'summary_large_image', title: 'DevFridge Game Builder', description, images: ['https://world.devfridge.cool/world/brainrot-pose-banner-v1.png'] },
};
export default function SkillPage() { return <SkillLanding />; }
