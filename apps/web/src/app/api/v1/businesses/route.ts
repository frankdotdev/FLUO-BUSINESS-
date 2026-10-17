import { deps } from "@/server/container.ts";
import { publicBusiness } from "@/server/public.ts";

export async function GET(req: Request): Promise<Response> {
  const u = new URL(req.url);
  const limit = Math.min(Math.max(Number(u.searchParams.get("limit") ?? 20) || 20, 1), 50);
  const offset = Math.max(Number(u.searchParams.get("offset") ?? 0) || 0, 0);
  const rows = await deps().store.listPublicBusinesses(limit, offset);
  return Response.json({ businesses: rows.map(publicBusiness) }, { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120" } });
}
