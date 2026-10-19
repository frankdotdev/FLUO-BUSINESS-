import { notFound } from "next/navigation";
import Link from "next/link";
import { fmtLocal, fmtMoney, hashToken, isCustomerOf, renderThermalReceipt, tokenMatches, type ReceiptData } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { getSession } from "@/server/session.ts";

import { PrintButton } from "@/components/print-button.tsx";
import { IconShield, IconZap, IconSmartphone, IconSparkles } from "@/components/icons.tsx";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ b?: string }> }) {
  const { id } = await params;
  const { b: businessId } = await searchParams;
  const d = deps();
  const biz = businessId ? await d.store.getBusiness(businessId) : null;
  return {
    title: `Receipt #${id.slice(0, 8).toUpperCase()} - ${biz?.name ?? "Fluo"}`,
    robots: { index: false, follow: false },
  };
}

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ b?: string; t?: string }>;
}) {
  const { id } = await params;
  const { b: businessId, t: token } = await searchParams;
  if (!businessId) notFound();

  const d = deps();
  const biz = await d.store.getBusiness(businessId);
  if (!biz) notFound();

  const order = await d.store.getOrder(businessId, id);
  const booking = order ? null : await d.store.getBooking(businessId, id);
  const subject = order ?? booking;
  if (!subject) notFound();

  // Authentication / Authorization Check
  const session = await getSession();
  let authorized = false;

  if (session) {
    if (await isCustomerOf(d, subject, { kind: "user", userId: session.user.id })) {
      authorized = true;
    } else {
      // Check if user is business staff/owner
      const memberships = await d.store.membershipsForBusiness(businessId);
      if (memberships.some((m) => m.userId === session.user.id && m.status === "active")) {
        authorized = true;
      }
    }
  }

  if (!authorized && token) {
    const guestRec = await d.store.findGuestToken(hashToken(token));
    if (guestRec && guestRec.businessId === businessId && guestRec.orderId === id && tokenMatches(token, hashToken(token), guestRec.expiresAtMs, Date.now(), guestRec.revoked)) {
      authorized = true;
    }
  }

  if (!authorized) {
    notFound();
  }

  const payment = await d.store.getPaymentForOrder(businessId, id);
  const items = order ? await d.store.getOrderItems(businessId, id) : [];
  const escrow = order ? await d.store.getEscrowRecord(id) : null;

  const lineItems = items.map((it) => ({
    name: it.name,
    quantity: it.quantity,
    unitPriceMinor: it.unitPriceMinor,
    lineTotalMinor: it.unitPriceMinor * BigInt(it.quantity),
  }));

  const customerName = subject.guest?.name ?? (session ? session.user.name : "Customer");
  const totalMinor = payment?.amountMinor ?? (order ? order.totalMinor : 0n);

  const receiptData: ReceiptData = {
    receiptNumber: id.slice(0, 8).toUpperCase(),
    businessName: biz.name,
    businessSlug: biz.slug,
    timezone: biz.timezone,
    currency: biz.currency,
    issuedAtMs: Date.now(),
    customerName,
    customerContact: subject.guest?.email ?? session?.user.email,
    items: lineItems,
    subtotalMinor: totalMinor,
    totalMinor,
    paymentMethod: payment?.method === "bank_transfer" ? "bank_transfer" : "provider",
    paymentReference: payment?.reference ?? id.slice(0, 8),
    escrowStatus: escrow?.status === "held" ? "held" : escrow?.status === "released" ? "released" : undefined,
  };

  const thermalText = renderThermalReceipt(receiptData, 32);

  return (
    <div style={{ maxWidth: 480, margin: "24px auto", padding: "0 16px" }}>
      {/* Top back navigation */}
      <div className="no-print" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href={`/b/${biz.slug}`} className="small">
          ← Back to {biz.name}
        </Link>
        <span className="badge ok">Paid &amp; Confirmed</span>
      </div>

      {/* Main Branded Receipt Card */}
      <div
        className="card print-receipt"
        style={{
          background: "#fff",
          border: "1px solid var(--border, #eaeaea)",
          borderRadius: 14,
          padding: 28,
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ textAlign: "center", borderBottom: "2px dashed #e2e8f0", paddingBottom: 20, marginBottom: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.5px" }}>{biz.name}</h1>
          <p className="muted small" style={{ margin: "2px 0" }}>fluo.ng/b/{biz.slug}</p>
          <p className="muted small" style={{ margin: "2px 0" }}>Receipt #{receiptData.receiptNumber}</p>
          <p className="muted small" style={{ margin: "2px 0" }}>{fmtLocal(receiptData.issuedAtMs, biz.timezone)}</p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <p className="small" style={{ margin: 0 }}>
            <strong>Customer:</strong> {customerName}
          </p>
          {escrow?.status === "held" && (
            <p style={{ marginTop: 6 }}>
              <span className="badge ok" style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe" }}>
                <IconShield size={13} /> Protected by Fluo Escrow
              </span>
            </p>
          )}
        </div>

        {/* Itemized Lines */}
        <div style={{ borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9", padding: "12px 0" }}>
          {lineItems.length > 0 ? (
            lineItems.map((it, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "4px 0" }}>
                <span>{it.quantity}x {it.name}</span>
                <span style={{ fontWeight: 600 }}>{fmtMoney(it.lineTotalMinor, biz.currency)}</span>
              </div>
            ))
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "4px 0" }}>
              <span>{order ? "Standard Order" : "Booking Service"}</span>
              <span style={{ fontWeight: 600 }}>{fmtMoney(totalMinor, biz.currency)}</span>
            </div>
          )}
        </div>

        {/* Total */}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 800, marginTop: 16, marginBottom: 16 }}>
          <span>Total Paid</span>
          <span>{fmtMoney(totalMinor, biz.currency)}</span>
        </div>

        <div className="small muted" style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
          <p style={{ margin: "2px 0" }}>Method: {receiptData.paymentMethod.toUpperCase()}</p>
          <p style={{ margin: "2px 0" }}>Reference: {receiptData.paymentReference}</p>
        </div>

        {/* Prominent Footer */}
        <div style={{ textAlign: "center", marginTop: 24, paddingTop: 16, borderTop: "2px dashed #e2e8f0" }}>
          <p className="small muted" style={{ margin: "0 0 6px" }}>Thank you for your patronage!</p>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, letterSpacing: "0.2px", display: "inline-flex", alignItems: "center", gap: 5 }}>
            <IconZap size={14} style={{ color: "#4f46e5" }} /> Powered by Fluo
          </p>
        </div>
      </div>

      {/* Polite post-purchase account save prompt for guest shoppers */}
      {!session && (
        <div
          className="no-print card"
          style={{
            marginTop: 18,
            padding: 20,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "var(--accent)",
              color: "#fff",
              marginBottom: 10,
            }}
          >
            <IconSparkles size={18} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", color: "var(--ink)" }}>
            Save this receipt to your phone
          </h3>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.5 }}>
            Never lose your order details or escrow status. Create a free account to track your orders in one tap.
          </p>
          <Link
            href={`/auth?mode=signup&email=${encodeURIComponent(subject.guest?.email ?? "")}&returnTo=${encodeURIComponent(`/receipt/${id}?b=${businessId}${token ? `&t=${token}` : ""}`)}`}
            className="primary-button"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", padding: "10px 20px" }}
          >
            <span>Create Password • Save Order</span>
            <span>↗</span>
          </Link>
        </div>
      )}

      {/* Action Buttons for Printing and Thermal Copy */}
      <div className="no-print" style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <PrintButton />

        <details className="card" style={{ marginTop: 10 }}>
          <summary className="small" style={{ cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <IconSmartphone size={14} /> ESC/POS Thermal Format (58mm / 80mm)
          </summary>
          <pre
            style={{
              marginTop: 10,
              padding: 12,
              background: "#1e1e1e",
              color: "#f0f0f0",
              fontSize: 12,
              borderRadius: 6,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {thermalText}
          </pre>
        </details>
      </div>
    </div>
  );
}
