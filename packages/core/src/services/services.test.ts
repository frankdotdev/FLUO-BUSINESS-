import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { money } from "../money.ts";
import { MemoryStore } from "./memory-store.ts";
import { createBusiness, publishBusiness } from "./business-service.ts";
import { confirmTransfer, markTransferSent, placeOrder } from "./checkout-service.ts";
import { type Deps, ServiceError } from "./ports.ts";

const H = 3_600_000, D = 24 * H;
function setup() {
  const store = new MemoryStore(); let t = 1_000_000;
  const d: Deps & { advance(ms: number): void } = { store, now: () => t, uuid: () => randomUUID(), advance: (ms) => { t += ms; } };
  return { store, d };
}
const lagos = { countryCode: "NG", currency: "NGN", timezone: "Africa/Lagos", acceptsAutomatic: true };
const code = async (p: Promise<unknown>): Promise<string> => { try { await p; return "no_error"; } catch (e) { return e instanceof ServiceError ? e.code : `unexpected:${(e as Error).message}`; } };

async function liveBakery() {
  const { store, d } = setup();
  const biz = await createBusiness(d, "frank", { name: "Frank's Bakes", typeId: "bakery", ...lagos });
  await publishBusiness(d, "frank", biz.id);
  store.transferAccounts.set(biz.id, { businessId: biz.id, bankName: "Test Bank", accountName: "Test", accountNumberEncrypted: "x", accountLast4: "0000" });
  store.items.set(biz.id, new Map([
    ["cake", { price: money(3500000, "NGN"), active: true, maxPerOrder: 5, name: "8-inch cake", fulfilment: "made_to_order", leadTimeHours: 48 }],
    ["bun", { price: money(50000, "NGN"), active: true, maxPerOrder: 20, name: "Bun", fulfilment: "stock", leadTimeHours: 0 }],
  ]));
  return { store, d, biz };
}

test("createBusiness: owner membership, registry capabilities, unique slugs, input validation", async () => {
  const { store, d } = setup();
  const a = await createBusiness(d, "frank", { name: "Franks Tech", typeId: "retail", optionalCapabilities: ["delivery"], ...lagos });
  const b = await createBusiness(d, "mike", { name: "Franks Tech", typeId: "retail", ...lagos });
  assert.equal(a.slug, "franks-tech"); assert.equal(b.slug, "franks-tech-2");
  assert.deepEqual(store.members.find((m) => m.businessId === a.id), { userId: "frank", businessId: a.id, role: "owner", status: "active" });
  assert.ok(store.caps.get(a.id)!.includes("delivery") && store.caps.get(a.id)!.includes("inventory"));
  assert.equal(await code(createBusiness(d, "x", { name: "A", typeId: "retail", ...lagos })), "invalid_name");
  assert.equal(await code(createBusiness(d, "x", { name: "Okay Name", typeId: "nope", ...lagos })), "unknown_business_type");
  assert.equal(await code(createBusiness(d, "x", { name: "Okay Name", typeId: "salon_barber", optionalCapabilities: ["inventory"], ...lagos })), "capability_not_available");
  assert.equal(await code(createBusiness(d, "x", { name: "Okay Name", typeId: "retail", ...lagos, timezone: "Mars/Base" })), "invalid_timezone");
  assert.equal(await code(createBusiness(d, "x", { name: "Okay Name", typeId: "retail", ...lagos, currency: "XXX" })), "unsupported_currency");
});
test("publish: only owners/admins; regulated types need verification; trial starts once at publish", async () => {
  const { store, d } = setup();
  const biz = await createBusiness(d, "frank", { name: "Frank Cafe", typeId: "restaurant", ...lagos });
  assert.equal(await code(publishBusiness(d, "mallory", biz.id)), "forbidden");
  const live = await publishBusiness(d, "frank", biz.id);
  assert.equal(live.status, "active");
  assert.equal(store.trials.length, 1);
  assert.equal(store.trials[0]!.endsMs - store.trials[0]!.startedMs, 30 * D);
  assert.equal(await code(publishBusiness(d, "frank", biz.id)), "not_a_draft");
  const second = await createBusiness(d, "frank", { name: "Frank Cafe Two", typeId: "restaurant", ...lagos });
  await publishBusiness(d, "frank", second.id);
  assert.equal(store.trials.length, 1, "a second business does not restart the free month");
  const pharm = await createBusiness(d, "pat", { name: "Pat Pharmacy", typeId: "pharmacy", ...lagos });
  assert.equal(pharm.verificationStatus, "pending");
  assert.equal(await code(publishBusiness(d, "pat", pharm.id)), "verification_required");
});

test("placeOrder: server-side prices, made-to-order lead time, allowed methods, guest link issued once", async () => {
  const { store, d, biz } = await liveBakery();
  const guest = { kind: "guest" as const, contact: { name: "Ada", email: "ada@example.com" } };
  const r = await placeOrder(d, { buyer: guest, businessId: biz.id, lines: [{ productId: "bun", quantity: 4 }], method: "bank_transfer" });
  assert.equal(r.totalMinor, 200000n);
  assert.match(r.transferReference!, /^FLU-/);
  assert.ok(r.guestToken && r.guestToken.length >= 43);
  assert.equal(store.payments.get(r.paymentId)!.status, "created");
  assert.equal(await code(placeOrder(d, { buyer: guest, businessId: biz.id, lines: [{ productId: "cake", quantity: 1 }], method: "provider" })), "required_by_needed");
  assert.equal(await code(placeOrder(d, { buyer: guest, businessId: biz.id, lines: [{ productId: "cake", quantity: 1 }], method: "provider", requiredByMs: d.now() + 24 * H })), "lead_time_not_met");
  const ok = await placeOrder(d, { buyer: guest, businessId: biz.id, lines: [{ productId: "cake", quantity: 1 }], method: "provider", requiredByMs: d.now() + 72 * H });
  assert.equal(store.orders.get(ok.orderId)!.kind, "made_to_order");
  assert.equal(ok.nextStep, "provider_checkout");
  assert.equal(await code(placeOrder(d, { buyer: { kind: "guest", contact: { name: "A", email: "bad" } }, businessId: biz.id, lines: [{ productId: "bun", quantity: 1 }], method: "provider" })), "invalid_contact");
});
test("placeOrder: another business's product id is invisible; transfer can be disabled per business", async () => {
  const { store, d, biz } = await liveBakery();
  const other = await createBusiness(d, "mike", { name: "Mike Shop", typeId: "retail", ...lagos, allowsTransfer: false });
  await publishBusiness(d, "mike", other.id);
  store.items.set(other.id, new Map([["secret", { price: money(100, "NGN"), active: true, maxPerOrder: 5, name: "x", fulfilment: "stock", leadTimeHours: 0 }]]));
  const g = { kind: "guest" as const, contact: { name: "Ada", email: "ada@example.com" } };
  assert.equal(await code(placeOrder(d, { buyer: g, businessId: biz.id, lines: [{ productId: "secret", quantity: 1 }], method: "provider" })), "unavailable_product");
  assert.equal(await code(placeOrder(d, { buyer: g, businessId: other.id, lines: [{ productId: "secret", quantity: 1 }], method: "bank_transfer" })), "method_not_allowed");
});

test("transfer flow: customer marks sent, business confirms, order becomes paid; audit recorded", async () => {
  const { store, d, biz } = await liveBakery();
  const r = await placeOrder(d, { buyer: { kind: "guest", contact: { name: "Ada", email: "ada@example.com" } }, businessId: biz.id, lines: [{ productId: "bun", quantity: 2 }], method: "bank_transfer" });
  await markTransferSent(d, { businessId: biz.id, orderId: r.orderId, as: { kind: "guest", token: r.guestToken! } });
  assert.equal(store.payments.get(r.paymentId)!.status, "awaiting_confirmation");
  await confirmTransfer(d, "frank", biz.id, r.orderId);
  assert.equal(store.payments.get(r.paymentId)!.status, "succeeded");
  assert.equal(store.orders.get(r.orderId)!.status, "paid");
  assert.ok(store.audit.some((a) => a.action === "payment.transfer_confirmed" && a.actorUserId === "frank"));
  assert.equal(await code(confirmTransfer(d, "frank", biz.id, r.orderId)), "invalid_state");     // cannot confirm twice
});
test("SECURITY: strangers, other tenants, wrong roles and other guests cannot touch an order", async () => {
  const { store, d, biz } = await liveBakery();
  const mike = await createBusiness(d, "mike", { name: "Mike Shop", typeId: "retail", ...lagos });
  await publishBusiness(d, "mike", mike.id);
  const r = await placeOrder(d, { buyer: { kind: "guest", contact: { name: "Ada", email: "ada@example.com" } }, businessId: biz.id, lines: [{ productId: "bun", quantity: 1 }], method: "bank_transfer" });
  const other = await placeOrder(d, { buyer: { kind: "guest", contact: { name: "Eve", email: "eve@example.com" } }, businessId: biz.id, lines: [{ productId: "bun", quantity: 1 }], method: "bank_transfer" });

  assert.equal(await code(confirmTransfer(d, "mallory", biz.id, r.orderId)), "forbidden");                 // no membership
  assert.equal(await code(confirmTransfer(d, "mike", biz.id, r.orderId)), "forbidden");                    // owner of ANOTHER business
  assert.equal(await code(confirmTransfer(d, "mike", mike.id, r.orderId)), "not_found");                   // own business id, someone else's order
  store.members.push({ userId: "jane", businessId: biz.id, role: "cashier", status: "active" });
  store.members.push({ userId: "sam", businessId: biz.id, role: "staff", status: "removed" });
  assert.equal(await code(confirmTransfer(d, "sam", biz.id, r.orderId)), "forbidden");                     // removed member
  assert.equal(await code(markTransferSent(d, { businessId: biz.id, orderId: r.orderId, as: { kind: "guest", token: other.guestToken! } })), "not_found");   // another guest's link
  assert.equal(await code(markTransferSent(d, { businessId: biz.id, orderId: r.orderId, as: { kind: "guest", token: "made-up" } })), "not_found");
  assert.equal(await code(markTransferSent(d, { businessId: biz.id, orderId: r.orderId, as: { kind: "user", userId: "mallory" } })), "not_found");
  assert.equal(store.orders.get(r.orderId)!.status, "awaiting_payment", "nothing changed");
  await confirmTransfer(d, "jane", biz.id, r.orderId);                                                     // a cashier may confirm
  assert.equal(store.orders.get(r.orderId)!.status, "paid");
});
test("transfers expire after the hold window", async () => {
  const { d, biz } = await liveBakery();
  const r = await placeOrder(d, { buyer: { kind: "guest", contact: { name: "Ada", email: "ada@example.com" } }, businessId: biz.id, lines: [{ productId: "bun", quantity: 1 }], method: "bank_transfer" });
  d.advance(25 * H);
  assert.equal(await code(markTransferSent(d, { businessId: biz.id, orderId: r.orderId, as: { kind: "guest", token: r.guestToken! } })), "transfer_expired");
  assert.equal(await code(confirmTransfer(d, "frank", biz.id, r.orderId)), "transfer_expired");
});
test("guest links expire after 30 days", async () => {
  const { d, biz } = await liveBakery();
  const r = await placeOrder(d, { buyer: { kind: "guest", contact: { name: "Ada", email: "ada@example.com" } }, businessId: biz.id, lines: [{ productId: "bun", quantity: 1 }], method: "provider" });
  d.advance(31 * D);
  assert.equal(await code(markTransferSent(d, { businessId: biz.id, orderId: r.orderId, as: { kind: "guest", token: r.guestToken! } })), "not_found");
});
