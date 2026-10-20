import Link from "next/link";
import { BUSINESS_TYPES } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { getSession } from "@/server/session.ts";
import { createGroupCartAction } from "@/app/actions.ts";
import { IconUsers, IconCheckCircle } from "@/components/icons.tsx";
import { GroupCartBuilder, type BusinessOption } from "@/components/group-cart-builder.tsx";

export const dynamic = "force-dynamic";
export const metadata = { title: "Start a Group Cart — Fluo" };

export default async function NewGroupCartPage() {
  const session = await getSession();
  const d = deps();
  const rawBusinesses = await d.store.listPublicBusinesses(50, 0).catch(() => []);
  const labelMap = new Map(BUSINESS_TYPES.map((t) => [t.id, t.label]));

  const businesses: BusinessOption[] = await Promise.all(
    rawBusinesses.map(async (b) => {
      const prods = await d.store.listProducts(b.id, ["active"], 6, 0).catch(() => []);
      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        categoryLabel: labelMap.get(b.typeId) ?? "Local Merchant",
        sampleItems: prods.map((p) => p.name),
      };
    })
  );

  return (
    <div style={{ maxWidth: 540, margin: "20px auto", padding: "0 16px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "var(--coral-soft)",
            color: "var(--coral-dark)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 10,
          }}
        >
          <IconUsers size={26} />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 6px", fontFamily: "Manrope, sans-serif" }}>
          Start a Group Cart
        </h1>
        <p className="muted" style={{ fontSize: 14, margin: 0, lineHeight: 1.5 }}>
          Pool funds and order meals, groceries, or essentials together with friends, roommates, or team members.
        </p>
      </div>

      <div
        style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: 24,
          padding: "clamp(18px, 4vw, 24px)",
          marginBottom: 20,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
        }}
      >
        <GroupCartBuilder
          businesses={businesses}
          defaultHostName={session?.user.name ?? ""}
          defaultHostEmail={session?.user.email ?? ""}
          action={createGroupCartAction}
        />
      </div>

      <div style={{ display: "grid", gap: 12, padding: "0 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--muted)" }}>
          <IconCheckCircle size={16} style={{ color: "var(--coral-dark)", flexShrink: 0 }} />
          <span>Friends get a live link to add items and pay their share via card or direct transfer</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--muted)" }}>
          <IconCheckCircle size={16} style={{ color: "var(--coral-dark)", flexShrink: 0 }} />
          <span>Order is placed with the merchant with 100% Escrow Protection once funded</span>
        </div>
      </div>
    </div>
  );
}
