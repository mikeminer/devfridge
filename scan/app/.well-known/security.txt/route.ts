export const runtime = "nodejs";

export function GET() {
  const body = `Contact: https://connect.devfridge.cool
Policy: https://docs.devfridge.cool/security
Canonical: https://scan.devfridge.cool/.well-known/security.txt
Preferred-Languages: en, it
Expires: 2027-08-21T00:00:00.000Z
`;
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
