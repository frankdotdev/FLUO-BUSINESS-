import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deps } from "@/server/container.ts";
import { requireUser } from "@/server/session.ts";
import { PosRegister } from "@/components/pos-register.tsx";

export const dynamic = "force-dynamic";

export default async function PosKioskPage({ params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  const user = await requireUser(`/app/${businessId}/kiosk`);
  const d = deps();

  const business = await d.store.getBusiness(businessId);
  if (!business) notFound();

  const memberships = await d.store.membershipsForBusiness(businessId);
  const userMember = memberships.find((m) => m.userId === user.id && m.status === "active");
  if (!userMember) redirect("/app");

  const products = await d.store.listProducts(businessId, ["active"], 200, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #eaeaea" }}>
        <div>
          <h1 style={{ margin: "0 0 2px", fontSize: "22px" }}>{business.name}</h1>
          <p className="muted small" style={{ margin: 0 }}>⚡ POS Kiosk Register Mode</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Link href={`/app/${businessId}?tab=products`} className="btn" style={{ fontSize: "13px" }}>
            ← Back to Workspace
          </Link>
        </div>
      </div>

      <PosRegister business={business} products={products} />
    </div>
  );
}
