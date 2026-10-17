import Link from "next/link";
import { BUSINESS_TYPES } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { requireUser } from "@/server/session.ts";

export const dynamic = "force-dynamic";
export const metadata = { title: "My workspaces" };

export default async function Workspaces() {
  const user = await requireUser("/app");
  const d = deps();
  const mine = (await d.store.membershipsForUser(user.id)).filter((m) => m.status === "active");
  const rows = (await Promise.all(mine.map(async (m) => ({ m, b: await d.store.getBusiness(m.businessId) })))).filter((r) => r.b);
  const label = new Map(BUSINESS_TYPES.map((t) => [t.id, t.label]));
  return (
    <>
      <h1>Hello, {user.name.split(" ")[0]}</h1>
      <p className="muted">Switch between your personal account and every business you own or work for.</p>
      <div className="row"><Link className="btn" href="/">Shop as a customer</Link><Link className="btn" href="/account/orders">My orders</Link><Link className="btn btn-primary" href="/app/new">Open a business</Link></div>
      <h2>Your businesses</h2>
      {rows.length === 0 ? <p className="notice">You don't have a business yet. Open one in a few minutes.</p> : (
        <div className="grid">{rows.map(({ m, b }) => (
          <Link key={b!.id} className="card cover" href={`/app/${b!.id}`}><h3>{b!.name}</h3><p className="muted small">{label.get(b!.typeId)} &middot; you are {m.role}</p><span className={`badge ${b!.status === "active" ? "ok" : "warn"}`}>{b!.status === "active" ? "Live" : "Draft"}</span></Link>
        ))}</div>
      )}
    </>
  );
}
