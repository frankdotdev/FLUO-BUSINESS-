import Link from "next/link";
import { cookies } from "next/headers";
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
  const c = await cookies();
  const userCampus = c.get("fluo_user_location")?.value || "";
  const cats = categories();
  const group = cats.find((cat) => cat.group === sp.group);
  const label = new Map(BUSINESS_TYPES.map((t) => [t.id, t.label]));

  let favoriteBusinesses: any[] = [];
  let favoriteBusinessIds = new Set<string>();
  if (session) {
    favoriteBusinesses = await d.store.listFavoriteBusinesses(session.user.id).catch(() => []);
    favoriteBusinessIds = new Set(favoriteBusinesses.map((b) => b.id));
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

  // Prioritize search results: favorites first, then user's selected campus / location
  found.products.sort((a, b) => {
    const aFav = favoriteBusinessIds.has(a.business.id) ? 1 : 0;
    const bFav = favoriteBusinessIds.has(b.business.id) ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;

    if (userCampus) {
      const aCamp = a.business.address?.toLowerCase().includes(userCampus.toLowerCase()) ? 1 : 0;
      const bCamp = b.business.address?.toLowerCase().includes(userCampus.toLowerCase()) ? 1 : 0;
      if (aCamp !== bCamp) return bCamp - aCamp;
    }
    return 0;
  });

  found.businesses.sort((a, b) => {
    const aFav = favoriteBusinessIds.has(a.id) ? 1 : 0;
    const bFav = favoriteBusinessIds.has(b.id) ? 1 : 0;
    if (aFav !== bFav) return bFav - aFav;

    if (userCampus) {
      const aCamp = a.address?.toLowerCase().includes(userCampus.toLowerCase()) ? 1 : 0;
      const bCamp = b.address?.toLowerCase().includes(userCampus.toLowerCase()) ? 1 : 0;
      if (aCamp !== bCamp) return bCamp - aCamp;
    }
    return 0;
  });

  const empty = found.businesses.length + found.products.length + found.events.length === 0;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px 80px" }}>
      {/* Header & Search Bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span className="section-kicker">
            {sp.filter === "favorites" ? "SAVED PLACES" : sp.filter === "products" ? "ALL ITEMS & MENU" : sp.filter === "events" ? "COMMUNITY EXPERIENCES" : group ? "CATEGORY" : "DISCOVER"}
          </span>
          {userCampus && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
              📍 Prioritizing near <strong>{userCampus}</strong>
            </span>
          )}
        </div>

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
          <Link href="/sign-in?next=/search?filter=favorites" className="primary-button">
            Sign In <span>↗</span>
          </Link>
        </div>
      )}

      {empty && (
        <div className="empty-dashboard" style={{ background: "#ffffff", borderRadius: 20, border: "1px solid var(--line)", margin: "32px 0" }}>
          <span>🔍</span>
          <b>Nothing found {sp.q ? `for "${sp.q}"` : ""}</b>
          <p>Try searching for popular everyday staples like "iPhone", "charger", "shawarma", or "haircut".</p>
          <Link href="/search" className="primary-button">
            Clear Search &amp; Discover All <span>↗</span>
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
              const isFav = favoriteBusinessIds.has(b.id);
              const isOnCampus = userCampus && b.address?.toLowerCase().includes(userCampus.toLowerCase());
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
                    <div style={{ position: "absolute", top: 8, left: 7, display: "flex", gap: 4, zIndex: 2 }}>
                      <span className="open-badge" style={{ position: "static" }}><i></i> Open now</span>
                      {isFav && (
                        <span style={{ background: "#ffffff", color: "var(--coral-dark)", fontSize: 9, fontWeight: 800, padding: "3px 6px", borderRadius: 8, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                          ♥ Saved
                        </span>
                      )}
                      {isOnCampus && (
                        <span style={{ background: "var(--ink)", color: "#ffffff", fontSize: 9, fontWeight: 800, padding: "3px 6px", borderRadius: 8 }}>
                          📍 Nearby
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="store-details">
                    <div className="store-title-row">
                      <h3>{b.name}</h3>
                      <span className="rating"><IconStar size={11} style={{ fill: "#f59e0b", color: "#f59e0b" }} /> 4.9</span>
                    </div>
                    <p>{label.get(b.typeId) ?? "Local Business"}</p>
                    <div className="store-meta">
                      <span>{b.address || "Verified Store"}</span>
                      <span className="delivery-tag">Visit Store</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Items & Dishes Results (Clean 2-Column Responsive Grid on Mobile) */}
      {found.products.length > 0 && (
        <section style={{ margin: "40px 0" }}>
          <div className="section-heading" style={{ marginBottom: 16 }}>
            <div>
              <span className="section-kicker">ITEMS &amp; PRODUCTS</span>
              <h2>Available Now</h2>
            </div>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{found.products.length} found</span>
          </div>

          <div className="products-2col-grid">
            {found.products.map(({ product: p, business: b }) => {
              const imgUrl = photo(b.id, p.imageAssetId, "card");
              const isFav = favoriteBusinessIds.has(b.id);
              const isOnCampus = userCampus && b.address?.toLowerCase().includes(userCampus.toLowerCase());
              return (
                <Link
                  key={p.id}
                  href={resourcePath("p", p.name, p.shortId)}
                  className="product-card-compact"
                >
                  <div className="product-card-thumb">
                    {imgUrl ? (
                      <img src={imgUrl} alt={p.name} loading="lazy" />
                    ) : (
                      <div style={{ color: "var(--muted)", fontWeight: 700, fontSize: 12, textAlign: "center", padding: "0 8px" }}>
                        {b.name}
                      </div>
                    )}
                    <div style={{ position: "absolute", top: 8, left: 8, display: "flex", flexDirection: "column", gap: 4, zIndex: 2 }}>
                      {isFav && (
                        <span style={{
                          background: "#ffffff",
                          color: "var(--coral-dark)",
                          padding: "2px 7px",
                          borderRadius: 6,
                          fontSize: 9,
                          fontWeight: 800,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                        }}>
                          ♥ Saved Spot
                        </span>
                      )}
                      {isOnCampus && (
                        <span style={{
                          background: "var(--ink)",
                          color: "#ffffff",
                          padding: "2px 7px",
                          borderRadius: 6,
                          fontSize: 9,
                          fontWeight: 800,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                        }}>
                          📍 On Campus
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="product-card-body">
                    <div>
                      <h3 className="product-card-title">{p.name}</h3>
                      <p className="product-card-subtitle">{b.name}</p>
                    </div>
                    <div className="product-card-price-row">
                      <strong className="product-card-price">
                        {fmtMoney(p.priceMinor, p.currency)}
                      </strong>
                      <span className="product-card-cta">
                        Order <IconArrowRight size={10} />
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
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ height: 160, background: "linear-gradient(135deg, #172126 0%, #26363f 100%)", color: "#ffffff", padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#f07866", textTransform: "uppercase", letterSpacing: "1px" }}>
                    Verified Event
                  </span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontFamily: "Manrope, sans-serif", fontWeight: 800 }}>{e.name}</h3>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#9db0b7" }}>{b.name}</p>
                  </div>
                </div>
                <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <IconCalendar size={13} /> {fmtLocal(e.startMs, b.timezone)}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--coral-dark)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                    Tickets <IconArrowRight size={12} />
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
