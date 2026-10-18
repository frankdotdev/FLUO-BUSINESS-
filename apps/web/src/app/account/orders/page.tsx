import Link from "next/link";
import { fmtLocal, fmtMoney } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { requireUser } from "@/server/session.ts";
import { IconReceipt, IconCalendar, IconArrowRight, IconShield } from "@/components/icons.tsx";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Orders & Bookings — Fluo" };

export default async function MyOrders() {
  const user = await requireUser("/account/orders");
  const d = deps();
  const [orders, bookings] = await Promise.all([
    d.store.listOrdersForUser(user.id, 50),
    d.store.listBookingsForUser(user.id, 50),
  ]);
  const names = new Map<string, { name: string; tz: string; slug: string }>();
  for (const id of new Set([...orders.map((o) => o.businessId), ...bookings.map((b) => b.businessId)])) {
    const b = await d.store.getBusiness(id);
    if (b) names.set(id, { name: b.name, tz: b.timezone, slug: b.slug });
  }

  const hasItems = orders.length + bookings.length > 0;

  return (
    <div style={{ maxWidth: 840, margin: "0 auto", padding: "24px 16px 80px" }}>
      <div style={{ marginBottom: 24 }}>
        <span className="section-kicker">ACTIVITY &amp; RECEIPTS</span>
        <h1 style={{
          fontFamily: "Manrope, sans-serif",
          fontSize: "clamp(24px, 3.5vw, 32px)",
          fontWeight: 800,
          letterSpacing: "-1px",
          margin: "4px 0 6px",
          color: "var(--ink)",
        }}>
          Orders &amp; Bookings
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
          Track delivery status, view digital receipts, and manage your upcoming reservations.
        </p>
      </div>

      {!hasItems ? (
        <div className="empty-dashboard" style={{ background: "#ffffff", borderRadius: 20, border: "1px solid var(--line)" }}>
          <span style={{ background: "var(--coral-soft)", color: "var(--coral-dark)" }}>▤</span>
          <b>No orders or bookings yet</b>
          <p>Explore your favourite local restaurants, shops, and services to place your first order.</p>
          <Link href="/search" className="primary-button">
            Explore Fluo <span>↗</span>
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {orders.map((o) => {
            const biz = names.get(o.businessId);
            const statusLabel = o.status.replace("_", " ");
            const isCompleted = o.status === "completed" || o.status === "paid";
            return (
              <Link
                key={o.id}
                href={`/account/orders/${o.id}?b=${o.businessId}`}
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--line)",
                  borderRadius: 18,
                  padding: "18px 22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  textDecoration: "none",
                  color: "inherit",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                  transition: "transform 0.15s, border-color 0.15s",
                }}
                className="store-card"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: isCompleted ? "#edf6f0" : "var(--coral-soft)",
                    color: isCompleted ? "var(--green)" : "var(--coral-dark)",
                    display: "grid",
                    placeItems: "center",
                  }}>
                    <IconReceipt size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontFamily: "Manrope, sans-serif", fontSize: 16, fontWeight: 700 }}>
                      {biz?.name ?? "Order"}
                    </h3>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                      Total {fmtMoney(o.totalMinor, o.currency)} &bull; Order #{o.id.slice(0, 8)}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className={`open-badge`} style={{
                    position: "static",
                    background: isCompleted ? "#edf6f0" : "#fef3c7",
                    color: isCompleted ? "var(--green)" : "#92400e",
                    textTransform: "capitalize",
                  }}>
                    {statusLabel}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    Details <IconArrowRight size={13} />
                  </span>
                </div>
              </Link>
            );
          })}

          {bookings.map((b) => {
            const biz = names.get(b.businessId);
            return (
              <Link
                key={b.id}
                href={`/account/orders/${b.id}?b=${b.businessId}`}
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--line)",
                  borderRadius: 18,
                  padding: "18px 22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  textDecoration: "none",
                  color: "inherit",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                }}
                className="store-card"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "var(--blue)",
                    color: "#1e40af",
                    display: "grid",
                    placeItems: "center",
                  }}>
                    <IconCalendar size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontFamily: "Manrope, sans-serif", fontSize: 16, fontWeight: 700 }}>
                      {biz?.name ?? "Appointment"}
                    </h3>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                      {fmtLocal(b.startMs, biz?.tz ?? "Africa/Lagos")}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="open-badge" style={{ position: "static", textTransform: "capitalize" }}>
                    {b.status}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    Details <IconArrowRight size={13} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
