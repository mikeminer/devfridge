import type { Metadata } from 'next';
import SkillLanding from '@/components/world/skill/SkillLanding';

const description = 'Build a Solana game for Browser, Seeker app or Both. Download the DevFridge AI skill for timelock access, signed APKs with local or hosted game content, optional Game Room integration and Solana dApp Store preparation.';
export const metadata: Metadata = {
  title: { absolute: 'DevFridge Game Builder — AI Skill for Solana Games' }, description,
  alternates: { canonical: 'https://world.devfridge.cool/skill' },
  openGraph: { title: 'Your meme. A world to play.', description, url: 'https://world.devfridge.cool/skill', siteName: 'DevFridge World', images: ['https://world.devfridge.cool/world/brainrot-pose-banner-v1.png'] },
  twitter: { card: 'summary_large_image', title: 'DevFridge Game Builder', description, images: ['https://world.devfridge.cool/world/brainrot-pose-banner-v1.png'] },
};
export default function SkillPage() { return <SkillLanding />; }
