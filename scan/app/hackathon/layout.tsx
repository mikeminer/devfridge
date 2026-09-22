import type { Metadata } from 'next';
import { HACKATHON_ORIGIN, SKILL_URL } from '@/lib/hackathon';
import s from './hackathon.module.css';

const description = 'Build your meme into a playable Solana game with AI coding agents, Three.js, Phantom and DevFridge timelocks. Get the free skill, builder handbook and submission kit.';
export const metadata: Metadata = {
  metadataBase: new URL(HACKATHON_ORIGIN),
  title: { absolute: 'DevFridge Hackathon — Your meme. Your game.' }, description,
  applicationName: 'DevFridge Hackathon', keywords: ['Solana hackathon', 'agentic coding', 'Pump.fun', 'Three.js', 'DevFridge', 'Phantom', 'game development'],
  alternates: { canonical: HACKATHON_ORIGIN },
  openGraph: { type: 'website', siteName: 'DevFridge Hackathon', title: 'Your meme. Your game.', description, url: HACKATHON_ORIGIN, images: [{ url: `${HACKATHON_ORIGIN}/opengraph-image`, width: 1200, height: 630, alt: 'DevFridge Hackathon — Build a game your community comes back for' }] },
  twitter: { card: 'summary_large_image', title: 'DevFridge Hackathon', description, images: [`${HACKATHON_ORIGIN}/opengraph-image`] },
};

export default function HackathonLayout({ children }: { children: React.ReactNode }) {
  return <div className={s.site}>
    <a className={s.skip} href="#main">Skip to content</a>
    <header className={s.header}>
      <a href="/hackathon" className={s.brand} aria-label="DevFridge Hackathon home"><span className={s.mark} aria-hidden="true">D<span>F</span></span><span>DEVFRIDGE<small>HACKATHON / BUILD SEASON</small></span></a>
      <nav aria-label="Main navigation"><a href="/hackathon/handbook/start">Handbook</a><a href="/hackathon#kit">Builder kit</a><a className={s.navCta} href={SKILL_URL}>Get the skill ↗</a></nav>
    </header>
    {children}
    <footer className={s.footer}><div><a className={s.brand} href="/hackathon">DEVFRIDGE / HACKATHON</a><p>Built for communities that want something to play.</p><small>A DevFridge initiative. No announced sponsorship by Solana, Pump.fun or Phantom.</small></div><div><a href="/hackathon/handbook/rules">Rules & conduct</a><a href="/hackathon/handbook/faq">FAQ</a><a href="https://connect.devfridge.cool">Official contacts ↗</a><a href="/hackathon/llms.txt">For AI agents ↗</a></div><p className={s.footerStatus}>Preparation kit available<br />Dates & prizes to be announced</p></footer>
  </div>;
}
