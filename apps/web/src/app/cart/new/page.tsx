import Link from "next/link";
import { BUSINESS_TYPES } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { getSession } from "@/server/session.ts";
import { createGroupCartAction } from "@/app/actions.ts";
import { IconUsers, IconCheckCircle, IconChevronRight } from "@/components/icons.tsx";

export const dynamic = "force-dynamic";
export const metadata = { title: "Start a Group Cart" };

export default async function NewGroupCartPage() {
  const session = await getSession();
  const d = deps();
  const businesses = await d.store.listPublicBusinesses(30, 0).catch(() => []);
  const label = new Map(BUSINESS_TYPES.map((t) => [t.id, t.label]));

  return (
    <div style={{ maxWidth: 520, margin: "16px auto" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
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
            marginBottom: 10,
          }}
        >
          <IconUsers size={24} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Start a Group Cart</h1>
        <p className="muted" style={{ fontSize: 14, margin: 0 }}>
          Order meals or groceries together with friends, roomies, or colleagues. Split the total automatically.
        </p>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: 20,
          marginBottom: 20,
        }}
      >
        <form action={createGroupCartAction} style={{ display: "grid", gap: 16 }}>
          <input type="hidden" name="back" value="/cart/new" />

          <div>
            <label htmlFor="businessId" style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
              Where are you ordering from?
            </label>
            {businesses.length === 0 ? (
              <p className="notice">
                No active storefronts found. <Link href="/search">Browse marketplace</Link>
              </p>
            ) : (
              <select id="businessId" name="businessId" required defaultValue={businesses[0]?.id} style={{ width: "100%" }}>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({label.get(b.typeId) ?? "Merchant"})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="hostName" style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
              Your Name (Cart Host)
            </label>
            <input
              id="hostName"
              name="hostName"
              required
              defaultValue={session?.user.name ?? ""}
              placeholder="e.g. Alex"
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label htmlFor="hostEmail" style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
              Your Email (For order receipts)
            </label>
            <input
              id="hostEmail"
              name="hostEmail"
              type="email"
              required
              defaultValue={session?.user.email ?? ""}
              placeholder="e.g. alex@campus.edu"
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label htmlFor="splitKind" style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
              How do you want to split?
            </label>
            <select id="splitKind" name="splitKind" defaultValue="itemized" style={{ width: "100%" }}>
              <option value="itemized">Itemized: Each person pays for what they add</option>
              <option value="equal">Equal Split: Bill is divided equally among participants</option>
            </select>
          </div>

          <div style={{ marginTop: 8 }}>
            <button
              className="btn btn-primary btn-block"
              type="submit"
              disabled={businesses.length === 0}
              style={{ minHeight: 46, fontSize: 15 }}
            >
              Create Shared Cart →
            </button>
          </div>
        </form>
      </div>

      <div style={{ display: "grid", gap: 10, padding: "0 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--muted)" }}>
          <IconCheckCircle size={16} style={{ color: "var(--coral)", flexShrink: 0 }} />
          <span>Friends get a live link to add items and pay their share via card or transfer</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--muted)" }}>
          <IconCheckCircle size={16} style={{ color: "var(--coral)", flexShrink: 0 }} />
          <span>Order is placed with the merchant once all contributions are collected</span>
        </div>
      </div>
    </div>
  );
}
