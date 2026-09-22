import { HACKATHON_ORIGIN } from '@/lib/hackathon';
export function GET() { return new Response(`User-agent: *\nAllow: /\nSitemap: ${HACKATHON_ORIGIN}/sitemap.xml\n`,{headers:{'Content-Type':'text/plain'}}); }
