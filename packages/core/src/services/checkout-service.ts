import { authorize } from "../platform/authz.ts";
import { allowedMethods } from "../payments/methods.ts";
import { TRANSFER_HOLD_HOURS, newTransferReference } from "../payments/transfer.ts";
import { canTransition } from "../payments/provider.ts";
import { meetsLeadTime, priceCart, type CartLine } from "../commerce/orders.ts";
import { newGuestToken } from "../platform/guest-access.ts";
import { fmtMoney, notifyBusiness, notifyRecipient, scheduleTransferNudges } from "../notifications/notify.ts";
import { afterOrderPaid, customerName, customerTarget } from "./lifecycle.ts";
import { isCustomerOf, type CustomerProof } from "./payout-service.ts";
import { PLAN_ENTITLEMENTS } from "../billing/plans.ts";
import { checkLimit } from "../billing/pricing.ts";
import { resolveEntitlements } from "./subscription-service.ts";
import { type Deps, type GuestContact, type OrderItemRecord, type OrderRecord, type PaymentRecord, ServiceError, fail } from "./ports.ts";

export type Buyer = { kind: "user"; userId: string } | { kind: "guest"; contact: GuestContact };
export interface PlaceOrderInput { readonly buyer: Buyer; readonly businessId: string; readonly lines: readonly CartLine[]; readonly method: "provider" | "bank_transfer"; readonly requiredByMs?: number; readonly note?: string }
export interface PlaceOrderResult { orderId: string; paymentId: string; totalMinor: bigint; transferReference: string | null; guestToken: string | null; nextStep: "provider_checkout" | "send_transfer" }

const GUEST_LINK_DAYS = 30;
export const isEmail = (s: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

export async function placeOrder(d: Deps, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const business = await d.store.getBusiness(input.businessId);
  if (!business || business.status !== "active") return fail("business_unavailable");
  if (input.buyer.kind === "guest" && (input.buyer.contact.name.trim().length < 2 || !isEmail(input.buyer.contact.email))) return fail("invalid_contact");
  // Plan limit: orders per calendar month (UTC). Over the limit, new orders are refused; nothing existing is touched.
  const { entitlements } = await resolveEntitlements(d, business.id, PLAN_ENTITLEMENTS);
  const monthStart = Date.UTC(new Date(d.now()).getUTCFullYear(), new Date(d.now()).getUTCMonth(), 1);
  if (!checkLimit(entitlements, "orders_per_month", await d.store.countOrdersSince(business.id, monthStart)).allowed) return fail("order_limit_reached");
  // Prices come from the catalogue of THIS business only; client prices are never accepted.
  const entries = await d.store.catalogue(business.id, input.lines.map((l) => l.productId));
  let priced; try { priced = priceCart(entries, input.lines, business.currency); } catch (e) { return fail((e as Error).message); }

  const madeToOrder = input.lines.some((l) => entries.get(l.productId)?.fulfilment === "made_to_order");
  const now = d.now();
  if (madeToOrder) {
    if (input.requiredByMs === undefined) return fail("required_by_needed");
    const maxLead = Math.max(...input.lines.map((l) => entries.get(l.productId)!.leadTimeHours));
    if (!meetsLeadTime(now, input.requiredByMs, maxLead)) return fail("lead_time_not_met");
  }
  if (!allowedMethods("order", priced.total.amountMinor, { provider: business.acceptsAutomatic, transfer: business.allowsTransfer }).includes(input.method)) return fail("method_not_allowed");
  const transfer = input.method === "bank_transfer";
  if (transfer && !(await d.store.getTransferAccount(business.id))) return fail("transfer_account_missing");

  const orderId = d.uuid();
  const order: OrderRecord = {
    id: orderId, businessId: business.id,
    userId: input.buyer.kind === "user" ? input.buyer.userId : null, guest: input.buyer.kind === "guest" ? input.buyer.contact : null,
    kind: madeToOrder ? "made_to_order" : "standard", status: "awaiting_payment", currency: business.currency,
    totalMinor: priced.total.amountMinor, requiredByMs: input.requiredByMs ?? null, note: input.note?.slice(0, 500) ?? null, refundPolicy: business.refundPolicy,
  };
  const items: OrderItemRecord[] = priced.lines.map((l) => ({ productId: l.productId, name: entries.get(l.productId)!.name, unitPriceMinor: l.unitPrice.amountMinor, quantity: l.quantity }));
  const payment: PaymentRecord = {
    id: d.uuid(), businessId: business.id, orderId, purpose: "order", method: input.method, status: "created", amountMinor: priced.total.amountMinor,
    currency: business.currency, reference: transfer ? newTransferReference() : null, expiresAtMs: transfer ? now + TRANSFER_HOLD_HOURS * 3600_000 : null,
  };
  const guest = input.buyer.kind === "guest" ? newGuestToken() : null;
  try { await d.store.insertOrder(order, items, payment, guest?.hash ?? null, now + GUEST_LINK_DAYS * 86_400_000); }
  catch (e) { if ((e as Error).message === "out_of_stock") return fail("out_of_stock"); throw e; }

  if (transfer) {                                                         // payment instructions by email as well as on screen
    const path = guest ? `/g/${guest.token}` : `/account/orders/${orderId}`;
    const to = guest ? { kind: "email" as const, email: (input.buyer as { contact: GuestContact }).contact.email } : { kind: "user" as const, userId: (input.buyer as { userId: string }).userId };
    await notifyRecipient(d, to, "order_placed_transfer", { businessName: business.name, total: fmtMoney(payment.amountMinor, payment.currency), reference: payment.reference!, path }, orderId);
  }
  return { orderId, paymentId: payment.id, totalMinor: priced.total.amountMinor, transferReference: payment.reference, guestToken: guest?.token ?? null, nextStep: transfer ? "send_transfer" : "provider_checkout" };
}

/** Customer says "I have transferred". The business is told straight away and nudged until it confirms. */
export async function markTransferSent(d: Deps, args: { businessId: string; orderId: string; as: CustomerProof }): Promise<void> {
  const order = await d.store.getOrder(args.businessId, args.orderId);
  const payment = order ? await d.store.getPaymentForOrder(args.businessId, args.orderId) : null;
  if (!order || !payment) return fail("not_found");
  if (!(await isCustomerOf(d, order, args.as))) return fail("not_found");          // same answer as "does not exist": no probing
  if (payment.method !== "bank_transfer" || payment.status !== "created") return fail("invalid_state");
  if (payment.expiresAtMs !== null && d.now() >= payment.expiresAtMs) return fail("transfer_expired");
  if (!(await d.store.setPaymentStatus(args.businessId, payment.id, "created", "awaiting_confirmation"))) return fail("invalid_state");
  const vars = { customerName: await customerName(d, order), total: fmtMoney(payment.amountMinor, payment.currency), reference: payment.reference ?? "", businessId: order.businessId, paymentId: payment.id, path: `/app/${order.businessId}/orders/${order.id}` };
  await notifyBusiness(d, order.businessId, "orders.write", "biz_transfer_marked_sent", vars, payment.id);
  await scheduleTransferNudges(d, order.businessId, payment.id, vars);
}

/** The BUSINESS confirms the money arrived in its own account. Fluo cannot verify bank transfers. */
export async function confirmTransfer(d: Deps, actorUserId: string, businessId: string, orderId: string): Promise<void> {
  const memberships = await d.store.membershipsForUser(actorUserId);
  if (!authorize(memberships, actorUserId, businessId, "orders.write").allowed) return fail("forbidden");
  const order = await d.store.getOrder(businessId, orderId);            // scoped by business: another tenant's order is "not found"
  const payment = order ? await d.store.getPaymentForOrder(businessId, orderId) : null;
  if (!order || !payment) return fail("not_found");
  if (payment.method !== "bank_transfer") return fail("not_a_transfer");
  if (payment.expiresAtMs !== null && d.now() >= payment.expiresAtMs && payment.status === "created") return fail("transfer_expired");
  if (payment.status === "created") await d.store.setPaymentStatus(businessId, payment.id, "created", "awaiting_confirmation");
  if (!canTransition("awaiting_confirmation", "succeeded")) return fail("invalid_state");
  if (!(await d.store.setPaymentStatus(businessId, payment.id, "awaiting_confirmation", "succeeded"))) return fail("invalid_state");
  if (!(await d.store.setOrderStatus(businessId, orderId, "awaiting_payment", "paid"))) return fail("invalid_state");
  await d.store.appendAudit({ businessId, actorUserId, action: "payment.transfer_confirmed", targetId: payment.id, atMs: d.now() });
  const paid = await d.store.getOrder(businessId, orderId);
  if (paid) await afterOrderPaid(d, paid);
}

/** A customer abandons an order they have not paid for. Not allowed once they say they've transferred (the business may hold the money). */
export async function cancelUnpaidOrder(d: Deps, args: { businessId: string; orderId: string; as: CustomerProof }): Promise<void> {
  const order = await d.store.getOrder(args.businessId, args.orderId);
  const payment = order ? await d.store.getPaymentForOrder(args.businessId, args.orderId) : null;
  if (!order || !payment || !(await isCustomerOf(d, order, args.as))) return fail("not_found");
  if (order.status !== "awaiting_payment") return fail("not_cancellable");
  if (payment.status === "awaiting_confirmation") return fail("payment_pending_confirmation");
  if (!(await d.store.setOrderStatus(args.businessId, order.id, "awaiting_payment", "cancelled"))) return fail("invalid_state");
  await d.store.releaseOrderStock(args.businessId, order.id);                  // the reserved stock goes back on the shelf
  if (canTransition(payment.status, "expired")) await d.store.setPaymentStatus(args.businessId, payment.id, payment.status, "expired");
}
void customerTarget;
export { ServiceError };
