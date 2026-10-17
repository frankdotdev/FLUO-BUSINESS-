import { canTransition, type NormalizedEvent, type PaymentStatus } from "../payments/provider.ts";
import { extendPaidUntil, renewalReminderTimes } from "../billing/subscription.ts";
import { notifyRecipient } from "../notifications/notify.ts";
import { afterBookingConfirmed, afterOrderPaid, afterTicketsIssued } from "./lifecycle.ts";
import { type Deps, type PaymentRecord } from "./ports.ts";

export interface ProviderCheck { readonly status: PaymentStatus; readonly amountMinor: bigint; readonly currency: string }
export type EventOutcome = "duplicate" | "ignored" | "unknown_payment" | "applied" | "already_applied" | "amount_mismatch" | "needs_reconciliation";

/** Called ONLY after the webhook signature was verified. Never fulfils on the webhook alone: it re-checks the payment
 *  with the provider (`verify`) and compares amount and currency with our own record. Idempotent and safe to retry. */
export async function applyProviderEvent(d: Deps, event: NormalizedEvent, verify: (providerReference: string) => Promise<ProviderCheck>): Promise<EventOutcome> {
  if (!(await d.store.recordWebhook(event.provider, event.eventId))) return "duplicate";
  try {
    return await process(d, event, verify);
  } catch (e) {
    await d.store.forgetWebhook(event.provider, event.eventId);       // let the provider's retry run again
    throw e;
  }
}

async function process(d: Deps, event: NormalizedEvent, verify: (ref: string) => Promise<ProviderCheck>): Promise<EventOutcome> {
  if (event.type !== "payment.succeeded" && event.type !== "payment.failed") return "ignored";
  const payment = await d.store.findPaymentByProviderRef(event.provider, event.providerReference);
  if (!payment) {
    await d.store.appendAudit({ businessId: null, actorUserId: null, action: "payment.unknown_reference", targetId: event.providerReference, atMs: d.now() });
    return "unknown_payment";
  }
  const biz = payment.businessId;
  if (event.type === "payment.failed") return (await d.store.setPaymentStatus(biz, payment.id, "pending", "failed")) ? "applied" : "already_applied";
  if (payment.status === "succeeded") return "already_applied";
  const check = await verify(event.providerReference);
  if (check.status !== "succeeded") return "ignored";
  if (check.amountMinor !== payment.amountMinor || check.currency !== payment.currency) {
    await d.store.appendAudit({ businessId: biz, actorUserId: null, action: "payment.amount_mismatch", targetId: payment.id, atMs: d.now() });
    return "amount_mismatch";                                           // nothing is fulfilled
  }
  if (!canTransition(payment.status, "succeeded")) {
    await d.store.appendAudit({ businessId: biz, actorUserId: null, action: "payment.needs_reconciliation", targetId: payment.id, atMs: d.now() });
    return "needs_reconciliation";                                      // e.g. paid after we marked it failed/expired
  }
  if (!(await d.store.setPaymentStatus(biz, payment.id, payment.status, "succeeded"))) return "already_applied";
  return fulfil(d, payment);
}

async function fulfil(d: Deps, payment: PaymentRecord): Promise<EventOutcome> {
  const biz = payment.businessId;
  if (payment.purpose === "ticket") {
    const n = await d.store.setTicketsForPayment(biz, payment.id, "held", "valid", d.now());
    if (n === 0) {                                                      // paid after the hold expired: money taken, no tickets
      await d.store.appendAudit({ businessId: biz, actorUserId: null, action: "payment.paid_without_tickets_refund_needed", targetId: payment.id, atMs: d.now() });
      return "needs_reconciliation";
    }
    const tickets = await d.store.ticketsForPayment(biz, payment.id);
    const type = tickets[0] ? await d.store.getTicketType(biz, tickets[0].ticketTypeId) : null;
    await afterTicketsIssued(d, tickets, type?.eventName ?? "your event");
  } else if (payment.purpose === "booking") {
    if (!(await d.store.setBookingStatus(biz, payment.orderId, "held", "confirmed"))) {   // paid after the hold lapsed
      await d.store.appendAudit({ businessId: biz, actorUserId: null, action: "payment.paid_without_booking_refund_needed", targetId: payment.id, atMs: d.now() });
      return "needs_reconciliation";
    }
    const b = await d.store.getBooking(biz, payment.orderId);
    if (b) await afterBookingConfirmed(d, b);
  } else if (payment.purpose === "subscription") {
    const current = await d.store.getSubscription(biz);
    const paidUntilMs = extendPaidUntil(current?.paidUntilMs ?? null, d.now(), payment.interval ?? "month");
    const sub = { businessId: biz, planKey: payment.planKey ?? "starter", paidUntilMs, cancelAtPeriodEnd: false, currency: payment.currency };
    await d.store.upsertSubscription(sub);
    await d.store.appendAudit({ businessId: biz, actorUserId: null, action: "subscription.paid", targetId: payment.id, atMs: d.now() });
    for (const at of renewalReminderTimes(sub)) {
      if (at <= d.now()) continue;
      const days = Math.round((paidUntilMs - at) / 86_400_000);
      const owner = (await d.store.membershipsForBusiness(biz)).find((m) => m.role === "owner" && m.status === "active");
      if (owner) await notifyRecipient(d, { kind: "user", userId: owner.userId }, "biz_subscription_renewal", { planName: sub.planKey, endsPhrase: days === 0 ? "ends today" : `ends in ${days} days`, businessId: biz, paidUntilMs: String(paidUntilMs), path: `/app/${biz}/billing` }, `${biz}:${paidUntilMs}:${days}`, at);
    }
  } else {
    if (await d.store.setOrderStatus(biz, payment.orderId, "awaiting_payment", "paid")) {
      const o = await d.store.getOrder(biz, payment.orderId);
      if (o) await afterOrderPaid(d, o);
    }
  }
  return "applied";
}
