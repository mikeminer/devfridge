import association from "./association.json";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(JSON.stringify(association), {
    headers: {
      // The Android DAL verifier compares the full header value exactly.
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
