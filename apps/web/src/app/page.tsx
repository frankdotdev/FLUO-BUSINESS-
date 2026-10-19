import { deps } from "@/server/container.ts";
import { getSession } from "@/server/session.ts";
import { HomeView } from "@/components/home-view.tsx";
import { type BusinessRecord, fmtMoney, fmtLocal, resourcePath } from "@fluo/core";
import { photo } from "@/server/media.ts";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  let businesses: BusinessRecord[] = [];
  let favorites: BusinessRecord[] = [];
  let rawProducts: any[] = [];
  let rawEvents: any[] = [];
  let regularBusinessIds: string[] = [];

  try {
    const d = deps();
    const results = await Promise.all([
      d.store.listPublicBusinesses(30, 0).catch(() => []),
      d.store.listPublicProducts(30, 0).catch(() => []),
      d.store.listPublicEvents(10).catch(() => []),
      session ? d.store.listFavoriteBusinesses(session.user.id).catch(() => []) : Promise.resolve([]),
      session ? d.store.listOrdersForUser(session.user.id, 10).catch(() => []) : Promise.resolve([]),
    ]);
    businesses = (results[0] ?? []) as BusinessRecord[];
    rawProducts = (results[1] ?? []) as any[];
    rawEvents = (results[2] ?? []) as any[];
    favorites = (results[3] ?? []) as BusinessRecord[];
    const userOrders = (results[4] ?? []) as any[];

    // User's regular spots: favorites + businesses they've ordered from
    const orderedBizIds = userOrders.map((o) => o.businessId);
    regularBusinessIds = Array.from(new Set([...favorites.map((b) => b.id), ...orderedBizIds]));
  } catch (err) {
    console.warn("Home page database connection/data check:", err);
  }

  // Format products for client with safe serializable values
  const products = rawProducts.map(({ product: p, business: b }) => {
    const totalPhotos = (p.galleryAssetIds && p.galleryAssetIds.length > 0)
      ? p.galleryAssetIds.length
      : p.imageAssetId ? 1 : 0;
    const discount = (p.compareAtPriceMinor && p.compareAtPriceMinor > p.priceMinor)
      ? Math.round((Number(p.compareAtPriceMinor - p.priceMinor) * 100) / Number(p.compareAtPriceMinor))
      : null;
    return {
      id: p.id,
      shortId: p.shortId,
      name: p.name,
      url: resourcePath("p", p.name, p.shortId),
      description: p.description ?? null,
      priceFormatted: fmtMoney(p.priceMinor, p.currency),
      compareAtPriceFormatted: p.compareAtPriceMinor ? fmtMoney(p.compareAtPriceMinor, p.currency) : null,
      discountPercent: discount,
      promoBadge: p.promoBadge ?? null,
      photoUrl: photo(b.id, p.imageAssetId, "card"),
      photoCount: totalPhotos,
      businessName: b.name,
      businessSlug: b.slug,
    };
  });

  // Format events for client
  const events = rawEvents.map(({ event: e, business: b }) => ({
    id: e.id,
    shortId: e.shortId,
    name: e.name,
    url: resourcePath("e", e.name, e.shortId),
    startsAtFormatted: fmtLocal(e.startsAtMs, b.timezone),
    businessName: b.name,
    businessSlug: b.slug,
  }));

  return (
    <HomeView
      initialBusinesses={businesses}
      initialProducts={products}
      initialEvents={events}
      favoriteIds={favorites.map((b) => b.id)}
      regularBusinessIds={regularBusinessIds}
      isAuthenticated={Boolean(session)}
    />
  );
}

