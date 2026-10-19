import Link from "next/link";
import { BUSINESS_TYPES } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { requireUser } from "@/server/session.ts";
import { IconStore, IconPlus, IconSparkles, IconChevronRight } from "@/components/icons.tsx";

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
    <div style={{ maxWidth: 720, margin: "16px auto" }}>
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
          style={{ flex: 1, minHeight: 40, justifyContent: "center", fontSize: 13, fontWeight: 600 }}
        >
          Browse as Customer
        </Link>
        <Link
          href="/account/orders"
          className="btn btn-subtle"
          style={{ flex: 1, minHeight: 40, justifyContent: "center", fontSize: 13, fontWeight: 600 }}
        >
          My Orders
        </Link>
        <Link
          href="/app/new"
          className="btn btn-primary"
          style={{ flex: 1, minHeight: 40, justifyContent: "center", fontSize: 13, fontWeight: 700 }}
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
        <div className="grid">
          {rows.map(({ m, b }) => (
            <Link
              key={b!.id}
              href={`/app/${b!.id}`}
              className="card cover"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "16px 18px",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{b!.name}</h3>
                  <span className={`badge ${b!.status === "active" ? "ok" : "warn"}`} style={{ fontSize: 11 }}>
                    {b!.status === "active" ? "Live" : "Draft"}
                  </span>
                </div>
                <p className="muted small" style={{ margin: 0 }}>
                  {label.get(b!.typeId) ?? "Business"} • Role: <strong>{m.role}</strong>
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 14,
                  paddingTop: 10,
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Workspace ID: {b!.id.slice(0, 8)}...</span>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "var(--coral)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  Dashboard <IconChevronRight size={14} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
