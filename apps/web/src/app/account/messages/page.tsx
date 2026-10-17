import Link from "next/link";
import { fmtLocal } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { requireUser } from "@/server/session.ts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages", robots: { index: false, follow: false } };

export default async function Inbox() {
  const user = await requireUser("/account/messages");
  const d = deps();
  const rows = await d.store.listConversationsForCustomer(user.id, 50);
  const biz = new Map<string, { name: string; tz: string }>();
  for (const c of rows) { const b = await d.store.getBusiness(c.businessId); if (b) biz.set(c.businessId, { name: b.name, tz: b.timezone }); }
  return (<><h1>Messages</h1>{rows.length === 0 ? <p className="notice">No conversations yet. Open a business page and tap Message.</p> : (
    <div className="grid">{rows.map((c) => (<Link key={c.id} className="card" href={`/account/messages/${c.id}?b=${c.businessId}`}><h3>{biz.get(c.businessId)?.name}</h3>
      <p className="muted small">{fmtLocal(c.lastMessageAtMs, biz.get(c.businessId)?.tz ?? "Africa/Lagos")}</p>{c.customerUnread > 0 && <span className="badge ok">{c.customerUnread} new</span>}</Link>))}</div>)}</>);
}
