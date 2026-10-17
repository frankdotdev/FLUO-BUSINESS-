import { deps } from "@/server/container.ts";
import { env } from "@/server/env.ts";
import { publicBusiness, publicProduct } from "@/server/public.ts";

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await ctx.params;
  const d = deps();
  const b = await d.store.getPublicBusinessBySlug(slug);
  if (!b) return Response.json({ error: "not_found" }, { status: 404 });
  const products = await d.store.listProducts(b.id, ["active"], 100, 0);
  return Response.json({ business: publicBusiness(b), products: products.map((p) => publicProduct(p, env().r2?.publicBase)) }, { headers: { "cache-control": "public, s-maxage=30, stale-while-revalidate=120" } });
}
