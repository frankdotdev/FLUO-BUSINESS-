import Link from "next/link";
import { BUSINESS_TYPES } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { requireUser } from "@/server/session.ts";
import { publishAction, deleteDraftBusinessAction } from "@/app/actions.ts";
import { IconStore, IconPlus, IconSparkles, IconChevronRight, IconTrash, IconExternalLink } from "@/components/icons.tsx";

export const dynamic = "force-dynamic";
export const metadata = { title: "My workspaces" };

export default async function Workspaces() {
  const user = await requireUser("/app");
  const d = deps();
  const mine = (await d.store.membershipsForUser(user.id)).filter((m) => m.status === "active");
  const rows = (await Promise.all(mine.map(async (m) => ({ m, b: await d.store.getBusiness(m.businessId) })))).filter(
    (r) => r.b,
  );
  const label = new Map(BUSINESS_TYPES.map((t) => [t.id, t.label]));

  return (
    <div style={{ maxWidth: 780, margin: "16px auto", padding: "0 16px" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>
          Workspaces • {user.name.split(" ")[0]}
        </h1>
        <p className="muted" style={{ fontSize: 14, margin: 0 }}>
          Manage your businesses, switch between store counters, or return to consumer shopping.
        </p>
      </div>

      {/* Mode Switcher Banner */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: 8,
          marginBottom: 24,
        }}
      >
        <Link
          href="/"
          className="btn btn-subtle"
          style={{ flex: "1 1 140px", minHeight: 40, justifyContent: "center", fontSize: 13, fontWeight: 600 }}
        >
          Browse as Customer
        </Link>
        <Link
          href="/account/orders"
          className="btn btn-subtle"
          style={{ flex: "1 1 140px", minHeight: 40, justifyContent: "center", fontSize: 13, fontWeight: 600 }}
        >
          My Orders
        </Link>
        <Link
          href="/app/new"
          className="btn btn-primary"
          style={{ flex: "1 1 140px", minHeight: 40, justifyContent: "center", fontSize: 13, fontWeight: 700 }}
        >
          <IconPlus size={16} /> Open Business
        </Link>
      </div>

      <div className="row between" style={{ alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <IconStore size={18} style={{ color: "var(--coral)" }} /> Your Businesses
        </h2>
        <span className="badge" style={{ fontSize: 12 }}>
          {rows.length} {rows.length === 1 ? "workspace" : "workspaces"}
        </span>
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            padding: "36px 20px",
            background: "var(--surface)",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-xl)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--coral-subtle)",
              color: "var(--coral)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <IconStore size={24} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>No businesses registered yet</h3>
          <p className="muted" style={{ fontSize: 13.5, maxWidth: 420, margin: "0 auto 16px" }}>
            Open your store, restaurant, or service on Fluo with a 30-day Free Trial. No upfront credit card required.
          </p>
          <Link href="/app/new" className="btn btn-primary" style={{ padding: "0 22px" }}>
            <IconSparkles size={16} /> Start 30-Day Free Trial
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {rows.map(({ m, b }) => {
            const isDraft = b!.status === "draft";
            return (
              <div
                key={b!.id}
                className="card"
                style={{
                  background: "#ffffff",
                  border: isDraft ? "1.5px solid #fed7aa" : "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  padding: "clamp(14px, 4vw, 22px)",
                  display: "grid",
                  gap: 14,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <Link
                        href={`/app/${b!.id}`}
                        style={{
                          margin: 0,
                          fontSize: 18,
                          fontWeight: 800,
                          color: "var(--ink)",
                          textDecoration: "none",
                        }}
                      >
                        {b!.name}
                      </Link>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: isDraft ? "#fef3c7" : "#dcfce7",
                          color: isDraft ? "#92400e" : "#166534",
                          border: `1px solid ${isDraft ? "#fde68a" : "#bbf7d0"}`,
                        }}
                      >
                        {isDraft ? "Draft (Hidden from Explore)" : "Live Storefront"}
                      </span>
                    </div>
                    <p className="muted small" style={{ margin: 0 }}>
                      {label.get(b!.typeId) ?? "Business"} • Role: <strong>{m.role}</strong> • ID: {b!.id.slice(0, 8)}...
                    </p>
                  </div>

                  <Link
                    href={`/app/${b!.id}`}
                    className="btn btn-subtle"
                    style={{ fontSize: 13, fontWeight: 700, color: "var(--coral)", padding: "6px 14px" }}
                  >
                    Open Dashboard <IconChevronRight size={14} />
                  </Link>
                </div>

                {/* Draft Actions Ribbon */}
                {isDraft ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 10,
                      padding: "12px 14px",
                      background: "#fffbeb",
                      border: "1px solid #fef3c7",
                      borderRadius: 12,
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#92400e", fontWeight: 500 }}>
                      This store is currently unlaunched and invisible on Fluo Explore.
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <form action={publishAction}>
                        <input type="hidden" name="businessId" value={b!.id} />
                        <button
                          className="btn btn-primary"
                          type="submit"
                          style={{ fontSize: 12, padding: "6px 14px", fontWeight: 700 }}
                        >
                          Publish Storefront Now ↗
                        </button>
                      </form>
                      {m.role === "owner" && (
                        <form action={deleteDraftBusinessAction}>
                          <input type="hidden" name="businessId" value={b!.id} />
                          <button
                            type="submit"
                            className="btn btn-subtle"
                            style={{
                              fontSize: 12,
                              padding: "6px 12px",
                              color: "#dc2626",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <IconTrash size={13} /> Discard Draft
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 8,
                      paddingTop: 10,
                      borderTop: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>
                      Public link: <code>/b/{b!.slug}</code>
                    </span>
                    <Link
                      href={`/b/${b!.slug}`}
                      target="_blank"
                      style={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: "var(--coral-dark)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        textDecoration: "none",
                      }}
                    >
                      View Public Storefront <IconExternalLink size={13} />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
