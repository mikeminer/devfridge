import { CHAPTERS, HACKATHON_ORIGIN } from '@/lib/hackathon';
export function GET() {
  const urls=[HACKATHON_ORIGIN,...CHAPTERS.map(c=>`${HACKATHON_ORIGIN}/handbook/${c.slug}`)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url=>`<url><loc>${url}</loc></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml'}});
}
