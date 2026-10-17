import Link from "next/link";
import { BUSINESS_TYPES, categories, fmtLocal, fmtMoney, resourcePath, searchMarketplace, typeIdsInGroup } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { rateLimited } from "@/server/rate.ts";
import { photo } from "@/server/media.ts";
import { getSession } from "@/server/session.ts";
import { IconSearch, IconHeart, IconUtensils, IconScissors, IconShoppingBag, IconCar, IconTicket } from "@/components/icons.tsx";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search & Discover", robots: { index: false, follow: true } };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; group?: string; filter?: string }>;
}) {
  const sp = await searchParams;
  if (await rateLimited("search")) {
    return <p className="alert" role="alert">Too many searches. Please wait a minute.</p>;
  }

  const d = deps();
  const session = await getSession();
  const cats = categories();
  const group = cats.find((c) => c.group === sp.group);
  const label = new Map(BUSINESS_TYPES.map((t) => [t.id, t.label]));

  let favoriteBusinesses: any[] = [];
  if (sp.filter === "favorites" && session) {
    favoriteBusinesses = await d.store.listFavoriteBusinesses(session.user.id).catch(() => []);
  }

  const found = group
    ? {
        query: "",
        businesses: await d.store.listPublicBusinesses(50, 0, undefined, typeIdsInGroup(group.group)),
        products: [],
        events: [],
      }
    : sp.filter === "favorites"
    ? { query: "", businesses: favoriteBusinesses, products: [], events: [] }
    : await searchMarketplace(d, sp.q ?? "");

  const empty = found.businesses.length + found.products.length + found.events.length === 0;

  return (
    <div style={{ maxWidth: 840, margin: "10px auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 14px" }}>
        {sp.filter === "favorites"
          ? "Your Regular Spots"
          : group
          ? group.label
          : sp.q
          ? `Results for "${sp.q}"`
          : "Discover Fluo"}
      </h1>

      {/* Prominent Search Bar */}
      <form action="/search" method="get" role="search" className="search-bar-wrap" style={{ marginBottom: 14 }}>
        <IconSearch size={18} style={{ color: "var(--muted)", flexShrink: 0 }} />
        <input
          name="q"
          type="search"
          defaultValue={sp.q ?? ""}
          placeholder="Search businesses, items, services, events..."
          aria-label="Search"
          className="search-bar-input"
          maxLength={60}
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ minHeight: 36, padding: "0 14px", fontSize: 13, borderRadius: "var(--radius-md)" }}
        >
          Search
        </button>
      </form>

      {/* Category Filter Pills */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 16 }}>
        <Link
          href="/search"
          className={`badge ${!sp.group && !sp.filter ? "ok" : ""}`}
          style={{ padding: "6px 12px", whiteSpace: "nowrap" }}
        >
          All
        </Link>
        {cats.map((c) => (
          <Link
            key={c.group}
            className={`badge ${group?.group === c.group ? "ok" : ""}`}
            href={`/search?group=${c.group}`}
            style={{ padding: "6px 12px", whiteSpace: "nowrap" }}
          >
            {c.label}
          </Link>
        ))}
      </div>

      {sp.filter === "favorites" && !session && (
        <div
          style={{
            padding: "24px 20px",
            background: "var(--surface)",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-lg)",
            textAlign: "center",
            margin: "20px 0",
          }}
        >
          <IconHeart size={32} style={{ color: "var(--coral)", marginBottom: 8 }} />
          <h3 style={{ margin: "0 0 6px" }}>Keep track of your regular spots</h3>
          <p className="muted small" style={{ maxWidth: 360, margin: "0 auto 16px" }}>
            Sign in to save your favorite campus food joints, keke drivers, and barbers for quick 1-click reordering.
          </p>
          <Link href="/sign-in" className="btn btn-primary">
            Sign In to Save Favorites
          </Link>
        </div>
      )}

      {empty && (found.query.length >= 2 || group || sp.filter === "favorites") && (
        <div style={{ padding: "32px 16px", textAlign: "center" }}>
          <p className="notice" style={{ margin: "0 auto", maxWidth: 440 }}>
            {sp.filter === "favorites"
              ? "You haven't saved any regular spots yet. Tap the heart on any business page to pin it here!"
              : `Nothing found${found.query ? ` for "${found.query}"` : ""}. Try a shorter query or browse a category above.`}
          </p>
        </div>
      )}

      {found.businesses.length > 0 && (
        <section style={{ margin: "24px 0" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>Businesses</h2>
          <div className="grid">
            {found.businesses.map((b) => (
              <Link key={b.id} className="card cover" href={`/b/${b.slug}`}>
                <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>{b.name}</h3>
                <p className="muted small" style={{ margin: 0 }}>
                  {label.get(b.typeId) ?? "Campus Business"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {found.products.length > 0 && (
        <section style={{ margin: "24px 0" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>Items &amp; Dishes</h2>
          <div className="grid">
            {found.products.map(({ product: p, business: b }) => (
              <Link key={p.id} className="card cover" href={resourcePath("p", p.name, p.shortId)}>
                {photo(b.id, p.imageAssetId, "card") && (
                  <img
                    className="photo"
                    src={photo(b.id, p.imageAssetId, "card")!}
                    alt={p.name}
                    width={480}
                    height={360}
                    loading="lazy"
                  />
                )}
                <h3 style={{ margin: "6px 0 2px", fontSize: 16 }}>{p.name}</h3>
                <p style={{ margin: "0 0 4px", fontWeight: 700, color: "var(--coral)" }}>
                  {fmtMoney(p.priceMinor, p.currency)}
                </p>
                <p className="muted small" style={{ margin: 0 }}>
                  {b.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {found.events.length > 0 && (
        <section style={{ margin: "24px 0" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px" }}>Events &amp; Tickets</h2>
          <div className="grid">
            {found.events.map(({ event: e, business: b }) => (
              <Link key={e.id} className="card cover" href={resourcePath("e", e.name, e.shortId)}>
                <span className="badge ok" style={{ marginBottom: 6 }}>
                  Tickets on Sale
                </span>
                <h3 style={{ margin: "4px 0", fontSize: 16 }}>{e.name}</h3>
                <p className="muted small" style={{ margin: 0 }}>
                  {fmtLocal(e.startsAtMs, b.timezone)}
                  <br />
                  {b.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
