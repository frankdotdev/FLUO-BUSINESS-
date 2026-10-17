import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { describePolicy, fmtLocal, fmtMoney, getTransferInstructions, isCustomerOf, generateEscrowSecrets, type CustomerProof } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { env } from "@/server/env.ts";
import { friendly } from "@/server/messages.ts";
import { cancelAction, disputeEscrowAction, markSentAction, payNowAction } from "@/app/actions.ts";
import { IconShield, IconReceipt, IconCheck, IconAlertTriangle } from "@/components/icons.tsx";

const LABEL: Record<string, [string, string]> = {
  awaiting_payment: ["Waiting for payment", "warn"], paid: ["Paid", "ok"], accepted: ["Accepted", "ok"], in_production: ["Being prepared", "ok"], ready: ["Ready", "ok"], completed: ["Completed", "ok"], cancelled: ["Cancelled", "bad"], refunded: ["Refunded", "bad"],
  held: ["Held for you", "warn"], confirmed: ["Confirmed", "ok"], checked_in: ["Checked in", "ok"], expired: ["Expired", "bad"], no_show: ["No show", "bad"],
};

/** The customer's view of one order or booking. Shown only to its own customer (signed in, or holding the secret link). */
export async function OrderPanel({ businessId, subjectId, proof, token, backPath, error }: { businessId: string; subjectId: string; proof: CustomerProof; token?: string; backPath: string; error?: string }) {
  const d = deps();
  const order = await d.store.getOrder(businessId, subjectId);
  const booking = order ? null : await d.store.getBooking(businessId, subjectId);
  const subject = order ?? booking;
  if (!subject || !(await isCustomerOf(d, subject, proof))) notFound();
  const biz = (await d.store.getBusiness(businessId))!;
  const payment = await d.store.getPaymentForOrder(businessId, subjectId);
  const kind = order ? "order" : "booking";
  const [statusText, tone] = LABEL[subject.status] ?? [subject.status, ""];
  const items = order ? await d.store.getOrderItems(businessId, subjectId) : [];
  const group = booking ? await d.store.getResourceGroup(businessId, booking.groupId) : null;
  let instructions: Awaited<ReturnType<typeof getTransferInstructions>> | null = null;
  try { instructions = await getTransferInstructions(d, { businessId, orderId: subjectId, kind, as: proof }); } catch { instructions = null; }
  const hidden = (<><input type="hidden" name="businessId" value={businessId} /><input type="hidden" name="id" value={subjectId} /><input type="hidden" name="kind" value={kind} /><input type="hidden" name="back" value={backPath} />{token && <input type="hidden" name="token" value={token} />}</>);
  const msg = friendly(error);

  const escrow = order ? await d.store.getEscrowRecord(subjectId) : null;
  let escrowSecrets: ReturnType<typeof generateEscrowSecrets> | null = null;
  let qrSvg: string | null = null;
  if (escrow && escrow.status === "held") {
    escrowSecrets = generateEscrowSecrets(env().TICKET_HMAC_SECRET, subjectId);
    qrSvg = await QRCode.toString(escrowSecrets.qrToken, { type: "svg", margin: 1, width: 180, errorCorrectionLevel: "M" });
  }

  return (
    <section>
      <h1>{order ? "Your order" : (group?.name ?? "Your booking")}</h1>
      <p className="muted">{biz.name}</p>
      {msg && <p className="alert" role="alert">{msg}</p>}
      <p><span className={`badge ${tone}`}>{statusText}</span></p>
      {booking && <p>{fmtLocal(booking.startMs, biz.timezone)} to {fmtLocal(booking.endMs, biz.timezone)}</p>}
      {items.length > 0 && (<div className="overflow"><table><tbody>{items.map((i, n) => (<tr key={n}><td>{i.name} x {i.quantity}</td><td>{fmtMoney(i.unitPriceMinor * BigInt(i.quantity), biz.currency)}</td></tr>))}</tbody></table></div>)}
      {payment && <p><strong>Total {fmtMoney(payment.amountMinor, payment.currency)}</strong></p>}

      {/* Escrow Delivery Protection & Handoff */}
      {escrow && escrow.status === "held" && escrowSecrets && (
        <div className="card" style={{ border: "2px solid #6366f1", background: "rgba(99, 102, 241, 0.05)", borderRadius: 12, padding: 18, marginTop: 16 }}>
          <h3 style={{ margin: "0 0 6px", color: "#4f46e5", display: "flex", alignItems: "center", gap: 8 }}>
            <IconShield size={18} /> Fluo Escrow Protected Delivery
          </h3>
          <p className="small muted" style={{ margin: "0 0 14px" }}>
            Your payment is held safely in escrow. Show this 4-digit PIN or QR code to the delivery rider or courier <strong>only after</strong> you have received and inspected your order.
          </p>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ textAlign: "center", background: "#fff", padding: "12px 24px", borderRadius: 8, border: "1px solid #c7d2fe" }}>
              <span className="small muted" style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>DELIVERY PIN</span>
              <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: 6, color: "#1e1b4b" }}>{escrowSecrets.pin}</span>
            </div>
            {qrSvg && <div role="img" aria-label="Delivery QR Token" dangerouslySetInnerHTML={{ __html: qrSvg }} />}
          </div>

          <form action={disputeEscrowAction}>
            <input type="hidden" name="orderId" value={subjectId} />
            <input type="hidden" name="back" value={backPath} />
            <details className="small">
              <summary style={{ cursor: "pointer", color: "#b91c1c", fontWeight: 600 }}>Report an issue / dispute delivery</summary>
              <input name="reason" placeholder="Explain the problem (e.g. damaged goods, wrong item)" required style={{ marginTop: 8 }} />
              <button className="btn btn-danger btn-block" style={{ marginTop: 8 }} type="submit">Submit Dispute</button>
            </details>
          </form>
        </div>
      )}

      {escrow && escrow.status === "released" && (
        <p className="notice" style={{ display: "flex", alignItems: "center", gap: 8, background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}>
          <IconCheck size={18} /> <span><strong>Escrow Released:</strong> Physical delivery hand-off verified.</span>
        </p>
      )}

      {escrow && escrow.status === "disputed" && (
        <p className="alert" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconAlertTriangle size={18} /> <span><strong>Escrow Disputed:</strong> {escrow.disputeReason ?? "Under review by support"}. Funds remain frozen until resolved.</span>
        </p>
      )}

      {instructions && (
        <div className="pay-box">
          <p className="small muted">Send exactly {fmtMoney(instructions.amountMinor, instructions.currency)} to:</p>
          <p className="muted small" style={{ margin: 0 }}>{instructions.bankName}</p>
          <p className="acct">{instructions.accountNumber}</p>
          <p style={{ margin: 0 }}><strong>{instructions.accountName}</strong></p>
          <p className="small">Put this reference in the narration: <strong>{instructions.reference}</strong></p>
          {instructions.status === "created"
            ? <form action={markSentAction}>{hidden}<button className="btn btn-primary btn-block" type="submit">I have transferred</button></form>
            : <p className="notice">You've told {biz.name} you've paid. They'll confirm once the money arrives.</p>}
          <p className="small muted">Only confirm after your bank app shows the transfer as sent. {biz.name} confirms from their own bank app.</p>
        </div>
      )}
      {payment?.method === "provider" && payment.status === "created" && (<form action={payNowAction}>{hidden}<button className="btn btn-accent btn-block" type="submit">Pay now</button></form>)}
      {payment?.method === "provider" && payment.status === "pending" && <p className="notice">We're confirming your payment. This page updates when it arrives.</p>}

      {/* Branded Receipt Button */}
      {(order?.status === "paid" || order?.status === "completed" || booking?.status === "confirmed" || booking?.status === "checked_in") && (
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border, #eaeaea)" }}>
          <a href={`/receipt/${subjectId}?b=${businessId}${token ? `&t=${token}` : ""}`} className="btn btn-block" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} target="_blank" rel="noopener">
            <IconReceipt size={16} /> View &amp; Print Branded Receipt
          </a>
        </div>
      )}

      <h2>Refunds</h2>
      <p className="small">{describePolicy(subject.refundPolicy)}</p>
      {((order && order.status === "awaiting_payment" && payment?.status !== "awaiting_confirmation") || (booking && (booking.status === "held" || booking.status === "confirmed") && payment?.status !== "awaiting_confirmation")) && (
        <form action={cancelAction}>{hidden}<button className="btn btn-danger" type="submit">{order ? "Cancel this order" : "Cancel this booking"}</button></form>
      )}
    </section>
  );
}
