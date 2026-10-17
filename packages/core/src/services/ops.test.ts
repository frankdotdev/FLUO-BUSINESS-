import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MemoryStore } from "./memory-store.ts";
import { createBusiness, publishBusiness } from "./business-service.ts";
import { acceptInvite, inviteMember, removeMember, transferOwnership } from "./staff-service.ts";
import { applyProviderEvent } from "./payment-events.ts";
import { checkInTicket, purchaseTickets, qrForTicket } from "./ticket-service.ts";
import { confirmTransfer, placeOrder } from "./checkout-service.ts";
import { type Deps, ServiceError } from "./ports.ts";
import { money } from "../money.ts";
import { PLAN_ENTITLEMENTS, EVENT_FEE_BPS } from "../billing/plans.ts";
import { POLICIES, RateLimiter } from "../platform/rate-limit.ts";
import { signTicket } from "../commerce/tickets.ts";

const H = 3_600_000, D = 24 * H;
const lagos = { countryCode: "NG", currency: "NGN", timezone: "Africa/Lagos", acceptsAutomatic: true };
function setup() {
  const store = new MemoryStore(); let t = 10_000_000;
  const d: Deps & { advance(ms: number): void } = { store, now: () => t, uuid: () => randomUUID(), ticketSecret: "test-secret", advance: (ms) => { t += ms; } };
  return { store, d };
}
const code = async (p: Promise<unknown>): Promise<string> => { try { await p; return "no_error"; } catch (e) { return e instanceof ServiceError ? e.code : `unexpected:${(e as Error).message}`; } };
const starter = PLAN_ENTITLEMENTS["starter"]!, free = PLAN_ENTITLEMENTS["free"]!;

async function liveBiz(d: Deps, owner = "frank", name = "Frank Events", type = "event_organiser") {
  const b = await createBusiness(d, owner, { name, typeId: type, ...lagos });
  await publishBusiness(d, owner, b.id); return b;
}
function addEvent(store: MemoryStore, businessId: string, opts: { id?: string; price: number; capacity: number; published?: boolean }) {
  const id = opts.id ?? "tt1";
  store.ticketTypes.set(id, { eventName: "Campus Night", id, eventId: "ev1", businessId, priceMinor: BigInt(opts.price), currency: "NGN", capacity: opts.capacity, salesStartMs: null, salesEndMs: null, eventPublished: opts.published ?? true });
  return id;
}

// ---------------- boundary: the core must stay framework- and vendor-free (migration safety) ----------------
test("BOUNDARY: core imports no Supabase, framework or database client packages", () => {
  const bad = /from\s+["'](@supabase|next|react|pg|drizzle|better-auth|@aws)/;
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f: string) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith(".ts") ? [p] : []; });
  const root = fileURLToPath(new URL("..", import.meta.url));
  const offenders = walk(root).filter((f) => bad.test(readFileSync(f, "utf8")));
  assert.deepEqual(offenders, []);
});

// ---------------- rate limiting ----------------
test("rate limiter: blocks after the limit, reports retry time, recovers, separates keys", () => {
  let t = 0; const rl = new RateLimiter(() => t);
  for (let i = 0; i < POLICIES.signin.max; i++) assert.equal(rl.check("signin", "1.2.3.4", "A@x.com").allowed, true);
  const blocked = rl.check("signin", "1.2.3.4", "a@x.com ");     // same key after normalisation
  assert.equal(blocked.allowed, false);
  assert.ok(!blocked.allowed && blocked.retryAfterMs > 0 && blocked.retryAfterMs <= 60_000);
  assert.equal(rl.check("signin", "9.9.9.9", "a@x.com").allowed, true);
  t = 61_000;
  assert.equal(rl.check("signin", "1.2.3.4", "a@x.com").allowed, true);
});

// ---------------- staff and ownership ----------------
test("staff: invite, accept with verified matching email, seat limits, no owner invites", async () => {
  const { store, d } = setup();
  const b = await liveBiz(d);
  assert.equal(await code(inviteMember(d, "frank", b.id, "jane@x.com", "cashier", free)), "seat_limit_reached");   // free = 1 seat
  assert.equal(await code(inviteMember(d, "frank", b.id, "jane@x.com", "owner" as any, starter)), "invalid_role");
  assert.equal(await code(inviteMember(d, "mallory", b.id, "jane@x.com", "staff", starter)), "forbidden");
  const { token } = await inviteMember(d, "frank", b.id, "Jane@X.com", "cashier", starter);
  assert.equal(await code(acceptInvite(d, { userId: "eve", email: "eve@x.com", emailVerified: true }, token)), "not_found");
  assert.equal(await code(acceptInvite(d, { userId: "jane", email: "jane@x.com", emailVerified: false }, token)), "not_found");
  assert.equal(await code(acceptInvite(d, { userId: "jane", email: "jane@x.com", emailVerified: true }, "wrong")), "not_found");
  await acceptInvite(d, { userId: "jane", email: "JANE@x.com", emailVerified: true }, token);
  assert.deepEqual(store.members.find((m) => m.userId === "jane"), { userId: "jane", businessId: b.id, role: "cashier", status: "active" });
  assert.equal(await code(acceptInvite(d, { userId: "jane", email: "jane@x.com", emailVerified: true }, token)), "not_found");   // single use
  const { token: t2 } = await inviteMember(d, "frank", b.id, "late@x.com", "staff", starter);
  d.advance(8 * D);
  assert.equal(await code(acceptInvite(d, { userId: "late", email: "late@x.com", emailVerified: true }, t2)), "not_found");     // expired
});
test("staff: admins cannot create or remove admins; owner cannot be removed; removal blocks access", async () => {
  const { store, d } = setup();
  const b = await liveBiz(d);
  store.members.push({ userId: "ada", businessId: b.id, role: "admin", status: "active" }, { userId: "sam", businessId: b.id, role: "staff", status: "active" });
  assert.equal(await code(inviteMember(d, "ada", b.id, "x@x.com", "admin", PLAN_ENTITLEMENTS["business"]!)), "forbidden");
  assert.equal(await code(removeMember(d, "ada", b.id, "frank")), "cannot_remove_owner");
  store.members.push({ userId: "ada2", businessId: b.id, role: "admin", status: "active" });
  assert.equal(await code(removeMember(d, "ada", b.id, "ada2")), "forbidden");
  await removeMember(d, "ada", b.id, "sam");
  assert.equal(await code(removeMember(d, "sam", b.id, "ada")), "forbidden");            // removed member lost all rights
});
test("ownership transfer: owner only, slug confirmation, target must be an active admin, one owner always", async () => {
  const { store, d } = setup();
  const b = await liveBiz(d);
  store.members.push({ userId: "ada", businessId: b.id, role: "admin", status: "active" }, { userId: "sam", businessId: b.id, role: "staff", status: "active" });
  assert.equal(await code(transferOwnership(d, "ada", b.id, "ada", b.slug)), "forbidden");
  assert.equal(await code(transferOwnership(d, "frank", b.id, "ada", "wrong")), "confirmation_mismatch");
  assert.equal(await code(transferOwnership(d, "frank", b.id, "sam", b.slug)), "target_must_be_active_admin");
  assert.equal(await code(transferOwnership(d, "frank", b.id, "frank", b.slug)), "invalid_target");
  await transferOwnership(d, "frank", b.id, "ada", b.slug);
  assert.equal(store.members.filter((m) => m.businessId === b.id && m.role === "owner" && m.status === "active").length, 1);
  assert.equal(store.members.find((m) => m.userId === "ada")!.role, "owner");
  assert.equal(store.members.find((m) => m.userId === "frank")!.role, "admin");
});

// ---------------- tickets ----------------
const guest = { kind: "guest" as const, contact: { name: "Ada", email: "ada@x.com" } };
const holder = (n: string) => ({ name: `Holder ${n}`, email: `h${n}@x.com` });

test("tickets: free tickets issue instantly with QR; capacity, publication and validation enforced", async () => {
  const { store, d } = setup(); const b = await liveBiz(d);
  const tt = addEvent(store, b.id, { price: 0, capacity: 2 });
  const r = await purchaseTickets(d, { buyer: guest, businessId: b.id, ticketTypeId: tt, holders: [holder("1")], feeBps: EVENT_FEE_BPS });
  assert.equal(r.nextStep, "tickets_issued"); assert.ok(r.tickets[0]!.qrToken); assert.equal(r.paymentId, null);
  assert.equal(await code(purchaseTickets(d, { buyer: guest, businessId: b.id, ticketTypeId: tt, holders: [holder("2"), holder("3")], feeBps: 200 })), "sold_out");
  assert.equal(await code(purchaseTickets(d, { buyer: guest, businessId: b.id, ticketTypeId: tt, holders: [{ name: "A", email: "bad" }], feeBps: 200 })), "invalid_holder");
  const draft = addEvent(store, b.id, { id: "tt2", price: 0, capacity: 5, published: false });
  assert.equal(await code(purchaseTickets(d, { buyer: guest, businessId: b.id, ticketTypeId: draft, holders: [holder("4")], feeBps: 200 })), "event_unavailable");
});
test("tickets: the last seat goes to exactly one of two racing buyers", async () => {
  const { store, d } = setup(); const b = await liveBiz(d);
  const tt = addEvent(store, b.id, { price: 500000, capacity: 1 });
  const results = await Promise.all([1, 2].map((n) => code(purchaseTickets(d, { buyer: guest, businessId: b.id, ticketTypeId: tt, holders: [holder(String(n))], feeBps: 200 }))));
  assert.deepEqual(results.sort(), ["no_error", "sold_out"]);
});
test("tickets: another business's ticket type is invisible", async () => {
  const { store, d } = setup(); const a = await liveBiz(d); const m = await liveBiz(d, "mike", "Mike Events");
  const tt = addEvent(store, a.id, { price: 0, capacity: 5 });
  assert.equal(await code(purchaseTickets(d, { buyer: guest, businessId: m.id, ticketTypeId: tt, holders: [holder("1")], feeBps: 200 })), "event_unavailable");
});

test("paid tickets: held, then valid only after a verified, amount-matching payment event; fee is 2%", async () => {
  const { store, d } = setup(); const b = await liveBiz(d);
  const tt = addEvent(store, b.id, { price: 500000, capacity: 10 });
  const r = await purchaseTickets(d, { buyer: guest, businessId: b.id, ticketTypeId: tt, holders: [holder("1"), holder("2")], feeBps: EVENT_FEE_BPS });
  assert.equal(r.totalMinor, 1000000n); assert.equal(r.platformFeeMinor, 20000n);           // 2% of N10,000 = N200
  assert.equal(r.nextStep, "provider_checkout"); assert.equal(r.tickets[0]!.qrToken, null);  // no QR before payment
  assert.ok(await d.store.attachProviderReference(b.id, r.paymentId!, "paystack", "ref-1"));
  const ev = { provider: "paystack", eventId: "e1", type: "payment.succeeded" as const, providerReference: "ref-1" };
  const wrong = await applyProviderEvent(d, { ...ev, eventId: "e0" }, async () => ({ status: "succeeded", amountMinor: 1n, currency: "NGN" }));
  assert.equal(wrong, "amount_mismatch");
  assert.ok([...store.tickets.values()].every((t) => t.status === "held"));
  const notYet = await applyProviderEvent(d, { ...ev, eventId: "e2" }, async () => ({ status: "pending", amountMinor: 1000000n, currency: "NGN" }));
  assert.equal(notYet, "ignored");
  const good = await applyProviderEvent(d, ev, async () => ({ status: "succeeded", amountMinor: 1000000n, currency: "NGN" }));
  assert.equal(good, "applied");
  assert.ok([...store.tickets.values()].every((t) => t.status === "valid"));
  assert.equal(await applyProviderEvent(d, ev, async () => { throw new Error("must not be called"); }), "duplicate");
  assert.equal(await applyProviderEvent(d, { ...ev, eventId: "e3" }, async () => ({ status: "succeeded", amountMinor: 1000000n, currency: "NGN" })), "already_applied");
  assert.ok(await qrForTicket(d, b.id, r.tickets[0]!.id));
});
test("paid after the hold expired: no tickets are issued and a refund is flagged", async () => {
  const { store, d } = setup(); const b = await liveBiz(d);
  const tt = addEvent(store, b.id, { price: 500000, capacity: 1 });
  const r = await purchaseTickets(d, { buyer: guest, businessId: b.id, ticketTypeId: tt, holders: [holder("1")], feeBps: 200 });
  await d.store.attachProviderReference(b.id, r.paymentId!, "paystack", "ref-9");
  d.advance(16 * 60_000);
  const out = await applyProviderEvent(d, { provider: "paystack", eventId: "x", type: "payment.succeeded", providerReference: "ref-9" }, async () => ({ status: "succeeded", amountMinor: 500000n, currency: "NGN" }));
  assert.equal(out, "needs_reconciliation");
  assert.ok(store.audit.some((a) => a.action === "payment.paid_without_tickets_refund_needed"));
  const second = await purchaseTickets(d, { buyer: guest, businessId: b.id, ticketTypeId: tt, holders: [holder("2")], feeBps: 200 });   // seat was freed
  assert.equal(second.nextStep, "provider_checkout");
});
test("payment events: a failed verification call is retried, unknown references are recorded, orders become paid", async () => {
  const { store, d } = setup(); const b = await liveBiz(d, "frank", "Frank Shop", "retail");
  store.items.set(b.id, new Map([["p", { price: money(100000, "NGN"), active: true, maxPerOrder: 5, name: "P", fulfilment: "stock", leadTimeHours: 0 }]]));
  const o = await placeOrder(d, { buyer: guest, businessId: b.id, lines: [{ productId: "p", quantity: 1 }], method: "provider" });
  await d.store.attachProviderReference(b.id, o.paymentId, "paystack", "ref-o");
  const ev = { provider: "paystack", eventId: "o1", type: "payment.succeeded" as const, providerReference: "ref-o" };
  let calls = 0;
  const flaky = async () => { if (calls++ === 0) throw new Error("provider down"); return { status: "succeeded" as const, amountMinor: 100000n, currency: "NGN" }; };
  assert.equal(await code(applyProviderEvent(d, ev, flaky)), "unexpected:provider down");
  assert.equal(await applyProviderEvent(d, ev, flaky), "applied");                         // the retry works
  assert.equal(store.orders.get(o.orderId)!.status, "paid");
  assert.equal(await applyProviderEvent(d, { ...ev, eventId: "o2", providerReference: "nope" }, flaky), "unknown_payment");
});

test("check-in: admits once; unpaid, forged, other-business and unauthorised scans are refused", async () => {
  const { store, d } = setup(); const b = await liveBiz(d); const other = await liveBiz(d, "mike", "Mike Events");
  const tt = addEvent(store, b.id, { price: 0, capacity: 5 });
  const r = await purchaseTickets(d, { buyer: guest, businessId: b.id, ticketTypeId: tt, holders: [holder("1")], feeBps: 200 });
  const qr = r.tickets[0]!.qrToken!;
  store.members.push({ userId: "gate", businessId: b.id, role: "staff", status: "active" }, { userId: "cash", businessId: b.id, role: "cashier", status: "active" });
  assert.equal(await code(checkInTicket(d, "mallory", b.id, "ev1", qr)), "forbidden");
  assert.equal(await code(checkInTicket(d, "cash", b.id, "ev1", qr)), "forbidden");        // cashiers cannot check in
  assert.equal(await code(checkInTicket(d, "mike", other.id, "ev1", qr)), "no_error");     // allowed to scan, but ...
  assert.equal((await checkInTicket(d, "mike", other.id, "ev1", qr)).result, "invalid");   // ... another business's ticket is unknown to him
  assert.equal((await checkInTicket(d, "gate", b.id, "ev1", "forged.token")).result, "invalid");
  assert.equal((await checkInTicket(d, "gate", b.id, "ev-other", qr)).result, "wrong_event");
  assert.equal((await checkInTicket(d, "gate", b.id, "ev1", qr)).result, "admitted");
  assert.equal((await checkInTicket(d, "gate", b.id, "ev1", qr)).result, "already_used");
  assert.equal(store.tickets.get(r.tickets[0]!.id)!.checkedInBy, "gate");
  const held = await purchaseTickets(d, { buyer: guest, businessId: b.id, ticketTypeId: addEvent(store, b.id, { id: "tt9", price: 100000, capacity: 5 }), holders: [holder("2")], feeBps: 200 });
  const heldId = held.tickets[0]!.id;
  assert.equal((await checkInTicket(d, "gate", b.id, "ev1", signTicket("test-secret", heldId, "ev1"))).result, "not_paid");
});
test("transfer confirmation still works after the Store changes", async () => {
  const { store, d } = setup(); const b = await liveBiz(d, "frank", "Frank Shop", "retail");
  store.transferAccounts.set(b.id, { businessId: b.id, bankName: "Test Bank", accountName: "Test", accountNumberEncrypted: "x", accountLast4: "0000" });
  store.items.set(b.id, new Map([["p", { price: money(100000, "NGN"), active: true, maxPerOrder: 5, name: "P", fulfilment: "stock", leadTimeHours: 0 }]]));
  const o = await placeOrder(d, { buyer: guest, businessId: b.id, lines: [{ productId: "p", quantity: 1 }], method: "bank_transfer" });
  await confirmTransfer(d, "frank", b.id, o.orderId);
  assert.equal(store.orders.get(o.orderId)!.status, "paid");
});
