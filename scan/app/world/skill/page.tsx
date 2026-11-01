import type { Metadata } from 'next';
import SkillLanding from '@/components/world/skill/SkillLanding';

const description = 'Unbox DevFridge Game Builder v1.9.3 in 3D. Build for Browser, Seeker app or Both with Daily, Weekly and Monthly passes paid in SOL, a vendored 49-role game studio, an optional token market, private RPC, generated app pages, a 50 FPS release gate, checkpoints, Store captures and private Drive delivery. Includes wallet-trust checks before Store submission, asset/audio pipelines, Game Room and signed APK updates.';
export const metadata: Metadata = {
  title: { absolute: 'DevFridge Game Builder v1.9.3 — AI Skill for Solana Games' }, description,
  alternates: { canonical: 'https://world.devfridge.cool/skill' },
  openGraph: { title: 'DevFridge Game Builder v1.9.3 — Unbox your next game.', description, url: 'https://world.devfridge.cool/skill', siteName: 'DevFridge World', images: ['https://world.devfridge.cool/world/brainrot-pose-banner-v1.png'] },
  twitter: { card: 'summary_large_image', title: 'DevFridge Game Builder v1.9.3', description, images: ['https://world.devfridge.cool/world/brainrot-pose-banner-v1.png'] },
};
export default function SkillPage() { return <SkillLanding />; }
