import { resourcePath, searchMarketplace } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { env } from "@/server/env.ts";
import { rateLimited } from "@/server/rate.ts";
import { publicBusiness, publicProduct } from "@/server/public.ts";

export async function GET(req: Request): Promise<Response> {
  if (await rateLimited("search")) return Response.json({ error: "rate_limited" }, { status: 429, headers: { "retry-after": "60" } });
  const r = await searchMarketplace(deps(), new URL(req.url).searchParams.get("q") ?? "");
  const base = env().r2?.publicBase;
  return Response.json({
    query: r.query,
    businesses: r.businesses.map(publicBusiness),
    products: r.products.map(({ product: p, business: b }) => ({ ...publicProduct(p, base), businessName: b.name, businessSlug: b.slug, path: resourcePath("p", p.name, p.shortId) })),
    events: r.events.map(({ event: e, business: b }) => ({ name: e.name, startsAtMs: e.startsAtMs, timezone: b.timezone, businessName: b.name, path: resourcePath("e", e.name, e.shortId) })),
  }, { headers: { "cache-control": "public, s-maxage=20, stale-while-revalidate=60" } });
}
