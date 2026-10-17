import Link from "next/link";
import { BUSINESS_TYPES, categories, fmtLocal, isBusinessOpenNow, resourcePath, type BusinessRecord } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { getSession } from "@/server/session.ts";
import { IconUtensils, IconCar, IconScissors, IconTicket, IconShoppingBag, IconShield, IconHeart } from "@/components/icons.tsx";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  const d = deps();
  const [rows, events, favorites] = await Promise.all([
    d.store.listPublicBusinesses(24, 0),
    d.store.listPublicEvents(8),
    session ? d.store.listFavoriteBusinesses(session.user.id) : Promise.resolve([] as BusinessRecord[]),
  ]);
  const label = new Map(BUSINESS_TYPES.map((t) => [t.id, t.label]));

  return (
    <>
      <div style={{ margin: "20px 0 16px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.03em", margin: "0 0 8px" }}>
          Campus life, all in one place.
        </h1>
        <p className="muted" style={{ fontSize: "16px", margin: "0 0 16px" }}>
          Discover local shops, order food, book salon appointments, ride keke/bikes, and attend events.
        </p>
        <div className="row" style={{ gap: "10px" }}>
          <Link className="btn btn-primary" href="/sign-up">Open your business</Link>
          <Link className="btn" href="/search">Browse marketplace</Link>
        </div>
      </div>

      {/* Quick Action Category Shortcuts */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", padding: "8px 0 16px", margin: "8px 0" }}>
        <Link href="/search?group=food" className="badge" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: "14px", whiteSpace: "nowrap", textDecoration: "none" }}>
          <IconUtensils size={15} /> Food &amp; Snacks
        </Link>
        <Link href="/search?q=keke" className="badge" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: "14px", whiteSpace: "nowrap", textDecoration: "none" }}>
          <IconCar size={15} /> Keke &amp; Bike Rides
        </Link>
        <Link href="/search?group=beauty" className="badge" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: "14px", whiteSpace: "nowrap", textDecoration: "none" }}>
          <IconScissors size={15} /> Salons &amp; Grooming
        </Link>
        <Link href="/search?group=events" className="badge" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: "14px", whiteSpace: "nowrap", textDecoration: "none" }}>
          <IconTicket size={15} /> Events &amp; Tickets
        </Link>
        <Link href="/search?group=retail" className="badge" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: "14px", whiteSpace: "nowrap", textDecoration: "none" }}>
          <IconShoppingBag size={15} /> Mini-Marts &amp; Essentials
        </Link>
      </div>

      {/* Escrow Trust Banner */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 16px", margin: "12px 0 24px", display: "flex", alignItems: "center", gap: "10px" }}>
        <IconShield size={20} style={{ color: "#4f46e5", flexShrink: 0 }} />
        <span className="small muted">
          <strong>Safe &amp; Protected:</strong> Delivery orders and custom bookings can be held in <strong>Fluo Escrow</strong>. Sellers are paid only after you confirm arrival.
        </span>
      </div>

      {/* Your Regular Spots (Favorites) */}
      {favorites.length > 0 && (
        <section style={{ margin: "28px 0" }}>
          <div className="row between" style={{ alignItems: "baseline", marginBottom: "12px" }}>
            <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <IconHeart size={20} fill="#ef4444" style={{ color: "#ef4444" }} /> Your regular spots
            </h2>
            <span className="badge ok">{favorites.length} saved</span>
          </div>
          <div className="grid">
            {favorites.map((b) => (
              <Link key={b.slug} className="card cover" href={`/b/${b.slug}`}>
                <h3 style={{ margin: "0 0 4px" }}>{b.name}</h3>
                <p className="muted small" style={{ margin: 0 }}>{label.get(b.typeId) ?? "Business"}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      {events.length > 0 && (
        <section style={{ margin: "28px 0" }}>
          <div className="row between" style={{ alignItems: "baseline", marginBottom: "12px" }}>
            <h2 style={{ margin: 0 }}>Upcoming events</h2>
            <Link href="/search?group=events" className="small">See all</Link>
          </div>
          <div className="grid">
            {events.map(({ event: e, business: b }) => (
              <Link key={e.id} className="card cover" href={resourcePath("e", e.name, e.shortId)}>
                <span className="badge ok" style={{ marginBottom: "6px" }}>Tickets on Sale</span>
                <h3 style={{ margin: "4px 0" }}>{e.name}</h3>
                <p className="muted small" style={{ margin: 0 }}>
                  {fmtLocal(e.startsAtMs, b.timezone)}<br />
                  {b.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Businesses Near You */}
      <section style={{ margin: "28px 0" }}>
        <div className="row between" style={{ alignItems: "baseline", marginBottom: "12px" }}>
          <h2 style={{ margin: 0 }}>Businesses near you</h2>
          <Link href="/search" className="small">Explore all</Link>
        </div>
        {rows.length === 0 ? (
          <p className="notice">No businesses are live yet. Be the first to open yours.</p>
        ) : (
          <div className="grid">
            {rows.map((b) => {
              const openStatus = isBusinessOpenNow(null, b.timezone);
              return (
                <div className="card" key={b.slug} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <Link className="cover" href={`/b/${b.slug}`}>
                      <h3 style={{ margin: "0 0 4px" }}>{b.name}</h3>
                      <p className="muted small" style={{ margin: "0 0 8px" }}>{label.get(b.typeId) ?? "Business"}</p>
                    </Link>
                  </div>
                  <div className="row small" style={{ marginTop: "8px", gap: "6px" }}>
                    <span className={`badge ${openStatus.isOpen ? "ok" : "warn"}`} style={{ fontSize: "11px" }}>
                      {openStatus.isOpen ? "Open" : "Closed"}
                    </span>
                    {b.acceptsAutomatic && <span className="badge ok" style={{ fontSize: "11px" }}>Pay online</span>}
                    {b.allowsTransfer && <span className="badge" style={{ fontSize: "11px" }}>Transfer</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
