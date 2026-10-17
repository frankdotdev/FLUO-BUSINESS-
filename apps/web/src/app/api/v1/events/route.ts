import { resourcePath } from "@fluo/core";
import { deps } from "@/server/container.ts";

export async function GET(): Promise<Response> {
  const rows = await deps().store.listPublicEvents(30);
  return Response.json({ events: rows.map(({ event: e, business: b }) => ({ name: e.name, venue: e.venue, startsAtMs: e.startsAtMs, timezone: b.timezone, businessName: b.name, businessSlug: b.slug, path: resourcePath("e", e.name, e.shortId) })) },
    { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120" } });
}
