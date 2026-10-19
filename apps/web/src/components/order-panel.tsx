import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { describePolicy, fmtLocal, fmtMoney, getTransferInstructions, isCustomerOf, generateEscrowSecrets, type CustomerProof } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { env } from "@/server/env.ts";
import { friendly } from "@/server/messages.ts";
import { cancelAction, disputeEscrowAction, markSentAction, payNowAction } from "@/app/actions.ts";
import { IconShield, IconReceipt, IconCheck, IconAlertTriangle, IconArrowRight, IconStore } from "@/components/icons.tsx";

const LABEL: Record<string, [string, string, string]> = {
  awaiting_payment: ["Waiting for payment", "#fef3c7", "#92400e"],
  paid: ["Payment confirmed", "#edf6f0", "var(--green)"],
  accepted: ["Order accepted", "#edf6f0", "var(--green)"],
  in_production: ["Being prepared", "#edf6f0", "var(--green)"],
  ready: ["Ready for pickup / delivery", "#edf6f0", "var(--green)"],
  completed: ["Completed", "#edf6f0", "var(--green)"],
  cancelled: ["Cancelled", "#fee2e2", "#dc2626"],
  refunded: ["Refunded", "#fee2e2", "#dc2626"],
  held: ["Reservation held", "#fef3c7", "#92400e"],
  confirmed: ["Confirmed", "#edf6f0", "var(--green)"],
  checked_in: ["Checked in", "#edf6f0", "var(--green)"],
  expired: ["Expired", "#fee2e2", "#dc2626"],
  no_show: ["No show", "#fee2e2", "#dc2626"],
};

/** The customer's view of one order or booking. Shown only to its own customer (signed in, or holding the secret link). */
export async function OrderPanel({
  businessId,
  subjectId,
  proof,
  token,
  backPath,
  error,
}: {
  businessId: string;
  subjectId: string;
  proof: CustomerProof;
  token?: string;
  backPath: string;
  error?: string;
}) {
  const d = deps();
  const order = await d.store.getOrder(businessId, subjectId);
  const booking = order ? null : await d.store.getBooking(businessId, subjectId);
  const subject = order ?? booking;
  if (!subject || !(await isCustomerOf(d, subject, proof))) notFound();
  const biz = (await d.store.getBusiness(businessId))!;
  const payment = await d.store.getPaymentForOrder(businessId, subjectId);
  const kind = order ? "order" : "booking";
  const [statusText, bgTone, textTone] = LABEL[subject.status] ?? [subject.status, "#f6f7f7", "var(--ink)"];
  const items = order ? await d.store.getOrderItems(businessId, subjectId) : [];
  const group = booking ? await d.store.getResourceGroup(businessId, booking.groupId) : null;
  let instructions: Awaited<ReturnType<typeof getTransferInstructions>> | null = null;
  try {
    instructions = await getTransferInstructions(d, { businessId, orderId: subjectId, kind, as: proof });
  } catch {
    instructions = null;
  }
  const hidden = (
    <>
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="id" value={subjectId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="back" value={backPath} />
      {token && <input type="hidden" name="token" value={token} />}
    </>
  );
  const msg = friendly(error);

  const escrow = order ? await d.store.getEscrowRecord(subjectId) : null;
  let escrowSecrets: ReturnType<typeof generateEscrowSecrets> | null = null;
  let qrSvg: string | null = null;
  if (escrow && escrow.status === "held") {
    escrowSecrets = generateEscrowSecrets(env().TICKET_HMAC_SECRET, subjectId);
    qrSvg = await QRCode.toString(escrowSecrets.qrToken, { type: "svg", margin: 1, width: 170, errorCorrectionLevel: "M" });
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 80px" }}>
      {/* Header */}
      <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
        <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>Fluo</Link>
        <span>/</span>
        <Link href={`/b/${biz.slug}`} style={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
          <IconStore size={13} /> {biz.name}
        </Link>
        <span>/</span>
        <span style={{ color: "var(--ink)", fontWeight: 600 }}>{order ? "Order Receipt" : "Booking Receipt"}</span>
      </nav>

      {msg && (
        <div style={{
          padding: "12px 16px",
          background: "var(--coral-soft)",
          border: "1px solid var(--coral)",
          borderRadius: 12,
          color: "var(--coral-dark)",
          marginBottom: 20,
          fontSize: 13,
          fontWeight: 600,
        }} role="alert">
          {msg}
        </div>
      )}

      {/* Main Order Card */}
      <section style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 24,
        padding: "clamp(20px, 4vw, 32px)",
        boxShadow: "var(--shadow)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <span className="section-kicker" style={{ margin: "0 0 4px" }}>
              {order ? `ORDER #${subjectId.slice(0, 8).toUpperCase()}` : "CONFIRMED APPOINTMENT"}
            </span>
            <h1 style={{
              margin: 0,
              fontFamily: "Manrope, sans-serif",
              fontSize: "clamp(22px, 3.2vw, 28px)",
              fontWeight: 800,
              letterSpacing: "-0.8px",
              color: "var(--ink)",
            }}>
              {order ? "Your Order Summary" : (group?.name ?? "Your Reservation")}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
              Merchant: <strong style={{ color: "var(--ink)" }}>{biz.name}</strong>
            </p>
          </div>

          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: bgTone,
            color: textTone,
            padding: "6px 14px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
            textTransform: "capitalize",
          }}>
            {statusText}
          </span>
        </div>

        {booking && (
          <div style={{
            padding: "12px 16px",
            background: "var(--canvas)",
            borderRadius: 14,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--ink)",
            marginBottom: 20,
          }}>
            Scheduled: {fmtLocal(booking.startMs, biz.timezone)} &ndash; {fmtLocal(booking.endMs, biz.timezone)}
          </div>
        )}

        {/* Items Breakdown Table */}
        {items.length > 0 && (
          <div style={{
            margin: "20px 0",
            border: "1px solid var(--line)",
            borderRadius: 16,
            overflow: "hidden",
          }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              padding: "10px 16px",
              background: "var(--canvas)",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--muted)",
              letterSpacing: "0.5px",
            }}>
              <span>ITEM</span>
              <span>TOTAL</span>
            </div>
            {items.map((i, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  padding: "12px 16px",
                  borderTop: "1px solid var(--line)",
                  fontSize: 13,
                  alignItems: "center",
                }}
              >
                <div>
                  <strong style={{ color: "var(--ink)" }}>{i.name}</strong>
                  <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: 6 }}>× {i.quantity}</span>
                </div>
                <div style={{ fontWeight: 700, color: "var(--ink)" }}>
                  {fmtMoney(i.unitPriceMinor * BigInt(i.quantity), biz.currency)}
                </div>
              </div>
            ))}
            {payment && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                padding: "14px 16px",
                borderTop: "2px solid var(--line)",
                background: "#ffffff",
                alignItems: "center",
              }}>
                <span style={{ fontFamily: "Manrope, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
                  Total Amount
                </span>
                <span style={{ fontFamily: "Manrope, sans-serif", fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>
                  {fmtMoney(payment.amountMinor, payment.currency)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Escrow Delivery Protection & Handoff */}
        {escrow && escrow.status === "held" && escrowSecrets && (
          <div style={{
            border: "2px solid #818cf8",
            background: "rgba(99, 102, 241, 0.04)",
            borderRadius: 20,
            padding: 22,
            margin: "24px 0",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: "#4338ca" }}>
              <IconShield size={20} />
              <h3 style={{ margin: 0, fontFamily: "Manrope, sans-serif", fontSize: 17, fontWeight: 800 }}>
                Fluo Escrow Delivery Protection
              </h3>
            </div>
            <p style={{ fontSize: 13, color: "#374151", margin: "0 0 16px", lineHeight: 1.6 }}>
              Your funds are held securely in Fluo Escrow. Reveal the 4-digit PIN or show the QR code to the courier <strong>only after</strong> you have inspected and confirmed your items.
            </p>

            <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
              <div style={{
                textAlign: "center",
                background: "#ffffff",
                padding: "16px 28px",
                borderRadius: 16,
                border: "1px solid #c7d2fe",
                boxShadow: "0 4px 12px rgba(99, 102, 241, 0.08)",
              }}>
                <span style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: "#6366f1" }}>
                  DELIVERY PIN
                </span>
                <span style={{
                  fontFamily: "Manrope, sans-serif",
                  fontSize: 36,
                  fontWeight: 800,
                  letterSpacing: 8,
                  color: "#1e1b4b",
                  display: "block",
                  marginTop: 4,
                }}>
                  {escrowSecrets.pin}
                </span>
              </div>

              {qrSvg && (
                <div
                  role="img"
                  aria-label="Delivery QR Token"
                  style={{ background: "#ffffff", padding: 8, borderRadius: 14, border: "1px solid #c7d2fe" }}
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              )}
            </div>

            <form action={disputeEscrowAction}>
              <input type="hidden" name="orderId" value={subjectId} />
              <input type="hidden" name="back" value={backPath} />
              <details style={{ fontSize: 12 }}>
                <summary style={{ cursor: "pointer", color: "#dc2626", fontWeight: 700 }}>
                  Report an issue or dispute delivery
                </summary>
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  <input
                    name="reason"
                    placeholder="Describe the problem (e.g. damaged goods, wrong items, missing order)"
                    required
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid var(--line)",
                      fontSize: 13,
                    }}
                  />
                  <button className="primary-button" style={{ background: "#dc2626", borderColor: "#dc2626", width: "fit-content" }} type="submit">
                    Submit Dispute ↗
                  </button>
                </div>
              </details>
            </form>
          </div>
        )}

        {escrow && escrow.status === "released" && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#edf6f0",
            border: "1px solid #bfe3cc",
            color: "var(--green)",
            padding: "14px 18px",
            borderRadius: 16,
            margin: "20px 0",
            fontSize: 13,
            fontWeight: 600,
          }}>
            <IconCheck size={18} />
            <span>Escrow Released — Physical delivery hand-off verified. Payout released to merchant.</span>
          </div>
        )}

        {escrow && escrow.status === "disputed" && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            padding: "14px 18px",
            borderRadius: 16,
            margin: "20px 0",
            fontSize: 13,
          }}>
            <IconAlertTriangle size={18} />
            <span>
              <strong>Escrow Dispute Active:</strong> {escrow.disputeReason ?? "Under review by support"}. Funds remain frozen until resolved.
            </span>
          </div>
        )}

        {/* Bank Transfer Instructions */}
        {instructions && (
          <div style={{
            padding: 20,
            background: "var(--canvas)",
            border: "1px solid var(--line)",
            borderRadius: 18,
            margin: "20px 0",
          }}>
            <span className="section-kicker" style={{ margin: "0 0 6px" }}>DIRECT BANK TRANSFER INSTRUCTIONS</span>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 12px" }}>
              Send exactly <strong style={{ color: "var(--ink)" }}>{fmtMoney(instructions.amountMinor, instructions.currency)}</strong> to:
            </p>
            <div style={{ background: "#ffffff", padding: 14, borderRadius: 12, border: "1px solid var(--line)", marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 2 }}>{instructions.bankName}</div>
              <div style={{ fontFamily: "Manrope, sans-serif", fontSize: 24, fontWeight: 800, letterSpacing: 1, color: "var(--ink)" }}>
                {instructions.accountNumber}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>
                {instructions.accountName}
              </div>
            </div>
            <div style={{
              fontSize: 12,
              background: "var(--coral-soft)",
              color: "var(--coral-dark)",
              padding: "8px 12px",
              borderRadius: 8,
              fontWeight: 600,
              marginBottom: 14,
            }}>
              Narration reference: <strong>{instructions.reference}</strong>
            </div>

            {instructions.status === "created" ? (
              <form action={markSentAction}>
                {hidden}
                <button className="primary-button" style={{ width: "100%", justifyContent: "center" }} type="submit">
                  I have transferred the funds <span>↗</span>
                </button>
              </form>
            ) : (
              <p style={{ fontSize: 12, color: "var(--green)", fontWeight: 600, margin: 0 }}>
                ✓ You notified {biz.name} that transfer was initiated. They will confirm upon arrival.
              </p>
            )}
          </div>
        )}

        {/* Instant Online Payment Trigger */}
        {payment?.method === "provider" && payment.status === "created" && (
          <form action={payNowAction} style={{ margin: "20px 0" }}>
            {hidden}
            <button className="primary-button" style={{ width: "100%", justifyContent: "center", padding: "14px 20px" }} type="submit">
              Pay Now with Card or Bank <span>↗</span>
            </button>
          </form>
        )}

        {payment?.method === "provider" && payment.status === "pending" && (
          <div style={{
            padding: "12px 16px",
            background: "#fef3c7",
            borderRadius: 12,
            color: "#92400e",
            fontSize: 13,
            fontWeight: 600,
            margin: "16px 0",
          }}>
            Verifying your payment with Paystack... This page updates automatically.
          </div>
        )}

        {/* Branded Receipt Button */}
        {(order?.status === "paid" || order?.status === "completed" || booking?.status === "confirmed" || booking?.status === "checked_in") && (
          <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
            <a
              href={`/receipt/${subjectId}?b=${businessId}${token ? `&t=${token}` : ""}`}
              className="secondary-button"
              style={{ width: "100%", justifyContent: "center", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}
              target="_blank"
              rel="noopener"
            >
              <IconReceipt size={16} /> View &amp; Print Branded Receipt
            </a>
          </div>
        )}

        {/* Refund Policy & Cancellation */}
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, marginBottom: 12 }}>
            <strong style={{ color: "var(--ink)", display: "block" }}>Refund Policy:</strong>
            {describePolicy(subject.refundPolicy)}
          </div>

          {((order && order.status === "awaiting_payment" && payment?.status !== "awaiting_confirmation") ||
            (booking && (booking.status === "held" || booking.status === "confirmed") && payment?.status !== "awaiting_confirmation")) && (
            <form action={cancelAction}>
              {hidden}
              <button
                type="submit"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#dc2626",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                {order ? "Cancel this order" : "Cancel this booking"}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
