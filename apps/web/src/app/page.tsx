import Link from "next/link";
import { BUSINESS_TYPES, fmtLocal, isBusinessOpenNow, resourcePath, type BusinessRecord } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { getSession } from "@/server/session.ts";
import {
  IconSearch,
  IconSliders,
  IconUtensils,
  IconShoppingBag,
  IconScissors,
  IconCar,
  IconTicket,
  IconBuilding,
  IconStar,
  IconHeart,
  IconShield,
  IconChevronRight,
  IconSparkles,
  IconStore,
} from "@/components/icons.tsx";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  let rows: BusinessRecord[] = [];
  let events: any[] = [];
  let favorites: BusinessRecord[] = [];

  try {
    const d = deps();
    const results = await Promise.all([
      d.store.listPublicBusinesses(24, 0).catch(() => []),
      d.store.listPublicEvents(8).catch(() => []),
      session ? d.store.listFavoriteBusinesses(session.user.id).catch(() => []) : Promise.resolve([]),
    ]);
    rows = (results[0] ?? []) as BusinessRecord[];
    events = (results[1] ?? []) as any[];
    favorites = (results[2] ?? []) as BusinessRecord[];
  } catch (err) {
    console.warn("Home page database connection/data check:", err);
  }

  const label = new Map(BUSINESS_TYPES.map((t) => [t.id, t.label]));

  // Curated campus discovery highlights (shown when fresh or supplementary)
  const campusHighlights = [
    {
      name: "Mama Chichi Kitchen",
      category: "Food & Drinks",
      desc: "Jollof rice, grilled turkey, and campus meal combos",
      rating: "4.9",
      distance: "0.2 km",
      badge: "Fast Delivery",
      link: "/search?group=food",
      open: true,
      price: "From ₦1,500",
    },
    {
      name: "Campus Keke & Dispatch",
      category: "Transport & Courier",
      desc: "Fast rides from campus gates to hostels, package runs",
      rating: "4.8",
      distance: "Campus Gate",
      badge: "Negotiable Fare",
      link: "/search?q=keke",
      open: true,
      price: "From ₦300",
    },
    {
      name: "Elite Grooming Lounge",
      category: "Barbershop & Braids",
      desc: "Precision fades, braids, and walk-in salon styling",
      rating: "4.9",
      distance: "Student Mall",
      badge: "Instant Booking",
      link: "/search?group=beauty",
      open: true,
      price: "From ₦2,000",
    },
    {
      name: "Campus Supermart",
      category: "Groceries & Essentials",
      desc: "Provisions, toiletries, stationeries, and chilled drinks",
      rating: "4.7",
      distance: "Hall 4 Hub",
      badge: "In Stock",
      link: "/search?group=retail",
      open: true,
      price: "Storefront & Pickup",
    },
  ];

  return (
    <>
      {/* 1. Header Greeting (Dropify visual specification) */}
      <section className="home-headline">
        <h1>
          {session ? `Welcome back, ${session.user.name.split(" ")[0]}` : "Your next find is just a search away"}
        </h1>
        <p>Find meals, groceries, rides, salon appointments, and events on campus.</p>
      </section>

      {/* 2. Prominent Search Bar with Filter */}
      <section className="search-container">
        <form action="/search" method="get" role="search" className="search-bar-wrap">
          <IconSearch size={18} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <input
            name="q"
            type="search"
            className="search-bar-input"
            placeholder="Search businesses, dishes, services, tickets..."
            aria-label="Search Fluo"
            maxLength={60}
          />
          <Link
            href="/search"
            className="filter-btn"
            aria-label="Search filters and categories"
            title="Browse all filters"
          >
            <IconSliders size={17} />
          </Link>
        </form>
      </section>

      {/* 3. 6-Tile Compact Category Grid */}
      <nav className="category-grid" aria-label="Quick Categories">
        <Link href="/search?group=food" className="category-tile">
          <div className="category-tile-icon">
            <IconUtensils size={22} style={{ color: "var(--coral)" }} />
          </div>
          <span className="category-tile-label">Food</span>
        </Link>

        <Link href="/search?group=retail" className="category-tile">
          <div className="category-tile-icon">
            <IconShoppingBag size={22} style={{ color: "var(--coral)" }} />
          </div>
          <span className="category-tile-label">Mart</span>
        </Link>

        <Link href="/search?group=beauty" className="category-tile">
          <div className="category-tile-icon">
            <IconScissors size={22} style={{ color: "var(--coral)" }} />
          </div>
          <span className="category-tile-label">Salons</span>
        </Link>

        <Link href="/search?q=keke" className="category-tile">
          <div className="category-tile-icon">
            <IconCar size={22} style={{ color: "var(--coral)" }} />
          </div>
          <span className="category-tile-label">Rides</span>
        </Link>

        <Link href="/search?group=events" className="category-tile">
          <div className="category-tile-icon">
            <IconTicket size={22} style={{ color: "var(--coral)" }} />
          </div>
          <span className="category-tile-label">Events</span>
        </Link>

        <Link href="/search?q=stay" className="category-tile">
          <div className="category-tile-icon">
            <IconBuilding size={22} style={{ color: "var(--coral)" }} />
          </div>
          <span className="category-tile-label">Stays</span>
        </Link>
      </nav>

      {/* 4. Horizontal Editorial Carousel ("What's new on Fluo") */}
      <section style={{ margin: "24px 0 28px" }}>
        <div className="row between" style={{ alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <IconSparkles size={18} style={{ color: "var(--coral)" }} /> What's new on Fluo
          </h2>
          <Link href="/search" className="small muted" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
            See all <IconChevronRight size={14} />
          </Link>
        </div>

        <div className="editorial-carousel">
          {/* Card 1: Midnight Bites */}
          <Link
            href="/search?group=food"
            className="editorial-card"
            style={{
              background: "linear-gradient(135deg, #1E232A 0%, #171A1F 100%)",
              color: "#FFFFFF",
            }}
          >
            <div>
              <span className="editorial-tag" style={{ background: "rgba(241, 111, 97, 0.25)", color: "#F16F61" }}>
                CAMPUS CRAVINGS
              </span>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: "8px 0 4px", color: "#FFFFFF" }}>
                Hot Meals &amp; Night Bites
              </h3>
              <p style={{ fontSize: 12.5, color: "#9CA3AF", margin: 0 }}>
                Order from your favorite hall spots with doorstep delivery.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <span className="badge" style={{ background: "rgba(255,255,255,0.15)", color: "#FFFFFF", fontSize: 11 }}>
                Order Food
              </span>
              <span style={{ fontSize: 12, color: "#F16F61", fontWeight: 700 }}>Explore &rarr;</span>
            </div>
          </Link>

          {/* Card 2: Merchant OS Free Trial */}
          <Link
            href="/app/new"
            className="editorial-card"
            style={{
              background: "linear-gradient(135deg, #FFF5F4 0%, #FEE8E5 100%)",
              border: "1px solid #FCD4CF",
              color: "var(--ink)",
            }}
          >
            <div>
              <span className="editorial-tag" style={{ background: "#F16F61", color: "#FFFFFF" }}>
                30 DAYS FREE
              </span>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: "8px 0 4px", color: "var(--ink)" }}>
                Start Selling on Campus
              </h3>
              <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0 }}>
                POS, storefront, QR menus, bookings &amp; automated payouts.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <span className="badge coral" style={{ fontSize: 11 }}>
                Open Business
              </span>
              <span style={{ fontSize: 12, color: "var(--coral)", fontWeight: 700 }}>Free Trial &rarr;</span>
            </div>
          </Link>

          {/* Card 3: Ride & Dispatch */}
          <Link
            href="/search?q=keke"
            className="editorial-card"
            style={{
              background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)",
              border: "1px solid #BBF7D0",
              color: "#166534",
            }}
          >
            <div>
              <span className="editorial-tag" style={{ background: "#16A34A", color: "#FFFFFF" }}>
                FAST &amp; LOCAL
              </span>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: "8px 0 4px", color: "#14532D" }}>
                Keke &amp; Errand Runners
              </h3>
              <p style={{ fontSize: 12.5, color: "#166534", margin: 0 }}>
                Negotiate directly with drivers and riders across campus.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <span className="badge ok" style={{ fontSize: 11 }}>
                Campus Mobility
              </span>
              <span style={{ fontSize: 12, color: "#15803D", fontWeight: 700 }}>Find Rides &rarr;</span>
            </div>
          </Link>
        </div>
      </section>

      {/* 5. Escrow Protection Banner */}
      <section style={{ margin: "20px 0" }}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--coral-subtle)",
              color: "var(--coral)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconShield size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>Fluo Escrow &amp; Buyer Protection</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Guest &amp; member orders are held safely. Sellers get paid only after you verify arrival.
            </div>
          </div>
        </div>
      </section>

      {/* 6. Your Regular Spots (Saved Favorites) */}
      {favorites.length > 0 && (
        <section style={{ margin: "28px 0" }}>
          <div className="row between" style={{ alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <IconHeart size={18} fill="var(--coral)" style={{ color: "var(--coral)" }} /> Your Regular Spots
            </h2>
            <span className="badge ok">{favorites.length} saved</span>
          </div>
          <div className="grid">
            {favorites.map((b) => (
              <Link key={b.slug} className="card cover" href={`/b/${b.slug}`}>
                <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>{b.name}</h3>
                <p className="muted small" style={{ margin: 0 }}>
                  {label.get(b.typeId) ?? "Campus Merchant"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 7. Upcoming Events & Shows */}
      {events.length > 0 && (
        <section style={{ margin: "28px 0" }}>
          <div className="row between" style={{ alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <IconTicket size={18} style={{ color: "var(--coral)" }} /> Upcoming Events
            </h2>
            <Link href="/search?group=events" className="small muted" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              See all <IconChevronRight size={14} />
            </Link>
          </div>
          <div className="grid">
            {events.map(({ event: e, business: b }) => (
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

      {/* 8. Popular Near You (Live businesses or rich campus highlights) */}
      <section style={{ margin: "28px 0" }}>
        <div className="row between" style={{ alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <IconStore size={18} style={{ color: "var(--coral)" }} /> Popular Near You
          </h2>
          <Link href="/search" className="small muted" style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
            Explore all <IconChevronRight size={14} />
          </Link>
        </div>

        {rows.length > 0 ? (
          <div className="grid">
            {rows.map((b) => {
              const openStatus = isBusinessOpenNow(null, b.timezone);
              return (
                <Link key={b.slug} href={`/b/${b.slug}`} className="biz-card-item">
                  <div className="biz-card-header">
                    <div>
                      <h3 className="biz-card-title">{b.name}</h3>
                      <div className="biz-card-category">{label.get(b.typeId) ?? "Campus Merchant"}</div>
                    </div>
                    <span className={`badge ${openStatus.isOpen ? "ok" : "warn"}`} style={{ fontSize: 11 }}>
                      {openStatus.isOpen ? "Open" : "Closed"}
                    </span>
                  </div>

                  <div className="biz-card-footer">
                    <span className="biz-rating">
                      <IconStar size={13} fill="currentColor" /> 4.9
                    </span>
                    <span>&middot;</span>
                    {b.acceptsAutomatic && <span className="badge ok" style={{ fontSize: 11 }}>Pay Online</span>}
                    {b.allowsTransfer && <span className="badge" style={{ fontSize: 11 }}>Transfer</span>}
                    <span style={{ marginLeft: "auto", fontWeight: 700, color: "var(--coral)", fontSize: 12 }}>
                      View &rarr;
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="grid">
            {campusHighlights.map((spot) => (
              <Link key={spot.name} href={spot.link} className="biz-card-item">
                <div className="biz-card-header">
                  <div>
                    <h3 className="biz-card-title">{spot.name}</h3>
                    <div className="biz-card-category">{spot.category}</div>
                  </div>
                  <span className="badge ok" style={{ fontSize: 11 }}>
                    {spot.badge}
                  </span>
                </div>
                <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "4px 0 10px", lineHeight: 1.4 }}>
                  {spot.desc}
                </p>
                <div className="biz-card-footer">
                  <span className="biz-rating">
                    <IconStar size={13} fill="currentColor" /> {spot.rating}
                  </span>
                  <span>&middot;</span>
                  <span>{spot.distance}</span>
                  <span className="biz-price-tag" style={{ marginLeft: "auto" }}>
                    {spot.price}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 9. Open Your Business Prompt (30-day Free Trial) */}
      <section
        style={{
          margin: "32px 0 16px",
          padding: "24px 20px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          textAlign: "center",
        }}
      >
        <span className="badge coral" style={{ marginBottom: 10, fontSize: 11, fontWeight: 700 }}>
          30-DAY FREE TRIAL INCLUDED
        </span>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: "6px 0 8px", letterSpacing: "-0.02em" }}>
          Run your campus business on Fluo
        </h2>
        <p className="muted" style={{ fontSize: 14, maxWidth: 440, margin: "0 auto 18px" }}>
          Accept card payments and bank transfers, take customer orders, issue QR event tickets, and track your cashflow.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          <Link href="/app/new" className="btn btn-primary" style={{ minHeight: 44, padding: "0 20px" }}>
            Start Free Trial
          </Link>
          <Link href="/search" className="btn btn-subtle" style={{ minHeight: 44, padding: "0 18px" }}>
            Explore Marketplace
          </Link>
        </div>
      </section>
    </>
  );
}
