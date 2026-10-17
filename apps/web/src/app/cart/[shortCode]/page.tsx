import { notFound } from "next/navigation";
import Link from "next/link";
import { fmtMoney, calculateEqualShare, isGroupCartFullyFunded } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { addGroupCartItemAction, contributeGroupCartAction } from "@/app/actions.ts";
import { env } from "@/server/env.ts";
import { IconCheck, IconClock, IconUsers, IconMessageSquare } from "@/components/icons.tsx";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;
  const d = deps();
  const cart = await d.store.getGroupCart(shortCode);
  const biz = cart ? await d.store.getBusiness(cart.businessId) : null;
  const title = cart ? `Group Cart for ${biz?.name ?? "Order"} (#${shortCode})` : "Group Cart";
  const desc = `Pool funds and split payments together on Fluo.`;
  const ogUrl = `${env().APP_URL}/api/og?title=${encodeURIComponent(title)}&description=${encodeURIComponent(desc)}&badge=Split+Payment`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogUrl],
    },
  };
}

export default async function GroupCartPage({
  params,
  searchParams,
}: {
  params: Promise<{ shortCode: string }>;
  searchParams: Promise<{ error?: string; paid?: string }>;
}) {
  const { shortCode } = await params;
  const sp = await searchParams;
  const d = deps();
  const cart = await d.store.getGroupCart(shortCode);
  if (!cart) notFound();

  const biz = await d.store.getBusiness(cart.businessId);
  if (!biz) notFound();

  // If returning from payment
  if (sp.paid) {
    const contribution = cart.contributions.find((c) => c.id === sp.paid);
    if (contribution && contribution.status !== "paid") {
      const updatedContributions = cart.contributions.map((c) =>
        c.id === sp.paid ? { ...c, status: "paid" as const, paidAtMs: Date.now() } : c
      );
      const newFunded = cart.fundedAmountMinor + contribution.amountMinor;
      const isFunded = newFunded >= cart.targetAmountMinor && cart.targetAmountMinor > 0n;
      await d.store.updateGroupCart(cart.id, {
        contributions: updatedContributions,
        fundedAmountMinor: newFunded,
        status: isFunded ? "funded" : cart.status,
      });
      cart.fundedAmountMinor = newFunded;
      if (isFunded) (cart as any).status = "funded";
    }
  }

  const products = await d.store.listProducts(cart.businessId, ["active"], 50, 0);
  const isFunded = isGroupCartFullyFunded(cart) || cart.status === "funded";
  const fundedPct = cart.targetAmountMinor > 0n
    ? Math.min(100, Math.round(Number((cart.fundedAmountMinor * 100n) / cart.targetAmountMinor)))
    : 0;

  const equalShare = calculateEqualShare(cart.targetAmountMinor, Math.max(1, cart.contributions.length + 1));
  const shareUrl = `${env().APP_URL}/cart/${shortCode}`;
  const whatsappShareText = encodeURIComponent(`Hey! Join our group order for ${biz.name} on Fluo: ${shareUrl}`);

  return (
    <div style={{ maxWidth: 560, margin: "24px auto", padding: "0 16px" }}>
      {/* Business Header */}
      <div style={{ marginBottom: 16 }}>
        <p className="small">
          <Link href={`/b/${biz.slug}`}>&larr; {biz.name}</Link>
        </p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h1 style={{ margin: "4px 0" }}>Group Cart #{shortCode}</h1>
          <span className={`badge ${isFunded ? "ok" : cart.status === "open" ? "warn" : "bad"}`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            {isFunded ? <><IconCheck size={13} /> 100% Funded</> : cart.status.toUpperCase()}
          </span>
        </div>
        <p className="muted small">
          Initiated by <strong>{cart.hostName}</strong> &bull; Split style: {cart.splitKind}
        </p>
      </div>

      {sp.error && <p className="alert" role="alert">{sp.error}</p>}
      {sp.paid && <p className="notice" style={{ display: "flex", alignItems: "center", gap: 6, background: "#ecfdf5", color: "#065f46" }}><IconCheck size={16} /> Payment received! Thanks for contributing.</p>}

      {/* Funding Progress Bar */}
      <div className="card" style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 15 }}>
          <span><strong>Funded:</strong> {fmtMoney(cart.fundedAmountMinor, cart.currency)}</span>
          <span className="muted"><strong>Goal:</strong> {fmtMoney(cart.targetAmountMinor, cart.currency)}</span>
        </div>
        <div style={{ width: "100%", height: 12, background: "#e2e8f0", borderRadius: 6, overflow: "hidden" }}>
          <div
            style={{
              width: `${fundedPct}%`,
              height: "100%",
              background: isFunded ? "#10b981" : "#4f46e5",
              transition: "width 0.4s ease",
            }}
          />
        </div>
        <p className="small muted" style={{ marginTop: 8, marginBottom: 0 }}>
          {fundedPct}% funded &bull; {isFunded ? "Order ready for dispatch" : `Remaining: ${fmtMoney(cart.targetAmountMinor > cart.fundedAmountMinor ? cart.targetAmountMinor - cart.fundedAmountMinor : 0n, cart.currency)}`}
        </p>
      </div>

      {/* Cart Items List */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Group Items ({cart.items.length})</h2>
        {cart.items.length === 0 ? (
          <p className="small muted">No items added yet. Choose items below to build the order.</p>
        ) : (
          <div className="overflow">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Added by</th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map((it) => (
                  <tr key={it.id}>
                    <td><strong>{it.name}</strong></td>
                    <td>{it.quantity}</td>
                    <td>{fmtMoney(it.unitPriceMinor * BigInt(it.quantity), cart.currency)}</td>
                    <td className="small muted">{it.addedBy.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add item form if cart open */}
        {cart.status === "open" && products.length > 0 && (
          <form action={addGroupCartItemAction} style={{ marginTop: 16, borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
            <input type="hidden" name="shortCode" value={shortCode} />
            <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Add your choice to the cart:</h3>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginBottom: 8 }}>
              <select name="productId" required style={{ width: "100%" }}>
                <option value="">Select menu item...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {fmtMoney(p.priceMinor, biz.currency)}
                  </option>
                ))}
              </select>
              <input type="number" name="quantity" min="1" max="20" defaultValue="1" required placeholder="Qty" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <input type="text" name="memberName" placeholder="Your name (e.g. Chisom)" required />
              <button type="submit" className="btn btn-primary">Add Item</button>
            </div>
          </form>
        )}
      </div>

      {/* Contributions / Paid Members */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Contributions ({cart.contributions.length})</h2>
        {cart.contributions.length === 0 ? (
          <p className="small muted">No contributions made yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {cart.contributions.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: c.status === "paid" ? "#f0fdf4" : "#fefce8",
                  border: `1px solid ${c.status === "paid" ? "#bbf7d0" : "#fef08a"}`,
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>{c.contributorName}</span>
                  <span className="small muted" style={{ display: "block" }}>{c.contributorEmail}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontWeight: 700 }}>{fmtMoney(c.amountMinor, cart.currency)}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: c.status === "paid" ? "#16a34a" : "#ca8a04" }}>
                    {c.status === "paid" ? <><IconCheck size={11} /> Paid</> : <><IconClock size={11} /> Pending</>}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contribute Share Form */}
        {cart.status === "open" && !isFunded && (
          <form action={contributeGroupCartAction} style={{ marginTop: 16, borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
            <input type="hidden" name="shortCode" value={shortCode} />
            <h3 style={{ fontSize: 15, margin: "0 0 6px" }}>Pay Your Share</h3>
            <p className="small muted" style={{ margin: "0 0 10px" }}>
              Recommended equal share: <strong>{fmtMoney(equalShare, cart.currency)}</strong>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input type="text" name="contributorName" placeholder="Your name" required />
              <input type="email" name="contributorEmail" placeholder="Your email (for payment receipt)" required />
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  name="amount"
                  placeholder={`Amount in ${cart.currency}`}
                  defaultValue={cart.splitKind === "equal" ? (Number(equalShare) / 100).toFixed(0) : ""}
                  required
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-accent">Pay via Paystack</button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Share Box */}
      <div className="card" style={{ textAlign: "center", padding: 18 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>Invite Friends to Join this Cart</h3>
        <p className="small muted" style={{ margin: "0 0 12px" }}>
          Share this link so friends can choose their own meals and split the bill.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href={`https://wa.me/?text=${whatsappShareText}`}
            className="btn"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#25D366", color: "#fff", borderColor: "#25D366", fontWeight: 600 }}
          >
            <IconMessageSquare size={16} /> Share to WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
