import { authorize } from "../platform/authz.ts";
import { refundAmount } from "../platform/refund-policy.ts";
import { canTransition } from "../payments/provider.ts";
import { money } from "../money.ts";
import { fmtMoney, notifyBusiness, notifyRecipient } from "../notifications/notify.ts";
import { customerName, customerTarget } from "./lifecycle.ts";
import { isCustomerOf, type CustomerProof } from "./payout-service.ts";
import { type Deps, fail } from "./ports.ts";

export type Canceller = { kind: "customer"; proof: CustomerProof } | { kind: "business"; actorUserId: string };

/** Cancels a booking under the business's own refund policy (the snapshot the customer agreed to).
 *  Fluo records the entitlement; the BUSINESS refunds and marks it done. Business-initiated cancellations are always full. */
export async function cancelBooking(d: Deps, a: { businessId: string; bookingId: string; by: Canceller }): Promise<{ refundMinor: bigint }> {
  const b = await d.store.getBooking(a.businessId, a.bookingId);
  if (!b) return fail("not_found");
  if (a.by.kind === "business") {
    const mine = await d.store.membershipsForUser(a.by.actorUserId);
    if (!authorize(mine, a.by.actorUserId, a.businessId, "bookings.manage").allowed) return fail("forbidden");
  } else if (!(await isCustomerOf(d, b, a.by.proof))) return fail("not_found");
  if (b.status !== "held" && b.status !== "confirmed") return fail("not_cancellable");
  const now = d.now();
  if (a.by.kind === "customer" && now >= b.startMs) return fail("already_started");
  const payment = b.paymentId ? await d.store.getPayment(a.businessId, b.paymentId) : null;
  const biz = await d.store.getBusiness(a.businessId);
  const group = await d.store.getResourceGroup(a.businessId, b.groupId);
  if (!biz) return fail("not_found");

  let refund = 0n;
  if (b.status === "held") {
    if (payment?.status === "awaiting_confirmation" && a.by.kind === "customer") return fail("payment_pending_confirmation");   // the business may already hold the money
    if (!(await d.store.setBookingStatus(a.businessId, b.id, "held", "cancelled"))) return fail("invalid_state");
    if (payment && canTransition(payment.status, "expired")) await d.store.setPaymentStatus(a.businessId, payment.id, payment.status, "expired");
  } else {
    if (!(await d.store.setBookingStatus(a.businessId, b.id, "confirmed", "cancelled"))) return fail("invalid_state");
    if (payment?.status === "succeeded" || payment?.status === "partially_refunded") {
      const paid = money(payment.amountMinor, payment.currency);
      refund = a.by.kind === "business" ? paid.amountMinor : refundAmount(b.refundPolicy, paid, b.startMs, now).amountMinor;
      if (refund > 0n) {
        const id = d.uuid();
        await d.store.insertRefundRequest({ id, businessId: a.businessId, paymentId: payment.id, subjectKind: "booking", subjectId: b.id, amountMinor: refund, currency: payment.currency, status: "requested", reason: null, createdAtMs: now, resolvedAtMs: null });
        await notifyBusiness(d, a.businessId, "refunds.manage", "biz_refund_requested", { customerName: await customerName(d, b), amount: fmtMoney(refund, payment.currency), path: `/app/${a.businessId}/refunds/${id}` }, id);
      }
    }
  }
  const t = await customerTarget(d, b, "bookings");
  const refundNote = refund > 0n ? `You are due a refund of ${fmtMoney(refund, biz.currency)}. ${biz.name} will pay it back and mark it as refunded.`
    : b.status === "confirmed" && payment ? "Under this business's refund policy, this booking is not refundable." : "";
  if (t) await notifyRecipient(d, t.to, "booking_cancelled", { businessName: biz.name, title: group?.name ?? "Booking", refundNote, path: t.path }, b.id);
  await d.store.appendAudit({ businessId: a.businessId, actorUserId: a.by.kind === "business" ? a.by.actorUserId : null, action: "booking.cancelled", targetId: b.id, atMs: now });
  return { refundMinor: refund };
}

/** The business records its decision on a refund. It performs the refund itself; Fluo never moves refund money. */
export async function resolveRefund(d: Deps, actor: string, businessId: string, refundId: string, outcome: { status: "refunded" } | { status: "declined"; reason: string }): Promise<void> {
  const mine = await d.store.membershipsForUser(actor);
  if (!authorize(mine, actor, businessId, "refunds.manage").allowed) return fail("forbidden");
  const r = await d.store.getRefundRequest(businessId, refundId);
  if (!r) return fail("not_found");
  if (outcome.status === "declined" && outcome.reason.trim().length < 5) return fail("reason_required");
  if (!(await d.store.setRefundStatus(businessId, refundId, "requested", outcome.status, d.now()))) return fail("already_resolved");
  const payment = await d.store.getPayment(businessId, r.paymentId);
  if (outcome.status === "refunded" && payment) {
    const to = r.amountMinor >= payment.amountMinor ? "refunded" : "partially_refunded";
    if (canTransition(payment.status, to)) await d.store.setPaymentStatus(businessId, payment.id, payment.status, to);
  }
  const subject = r.subjectKind === "booking" ? await d.store.getBooking(businessId, r.subjectId) : await d.store.getOrder(businessId, r.subjectId);
  const biz = await d.store.getBusiness(businessId);
  const t = subject && biz ? await customerTarget(d, subject, r.subjectKind === "booking" ? "bookings" : "orders") : null;
  if (t && biz) await notifyRecipient(d, t.to, "refund_update", { businessName: biz.name, amount: fmtMoney(r.amountMinor, r.currency), status: outcome.status === "refunded" ? "paid out" : "declined", path: t.path }, r.id);
  await d.store.appendAudit({ businessId, actorUserId: actor, action: `refund.${outcome.status}`, targetId: r.id, atMs: d.now() });
}
