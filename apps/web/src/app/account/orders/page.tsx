import Link from "next/link";
import { fmtLocal, fmtMoney } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { requireUser } from "@/server/session.ts";

export const dynamic = "force-dynamic";
export const metadata = { title: "My orders and bookings" };

export default async function MyOrders() {
  const user = await requireUser("/account/orders");
  const d = deps();
  const [orders, bookings] = await Promise.all([d.store.listOrdersForUser(user.id, 50), d.store.listBookingsForUser(user.id, 50)]);
  const names = new Map<string, { name: string; tz: string }>();
  for (const id of new Set([...orders.map((o) => o.businessId), ...bookings.map((b) => b.businessId)])) { const b = await d.store.getBusiness(id); if (b) names.set(id, { name: b.name, tz: b.timezone }); }
  return (
    <>
      <h1>My orders and bookings</h1>
      {orders.length + bookings.length === 0 && <p className="notice">Nothing yet. Find a business on the home page.</p>}
      <div className="grid">
        {orders.map((o) => (<Link key={o.id} className="card" href={`/account/orders/${o.id}?b=${o.businessId}`}><h3>{names.get(o.businessId)?.name}</h3><p className="muted small">Order, {fmtMoney(o.totalMinor, o.currency)}</p><span className="badge">{o.status.replace("_", " ")}</span></Link>))}
        {bookings.map((b) => (<Link key={b.id} className="card" href={`/account/orders/${b.id}?b=${b.businessId}`}><h3>{names.get(b.businessId)?.name}</h3><p className="muted small">Booking, {fmtLocal(b.startMs, names.get(b.businessId)?.tz ?? "UTC")}</p><span className="badge">{b.status}</span></Link>))}
      </div>
    </>
  );
}
