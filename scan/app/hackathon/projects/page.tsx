import type { Metadata } from 'next';
import { HACKATHON_ORIGIN } from '@/lib/hackathon';
import { loadPublishedProjects } from '@/lib/hackathon-feed.cjs';
import s from './projects.module.css';

export const dynamic = 'force-static';

type CommunityProject = {
  slug: string; name: string; pitch: string; community: string;
  playUrl: string; repositoryUrl: string; demoUrl: string; submissionUrl: string;
  buildLogUrl: string; verificationUrl: string; commit: string;
  access: string; limitations: string;
};

export const metadata: Metadata = {
  title: { absolute: 'Playable projects | DevFridge Hackathon' },
  description: 'Play community games built with coding agents, Three.js, Phantom and DevFridge. Start with Fridge Run, a free PASTA courier game.',
  alternates: { canonical: `${HACKATHON_ORIGIN}/projects` },
  openGraph: { title: 'Playable projects | DevFridge Hackathon', description: 'Small worlds. Real games. Try the games taking shape in the DevFridge build season.', url: `${HACKATHON_ORIGIN}/projects`, images: [{ url: `${HACKATHON_ORIGIN}/projects/fridge-run/preview.png`, width: 1440, height: 1000, alt: 'Fridge Run: a miniature cold-chain courier game' }] },
};

export default function HackathonProjectsPage() {
  const published = loadPublishedProjects().projects as CommunityProject[];
  const featured = published.find(project => project.slug === 'fridge-run');
  const projects = published.filter(project => project.slug !== 'fridge-run');
  return <main id="main" className={s.main}>
    <div className={s.intro}><p className={s.eyebrow}>THE BUILD SEASON / PLAYABLE PROJECTS</p><h1>Small worlds.<br /><em>Real games.</em></h1><p>See what happens when a community gives its meme something to do. Play a complete run, meet the builders through their build logs, and find your next idea.</p></div>
    {featured && <><article className={s.project}>
      <a className={s.image} href={featured.playUrl} aria-label="Play Fridge Run"><img src="/projects/fridge-run/preview.png" alt="A refrigerated courier collecting crates in a miniature night market" width={1440} height={1000} /><span>FREE PRACTICE · DESKTOP + TOUCH</span></a>
      <div className={s.details}><p className={s.eyebrow}>01 / PASTA COMMUNITY</p><h2>{featured.name}</h2><p className={s.subtitle}>The midnight delivery.</p><p>{featured.pitch}</p>
        <div className={s.tags}><span>Three.js</span><span>Phantom</span><span>DevFridge timelocks</span></div>
        <a className={s.play} href={featured.playUrl}>Start a delivery <span>↗</span></a>
        <p className={s.note}>No wallet or token purchase needed for practice. The 50-second challenge uses a client-side PASTA eligibility check. Scores are local and unverified; no prizes or rewards.</p>
      </div>
    </article>
    <section className={s.evidence} aria-label="Fridge Run project details"><div><h3>A transparent access policy.</h3><p>{featured.access}</p><p>No early withdrawal. The documented redemption fee is 2%, plus network costs; this PASTA mint uses direct burning. Read all disclosures in the game before opening DevFridge.</p><code>39kMeX4HVRW9qbbiHSPbRQ9xeXUF18GrNP6gL61Ppump</code></div><div><h3>Built with an agent. Open to review.</h3><p>{featured.limitations}</p><nav aria-label="Fridge Run evidence"><a href={featured.buildLogUrl}>AI build log ↗</a><a href={featured.verificationUrl}>Test evidence & limitations ↗</a><a href={featured.submissionUrl}>Project submission draft ↗</a><a href={featured.repositoryUrl}>Source & setup ↗</a></nav></div></section>
    </>}
    <section className={s.community} aria-labelledby="community-projects-title">
      <h2 id="community-projects-title">Community builds.</h2>
      <p>Projects reviewed for this showcase. External games are hosted by their builders; inclusion is not a security audit or a prize award.</p>
      {projects.length === 0 ? <p>The next shelf is open. Let your agent prepare and submit your game for review.</p> : <div className={s.communityGrid}>{projects.map(project => <article className={s.communityCard} key={project.slug} id={project.slug}>
        <p className={s.eyebrow}>{project.community}</p><h3>{project.name}</h3><p>{project.pitch}</p>
        <a className={s.play} href={project.playUrl} target="_blank" rel="noopener noreferrer">Play free practice <span>↗</span></a>
        <details><summary>Access policy & limitations</summary><p>{project.access}</p><p>{project.limitations}</p></details>
        <nav aria-label={`${project.name} evidence`}><a href={project.repositoryUrl} target="_blank" rel="noopener noreferrer">Source ↗</a><a href={project.demoUrl} target="_blank" rel="noopener noreferrer">Demo ↗</a><a href={project.submissionUrl} target="_blank" rel="noopener noreferrer">Submission ↗</a><a href={project.buildLogUrl} target="_blank" rel="noopener noreferrer">AI build log ↗</a><a href={project.verificationUrl} target="_blank" rel="noopener noreferrer">Test evidence ↗</a></nav><p className={s.commit}>Source commit: <code>{project.commit}</code></p>
      </article>)}</div>}
    </section>
    <aside className={s.status}><strong>Your agent can handle the submission.</strong><p>No Git experience needed. Ask the Game Builder skill to prepare your project and open its review request. Owner approval, a projects.json release update, merge and a successful deployment publish it here. Event dates, prizes and final competition eligibility are still to be announced.</p><a href="/projects.json">Approved games · JSON feed →</a><br /><a href="https://world.devfridge.cool/skill#submit">Get the guided submission prompt →</a><br /><a href="/hackathon/handbook/submission">How review and publication work →</a></aside>
  </main>;
}
