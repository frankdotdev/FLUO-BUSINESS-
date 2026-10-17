import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MemoryStore } from "./memory-store.ts";
import { createBusiness, publishBusiness } from "./business-service.ts";
import { confirmBookingTransfer, holdBooking, TRANSFER_HOLD_MINUTES } from "./booking-service.ts";
import { runMaintenance } from "./maintenance.ts";
import { applyProviderEvent } from "./payment-events.ts";
import { placeOrder } from "./checkout-service.ts";
import { type Deps, ServiceError } from "./ports.ts";
import { stayToInterval } from "../platform/timezone.ts";
import { priceForInterval } from "../platform/booking-price.ts";
import { money } from "../money.ts";
import type { AvailabilityPolicy } from "../platform/availability.ts";

const H = 3_600_000, D = 24 * H;
const lagos = { countryCode: "NG", currency: "NGN", timezone: "Africa/Lagos", acceptsAutomatic: true };
const hotelPolicy: AvailabilityPolicy = { kind: "nights", minDurationMs: D, maxDurationMs: 30 * D, granularityMs: H, alignmentOriginMs: 0, bufferMs: 2 * H, minNoticeMs: 0, maxAdvanceMs: 365 * D };
const guest = { kind: "guest" as const, contact: { name: "Ada", email: "ada@x.com" } };
const code = async (p: Promise<unknown>) => { try { await p; return "no_error"; } catch (e) { return e instanceof ServiceError ? e.code : `unexpected:${(e as Error).message}`; } };

// "now" is fixed at 2026-10-10 08:00 Lagos so Lagos-local stays are realistic.
const NOW = Date.UTC(2026, 9, 10, 7, 0);
async function hotel(rooms = 2, unitPrice = 2000000, policy = hotelPolicy) {
  const store = new MemoryStore(); let t = NOW;
  const d: Deps & { advance(ms: number): void } = { store, now: () => t, uuid: () => randomUUID(), ticketSecret: "s", advance: (ms) => { t += ms; } };
  const b = await createBusiness(d, "frank", { name: "Frank Hotel", typeId: "hotel", ...lagos });
  await publishBusiness(d, "frank", b.id);
  store.transferAccounts.set(b.id, { businessId: b.id, bankName: "Test Bank", accountName: "Test", accountNumberEncrypted: "x", accountLast4: "0000" });
  store.groups.set("deluxe", { id: "deluxe", name: "Deluxe room", businessId: b.id, policy, timezone: "Africa/Lagos", priceMinor: BigInt(unitPrice), priceUnit: "per_night", currency: "NGN", active: true });
  for (let i = 1; i <= rooms; i++) store.resources.push({ id: `room-${i}`, businessId: b.id, groupId: "deluxe", label: `Room ${i}` });
  return { store, d, b };
}
const stay = (inD: string, outD: string) => stayToInterval({ checkInDate: inD, checkOutDate: outD, checkInTime: "14:00", checkOutTime: "11:00", timezone: "Africa/Lagos" });

test("price: per night / hour / flat, computed on the server", () => {
  assert.equal(priceForInterval("per_night", 2000000n, "NGN", 0, 2 * D).amountMinor, 4000000n);
  assert.equal(priceForInterval("per_night", 2000000n, "NGN", 0, 45 * H).amountMinor, 4000000n);   // 14:00 -> 11:00 two days later = 2 nights
  assert.equal(priceForInterval("per_hour", 100000n, "NGN", 0, 90 * 60_000).amountMinor, 200000n);
  assert.equal(priceForInterval("flat", 500000n, "NGN", 0, 5 * D).amountMinor, 500000n);
  assert.throws(() => priceForInterval("flat", 1n, "NGN", 5, 5), /invalid/);
});

test("hotel: Lagos-local stay is held, priced per night, and assigned a room", async () => {
  const { store, d } = await hotel();
  const s = stay("2026-10-20", "2026-10-22");
  const r = await holdBooking(d, { buyer: guest, businessId: store.groups.get("deluxe")!.businessId, groupId: "deluxe", startMs: s.start, endMs: s.end, method: "provider" });
  assert.equal(r.nextStep, "provider_checkout"); assert.equal(r.totalMinor, 4000000n);
  assert.equal(store.bookings.get(r.bookingId)!.status, "held");
  assert.equal(r.holdExpiresMs, NOW + 15 * 60_000);
  assert.ok(r.guestToken);
});
test("hotel: rooms run out, no double-booking, buffer respected, rooms assigned to different units", async () => {
  const { store, d, b } = await hotel(2);
  const s = stay("2026-10-20", "2026-10-22");
  const mk = () => holdBooking(d, { buyer: guest, businessId: b.id, groupId: "deluxe", startMs: s.start, endMs: s.end, method: "provider" });
  const results = await Promise.all([mk(), mk(), mk()].map(code));
  assert.deepEqual(results.sort(), ["fully_booked", "no_error", "no_error"]);
  const rooms = [...store.bookings.values()].map((x) => x.resourceId).sort();
  assert.deepEqual(rooms, ["room-1", "room-2"]);
  // same-day arrival the moment the previous guest leaves is not allowed (2h cleaning buffer)
  const s2 = stayToInterval({ checkInDate: "2026-10-22", checkOutDate: "2026-10-23", checkInTime: "12:00", checkOutTime: "12:00", timezone: "Africa/Lagos" });
  assert.equal(await code(holdBooking(d, { buyer: guest, businessId: b.id, groupId: "deluxe", startMs: s2.start, endMs: s2.end, method: "provider" })), "fully_booked");
});
test("hotel: request rules and tenant isolation", async () => {
  const { store, d, b } = await hotel();
  const bad = { buyer: guest, businessId: b.id, groupId: "deluxe", method: "provider" as const };
  assert.equal(await code(holdBooking(d, { ...bad, startMs: NOW + 5 * D, endMs: NOW + 5 * D + 2 * H })), "too_short");
  assert.equal(await code(holdBooking(d, { ...bad, startMs: NOW + 5 * D, endMs: NOW + 5 * D })), "invalid_interval");
  assert.equal(await code(holdBooking(d, { ...bad, startMs: NOW + 5 * D, endMs: NOW + 50 * D })), "too_long");
  assert.equal(await code(holdBooking(d, { ...bad, groupId: "nope", startMs: NOW + 5 * D, endMs: NOW + 7 * D })), "unavailable");
  const other = await createBusiness(d, "mike", { name: "Mike Hotel", typeId: "hotel", ...lagos }); await publishBusiness(d, "mike", other.id);
  assert.equal(await code(holdBooking(d, { ...bad, businessId: other.id, startMs: NOW + 5 * D, endMs: NOW + 7 * D })), "unavailable");   // Frank's group is invisible to Mike's business
  assert.equal(store.bookings.size, 0);
});

test("hold expiry releases the room; confirmed bookings are untouched", async () => {
  const { store, d, b } = await hotel(1);
  const s = stay("2026-10-20", "2026-10-22");
  const input = { buyer: guest, businessId: b.id, groupId: "deluxe", startMs: s.start, endMs: s.end, method: "provider" as const };
  const first = await holdBooking(d, input);
  assert.equal(await code(holdBooking(d, input)), "fully_booked");
  d.advance(16 * 60_000);
  assert.equal(await code(holdBooking(d, input)), "no_error");      // expired hold no longer blocks, even before the job runs
  const out = await runMaintenance(d);
  assert.equal(out.bookings, 1);
  assert.equal(store.bookings.get(first.bookingId)!.status, "expired");
});

test("provider payment confirms the booking; paying after the hold lapsed is flagged for refund", async () => {
  const { store, d, b } = await hotel(1);
  const s = stay("2026-10-20", "2026-10-22");
  const r = await holdBooking(d, { buyer: guest, businessId: b.id, groupId: "deluxe", startMs: s.start, endMs: s.end, method: "provider" });
  await d.store.attachProviderReference(b.id, r.paymentId!, "paystack", "bk-1");
  const ev = { provider: "paystack", eventId: "b1", type: "payment.succeeded" as const, providerReference: "bk-1" };
  const ok = async () => ({ status: "succeeded" as const, amountMinor: 4000000n, currency: "NGN" });
  assert.equal(await applyProviderEvent(d, ev, ok), "applied");
  assert.equal(store.bookings.get(r.bookingId)!.status, "confirmed");

  const s2 = stay("2026-11-20", "2026-11-22");
  const late = await holdBooking(d, { buyer: guest, businessId: b.id, groupId: "deluxe", startMs: s2.start, endMs: s2.end, method: "provider" });
  await d.store.attachProviderReference(b.id, late.paymentId!, "paystack", "bk-2");
  d.advance(20 * 60_000); await runMaintenance(d);
  assert.equal(await applyProviderEvent(d, { ...ev, eventId: "b2", providerReference: "bk-2" }, ok), "needs_reconciliation");
  assert.ok(store.audit.some((a) => a.action === "payment.paid_without_booking_refund_needed"));
});

test("manual transfer for a booking: business confirms; strangers, other tenants and lapsed holds are refused", async () => {
  const { store, d, b } = await hotel(1);
  const s = stay("2026-10-20", "2026-10-22");
  const r = await holdBooking(d, { buyer: guest, businessId: b.id, groupId: "deluxe", startMs: s.start, endMs: s.end, method: "bank_transfer" });
  assert.match(r.transferReference!, /^FLU-/); assert.equal(r.holdExpiresMs, NOW + TRANSFER_HOLD_MINUTES * 60_000);
  const mike = await createBusiness(d, "mike", { name: "Mike Hotel", typeId: "hotel", ...lagos }); await publishBusiness(d, "mike", mike.id);
  assert.equal(await code(confirmBookingTransfer(d, "mallory", b.id, r.bookingId)), "forbidden");
  assert.equal(await code(confirmBookingTransfer(d, "mike", b.id, r.bookingId)), "forbidden");
  assert.equal(await code(confirmBookingTransfer(d, "mike", mike.id, r.bookingId)), "not_found");
  await confirmBookingTransfer(d, "frank", b.id, r.bookingId);
  assert.equal(store.bookings.get(r.bookingId)!.status, "confirmed");
  assert.equal(await code(confirmBookingTransfer(d, "frank", b.id, r.bookingId)), "hold_expired");   // already confirmed: not a held booking

  const s2 = stay("2026-12-01", "2026-12-03");
  const r2 = await holdBooking(d, { buyer: guest, businessId: b.id, groupId: "deluxe", startMs: s2.start, endMs: s2.end, method: "bank_transfer" });
  d.advance(3 * H);
  assert.equal(await code(confirmBookingTransfer(d, "frank", b.id, r2.bookingId)), "hold_expired");
});
test("maintenance expires unconfirmed transfers and cancels their orders, but not other orders", async () => {
  const { store, d, b } = await hotel(1);
  const biz2 = await createBusiness(d, "pat", { name: "Pat Shop", typeId: "retail", ...lagos }); await publishBusiness(d, "pat", biz2.id);
  store.transferAccounts.set(biz2.id, { businessId: biz2.id, bankName: "Test Bank", accountName: "Test", accountNumberEncrypted: "x", accountLast4: "0000" });
  store.items.set(biz2.id, new Map([["p", { price: money(100000, "NGN"), active: true, maxPerOrder: 5, name: "P", fulfilment: "stock", leadTimeHours: 0 }]]));
  const o = await placeOrder(d, { buyer: guest, businessId: biz2.id, lines: [{ productId: "p", quantity: 1 }], method: "bank_transfer" });
  const prov = await placeOrder(d, { buyer: guest, businessId: biz2.id, lines: [{ productId: "p", quantity: 1 }], method: "provider" });
  d.advance(25 * H);
  const out = await runMaintenance(d);
  assert.equal(out.transfers, 1);
  assert.equal(store.orders.get(o.orderId)!.status, "cancelled");
  assert.equal(store.orders.get(prov.orderId)!.status, "awaiting_payment");
  assert.equal((await runMaintenance(d)).transfers, 0, "idempotent");
  void b;
});
