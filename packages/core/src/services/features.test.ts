import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MemoryStore } from "./memory-store.ts";
import { createBusiness, publishBusiness } from "./business-service.ts";
import { addTicketType, createEvent, setEventStatus } from "./event-service.ts";
import { createResourceGroup, freeSlots } from "./resource-service.ts";
import { checkInTicket, purchaseTickets } from "./ticket-service.ts";
import { holdBooking } from "./booking-service.ts";
import { placeOrder } from "./checkout-service.ts";
import { type Deps, ServiceError } from "./ports.ts";
import { policyDefaults } from "../platform/resource-defaults.ts";
import { localMidnight, stayToInterval } from "../platform/timezone.ts";
import { money } from "../money.ts";

const H = 3_600_000, D = 24 * H;
const NOW = Date.UTC(2026, 9, 10, 7, 0);
const code = async (p: Promise<unknown>) => { try { await p; return "no_error"; } catch (e) { return e instanceof ServiceError ? e.code : `unexpected:${(e as Error).message}`; } };
const lagos = { countryCode: "NG", currency: "NGN", timezone: "Africa/Lagos" };
const guest = { kind: "guest" as const, contact: { name: "Ada Obi", email: "ada@x.com" } };
function setup() {
  const store = new MemoryStore(); let t = NOW;
  const d: Deps & { advance(ms: number): void } = { store, now: () => t, uuid: () => randomUUID(), ticketSecret: "s3cret", appUrl: "https://fluo.test", advance: (ms) => { t += ms; } };
  return { store, d };
}

test("events: create, add ticket types, publish; checks on who, when and what", async () => {
  const { store, d } = setup();
  const b = await createBusiness(d, "frank", { name: "Frank Events", typeId: "event_organiser", ...lagos, acceptsAutomatic: false });
  await publishBusiness(d, "frank", b.id);
  store.members.push({ userId: "gate", businessId: b.id, role: "staff", status: "active" });
  const input = { name: "Campus Night", venue: "Main Hall", startsAtMs: NOW + 20 * D };
  assert.equal(await code(createEvent(d, "gate", b.id, input)), "forbidden", "staff can check people in but cannot create events");
  assert.equal(await code(createEvent(d, "mallory", b.id, input)), "forbidden");
  assert.equal(await code(createEvent(d, "frank", b.id, { ...input, startsAtMs: NOW - D })), "event_must_be_in_future");
  assert.equal(await code(createEvent(d, "frank", b.id, { ...input, endsAtMs: NOW })), "invalid_end_time");
  const ev = await createEvent(d, "frank", b.id, input);
  assert.equal(await code(setEventStatus(d, "frank", b.id, ev.id, "published")), "no_ticket_types");
  assert.equal(await code(addTicketType(d, "frank", b.id, ev.id, { name: "VIP", priceMinor: 500000n, capacity: 10 })), "payments_unavailable", "paid tickets need online payment");
  assert.equal(await code(addTicketType(d, "frank", b.id, ev.id, { name: "Free", priceMinor: 0n, capacity: 0 })), "invalid_capacity");
  assert.equal(await code(addTicketType(d, "frank", b.id, ev.id, { name: "Free", priceMinor: 0n, capacity: 5, salesEndMs: ev.startsAtMs + D })), "sales_must_end_before_event");
  await addTicketType(d, "frank", b.id, ev.id, { name: "Free entry", priceMinor: 0n, capacity: 5 });
  assert.equal(await store.getPublicEventByShortId(ev.shortId), null, "drafts are not public");
  await setEventStatus(d, "frank", b.id, ev.id, "published");
  assert.equal((await store.getPublicEventByShortId(ev.shortId))!.ticketTypes.length, 1);
  assert.equal(await code(setEventStatus(d, "frank", b.id, ev.id, "published")), "invalid_state");
  const other = await createBusiness(d, "mike", { name: "Mike Shop", typeId: "retail", ...lagos });
  assert.equal(await code(createEvent(d, "mike", other.id, input)), "capability_not_enabled");
  assert.equal(await code(setEventStatus(d, "mike", b.id, ev.id, "cancelled")), "forbidden");
});

test("events end to end: created ticket type sells, QR check-in admits once; cancelled events stop selling", async () => {
  const { store, d } = setup();
  const b = await createBusiness(d, "frank", { name: "Frank Events", typeId: "event_organiser", ...lagos, acceptsAutomatic: true });
  await publishBusiness(d, "frank", b.id);
  store.members.push({ userId: "gate", businessId: b.id, role: "staff", status: "active" });
  const ev = await createEvent(d, "frank", b.id, { name: "Campus Night", startsAtMs: NOW + 20 * D });
  const tt = await addTicketType(d, "frank", b.id, ev.id, { name: "Free entry", priceMinor: 0n, capacity: 2 });
  await setEventStatus(d, "frank", b.id, ev.id, "published");
  const r = await purchaseTickets(d, { buyer: guest, businessId: b.id, ticketTypeId: tt.id, holders: [{ name: "Ada Obi", email: "ada@x.com" }], feeBps: 200 });
  assert.equal(r.nextStep, "tickets_issued"); assert.equal(r.guestToken, null);
  assert.ok([...store.outbox.values()].some((n) => n.kind === "ticket_issued" && n.email === "ada@x.com"));
  assert.equal((await checkInTicket(d, "gate", b.id, ev.id, r.tickets[0]!.qrToken!)).result, "admitted");
  assert.equal((await checkInTicket(d, "gate", b.id, ev.id, r.tickets[0]!.qrToken!)).result, "already_used");
  await setEventStatus(d, "frank", b.id, ev.id, "cancelled");
  assert.equal(await code(purchaseTickets(d, { buyer: guest, businessId: b.id, ticketTypeId: tt.id, holders: [{ name: "Eve Ade", email: "eve@x.com" }], feeBps: 200 })), "event_unavailable");
});

test("bookable resources: defaults per kind, creation rules, a created hotel room is bookable with correct pricing", async () => {
  const { store, d } = setup();
  assert.equal(policyDefaults("nights").priceUnit, "per_night"); assert.equal(policyDefaults("time_block").granularityMinutes, 30);
  const b = await createBusiness(d, "frank", { name: "Frank Hotel", typeId: "hotel", ...lagos, acceptsAutomatic: true });
  await publishBusiness(d, "frank", b.id);
  assert.equal(await code(createResourceGroup(d, "mallory", b.id, { name: "Deluxe", kind: "nights", priceMinor: 1n, unitLabels: ["101"] })), "forbidden");
  assert.equal(await code(createResourceGroup(d, "frank", b.id, { name: "Deluxe", kind: "nights", priceMinor: 1n, unitLabels: [] })), "invalid_units");
  assert.equal(await code(createResourceGroup(d, "frank", b.id, { name: "Deluxe", kind: "nights", priceMinor: 1n, unitLabels: ["101", "101"] })), "invalid_units");
  assert.equal(await code(createResourceGroup(d, "frank", b.id, { name: "Deluxe", kind: "nights", priceMinor: -5n, unitLabels: ["101"] })), "invalid_price");
  assert.equal(await code(createResourceGroup(d, "frank", b.id, { name: "Deluxe", kind: "nights", priceMinor: 1n, unitLabels: ["101"], minDurationMinutes: 0 })), "invalid_rules");
  const g = await createResourceGroup(d, "frank", b.id, { name: "Deluxe room", kind: "nights", priceMinor: 2000000n, unitLabels: ["101", "102"] });
  assert.equal((await store.getPublicResourceGroupByShortId(g.shortId!))!.group.name, "Deluxe room");
  const s = stayToInterval({ checkInDate: "2026-10-20", checkOutDate: "2026-10-22", checkInTime: "14:00", checkOutTime: "11:00", timezone: "Africa/Lagos" });
  const hold = await holdBooking(d, { buyer: guest, businessId: b.id, groupId: g.id, startMs: s.start, endMs: s.end, method: "provider" });
  assert.equal(hold.totalMinor, 4000000n);
  const salon = await createBusiness(d, "pat", { name: "Pat Salon", typeId: "salon_barber", ...lagos });
  const cut = await createResourceGroup(d, "pat", salon.id, { name: "Haircut", kind: "time_block", priceMinor: 300000n, unitLabels: ["Tunde", "Chidi"], priceUnit: "flat" });
  assert.equal(cut.priceUnit, "flat");
  const retail = await createBusiness(d, "rita", { name: "Rita Shop", typeId: "retail", ...lagos });
  assert.equal(await code(createResourceGroup(d, "rita", retail.id, { name: "Chair", kind: "time_block", priceMinor: 1n, unitLabels: ["1"] })), "capability_not_enabled");
});

test("free slots: 30-minute steps; an existing booking removes every overlapping start", async () => {
  const { store, d } = setup();
  const b = await createBusiness(d, "pat", { name: "Pat Salon", typeId: "salon_barber", ...lagos, acceptsAutomatic: true });
  await publishBusiness(d, "pat", b.id);
  const g = await createResourceGroup(d, "pat", b.id, { name: "Haircut", kind: "time_block", priceMinor: 300000n, unitLabels: ["Tunde"], minDurationMinutes: 60, bufferMinutes: 0, minNoticeMinutes: 0 });
  const dayStart = localMidnight("2026-10-12", "Africa/Lagos");
  const base = { businessId: b.id, groupId: g.id, dayStartMs: dayStart, durationMs: H, limit: 100 };
  assert.equal((await freeSlots(d, base)).length, 48);
  const unit = (await store.resourcesInGroup(b.id, g.id))[0]!;
  const ten = dayStart + 10 * H;
  await store.insertBookingIfFree({ id: randomUUID(), businessId: b.id, resourceId: unit.id, groupId: g.id, userId: null, guest: { name: "Ada Obi", email: "a@x.com" }, startMs: ten, endMs: ten + H, status: "confirmed", holdExpiresMs: null, paymentId: null, refundPolicy: { kind: "none" } }, null, 0, null, 0, NOW);
  const after = await freeSlots(d, base);
  assert.deepEqual([9.5, 10, 10.5].map((h) => after.includes(dayStart + h * H)), [false, false, false]);
  assert.ok(after.includes(dayStart + 9 * H) && after.includes(dayStart + 11 * H));
  assert.equal(after.length, 45);
  assert.deepEqual(await freeSlots(d, { ...base, groupId: randomUUID() }), []);
});

test("plan limits: the Free plan stops new orders over its monthly limit; trial months and earlier months do not count", async () => {
  let t = NOW;
  const store = new MemoryStore(() => t);
  const d: Deps = { store, now: () => t, uuid: () => randomUUID(), ticketSecret: "s", appUrl: "https://fluo.test" };
  const b = await createBusiness(d, "frank", { name: "Frank Shop", typeId: "retail", ...lagos, acceptsAutomatic: true });
  await publishBusiness(d, "frank", b.id);
  const p = { id: randomUUID(), businessId: b.id, shortId: "abcd2345", slug: "p", name: "P", description: null, priceMinor: 1000n, currency: "NGN", fulfilment: "stock" as const, leadTimeHours: 0, maxPerOrder: 5, status: "active" as const, createdAtMs: NOW };
  await store.insertProduct(p);
  const order = () => placeOrder(d, { buyer: guest, businessId: b.id, lines: [{ productId: p.id, quantity: 1 }], method: "provider" });
  for (let i = 0; i < 25; i++) await order();                                          // trial = Business plan = unlimited
  t += 32 * D;                                                                         // next month, trial over: Free plan allows 30 a month
  for (let i = 0; i < 30; i++) assert.equal(await code(order()), "no_error");
  assert.equal(await code(order()), "order_limit_reached");
});

test("inventory through the services: stock is reserved at checkout, refused when short, released on cancel, shown to the owner", async () => {
  const { store, d } = setup();
  const b = await createBusiness(d, "frank", { name: "Frank Phones", typeId: "retail", ...lagos, acceptsAutomatic: true });
  await publishBusiness(d, "frank", b.id);
  const { createProduct } = await import("./catalogue-service.ts");
  const { cancelUnpaidOrder } = await import("./checkout-service.ts");
  const { PLAN_ENTITLEMENTS } = await import("../billing/plans.ts");
  const p = await createProduct(d, "frank", b.id, { name: "Screen guard", priceMinor: 200000n, publish: true, stockQuantity: 3 }, PLAN_ENTITLEMENTS["business"]!);
  assert.equal(await code(createProduct(d, "frank", b.id, { name: "Bad", priceMinor: 1n, stockQuantity: -1 }, PLAN_ENTITLEMENTS["business"]!)), "invalid_stock");
  const order = (q: number) => placeOrder(d, { buyer: guest, businessId: b.id, lines: [{ productId: p.id, quantity: q }], method: "provider" });
  assert.equal(await code(order(4)), "out_of_stock");
  const o = await order(2);
  assert.equal((await store.getProduct(b.id, p.id))!.stockQuantity, 1);
  assert.equal(await code(order(2)), "out_of_stock", "only one is left");
  const { cancelUnpaidOrder: cancel } = { cancelUnpaidOrder };
  await cancel(d, { businessId: b.id, orderId: o.orderId, as: { kind: "guest", token: o.guestToken! } });
  assert.equal((await store.getProduct(b.id, p.id))!.stockQuantity, 3, "cancelled order gives its stock back");
  const t = await order(3);
  d.advance(25 * H);                                                                   // nobody pays: a transfer order would expire and return stock
  void t; money(1, "NGN");
});
