import { loadPublishedProjects } from '../../../lib/hackathon-feed.cjs';

export const dynamic = 'force-static';

export function GET() {
  return Response.json(loadPublishedProjects(), {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
