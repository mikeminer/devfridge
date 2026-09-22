import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CHAPTERS, HACKATHON_ORIGIN } from '@/lib/hackathon';
import s from '../../hackathon.module.css';

export function generateStaticParams() { return CHAPTERS.map(({slug}) => ({slug})); }
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const c = CHAPTERS.find(c=>c.slug===params.slug);
  return c ? { title: { absolute: `${c.title} — DevFridge Hackathon` }, description:c.intro, alternates: {canonical:`${HACKATHON_ORIGIN}/handbook/${c.slug}`}, openGraph: {title:`${c.title} — DevFridge Hackathon`,description:c.intro,url:`${HACKATHON_ORIGIN}/handbook/${c.slug}`,images:[`${HACKATHON_ORIGIN}/opengraph-image`]} } : {};
}
export default function HandbookPage({params}:{params:{slug:string}}) {
  const index=CHAPTERS.findIndex(c=>c.slug===params.slug);
  if(index<0) notFound();
  const c=CHAPTERS[index];
  return <main id="main" className={s.docs}>
    <aside><a href="/hackathon">← Hackathon home</a><p className={s.eyebrow}>BUILDER HANDBOOK</p><nav aria-label="Handbook chapters">{CHAPTERS.map((item,i)=><a key={item.slug} href={`/hackathon/handbook/${item.slug}`} aria-current={item.slug===c.slug?'page':undefined}><span>0{i+1}</span>{item.title}</a>)}</nav><a href="/hackathon/kit/handbook.md" download>Download complete handbook ↓</a></aside>
    <article><p className={s.eyebrow}>GUIDE 0{index+1} / PREPARATION EDITION</p><h1>{c.title}</h1><p className={s.docIntro}>{c.intro}</p>{c.sections.map((section,i)=><section key={section.title} id={`section-${i+1}`}><h2>{section.title}</h2>{section.paragraphs?.map(p=><p key={p}>{p}</p>)}{section.items&&<ul>{section.items.map(item=><li key={item}>{item}</li>)}</ul>}</section>)}<div className={s.resourceLinks}><h2>Resources</h2>{c.links.map(([label,url])=><a href={url.startsWith('/')?`/hackathon${url}`:url} key={label}>{label} ↗</a>)}</div><div className={s.docPager}>{index>0&&<a href={`/hackathon/handbook/${CHAPTERS[index-1].slug}`}>← {CHAPTERS[index-1].title}</a>}{index<CHAPTERS.length-1&&<a href={`/hackathon/handbook/${CHAPTERS[index+1].slug}`}>{CHAPTERS[index+1].title} →</a>}</div></article>
  </main>;
}
