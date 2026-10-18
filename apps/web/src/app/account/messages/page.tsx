import Link from "next/link";
import { fmtLocal } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { requireUser } from "@/server/session.ts";
import { IconMessageSquare, IconArrowRight } from "@/components/icons.tsx";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages — Fluo", robots: { index: false, follow: false } };

export default async function Inbox() {
  const user = await requireUser("/account/messages");
  const d = deps();
  const rows = await d.store.listConversationsForCustomer(user.id, 50);
  const biz = new Map<string, { name: string; tz: string; slug: string }>();
  for (const c of rows) {
    const b = await d.store.getBusiness(c.businessId);
    if (b) biz.set(c.businessId, { name: b.name, tz: b.timezone, slug: b.slug });
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 80px" }}>
      <div style={{ marginBottom: 24 }}>
        <span className="section-kicker">COMMUNICATIONS</span>
        <h1 style={{
          fontFamily: "Manrope, sans-serif",
          fontSize: "clamp(24px, 3.5vw, 32px)",
          fontWeight: 800,
          letterSpacing: "-1px",
          margin: "4px 0 6px",
          color: "var(--ink)",
        }}>
          Direct Messages
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
          Direct communication with your local merchants and service providers.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="empty-dashboard" style={{ background: "#ffffff", borderRadius: 20, border: "1px solid var(--line)" }}>
          <span style={{ background: "var(--coral-soft)", color: "var(--coral-dark)" }}>💬</span>
          <b>No conversations yet</b>
          <p>When you visit a store or service on Fluo, tap "Message" to ask questions or place custom inquiries.</p>
          <Link href="/search" className="primary-button">
            Browse local spots <span>↗</span>
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map((c) => {
            const b = biz.get(c.businessId);
            const name = b?.name ?? "Merchant";
            return (
              <Link
                key={c.id}
                href={`/account/messages/${c.id}?b=${c.businessId}`}
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--line)",
                  borderRadius: 18,
                  padding: "16px 20px",
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
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "var(--coral-soft)",
                    color: "var(--coral-dark)",
                    fontFamily: "Manrope, sans-serif",
                    fontWeight: 800,
                    fontSize: 18,
                    display: "grid",
                    placeItems: "center",
                  }}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: "0 0 4px", fontFamily: "Manrope, sans-serif", fontSize: 16, fontWeight: 700 }}>
                      {name}
                    </h3>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>
                      {fmtLocal(c.lastMessageAtMs, b?.tz ?? "Africa/Lagos")}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {c.customerUnread > 0 ? (
                    <span className="open-badge" style={{ position: "static", background: "var(--coral)" }}>
                      {c.customerUnread} new
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      Open <IconArrowRight size={13} />
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
