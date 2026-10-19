import Link from "next/link";
import { BUSINESS_TYPES, categories, fmtLocal, fmtMoney, resourcePath, searchMarketplace, typeIdsInGroup } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { rateLimited } from "@/server/rate.ts";
import { photo } from "@/server/media.ts";
import { getSession } from "@/server/session.ts";
import { IconSearch, IconHeart, IconShield, IconStar, IconArrowRight, IconCalendar, IconStore } from "@/components/icons.tsx";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search & Discover — Fluo", robots: { index: false, follow: true } };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; group?: string; filter?: string }>;
}) {
  const sp = await searchParams;
  if (await rateLimited("search")) {
    return (
      <div style={{ maxWidth: 840, margin: "40px auto", padding: "16px" }}>
        <p className="alert" role="alert">Too many searches. Please wait a minute and try again.</p>
      </div>
    );
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

  let found: { query: string; businesses: any[]; products: any[]; events: any[] };
  if (sp.filter === "products") {
    const prods = await d.store.listPublicProducts(60, 0).catch(() => []);
    found = { query: "", businesses: [], products: prods, events: [] };
  } else if (sp.filter === "events") {
    const evts = await d.store.listPublicEvents(50).catch(() => []);
    found = { query: "", businesses: [], products: [], events: evts };
  } else if (group) {
    const biz = await d.store.listPublicBusinesses(50, 0, undefined, typeIdsInGroup(group.group)).catch(() => []);
    found = { query: "", businesses: biz, products: [], events: [] };
  } else if (sp.filter === "favorites") {
    found = { query: "", businesses: favoriteBusinesses, products: [], events: [] };
  } else {
    found = await searchMarketplace(d, sp.q ?? "");
  }

  const empty = found.businesses.length + found.products.length + found.events.length === 0;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 80px" }}>
      {/* Header & Search Bar */}
      <div style={{ marginBottom: 24 }}>
        <span className="section-kicker">
          {sp.filter === "favorites" ? "SAVED PLACES" : sp.filter === "products" ? "ALL ITEMS & MENU" : sp.filter === "events" ? "COMMUNITY EXPERIENCES" : group ? "CATEGORY" : "DISCOVER"}
        </span>
        <h1 style={{
          fontFamily: "Manrope, sans-serif",
          fontSize: "clamp(24px, 3.5vw, 36px)",
          fontWeight: 800,
          letterSpacing: "-1px",
          margin: "4px 0 16px",
          color: "var(--ink)",
        }}>
          {sp.filter === "favorites"
            ? "Your Regular Spots"
            : sp.filter === "products"
            ? "Trending Products & Services"
            : sp.filter === "events"
            ? "Upcoming & Trending Events"
            : group
            ? group.label
            : sp.q
            ? `Results for "${sp.q}"`
            : "Explore Everything on Fluo"}
        </h1>

        <form action="/search" method="get" role="search" className="hero-search" style={{ maxWidth: "100%", margin: 0 }}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m16 16 5 5" />
          </svg>
          <input
            name="q"
            type="search"
            defaultValue={sp.q ?? ""}
            placeholder="Search shops, food, services, events..."
            aria-label="Search businesses and services"
            maxLength={60}
          />
          <button type="submit" className="primary-button" style={{ height: 42, padding: "0 18px", borderRadius: 12 }}>
            Search <span>↗</span>
          </button>
        </form>

        {/* Categories Bar */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "16px 0 4px", scrollbarWidth: "none" }}>
          <Link
            href="/search"
            style={{
              padding: "8px 16px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap",
              transition: "all 0.2s",
              background: !sp.group && !sp.filter ? "var(--ink)" : "#ffffff",
              color: !sp.group && !sp.filter ? "#ffffff" : "var(--ink)",
              border: `1px solid ${!sp.group && !sp.filter ? "var(--ink)" : "var(--line)"}`,
            }}
          >
            Everything
          </Link>
          {cats.map((c) => {
            const isActive = group?.group === c.group;
            return (
              <Link
                key={c.group}
                href={`/search?group=${c.group}`}
                style={{
                  padding: "8px 16px",
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 700,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s",
                  background: isActive ? "var(--ink)" : "#ffffff",
                  color: isActive ? "#ffffff" : "var(--ink)",
                  border: `1px solid ${isActive ? "var(--ink)" : "var(--line)"}`,
                }}
              >
                {c.label}
              </Link>
            );
          })}
        </div>
      </div>

      {sp.filter === "favorites" && !session && (
        <div className="empty-dashboard" style={{ background: "#ffffff", borderRadius: 20, border: "1px solid var(--line)", margin: "24px 0" }}>
          <span>♥</span>
          <b>Keep track of your regular spots</b>
          <p>Sign in to save your favorite campus food joints, stores, and services for quick one-tap access.</p>
          <Link href="/sign-in" className="primary-button">
            Sign In to Save Favorites <span>↗</span>
          </Link>
        </div>
      )}

      {empty && (found.query.length >= 2 || group || sp.filter === "favorites") && (
        <div className="empty-dashboard" style={{ background: "#ffffff", borderRadius: 20, border: "1px solid var(--line)", margin: "24px 0" }}>
          <span>▧</span>
          <b>No matching results found</b>
          <p>
            {sp.filter === "favorites"
              ? "You haven't saved any regular spots yet. Tap the heart icon on any business page to add it here!"
              : `We couldn't find matches for "${found.query || group?.label}". Try another search or explore all categories.`}
          </p>
          <Link href="/search" className="secondary-button">
            View all businesses ↗
          </Link>
        </div>
      )}

      {/* Businesses Results */}
      {found.businesses.length > 0 && (
        <section style={{ margin: "32px 0" }}>
          <div className="section-heading" style={{ marginBottom: 16 }}>
            <div>
              <span className="section-kicker">LOCAL HUBS</span>
              <h2>Businesses &amp; Stores</h2>
            </div>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{found.businesses.length} found</span>
          </div>

          <div className="store-grid">
            {found.businesses.map((b) => {
              const logoUrl = photo(b.id, b.logoAssetId, "card");
              return (
                <Link
                  key={b.id}
                  href={`/b/${b.slug}`}
                  className="store-card"
                  style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column" }}
                >
                  <div className="store-image" style={{ position: "relative", background: "var(--canvas)", display: "grid", placeItems: "center" }}>
                    {logoUrl ? (
                      <img src={logoUrl} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{
                        width: 54,
                        height: 54,
                        borderRadius: 16,
                        background: "var(--coral-soft)",
                        color: "var(--coral-dark)",
                        fontFamily: "Manrope, sans-serif",
                        fontSize: 22,
                        fontWeight: 800,
                        display: "grid",
                        placeItems: "center",
                      }}>
                        {b.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="open-badge"><i></i> Open now</span>
                  </div>
                  <div className="store-details">
                    <div className="store-title-row">
                      <h3>{b.name}</h3>
                      <span className="rating"><IconStar size={11} style={{ fill: "#f59e0b", color: "#f59e0b" }} /> 4.8</span>
                    </div>
                    <p>{label.get(b.typeId) ?? "Local Business"}</p>
                    <div className="store-meta">
                      <span>Abakaliki · Verified</span>
                      <span className="delivery-tag">Visit Store</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Items & Dishes Results */}
      {found.products.length > 0 && (
        <section style={{ margin: "40px 0" }}>
          <div className="section-heading" style={{ marginBottom: 16 }}>
            <div>
              <span className="section-kicker">ITEMS &amp; PRODUCTS</span>
              <h2>Available Now</h2>
            </div>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{found.products.length} found</span>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 20,
          }}>
            {found.products.map(({ product: p, business: b }) => {
              const imgUrl = photo(b.id, p.imageAssetId, "card");
              return (
                <Link
                  key={p.id}
                  href={resourcePath("p", p.name, p.shortId)}
                  className="store-card"
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    background: "#ffffff",
                    borderRadius: 20,
                    border: "1px solid var(--line)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ height: 160, background: "var(--canvas)", position: "relative", overflow: "hidden", display: "grid", placeItems: "center" }}>
                    {imgUrl ? (
                      <img src={imgUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ color: "var(--muted)", fontWeight: 700, fontSize: 13 }}>{b.name}</div>
                    )}
                  </div>
                  <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <h3 style={{ margin: "0 0 4px", fontSize: 15, fontFamily: "Manrope, sans-serif", fontWeight: 700 }}>{p.name}</h3>
                      <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--muted)" }}>{b.name}</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                      <strong style={{ fontFamily: "Manrope, sans-serif", fontSize: 16, fontWeight: 800 }}>
                        {fmtMoney(p.priceMinor, p.currency)}
                      </strong>
                      <span style={{ fontSize: 12, color: "var(--coral-dark)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                        Order <IconArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Events Results */}
      {found.events.length > 0 && (
        <section style={{ margin: "40px 0" }}>
          <div className="section-heading" style={{ marginBottom: 16 }}>
            <div>
              <span className="section-kicker">EXPERIENCES</span>
              <h2>Events &amp; Tickets</h2>
            </div>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{found.events.length} found</span>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20,
          }}>
            {found.events.map(({ event: e, business: b }) => (
              <Link
                key={e.id}
                href={resourcePath("e", e.name, e.shortId)}
                className="store-card"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  background: "#ffffff",
                  borderRadius: 20,
                  border: "1px solid var(--line)",
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <span className="open-badge" style={{ position: "static", display: "inline-block", marginBottom: 12 }}>
                    Tickets on sale
                  </span>
                  <h3 style={{ margin: "0 0 6px", fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 800 }}>
                    {e.name}
                  </h3>
                  <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", gap: 5 }}>
                    <IconCalendar size={13} /> {fmtLocal(e.startsAtMs, b.timezone)}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>{b.name}</span>
                  <span style={{ fontSize: 12, color: "var(--coral-dark)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                    Get Tickets <IconArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
