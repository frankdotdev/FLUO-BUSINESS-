import { authorize } from "../platform/authz.ts";
import { freeResources, validateRequest, type ResourceBookings } from "../platform/availability.ts";
import { priceForInterval } from "../platform/booking-price.ts";
import { allowedMethods } from "../payments/methods.ts";
import { canTransition } from "../payments/provider.ts";
import { newTransferReference } from "../payments/transfer.ts";
import { newGuestToken } from "../platform/guest-access.ts";
import { fmtLocal, fmtMoney, notifyBusiness, notifyRecipient, scheduleTransferNudges } from "../notifications/notify.ts";
import { type Buyer, isEmail } from "./checkout-service.ts";
import { afterBookingConfirmed, customerName } from "./lifecycle.ts";
import { isCustomerOf, type CustomerProof } from "./payout-service.ts";
import { type BookingRecord, type Deps, type PaymentRecord, fail } from "./ports.ts";

export const PROVIDER_HOLD_MINUTES = 15;
export const TRANSFER_HOLD_MINUTES = 120;           // long enough to pay by transfer, short enough not to lock a slot all day
export const TRANSFER_SENT_HOLD_HOURS = 24;         // once the customer says "I have transferred", the business gets a day to confirm
const GUEST_LINK_DAYS = 30;

export interface HoldInput { readonly buyer: Buyer; readonly businessId: string; readonly groupId: string; readonly startMs: number; readonly endMs: number; readonly method: "provider" | "bank_transfer" }
export interface HoldResult { bookingId: string; paymentId: string | null; totalMinor: bigint; transferReference: string | null; guestToken: string | null; holdExpiresMs: number | null; nextStep: "confirmed" | "provider_checkout" | "send_transfer" }

export async function holdBooking(d: Deps, input: HoldInput): Promise<HoldResult> {
  const biz = await d.store.getBusiness(input.businessId);
  if (!biz || biz.status !== "active") return fail("business_unavailable");
  const group = await d.store.getResourceGroup(biz.id, input.groupId);                 // scoped to this business
  if (!group || !group.active) return fail("unavailable");
  if (group.currency !== biz.currency) return fail("currency_mismatch");
  if (input.buyer.kind === "guest" && (input.buyer.contact.name.trim().length < 2 || !isEmail(input.buyer.contact.email))) return fail("invalid_contact");
  const now = d.now();
  const interval = { start: input.startMs, end: input.endMs };
  const v = validateRequest(group.policy, interval, now);
  if (!v.ok) return fail(v.reason);

  const total = priceForInterval(group.priceUnit, group.priceMinor, group.currency, input.startMs, input.endMs);
  const free = total.amountMinor === 0n;
  const transfer = input.method === "bank_transfer";
  if (!free && !allowedMethods("booking", total.amountMinor, { provider: biz.acceptsAutomatic, transfer: biz.allowsTransfer }).includes(input.method)) return fail("method_not_allowed");
  if (!free && transfer && !(await d.store.getTransferAccount(biz.id))) return fail("transfer_account_missing");

  const resources = await d.store.resourcesInGroup(biz.id, group.id);
  const state: ResourceBookings[] = [];
  for (const r of resources) state.push({ resourceId: r.id, bookings: await d.store.activeBookingIntervals(biz.id, r.id, now) });
  const candidates = freeResources(state, interval, group.policy.bufferMs);
  if (candidates.length === 0) return fail("fully_booked");

  const holdMs = free ? null : now + (transfer ? TRANSFER_HOLD_MINUTES : PROVIDER_HOLD_MINUTES) * 60_000;
  const guest = input.buyer.kind === "guest" ? newGuestToken() : null;
  for (const resourceId of candidates) {                                               // if a race takes one, try the next unit
    const bookingId = d.uuid();
    const payment: PaymentRecord | null = free ? null : {
      id: d.uuid(), businessId: biz.id, orderId: bookingId, purpose: "booking", method: input.method, status: "created",
      amountMinor: total.amountMinor, currency: total.currency, reference: transfer ? newTransferReference() : null, expiresAtMs: holdMs,
    };
    const booking: BookingRecord = {
      id: bookingId, businessId: biz.id, resourceId, groupId: group.id,
      userId: input.buyer.kind === "user" ? input.buyer.userId : null, guest: input.buyer.kind === "guest" ? input.buyer.contact : null,
      startMs: input.startMs, endMs: input.endMs, status: free ? "confirmed" : "held", holdExpiresMs: holdMs, paymentId: payment?.id ?? null, refundPolicy: biz.refundPolicy,
    };
    if (await d.store.insertBookingIfFree(booking, payment, group.policy.bufferMs, guest?.hash ?? null, now + GUEST_LINK_DAYS * 86_400_000, now)) {
      if (free) await afterBookingConfirmed(d, booking);
      else if (transfer) {
        const path = guest ? `/g/${guest.token}` : `/account/bookings/${bookingId}`;
        const to = guest ? { kind: "email" as const, email: (input.buyer as { contact: { email: string } }).contact.email } : { kind: "user" as const, userId: (input.buyer as { userId: string }).userId };
        await notifyRecipient(d, to, "booking_held_transfer", { businessName: biz.name, title: group.name, total: fmtMoney(total.amountMinor, total.currency), holdUntil: fmtLocal(holdMs!, biz.timezone), reference: payment!.reference!, path }, bookingId);
      }
      return {
        bookingId, paymentId: payment?.id ?? null, totalMinor: total.amountMinor, transferReference: payment?.reference ?? null, guestToken: guest?.token ?? null, holdExpiresMs: holdMs,
        nextStep: free ? "confirmed" : transfer ? "send_transfer" : "provider_checkout",
      };
    }
  }
  return fail("fully_booked");
}

/** Customer says "I have transferred". The hold is extended so the business has time to check its bank app. */
export async function markBookingTransferSent(d: Deps, args: { businessId: string; bookingId: string; as: CustomerProof }): Promise<void> {
  const b = await d.store.getBooking(args.businessId, args.bookingId);
  const payment = b ? await d.store.getPaymentForOrder(args.businessId, args.bookingId) : null;
  if (!b || !payment || !(await isCustomerOf(d, b, args.as))) return fail("not_found");
  if (payment.method !== "bank_transfer" || payment.status !== "created" || b.status !== "held" || (b.holdExpiresMs ?? 0) <= d.now()) return fail("invalid_state");
  if (!(await d.store.setPaymentStatus(args.businessId, payment.id, "created", "awaiting_confirmation"))) return fail("invalid_state");
  await d.store.setBookingHold(args.businessId, b.id, d.now() + TRANSFER_SENT_HOLD_HOURS * 3_600_000);
  const biz = await d.store.getBusiness(args.businessId);
  const group = await d.store.getResourceGroup(args.businessId, b.groupId);
  const vars = { customerName: await customerName(d, b), total: fmtMoney(payment.amountMinor, payment.currency), reference: payment.reference ?? "", businessId: b.businessId, paymentId: payment.id, title: group?.name ?? "", startsAt: biz ? fmtLocal(b.startMs, biz.timezone) : "", path: `/app/${b.businessId}/bookings/${b.id}` };
  await notifyBusiness(d, b.businessId, "bookings.manage", "biz_transfer_marked_sent", vars, payment.id);
  await scheduleTransferNudges(d, b.businessId, payment.id, vars);
}

/** The business confirms a manual transfer for a held booking. A lapsed hold cannot be confirmed (the slot may be gone). */
export async function confirmBookingTransfer(d: Deps, actor: string, businessId: string, bookingId: string): Promise<void> {
  const mine = await d.store.membershipsForUser(actor);
  if (!authorize(mine, actor, businessId, "bookings.manage").allowed) return fail("forbidden");
  const booking = await d.store.getBooking(businessId, bookingId);                    // other tenants' bookings are "not found"
  const payment = booking ? await d.store.getPaymentForOrder(businessId, bookingId) : null;
  if (!booking || !payment) return fail("not_found");
  if (payment.method !== "bank_transfer") return fail("not_a_transfer");
  if (booking.status !== "held" || (booking.holdExpiresMs ?? 0) <= d.now()) return fail("hold_expired");
  if (payment.status === "created") await d.store.setPaymentStatus(businessId, payment.id, "created", "awaiting_confirmation");
  if (!canTransition("awaiting_confirmation", "succeeded")) return fail("invalid_state");
  if (!(await d.store.setPaymentStatus(businessId, payment.id, "awaiting_confirmation", "succeeded"))) return fail("invalid_state");
  if (!(await d.store.setBookingStatus(businessId, bookingId, "held", "confirmed"))) return fail("invalid_state");
  await d.store.appendAudit({ businessId, actorUserId: actor, action: "booking.transfer_confirmed", targetId: bookingId, atMs: d.now() });
  const confirmed = await d.store.getBooking(businessId, bookingId);
  if (confirmed) await afterBookingConfirmed(d, confirmed);
}
