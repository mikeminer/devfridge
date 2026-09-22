import type { Metadata } from 'next';
import { HACKATHON_ORIGIN } from '@/lib/hackathon';
import s from './projects.module.css';

export const metadata: Metadata = {
  title: { absolute: 'Playable projects | DevFridge Hackathon' },
  description: 'Play community games built with coding agents, Three.js, Phantom and DevFridge. Start with Fridge Run, a free PASTA courier game.',
  alternates: { canonical: `${HACKATHON_ORIGIN}/projects` },
  openGraph: { title: 'Playable projects | DevFridge Hackathon', description: 'Small worlds. Real games. Try the games taking shape in the DevFridge build season.', url: `${HACKATHON_ORIGIN}/projects`, images: [{ url: `${HACKATHON_ORIGIN}/projects/fridge-run/preview.png`, width: 1440, height: 1000, alt: 'Fridge Run: a miniature cold-chain courier game' }] },
};

export default function HackathonProjectsPage() {
  return <main id="main" className={s.main}>
    <div className={s.intro}><p className={s.eyebrow}>THE BUILD SEASON / PLAYABLE PROJECTS</p><h1>Small worlds.<br /><em>Real games.</em></h1><p>See what happens when a community gives its meme something to do. Play a complete run, meet the builders through their build logs, and find your next idea.</p></div>
    <article className={s.project}>
      <a className={s.image} href="/projects/fridge-run/index.html" aria-label="Play Fridge Run"><img src="/projects/fridge-run/preview.png" alt="A refrigerated courier collecting crates in a miniature night market" width={1440} height={1000} /><span>FREE PRACTICE · DESKTOP + TOUCH</span></a>
      <div className={s.details}><p className={s.eyebrow}>01 / PASTA COMMUNITY</p><h2>Fridge Run</h2><p className={s.subtitle}>The midnight delivery.</p><p>Six cold crates. One sleepy market. Drive a tiny refrigerated courier, dodge warm vents and get home before the ice runs out. Then try to beat your local best.</p>
        <div className={s.tags}><span>Three.js</span><span>Phantom</span><span>DevFridge timelocks</span></div>
        <a className={s.play} href="/projects/fridge-run/index.html">Start a delivery <span>↗</span></a>
        <p className={s.note}>No wallet or token purchase needed for practice. The 50-second challenge uses a client-side PASTA eligibility check. Scores are local and unverified; no prizes or rewards.</p>
      </div>
    </article>
    <section className={s.evidence} aria-label="Fridge Run project details"><div><h3>A transparent access policy.</h3><p>100 PASTA, summed across qualifying vaults for the same wallet. Each vault needs an original lock duration of at least 24 hours and at least 60 seconds remaining. Practice and local progress remain available when challenge access ends.</p><p>No early withdrawal. The documented redemption fee is 2%, plus network costs; this PASTA mint uses direct burning. Read all disclosures in the game before opening DevFridge.</p><code>39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump</code></div><div><h3>Built with an agent. Open to review.</h3><p>12 logic tests and 13 browser checks passed during the initial build. Phone screenshots are emulated; real-phone and real-Phantom testing remain pending. Wallet connection, eligibility and score authority are separate.</p><nav aria-label="Fridge Run evidence"><a href="/projects/fridge-run/BUILD_LOG.md">AI build log ↗</a><a href="/projects/fridge-run/VERIFICATION.md">Test evidence & limitations ↗</a><a href="/projects/fridge-run/SUBMISSION.md">Project submission draft ↗</a><a href="https://github.com/mikeminer/devfridge/tree/master/games/fridge-run">Source & setup ↗</a></nav></div></section>
    <aside className={s.status}><strong>A showcase, with room to grow.</strong><p>Publishing a project here is not registration or acceptance into the hackathon. Event dates, prizes and the official submission window are still to be announced.</p><a href="/hackathon/handbook/submission">Prepare your own project →</a></aside>
  </main>;
}
