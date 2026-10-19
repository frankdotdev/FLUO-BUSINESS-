import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/session.ts";
import { deps } from "@/server/container.ts";
import {
  IconReceipt,
  IconHeart,
  IconMessageSquare,
  IconStore,
  IconUsers,
  IconSparkles,
  IconArrowRight,
  IconShield,
} from "@/components/icons.tsx";
import { SignOutButton } from "./sign-out-button.tsx";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Account - Fluo",
};

export default async function AccountPage() {
  const session = await getSession();

  if (!session) {
    redirect("/auth?returnTo=/account");
  }

  const user = session.user;
  const d = deps();
  const memberships = await d.store.membershipsForUser(user.id).catch(() => []);
  const businesses = await Promise.all(
    memberships.map((m) => d.store.getBusiness(m.businessId).catch(() => null))
  );
  const activeBusinesses = businesses.filter(Boolean);

  const initial = (user.name || user.email || "F").charAt(0).toUpperCase();

  return (
    <div style={{ maxWidth: 640, margin: "24px auto", padding: "0 16px" }}>
      {/* Profile Header */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "24px 28px",
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 24,
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--coral-soft)",
            color: "var(--coral-dark)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.name}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user.email}
          </p>
        </div>
        <SignOutButton />
      </div>

      {/* Everyday Activity */}
      <div style={{ marginBottom: 28 }}>
        <span className="section-kicker" style={{ display: "block", marginBottom: 8 }}>
          ACTIVITY &amp; ORDERS
        </span>
        <div style={{ display: "grid", gap: 10 }}>
          <Link
            href="/account/orders"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              background: "#ffffff",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              textDecoration: "none",
              color: "var(--ink)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ink)",
                }}
              >
                <IconReceipt size={20} />
              </div>
              <div>
                <strong style={{ display: "block", fontSize: 15 }}>My Orders &amp; Receipts</strong>
                <small style={{ color: "var(--muted)", fontSize: 12 }}>Track purchases, transfers, and escrow releases</small>
              </div>
            </div>
            <IconArrowRight size={16} style={{ color: "var(--muted)" }} />
          </Link>

          <Link
            href="/search?filter=favorites"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              background: "#ffffff",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              textDecoration: "none",
              color: "var(--ink)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--coral-dark)",
                }}
              >
                <IconHeart size={20} />
              </div>
              <div>
                <strong style={{ display: "block", fontSize: 15 }}>Saved Businesses</strong>
                <small style={{ color: "var(--muted)", fontSize: 12 }}>Your bookmarked campus stores, barbers, and restaurants</small>
              </div>
            </div>
            <IconArrowRight size={16} style={{ color: "var(--muted)" }} />
          </Link>

          <Link
            href="/account/messages"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              background: "#ffffff",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              textDecoration: "none",
              color: "var(--ink)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ink)",
                }}
              >
                <IconMessageSquare size={20} />
              </div>
              <div>
                <strong style={{ display: "block", fontSize: 15 }}>Direct Messages</strong>
                <small style={{ color: "var(--muted)", fontSize: 12 }}>Inquiries and chats with local sellers</small>
              </div>
            </div>
            <IconArrowRight size={16} style={{ color: "var(--muted)" }} />
          </Link>

          <Link
            href="/cart/new"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              background: "#ffffff",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              textDecoration: "none",
              color: "var(--ink)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "var(--surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--ink)",
                }}
              >
                <IconUsers size={20} />
              </div>
              <div>
                <strong style={{ display: "block", fontSize: 15 }}>Group Orders</strong>
                <small style={{ color: "var(--muted)", fontSize: 12 }}>Pool food or grocery orders and split payments</small>
              </div>
            </div>
            <IconArrowRight size={16} style={{ color: "var(--muted)" }} />
          </Link>
        </div>
      </div>

      {/* Business & Merchant Section */}
      <div style={{ marginBottom: 28 }}>
        <span className="section-kicker" style={{ display: "block", marginBottom: 8 }}>
          MERCHANT WORKSPACES
        </span>

        {activeBusinesses.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {activeBusinesses.map((b) => (
              <Link
                key={b!.id}
                href={`/app/${b!.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  background: "#ffffff",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  textDecoration: "none",
                  color: "var(--ink)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "var(--coral-soft)",
                      color: "var(--coral-dark)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontWeight: 800,
                    }}
                  >
                    {b!.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong style={{ display: "block", fontSize: 15 }}>{b!.name}</strong>
                    <small style={{ color: "var(--muted)", fontSize: 12 }}>
                      {b!.status === "active" ? "Live store" : "Draft setup"} • Open Admin Dashboard
                    </small>
                  </div>
                </div>
                <IconArrowRight size={16} style={{ color: "var(--muted)" }} />
              </Link>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: "24px 20px",
              background: "#ffffff",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-lg)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "var(--coral-soft)",
                color: "var(--coral-dark)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              <IconStore size={20} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", color: "var(--ink)" }}>
              Run a business or side hustle?
            </h3>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px", maxWidth: 380, marginInline: "auto" }}>
              Launch your online store, manage staff, accept bank transfers, and run physical counter sales.
            </p>
            <Link
              href="/app/new"
              className="primary-button"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 13, padding: "10px 18px" }}
            >
              <IconSparkles size={14} />
              <span>Start Business • 30-Day Free Trial</span>
              <span>↗</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
