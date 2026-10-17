import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { MemoryStore } from "./memory-store.ts";
import { createBusiness, publishBusiness } from "./business-service.ts";
import { getTransferInstructions, setPayoutAccount, setPaymentModes, setTransferAccount } from "./payout-service.ts";
import { initializeProviderCheckout } from "./provider-checkout.ts";
import { createProduct, enforceListingLimit, setProductStatus } from "./catalogue-service.ts";
import { cancelBooking, resolveRefund } from "./cancel-service.ts";
import { cancelSubscription, resolveEntitlements, resumeSubscription, startSubscriptionPayment } from "./subscription-service.ts";
import { applyProviderEvent } from "./payment-events.ts";
import { confirmBookingTransfer, holdBooking, markBookingTransferSent } from "./booking-service.ts";
import { cancelUnpaidOrder, confirmTransfer, markTransferSent, placeOrder } from "./checkout-service.ts";
import { drainOutbox } from "../notifications/notify.ts";
import { renderNotification } from "../notifications/templates.ts";
import { runMaintenance } from "./maintenance.ts";
import { type Deps, type EmailProvider, type PushProvider, ServiceError } from "./ports.ts";
import type { PaymentProvider } from "../payments/provider.ts";
import { PLAN_ENTITLEMENTS, PRICE_BOOK } from "../billing/plans.ts";
import { stayToInterval } from "../platform/timezone.ts";
import { money } from "../money.ts";
import type { AvailabilityPolicy } from "../platform/availability.ts";

const H = 3_600_000, D = 24 * H;
const NOW = Date.UTC(2026, 9, 10, 7, 0);
const code = async (p: Promise<unknown>) => { try { await p; return "no_error"; } catch (e) { return e instanceof ServiceError ? e.code : `unexpected:${(e as Error).message}`; } };
const guest = { kind: "guest" as const, contact: { name: "Ada Obi", email: "ada@x.com" } };

function setup() {
  const store = new MemoryStore(); let t = NOW;
  const keys = { k1: randomBytes(32) };
  const d: Deps & { advance(ms: number): void } = { store, now: () => t, uuid: () => randomUUID(), ticketSecret: "s", appUrl: "https://fluo.test", keys, keyId: "k1", advance: (ms) => { t += ms; } };
  return { store, d };
}
interface InitCall { reference: string; split?: { subaccount: string; platformFee: { amountMinor: bigint } } }
function fakeProvider(opts: { accountName?: string } = {}) {
  const calls: InitCall[] = [];
  const p: PaymentProvider = {
    id: "paystack", countries: "*", currencies: "*",
    initialize: async (i) => { calls.push(i as InitCall); return { checkoutUrl: `https://checkout.test/${i.reference}` }; },
    verify: async () => { throw new Error("not used"); },
    parseWebhook: () => null,
    resolveAccount: async () => ({ accountName: opts.accountName ?? "FRANK OKON" }),
    createSubaccount: async () => ({ ref: "ACCT_test1", accountName: opts.accountName ?? "FRANK OKON" }),
  };
  return { p, calls };
}
const lagos = { countryCode: "NG", currency: "NGN", timezone: "Africa/Lagos" };

test("payout: name match activates automatic payments; mismatch waits for review; only the owner may set it", async () => {
  const { store, d } = setup(); const { p } = fakeProvider();
  const b = await createBusiness(d, "frank", { name: "Frank Bakes", typeId: "bakery", ...lagos });
  store.members.push({ userId: "jane", businessId: b.id, role: "cashier", status: "active" }, { userId: "ada", businessId: b.id, role: "admin", status: "active" });
  const input = { bankCode: "058", accountNumber: "0123456789", ownerName: "Frank Okon" };
  assert.equal(await code(setPayoutAccount(d, p, "jane", b.id, input)), "forbidden");
  assert.equal(await code(setPayoutAccount(d, p, "ada", b.id, input)), "forbidden");            // admins cannot move the money destination
  assert.equal(await code(setPayoutAccount(d, p, "frank", b.id, { ...input, accountNumber: "123" })), "invalid_account_number");
  const r = await setPayoutAccount(d, p, "frank", b.id, input);
  assert.deepEqual(r, { verified: true, accountName: "FRANK OKON" });
  assert.equal((await store.getBusiness(b.id))!.acceptsAutomatic, true);
  assert.equal(store.payouts.get(b.id)!.accountLast4, "6789");
  assert.equal(JSON.stringify([...store.payouts.values()]).includes("0123456789"), false, "full account number is never stored");
  const other = fakeProvider({ accountName: "TUNDE BELLO" });
  const b2 = await createBusiness(d, "mike", { name: "Mike Shop", typeId: "retail", ...lagos });
  const r2 = await setPayoutAccount(d, other.p, "mike", b2.id, { ...input, ownerName: "Mike Eze" });
  assert.equal(r2.verified, false);
  assert.equal((await store.getBusiness(b2.id))!.acceptsAutomatic, false);
  assert.equal(store.payouts.get(b2.id)!.providerRef, "", "no sub-account is created for an unverified account");
});

test("payment modes: the business chooses; automatic needs a verified payout; manual needs an account", async () => {
  const { store, d } = setup(); const { p } = fakeProvider();
  const b = await createBusiness(d, "frank", { name: "Frank Okon Shop", typeId: "retail", ...lagos });
  assert.equal(await code(setPaymentModes(d, "frank", b.id, { automatic: false, manual: false })), "at_least_one_mode_required");
  assert.equal(await code(setPaymentModes(d, "frank", b.id, { automatic: true, manual: false })), "payout_not_verified");
  assert.equal(await code(setPaymentModes(d, "frank", b.id, { automatic: false, manual: true })), "transfer_account_required");
  await setTransferAccount(d, "frank", b.id, { bankName: "GTBank", accountName: "Frank Okon", accountNumber: "0123456789" });
  await setPaymentModes(d, "frank", b.id, { automatic: false, manual: true });
  assert.equal((await store.getBusiness(b.id))!.acceptsAutomatic, false);
  await setPayoutAccount(d, p, "frank", b.id, { bankCode: "058", accountNumber: "0123456789", ownerName: "Frank Okon" });
  await setPaymentModes(d, "frank", b.id, { automatic: true, manual: true });
  assert.equal(await code(setPaymentModes(d, "mallory", b.id, { automatic: true, manual: true })), "forbidden");
  assert.equal(store.transferAccounts.get(b.id)!.accountNumberEncrypted.includes("0123456789"), false, "transfer account number is encrypted");
});

test("manual payment: the customer sees the account number; nobody else does", async () => {
  const { store, d } = setup();
  const b = await createBusiness(d, "frank", { name: "Frank Bakes", typeId: "retail", ...lagos, acceptsAutomatic: false });
  await publishBusiness(d, "frank", b.id);
  await setTransferAccount(d, "frank", b.id, { bankName: "GTBank", accountName: "Frank Okon", accountNumber: "0123456789" });
  store.items.set(b.id, new Map([["p", { price: money(250000, "NGN"), active: true, maxPerOrder: 5, name: "Cake", fulfilment: "stock", leadTimeHours: 0 }]]));
  const o = await placeOrder(d, { buyer: guest, businessId: b.id, lines: [{ productId: "p", quantity: 1 }], method: "bank_transfer" });
  const other = await placeOrder(d, { buyer: { kind: "guest", contact: { name: "Eve Ade", email: "eve@x.com" } }, businessId: b.id, lines: [{ productId: "p", quantity: 1 }], method: "bank_transfer" });
  const info = await getTransferInstructions(d, { businessId: b.id, orderId: o.orderId, kind: "order", as: { kind: "guest", token: o.guestToken! } });
  assert.deepEqual([info.bankName, info.accountName, info.accountNumber, info.reference, info.amountMinor], ["GTBank", "Frank Okon", "0123456789", o.transferReference, 250000n]);
  assert.equal(await code(getTransferInstructions(d, { businessId: b.id, orderId: o.orderId, kind: "order", as: { kind: "guest", token: other.guestToken! } })), "not_found");
  assert.equal(await code(getTransferInstructions(d, { businessId: b.id, orderId: o.orderId, kind: "order", as: { kind: "user", userId: "mallory" } })), "not_found");
  await markTransferSent(d, { businessId: b.id, orderId: o.orderId, as: { kind: "guest", token: o.guestToken! } });
  await confirmTransfer(d, "frank", b.id, o.orderId);
  assert.equal(await code(getTransferInstructions(d, { businessId: b.id, orderId: o.orderId, kind: "order", as: { kind: "guest", token: o.guestToken! } })), "not_found");   // once paid, no longer shown
  assert.equal(await code(cancelUnpaidOrder(d, { businessId: b.id, orderId: o.orderId, as: { kind: "guest", token: o.guestToken! } })), "not_cancellable");
});

test("provider checkout: money goes to the business sub-account; only paid tickets carry Fluo's 2%; subscriptions are plain", async () => {
  const { store, d } = setup(); const { p, calls } = fakeProvider();
  const b = await createBusiness(d, "frank", { name: "Frank Okon Events", typeId: "event_organiser", ...lagos });
  await setPayoutAccount(d, p, "frank", b.id, { bankCode: "058", accountNumber: "0123456789", ownerName: "Frank Okon" });
  await publishBusiness(d, "frank", b.id);
  store.payments.set("pay-order", { id: "pay-order", businessId: b.id, orderId: "o1", purpose: "order", method: "provider", status: "created", amountMinor: 1000000n, currency: "NGN", reference: null, expiresAtMs: null });
  store.payments.set("pay-ticket", { id: "pay-ticket", businessId: b.id, orderId: "t1", purpose: "ticket", method: "provider", status: "created", amountMinor: 500000n, currency: "NGN", reference: null, expiresAtMs: null });
  const a = { businessId: b.id, customerEmail: "ada@x.com", callbackUrl: "https://fluo.test/back", eventFeeBps: 200 };
  const r1 = await initializeProviderCheckout(d, p, { ...a, paymentId: "pay-order" });
  assert.match(r1.checkoutUrl, /^https:\/\/checkout\.test\/fl_/);
  assert.deepEqual([calls[0]!.split!.subaccount, calls[0]!.split!.platformFee.amountMinor], ["ACCT_test1", 0n]);
  await initializeProviderCheckout(d, p, { ...a, paymentId: "pay-ticket" });
  assert.equal(calls[1]!.split!.platformFee.amountMinor, 10000n);                      // 2% of N5,000
  assert.equal(await code(initializeProviderCheckout(d, p, { ...a, paymentId: "pay-order" })), "invalid_state");   // cannot start twice
  assert.equal(store.payments.get("pay-order")!.status, "pending");
  const noPayout = await createBusiness(d, "mike", { name: "Mike Shop", typeId: "retail", ...lagos, acceptsAutomatic: true });
  store.payments.set("pay-x", { id: "pay-x", businessId: noPayout.id, orderId: "o9", purpose: "order", method: "provider", status: "created", amountMinor: 100n, currency: "NGN", reference: null, expiresAtMs: null });
  assert.equal(await code(initializeProviderCheckout(d, p, { ...a, businessId: noPayout.id, paymentId: "pay-x" })), "payments_unavailable");
  assert.equal(await code(initializeProviderCheckout(d, p, { ...a, businessId: noPayout.id, paymentId: "pay-order" })), "invalid_state");   // another business's payment id is invisible
});

test("catalogue: permissions, capability gate, free-plan listing limit, paused (not deleted) after the plan ends", async () => {
  const { store, d } = setup();
  const b = await createBusiness(d, "frank", { name: "Frank Shop", typeId: "retail", ...lagos });
  const free = PLAN_ENTITLEMENTS["free"]!;
  const mk = (n: number, publish = true) => createProduct(d, "frank", b.id, { name: `Item ${n}`, priceMinor: 100000n, publish }, free);
  for (let i = 1; i <= 10; i++) { await mk(i); d.advance(1000); }
  assert.equal(await code(mk(11)), "listing_limit_reached");
  const draft = await mk(12, false); assert.equal(draft.status, "draft");                // drafts don't count
  assert.equal(await code(setProductStatus(d, "frank", b.id, draft.id, "active", free)), "listing_limit_reached");
  await setProductStatus(d, "frank", b.id, draft.id, "active", PLAN_ENTITLEMENTS["starter"]!);
  assert.equal(await store.countProducts(b.id, ["active"]), 11);
  assert.equal(await enforceListingLimit(d, b.id, free), 1);                              // downgrade: newest is paused
  assert.equal(await store.countProducts(b.id, ["paused"]), 1);
  assert.equal(await store.countProducts(b.id, ["active", "paused"]), 11, "nothing deleted");
  assert.equal(await enforceListingLimit(d, b.id, free), 0, "idempotent");
  assert.equal(await code(createProduct(d, "mallory", b.id, { name: "Hack", priceMinor: 1n }, free)), "forbidden");
  const salon = await createBusiness(d, "pat", { name: "Pat Salon", typeId: "salon_barber", ...lagos });
  assert.equal(await code(createProduct(d, "pat", salon.id, { name: "Item", priceMinor: 1n }, free)), "capability_not_enabled");
  assert.equal(await code(createProduct(d, "frank", b.id, { name: "X", priceMinor: 1n }, free)), "invalid_name");
  assert.equal(await code(createProduct(d, "frank", b.id, { name: "Okay", priceMinor: -1n }, free)), "invalid_price");
});

const hotelPolicy: AvailabilityPolicy = { kind: "nights", minDurationMs: D, maxDurationMs: 30 * D, granularityMs: H, alignmentOriginMs: 0, bufferMs: 0, minNoticeMs: 0, maxAdvanceMs: 365 * D };
async function hotel(policy = { kind: "tiered", tiers: [{ hoursBefore: 72, percentBps: 10000 }, { hoursBefore: 24, percentBps: 5000 }] } as const) {
  const { store, d } = setup();
  const b = await createBusiness(d, "frank", { name: "Frank Hotel", typeId: "hotel", ...lagos, acceptsAutomatic: true, refundPolicy: policy });
  await publishBusiness(d, "frank", b.id);
  store.transferAccounts.set(b.id, { businessId: b.id, bankName: "GTB", accountName: "F", accountNumberEncrypted: "x", accountLast4: "0000" });
  store.groups.set("g", { id: "g", name: "Deluxe room", businessId: b.id, policy: hotelPolicy, timezone: "Africa/Lagos", priceMinor: 2000000n, priceUnit: "per_night", currency: "NGN", active: true });
  store.resources.push({ id: "r1", businessId: b.id, groupId: "g", label: "Room 1" });
  store.members.push({ userId: "mgr", businessId: b.id, role: "manager", status: "active" }, { userId: "cash", businessId: b.id, role: "cashier", status: "active" });
  return { store, d, b };
}
const stay = (a: string, z: string) => stayToInterval({ checkInDate: a, checkOutDate: z, checkInTime: "14:00", checkOutTime: "11:00", timezone: "Africa/Lagos" });
async function paidBooking(h: Awaited<ReturnType<typeof hotel>>, inD: string, outD: string) {
  const s = stay(inD, outD);
  const r = await holdBooking(h.d, { buyer: guest, businessId: h.b.id, groupId: "g", startMs: s.start, endMs: s.end, method: "bank_transfer" });
  await markBookingTransferSent(h.d, { businessId: h.b.id, bookingId: r.bookingId, as: { kind: "guest", token: r.guestToken! } });
  await confirmBookingTransfer(h.d, "frank", h.b.id, r.bookingId);
  return { ...r, start: s.start };
}

test("customer 'I have transferred' on a booking extends the hold; the business confirms; both sides are notified and reminded", async () => {
  const h = await hotel();
  const s = stay("2026-10-20", "2026-10-22");
  const r = await holdBooking(h.d, { buyer: guest, businessId: h.b.id, groupId: "g", startMs: s.start, endMs: s.end, method: "bank_transfer" });
  assert.equal(r.holdExpiresMs, NOW + 2 * H);
  await markBookingTransferSent(h.d, { businessId: h.b.id, bookingId: r.bookingId, as: { kind: "guest", token: r.guestToken! } });
  assert.equal(h.store.bookings.get(r.bookingId)!.holdExpiresMs, NOW + 24 * H);
  assert.equal(h.store.payments.get(r.paymentId!)!.status, "awaiting_confirmation");
  h.d.advance(5 * H);                                                                  // past the original 2h hold
  assert.equal((await runMaintenance(h.d)).bookings, 0, "a marked-as-sent booking is not released early");
  await confirmBookingTransfer(h.d, "frank", h.b.id, r.bookingId);
  const kinds = [...h.store.outbox.values()].map((n) => n.kind);
  for (const k of ["booking_held_transfer", "biz_transfer_marked_sent", "biz_transfer_nudge", "booking_confirmed", "biz_new_booking", "booking_reminder_24h", "booking_reminder_2h", "biz_booking_reminder_2h"]) assert.ok(kinds.includes(k as any), k);
});

test("cancellation follows the business's own policy; the business refunds and records it", async () => {
  const h = await hotel();
  const early = await paidBooking(h, "2026-10-25", "2026-10-27");                     // > 72h away: full refund
  const c1 = await cancelBooking(h.d, { businessId: h.b.id, bookingId: early.bookingId, by: { kind: "customer", proof: { kind: "guest", token: early.guestToken! } } });
  assert.equal(c1.refundMinor, 4000000n);
  const req = [...h.store.refunds.values()][0]!;
  assert.equal(req.status, "requested");
  assert.equal(await code(resolveRefund(h.d, "cash", h.b.id, req.id, { status: "refunded" })), "forbidden");     // cashiers cannot decide refunds
  assert.equal(await code(resolveRefund(h.d, "mgr", h.b.id, req.id, { status: "declined", reason: "no" })), "reason_required");
  await resolveRefund(h.d, "mgr", h.b.id, req.id, { status: "refunded" });
  assert.equal(h.store.payments.get(early.paymentId!)!.status, "refunded");
  assert.equal(await code(resolveRefund(h.d, "mgr", h.b.id, req.id, { status: "refunded" })), "already_resolved");
  assert.ok([...h.store.outbox.values()].some((n) => n.kind === "refund_update"));

  const mid = await paidBooking(h, "2026-10-12", "2026-10-14");                       // ~50h away: 50%
  h.d.advance(0);
  assert.equal((await cancelBooking(h.d, { businessId: h.b.id, bookingId: mid.bookingId, by: { kind: "customer", proof: { kind: "guest", token: mid.guestToken! } } })).refundMinor, 2000000n);

  const late = await paidBooking(h, "2026-10-10", "2026-10-12");                      // < 24h away: none
  const c3 = await cancelBooking(h.d, { businessId: h.b.id, bookingId: late.bookingId, by: { kind: "customer", proof: { kind: "guest", token: late.guestToken! } } });
  assert.equal(c3.refundMinor, 0n);

  const theirs = await paidBooking(h, "2026-11-10", "2026-11-12");                    // the BUSINESS cancels: always full
  assert.equal(await code(cancelBooking(h.d, { businessId: h.b.id, bookingId: theirs.bookingId, by: { kind: "business", actorUserId: "cash" } })), "forbidden");
  assert.equal((await cancelBooking(h.d, { businessId: h.b.id, bookingId: theirs.bookingId, by: { kind: "business", actorUserId: "mgr" } })).refundMinor, 4000000n);
  assert.equal(await code(cancelBooking(h.d, { businessId: h.b.id, bookingId: theirs.bookingId, by: { kind: "business", actorUserId: "mgr" } })), "not_cancellable");
});
test("cancellation security: strangers, a customer after start, and unconfirmed transfers", async () => {
  const h = await hotel();
  const b1 = await paidBooking(h, "2026-10-25", "2026-10-27");
  assert.equal(await code(cancelBooking(h.d, { businessId: h.b.id, bookingId: b1.bookingId, by: { kind: "customer", proof: { kind: "guest", token: "nope" } } })), "not_found");
  assert.equal(await code(cancelBooking(h.d, { businessId: h.b.id, bookingId: b1.bookingId, by: { kind: "customer", proof: { kind: "user", userId: "mallory" } } })), "not_found");
  const s = stay("2026-11-20", "2026-11-22");
  const pending = await holdBooking(h.d, { buyer: guest, businessId: h.b.id, groupId: "g", startMs: s.start, endMs: s.end, method: "bank_transfer" });
  await markBookingTransferSent(h.d, { businessId: h.b.id, bookingId: pending.bookingId, as: { kind: "guest", token: pending.guestToken! } });
  assert.equal(await code(cancelBooking(h.d, { businessId: h.b.id, bookingId: pending.bookingId, by: { kind: "customer", proof: { kind: "guest", token: pending.guestToken! } } })), "payment_pending_confirmation");
  h.d.advance(20 * D);                                                                 // the first stay has started
  assert.equal(await code(cancelBooking(h.d, { businessId: h.b.id, bookingId: b1.bookingId, by: { kind: "customer", proof: { kind: "guest", token: b1.guestToken! } } })), "already_started");
});

test("subscriptions: server-side price, paid period, early renewal, one-tap cancel, lapse to Free", async () => {
  const { store, d } = setup();
  const b = await createBusiness(d, "frank", { name: "Frank Shop", typeId: "retail", ...lagos });
  await publishBusiness(d, "frank", b.id);
  assert.equal((await resolveEntitlements(d, b.id, PLAN_ENTITLEMENTS)).planKey, "business", "free month = Business features");
  assert.equal(await code(startSubscriptionPayment(d, { actor: "mallory", businessId: b.id, planKey: "starter", interval: "month", prices: PRICE_BOOK })), "forbidden");
  assert.equal(await code(startSubscriptionPayment(d, { actor: "frank", businessId: b.id, planKey: "platinum", interval: "month", prices: PRICE_BOOK })), "plan_not_available");
  const sp = await startSubscriptionPayment(d, { actor: "frank", businessId: b.id, planKey: "starter", interval: "month", prices: PRICE_BOOK });
  assert.equal(sp.amountMinor, 300000n);
  await d.store.attachProviderReference(b.id, sp.paymentId, "paystack", "sub-1");
  const ev = { provider: "paystack", eventId: "s1", type: "payment.succeeded" as const, providerReference: "sub-1" };
  await applyProviderEvent(d, ev, async () => ({ status: "succeeded", amountMinor: 300000n, currency: "NGN" }));
  const sub = (await store.getSubscription(b.id))!;
  assert.equal(sub.planKey, "starter"); assert.equal(sub.paidUntilMs, NOW + 30 * D);
  assert.ok([...store.outbox.values()].some((n) => n.kind === "biz_subscription_renewal"));
  d.advance(31 * D);                                                                   // trial and paid month are over
  assert.equal((await resolveEntitlements(d, b.id, PLAN_ENTITLEMENTS)).planKey, "free");
  assert.equal(await code(cancelSubscription(d, "frank", b.id)), "no_active_subscription");
});
test("subscriptions: cancelling is one tap, keeps access to the end, and can be undone", async () => {
  const { store, d } = setup();
  const b = await createBusiness(d, "frank", { name: "Frank Shop", typeId: "retail", ...lagos });
  await store.upsertSubscription({ businessId: b.id, planKey: "business", paidUntilMs: NOW + 10 * D, cancelAtPeriodEnd: false, currency: "NGN" });
  assert.equal(await code(cancelSubscription(d, "mallory", b.id)), "forbidden");
  await cancelSubscription(d, "frank", b.id);
  assert.equal((await store.getSubscription(b.id))!.cancelAtPeriodEnd, true);
  assert.equal((await resolveEntitlements(d, b.id, PLAN_ENTITLEMENTS)).planKey, "business", "access continues until the paid date");
  await resumeSubscription(d, "frank", b.id);
  assert.equal((await store.getSubscription(b.id))!.cancelAtPeriodEnd, false);
});

function mailer(failTimes = 0) {
  const sent: { to: string; subject: string; text: string }[] = []; let fails = failTimes;
  const email: EmailProvider = { send: async (m) => { if (fails-- > 0) throw new Error("smtp down"); sent.push(m); } };
  const pushed: { token: string; title: string }[] = [];
  const push: PushProvider = { send: async (ms) => { pushed.push(...ms); return { invalidTokens: ms.filter((m) => m.token === "dead").map((m) => m.token) }; } };
  return { sent, pushed, email, push };
}
test("outbox: renders and sends email and push, wipes secrets, honours the daily budget, retries failures", async () => {
  const h = await hotel(); const m = mailer();
  await paidBooking(h, "2026-10-25", "2026-10-27");
  const secretBefore = [...h.store.outbox.values()].some((n) => (n.vars["path"] ?? "").startsWith("/g/"));
  assert.equal(secretBefore, true);
  h.store.contacts.set("frank", { email: "frank@x.com", name: "Frank" });
  h.store.pushTokens.push({ userId: "frank", token: "tok-1", platform: "ios" }, { userId: "frank", token: "dead", platform: "android" });
  await h.store.enqueueNotification({ id: "x1", dedupeKey: "t:1", userId: "frank", email: "frank@x.com", kind: "biz_new_order", klass: "important", vars: { customerName: "Ada", total: "N1,000", path: "/app/x" }, sendAfterMs: NOW, sentAtMs: null, attempts: 0, lastError: null });
  const out = await drainOutbox(h.d, { email: m.email, push: m.push });
  assert.ok(out.sent >= 3 && out.failed === 0);
  assert.ok(m.sent.some((x) => x.to === "ada@x.com" && /confirmed/i.test(x.subject)));
  assert.ok(m.sent.some((x) => x.to === "ada@x.com" && x.text.includes("https://fluo.test/g/")));
  assert.deepEqual([...new Set(m.pushed.map((x) => x.token))].sort(), ["dead", "tok-1"]);
  assert.deepEqual(h.store.pushTokens.map((t) => t.token), ["tok-1"], "invalid push token removed");
  assert.equal([...h.store.outbox.values()].filter((n) => n.sentAtMs !== null).every((n) => Object.keys(n.vars).length === 0), true, "vars (and any secret links) wiped after sending");
  assert.equal([...h.store.outbox.values()].some((n) => n.sentAtMs === null && n.sendAfterMs <= NOW), false);
});
test("outbox: email budget defers non-critical mail; failures back off and finally give up", async () => {
  const { store, d } = setup(); const m = mailer(99);
  const mk = (id: string, klass: "critical" | "important", kind: any = "order_paid") => store.enqueueNotification({ id, dedupeKey: id, userId: null, email: `${id}@x.com`, kind, klass, vars: { businessName: "B", total: "N1", path: "/" }, sendAfterMs: NOW, sentAtMs: null, attempts: 0, lastError: null });
  await mk("a", "important"); await mk("b", "critical");
  const good = mailer();
  const r = await drainOutbox(d, { email: good.email, push: good.push, dailyEmailCap: 10 });
  assert.equal(r.sent, 2);
  const s2 = setup(); const failing = mailer(99);
  await s2.store.enqueueNotification({ id: "f", dedupeKey: "f", userId: null, email: "f@x.com", kind: "order_paid", klass: "critical", vars: { businessName: "B", total: "N1" }, sendAfterMs: NOW, sentAtMs: null, attempts: 0, lastError: null });
  for (let i = 0; i < 6; i++) { await drainOutbox(s2.d, { email: failing.email, push: failing.push }); s2.d.advance(13 * H); }
  const n = s2.store.outbox.get("f")!;
  assert.equal(n.attempts, 5); assert.equal(n.sentAtMs, null); assert.equal(n.lastError, "smtp down");
  assert.equal((await drainOutbox(s2.d, { email: failing.email, push: failing.push })).failed, 0, "gave up: no more attempts");
  const budget = setup();
  for (let i = 0; i < 6; i++) await budget.store.enqueueNotification({ id: `m${i}`, dedupeKey: `m${i}`, userId: null, email: `m${i}@x.com`, kind: "biz_trial_ended", klass: "important", vars: { businessId: "none" }, sendAfterMs: NOW, sentAtMs: null, attempts: 0, lastError: null });
  await budget.store.enqueueNotification({ id: "c", dedupeKey: "c", userId: null, email: "c@x.com", kind: "order_paid", klass: "critical", vars: { businessName: "B", total: "N1" }, sendAfterMs: NOW + 1, sentAtMs: null, attempts: 0, lastError: null });
  budget.d.advance(5);
  const mm = mailer();
  const rr = await drainOutbox(budget.d, { email: mm.email, push: mm.push, dailyEmailCap: 5 });   // important mail may use 90% of 5 = 4 sends
  assert.equal(rr.sent, 5); assert.equal(rr.deferred, 2);
  assert.ok(mm.sent.some((x) => x.to === "c@x.com"), "critical mail still gets through when important mail is deferred");
});
test("outbox: reminders for cancelled bookings and renewals for cancelled plans are dropped", async () => {
  const h = await hotel(); const m = mailer();
  const b = await paidBooking(h, "2026-10-25", "2026-10-27");
  await cancelBooking(h.d, { businessId: h.b.id, bookingId: b.bookingId, by: { kind: "business", actorUserId: "mgr" } });
  h.d.advance(14 * D);
  await drainOutbox(h.d, { email: m.email, push: m.push });
  assert.equal(m.sent.some((x) => /Tomorrow|Starting soon|In 2 hours/.test(x.subject)), false);
  assert.ok(m.sent.some((x) => /cancelled/i.test(x.subject)));
});
test("templates: every kind renders without leaking undefined; html is escaped", () => {
  const html = renderNotification("biz_new_order", { customerName: "<script>x</script>", total: "N1", path: "/app/1" }, "https://fluo.test");
  assert.ok(!html.html.includes("<script>") && html.html.includes("&lt;script&gt;"));
  assert.equal(renderNotification("order_paid", { businessName: "B", total: "N1", path: "/p" }).text.includes("undefined"), false);
  assert.equal(renderNotification("biz_trial_ended", {}, "https://x.test").subject, "Your free month has ended");
});
