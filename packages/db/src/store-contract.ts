import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { money, type BookingRecord, type BusinessRecord, type OrderRecord, type PaymentRecord, type Store, type TicketRecord, type MobilityOperatorRecord, type RideRecord, type EscrowRecord, type GroupCartSession } from "@fluo/core";

/** Behaviour every Store implementation must have. Run against MemoryStore (always) and PgStore (when TEST_DATABASE_URL is set). */
export interface Harness {
  store: Store;
  seedUser(id: string): Promise<void>;
  seedTicketType(a: { businessId: string; id: string; eventId: string; capacity: number }): Promise<void>;
  seedBookable(a: { businessId: string; groupId: string; resourceIds: string[] }): Promise<void>;
}
const NOW = Date.UTC(2026, 9, 10, 8, 0), H = 3_600_000, D = 24 * H;
const policy = { kind: "none" } as const;

export function runStoreContract(name: string, make: () => Promise<Harness>): void {
  const t = (title: string, fn: (h: Harness) => Promise<void>) => test(`${name}: ${title}`, async () => fn(await make()));

  async function business(h: Harness, owner = `u-${randomUUID()}`, slug = `b-${randomUUID().slice(0, 8)}`): Promise<BusinessRecord> {
    await h.seedUser(owner);
    const b: BusinessRecord = { id: randomUUID(), slug, name: "Test Biz", typeId: "retail", typeVersion: 1, countryCode: "NG", currency: "NGN", timezone: "Africa/Lagos", status: "active", verificationStatus: "not_required", allowsTransfer: true, acceptsAutomatic: true, refundPolicy: policy, publishedAtMs: NOW };
    await h.store.insertBusiness(b, { userId: owner, businessId: b.id, role: "owner", status: "active" }, ["catalogue", "orders", "customers"]);
    return b;
  }
  const pay = (b: BusinessRecord, subject: string, over: Partial<PaymentRecord> = {}): PaymentRecord => ({ id: randomUUID(), businessId: b.id, orderId: subject, purpose: "order", method: "provider", status: "created", amountMinor: 100000n, currency: "NGN", reference: null, expiresAtMs: null, platformFeeMinor: 0n, ...over });
  const order = (b: BusinessRecord, over: Partial<OrderRecord> = {}): OrderRecord => ({ id: randomUUID(), businessId: b.id, userId: null, guest: { name: "Ada Obi", email: "ada@x.com" }, kind: "standard", status: "awaiting_payment", currency: "NGN", totalMinor: 100000n, requiredByMs: null, note: null, refundPolicy: policy, ...over });

  t("businesses: round trip, slug uniqueness, memberships, owner swap keeps exactly one owner", async (h) => {
    const b = await business(h, "owner-1");
    const got = (await h.store.getBusiness(b.id))!;
    assert.deepEqual([got.slug, got.currency, got.timezone, got.acceptsAutomatic, got.refundPolicy], [b.slug, "NGN", "Africa/Lagos", true, policy]);
    assert.equal(await h.store.slugTaken(b.slug), true); assert.equal(await h.store.slugTaken("nope-nope"), false);
    assert.equal(await h.store.getBusiness("not-a-uuid"), null);
    assert.ok((await h.store.capabilitiesOf(b.id)).includes("orders"));
    await h.seedUser("admin-1"); await h.seedUser("staff-1");
    await h.store.upsertMembership({ userId: "admin-1", businessId: b.id, role: "admin", status: "active" });
    await h.store.upsertMembership({ userId: "staff-1", businessId: b.id, role: "staff", status: "active" });
    assert.equal(await h.store.swapOwner(b.id, "owner-1", "staff-1"), false);
    assert.equal(await h.store.swapOwner(b.id, "owner-1", "admin-1"), true);
    const owners = (await h.store.membershipsForBusiness(b.id)).filter((m) => m.role === "owner" && m.status === "active");
    assert.deepEqual(owners.map((m) => m.userId), ["admin-1"]);
    await h.store.patchBusiness(b.id, { status: "suspended" });
    assert.equal(await h.store.getPublicBusinessBySlug(b.slug), null, "suspended businesses are not public");
  });

  t("orders and payments: tenant scoping and compare-and-set", async (h) => {
    const a = await business(h), c = await business(h);
    const o = order(a), p = pay(a, o.id);
    await h.store.insertOrder(o, [], p, null, NOW + D).catch(() => undefined);   // items need real products; covered below
    const prod = { id: randomUUID(), businessId: a.id, shortId: randomUUID().replaceAll("-", "").slice(0, 8), slug: "x", name: "Cake", description: null, priceMinor: 100000n, currency: "NGN", fulfilment: "stock" as const, leadTimeHours: 0, maxPerOrder: 5, status: "active" as const, createdAtMs: NOW };
    assert.equal(await h.store.insertProduct(prod), true);
    const o2 = order(a), p2 = pay(a, o2.id);
    await h.store.insertOrder(o2, [{ productId: prod.id, name: "Cake", unitPriceMinor: 100000n, quantity: 1 }], p2, null, NOW + D);
    assert.equal((await h.store.getOrder(a.id, o2.id))!.guest!.email, "ada@x.com");
    assert.equal(await h.store.getOrder(c.id, o2.id), null, "another business cannot read it");
    assert.equal((await h.store.getOrderItems(a.id, o2.id)).length, 1);
    assert.equal(await h.store.setOrderStatus(c.id, o2.id, "awaiting_payment", "paid"), false);
    assert.equal(await h.store.setOrderStatus(a.id, o2.id, "paid", "accepted"), false);
    assert.equal(await h.store.setOrderStatus(a.id, o2.id, "awaiting_payment", "paid"), true);
    assert.equal(await h.store.setOrderStatus(a.id, o2.id, "awaiting_payment", "paid"), false, "second identical change loses");
    assert.equal(await h.store.attachProviderReference(a.id, p2.id, "paystack", "ref-1"), true);
    assert.equal(await h.store.attachProviderReference(a.id, p2.id, "paystack", "ref-2"), false, "cannot start twice");
    assert.equal((await h.store.findPaymentByProviderRef("paystack", "ref-1"))!.id, p2.id);
    assert.equal(await h.store.setPaymentStatus(a.id, p2.id, "pending", "succeeded"), true);
    assert.equal(await h.store.setPaymentStatus(a.id, p2.id, "pending", "failed"), false);
    assert.equal((await h.store.getPaymentForOrder(a.id, o2.id))!.status, "succeeded");
    assert.equal(await h.store.getPaymentForOrder(c.id, o2.id), null);
  });

  t("catalogue: only this business's active items; newest are paused first", async (h) => {
    const a = await business(h), c = await business(h);
    const mk = (b: BusinessRecord, n: number, status: "active" | "draft") => ({ id: randomUUID(), businessId: b.id, shortId: randomUUID().replaceAll("-", "").slice(0, 8), slug: `p${n}`, name: `P${n}`, description: null, priceMinor: 1000n, currency: "NGN", fulfilment: "stock" as const, leadTimeHours: 0, maxPerOrder: 5, status, createdAtMs: NOW + n * 1000 });
    const ps = [mk(a, 1, "active"), mk(a, 2, "active"), mk(a, 3, "active"), mk(a, 4, "draft"), mk(c, 5, "active")];
    for (const p of ps) assert.equal(await h.store.insertProduct(p), true);
    assert.equal(await h.store.insertProduct({ ...ps[0]!, id: randomUUID() }), false, "short id collision reported, not thrown");
    const cat = await h.store.catalogue(a.id, [ps[0]!.id, ps[3]!.id, ps[4]!.id, "garbage"]);
    assert.deepEqual([...cat.keys()], [ps[0]!.id]);
    assert.equal(await h.store.countProducts(a.id, ["active"]), 3);
    assert.equal(await h.store.pauseNewestActiveProducts(a.id, 1), 2);
    assert.equal((await h.store.getProduct(a.id, ps[0]!.id))!.status, "active");
    assert.equal((await h.store.getProduct(a.id, ps[2]!.id))!.status, "paused");
    assert.equal(await h.store.getProduct(c.id, ps[0]!.id), null);
    assert.equal(await h.store.pauseNewestActiveProducts(a.id, 1), 0, "idempotent");
  });

  t("webhooks and invites are single-use", async (h) => {
    assert.equal(await h.store.recordWebhook("paystack", "e1"), true);
    assert.equal(await h.store.recordWebhook("paystack", "e1"), false);
    await h.store.forgetWebhook("paystack", "e1");
    assert.equal(await h.store.recordWebhook("paystack", "e1"), true);
    const b = await business(h); await h.seedUser("inviter");
    const hash = Buffer.from(randomUUID().replaceAll("-", ""), "hex");
    await h.store.insertInvite({ tokenHash: hash, businessId: b.id, email: "x@x.com", role: "staff", expiresAtMs: NOW + D, usedAtMs: null, invitedBy: "inviter" });
    assert.equal((await h.store.findInvite(hash))!.email, "x@x.com");
    assert.equal(await h.store.markInviteUsed(hash, NOW), true);
    assert.equal(await h.store.markInviteUsed(hash, NOW), false);
  });

  t("tickets: capacity holds under concurrency; expired holds are not fulfilled; admit once", async (h) => {
    const b = await business(h); const typeId = randomUUID(), eventId = randomUUID();
    await h.seedTicketType({ businessId: b.id, id: typeId, eventId, capacity: 3 });
    const mkTicket = (): TicketRecord => ({ id: randomUUID(), businessId: b.id, eventId, ticketTypeId: typeId, paymentId: null, holderName: "Holder One", holderEmail: "h@x.com", status: "valid", usedAtMs: null, holdExpiresMs: null, checkedInBy: null });
    const results = await Promise.all(Array.from({ length: 6 }, () => h.store.insertTicketsWithinCapacity(b.id, typeId, [mkTicket()], null, NOW)));
    assert.equal(results.filter(Boolean).length, 3, "exactly capacity many succeed");
    assert.equal(await h.store.countLiveTickets(b.id, typeId, NOW), 3);
    const t0 = mkTicket(); const c = await business(h);
    assert.equal(await h.store.insertTicketsWithinCapacity(c.id, typeId, [{ ...t0, businessId: c.id }], null, NOW), false, "another business cannot sell this ticket type");

    const b2 = await business(h); const type2 = randomUUID(), ev2 = randomUUID();
    await h.seedTicketType({ businessId: b2.id, id: type2, eventId: ev2, capacity: 1 });
    const p = pay(b2, randomUUID(), { purpose: "ticket" });
    const held: TicketRecord = { ...mkTicket(), businessId: b2.id, eventId: ev2, ticketTypeId: type2, paymentId: p.id, status: "held", holdExpiresMs: NOW + 15 * 60_000 };
    assert.equal(await h.store.insertTicketsWithinCapacity(b2.id, type2, [held], p, NOW), true);
    assert.equal(await h.store.insertTicketsWithinCapacity(b2.id, type2, [{ ...mkTicket(), businessId: b2.id, eventId: ev2, ticketTypeId: type2 }], null, NOW), false, "a live hold takes the seat");
    assert.equal(await h.store.setTicketsForPayment(b2.id, p.id, "held", "valid", NOW + 20 * 60_000), 0, "expired hold is not fulfilled");
    assert.equal(await h.store.setTicketsForPayment(b2.id, p.id, "held", "valid", NOW + 60_000), 1);
    await h.seedUser("gate");
    assert.equal(await h.store.admitTicket(b2.id, held.id, "gate", NOW), true);
    assert.equal(await h.store.admitTicket(b2.id, held.id, "gate", NOW), false);
    assert.equal(await h.store.admitTicket(b.id, held.id, "gate", NOW), false, "wrong business");
    assert.equal((await h.store.getTicket(b2.id, held.id))!.checkedInBy, "gate");
  });

  t("bookings: concurrent requests for one slot, turnaround buffer, lapsed holds release", async (h) => {
    const b = await business(h); const groupId = randomUUID(), r1 = randomUUID();
    await h.seedBookable({ businessId: b.id, groupId, resourceIds: [r1] });
    const mk = (startMs: number, endMs: number, over: Partial<BookingRecord> = {}): BookingRecord => ({ id: randomUUID(), businessId: b.id, resourceId: r1, groupId, userId: null, guest: { name: "Ada Obi", email: "ada@x.com" }, startMs, endMs, status: "confirmed", holdExpiresMs: null, paymentId: null, refundPolicy: policy, ...over });
    const s = NOW + 5 * D, e = s + 2 * D;
    const race = await Promise.all([1, 2, 3].map(() => h.store.insertBookingIfFree(mk(s, e), null, 2 * H, null, NOW + D, NOW)));
    assert.equal(race.filter(Boolean).length, 1);
    assert.equal(await h.store.insertBookingIfFree(mk(e, e + D), null, 2 * H, null, NOW + D, NOW), false, "turnaround buffer not respected");
    assert.equal(await h.store.insertBookingIfFree(mk(e + 2 * H, e + D), null, 2 * H, null, NOW + D, NOW), true);
    const held = mk(s + 10 * D, s + 11 * D, { status: "held", holdExpiresMs: NOW + 15 * 60_000 });
    assert.equal(await h.store.insertBookingIfFree(held, null, 0, null, NOW + D, NOW), true);
    assert.equal(await h.store.insertBookingIfFree(mk(s + 10 * D, s + 11 * D), null, 0, null, NOW + D, NOW), false, "live hold blocks");
    assert.equal(await h.store.insertBookingIfFree(mk(s + 10 * D, s + 11 * D), null, 0, null, NOW + D, NOW + 20 * 60_000), true, "lapsed hold does not block");
    assert.deepEqual((await h.store.getBooking(b.id, held.id))!.refundPolicy, policy);
    assert.equal((await h.store.listBookings(b.id, s - D, s + 3 * D)).length, 2);
    const other = await business(h);
    assert.equal(await h.store.getBooking(other.id, held.id), null);
  });

  t("maintenance: unconfirmed transfers expire and cancel their orders; held bookings and tickets expire", async (h) => {
    const b = await business(h);
    const prod = { id: randomUUID(), businessId: b.id, shortId: randomUUID().replaceAll("-", "").slice(0, 8), slug: "x", name: "X", description: null, priceMinor: 1000n, currency: "NGN", fulfilment: "stock" as const, leadTimeHours: 0, maxPerOrder: 5, status: "active" as const, createdAtMs: NOW };
    await h.store.insertProduct(prod);
    const o = order(b); const p = pay(b, o.id, { method: "bank_transfer", reference: `FLU-${randomUUID().slice(0, 6).toUpperCase()}`, expiresAtMs: NOW + H });
    await h.store.insertOrder(o, [{ productId: prod.id, name: "X", unitPriceMinor: 1000n, quantity: 1 }], p, null, NOW + D);
    assert.equal(await h.store.expireStaleTransfers(NOW), 0);
    assert.equal(await h.store.expireStaleTransfers(NOW + 2 * H), 1);
    assert.equal((await h.store.getOrder(b.id, o.id))!.status, "cancelled");
    assert.equal(await h.store.expireStaleTransfers(NOW + 3 * H), 0, "idempotent");
  });

  t("notifications: de-duplicated, claimed once, failures back off, sent rows are wiped", async (h) => {
    const mk = (key: string, over = {}) => ({ id: randomUUID(), dedupeKey: key, userId: null, email: "a@x.com", kind: "order_paid" as const, klass: "critical" as const, vars: { path: "/g/secret" }, sendAfterMs: NOW, sentAtMs: null, attempts: 0, lastError: null, ...over });
    const a = mk(`k-${randomUUID()}`);
    assert.equal(await h.store.enqueueNotification(a), true);
    assert.equal(await h.store.enqueueNotification(mk(a.dedupeKey)), false);
    const due = (await h.store.dueNotifications(NOW, 10)).filter((n) => n.id === a.id);
    assert.equal(due.length, 1); assert.equal(due[0]!.vars["path"], "/g/secret");
    assert.equal(await h.store.countEmailsSentSince(NOW - D), 0);
    await h.store.markNotificationSent(a.id, NOW);
    assert.equal((await h.store.dueNotifications(NOW + D, 50)).some((n) => n.id === a.id), false);
    assert.equal(await h.store.countEmailsSentSince(NOW - D) >= 1, true);
    const f = mk(`k-${randomUUID()}`); await h.store.enqueueNotification(f);
    await h.store.dueNotifications(NOW, 50);
    await h.store.markNotificationFailed(f.id, 5, null, "smtp down");
    assert.equal((await h.store.dueNotifications(NOW + 365 * D, 50)).some((n) => n.id === f.id), false, "gave up: never due again");
    await h.seedUser("pusher");
    await h.store.savePushToken({ userId: "pusher", token: "ExponentPushToken[a]", platform: "ios" });
    await h.store.savePushToken({ userId: "pusher", token: "ExponentPushToken[a]", platform: "android" });
    assert.deepEqual((await h.store.pushTokensForUsers(["pusher"])).map((x) => x.platform), ["android"], "same token is stored once");
    await h.store.removePushTokens(["ExponentPushToken[a]"]);
    assert.equal((await h.store.pushTokensForUsers(["pusher"])).length, 0);
  });

  t("events and bookable resources: public reads only show published events of live businesses; short-id collisions are reported", async (h) => {
    const b = await business(h);
    const ev = { id: randomUUID(), businessId: b.id, shortId: randomUUID().replaceAll("-", "").slice(0, 8), slug: "night", name: "Campus Night", description: null, venue: "Hall", startsAtMs: Date.now() + 30 * D, endsAtMs: null, status: "draft" as const };
    assert.equal(await h.store.insertEvent(ev), true);
    assert.equal(await h.store.insertEvent({ ...ev, id: randomUUID() }), false, "short id collision reported, not thrown");
    assert.equal(await h.store.getPublicEventByShortId(ev.shortId), null, "drafts are private");
    const tt = { id: randomUUID(), eventId: ev.id, businessId: b.id, name: "General", priceMinor: 0n, currency: "NGN", capacity: 50, salesStartMs: null, salesEndMs: null };
    await h.store.insertTicketType(tt);
    assert.equal(await h.store.patchEvent(b.id, ev.id, { status: "published" }), true);
    const pub = (await h.store.getPublicEventByShortId(ev.shortId))!;
    assert.deepEqual([pub.event.name, pub.ticketTypes.length, pub.business.id], ["Campus Night", 1, b.id]);
    const full = (await h.store.getTicketType(b.id, tt.id))!;
    assert.deepEqual([full.eventName, full.eventPublished, full.capacity], ["Campus Night", true, 50]);
    assert.ok((await h.store.listPublicEvents(50)).some((x) => x.event.id === ev.id));
    const other = await business(h);
    assert.equal(await h.store.getEvent(other.id, ev.id), null);
    assert.equal(await h.store.patchEvent(other.id, ev.id, { status: "cancelled" }), false);
    await h.store.patchBusiness(b.id, { status: "suspended" });
    assert.equal(await h.store.getPublicEventByShortId(ev.shortId), null, "suspended business: event no longer public");

    const c = await business(h); const gid = randomUUID(), shortId = randomUUID().replaceAll("-", "").slice(0, 8);
    const g = { id: gid, shortId, slug: "room", businessId: c.id, name: "Deluxe room", timezone: "Africa/Lagos", priceMinor: 2000000n, priceUnit: "per_night" as const, currency: "NGN", active: true,
      policy: { kind: "nights" as const, minDurationMs: D, maxDurationMs: 30 * D, granularityMs: H, alignmentOriginMs: 0, bufferMs: 2 * H, minNoticeMs: 0, maxAdvanceMs: 365 * D } };
    assert.equal(await h.store.insertResourceGroup(g, [{ id: randomUUID(), label: "101" }, { id: randomUUID(), label: "102" }]), true);
    assert.equal(await h.store.insertResourceGroup({ ...g, id: randomUUID() }, [{ id: randomUUID(), label: "201" }]), false, "short id collision reported, not thrown");
    const got = (await h.store.getResourceGroup(c.id, gid))!;
    assert.deepEqual([got.policy.bufferMs, got.policy.minDurationMs, got.priceMinor, got.name], [2 * H, D, 2000000n, "Deluxe room"]);
    assert.equal((await h.store.resourcesInGroup(c.id, gid)).length, 2);
    assert.equal((await h.store.listResourceGroups(c.id)).length, 1);
    assert.equal((await h.store.getPublicResourceGroupByShortId(shortId))!.business.id, c.id);
    assert.equal(await h.store.getResourceGroup(other.id, gid), null);
  });

  t("order counting for plan limits ignores cancelled orders and earlier periods", async (h) => {
    const b = await business(h);
    const prod = { id: randomUUID(), businessId: b.id, shortId: randomUUID().replaceAll("-", "").slice(0, 8), slug: "x", name: "X", description: null, priceMinor: 1000n, currency: "NGN", fulfilment: "stock" as const, leadTimeHours: 0, maxPerOrder: 5, status: "active" as const, createdAtMs: NOW };
    await h.store.insertProduct(prod);
    for (let i = 0; i < 3; i++) { const o = order(b); await h.store.insertOrder(o, [{ productId: prod.id, name: "X", unitPriceMinor: 1000n, quantity: 1 }], pay(b, o.id), null, NOW + D); }
    const cancelled = order(b); await h.store.insertOrder(cancelled, [{ productId: prod.id, name: "X", unitPriceMinor: 1000n, quantity: 1 }], pay(b, cancelled.id), null, NOW + D);
    await h.store.setOrderStatus(b.id, cancelled.id, "awaiting_payment", "cancelled");
    assert.equal(await h.store.countOrdersSince(b.id, Date.now() - 60_000), 3);
    assert.equal(await h.store.countOrdersSince(b.id, Date.now() + 3_600_000), 0, "nothing counted from a future period start");
  });

  t("messaging: one thread per customer, atomic unread counting, tenant scoping", async (h) => {
    const b = await business(h), c = await business(h); await h.seedUser("cust-1");
    const mk = () => ({ id: randomUUID(), businessId: b.id, customerUserId: "cust-1", topic: null, createdAtMs: NOW, lastMessageAtMs: NOW, businessUnread: 0, customerUnread: 0 });
    const first = await h.store.getOrCreateConversation(mk()); const again = await h.store.getOrCreateConversation(mk());
    assert.equal(first.id, again.id);
    await Promise.all(Array.from({ length: 20 }, (_, i) => h.store.insertMessage({ id: randomUUID(), conversationId: first.id, businessId: b.id, senderKind: "customer", senderUserId: "cust-1", body: `m${i}`, createdAtMs: NOW + i })));
    assert.equal((await h.store.getConversation(b.id, first.id))!.businessUnread, 20, "no lost updates under concurrent sends");
    assert.equal((await h.store.listMessages(b.id, first.id, 5)).length, 5);
    await h.store.markConversationRead(b.id, first.id, "business");
    assert.equal((await h.store.getConversation(b.id, first.id))!.businessUnread, 0);
    assert.equal(await h.store.getConversation(c.id, first.id), null, "another business cannot see the thread");
    assert.deepEqual(await h.store.listMessages(c.id, first.id, 5), []);
    assert.equal((await h.store.listConversationsForCustomer("cust-1", 10)).length, 1);
    await assert.rejects(() => h.store.insertMessage({ id: randomUUID(), conversationId: first.id, businessId: c.id, senderKind: "customer", senderUserId: "cust-1", body: "x", createdAtMs: NOW }), "a message cannot be written into another business's thread");
  });

  t("stampede: 100 simultaneous buyers for 10 seats sell exactly 10; 100 identical confirmations take effect once", async (h) => {
    const b = await business(h); const typeId = randomUUID(), eventId = randomUUID();
    await h.seedTicketType({ businessId: b.id, id: typeId, eventId, capacity: 10 });
    const mk = (): TicketRecord => ({ id: randomUUID(), businessId: b.id, eventId, ticketTypeId: typeId, paymentId: null, holderName: "Holder One", holderEmail: "h@x.com", status: "valid", usedAtMs: null, holdExpiresMs: null, checkedInBy: null });
    const r = await Promise.all(Array.from({ length: 100 }, () => h.store.insertTicketsWithinCapacity(b.id, typeId, [mk()], null, NOW)));
    assert.equal(r.filter(Boolean).length, 10);
    assert.equal(await h.store.countLiveTickets(b.id, typeId, NOW), 10);
    const o = order(b), p = pay(b, o.id, { method: "bank_transfer", reference: `FLU-${randomUUID().slice(0, 6).toUpperCase()}`, expiresAtMs: NOW + H });
    const prod = { id: randomUUID(), businessId: b.id, shortId: randomUUID().replaceAll("-", "").slice(0, 8), slug: "x", name: "X", description: null, priceMinor: 1000n, currency: "NGN", fulfilment: "stock" as const, leadTimeHours: 0, maxPerOrder: 5, status: "active" as const, createdAtMs: NOW };
    await h.store.insertProduct(prod);
    await h.store.insertOrder(o, [{ productId: prod.id, name: "X", unitPriceMinor: 1000n, quantity: 1 }], p, null, NOW + D);
    const clicks = await Promise.all(Array.from({ length: 100 }, () => h.store.setOrderStatus(b.id, o.id, "awaiting_payment", "paid")));
    assert.equal(clicks.filter(Boolean).length, 1, "a button clicked 100 times at once changes the order exactly once");
  });

  t("inventory: 50 simultaneous orders for 5 items sell exactly 5; cancelling returns the stock", async (h) => {
    const b = await business(h);
    const prod = { id: randomUUID(), businessId: b.id, shortId: randomUUID().replaceAll("-", "").slice(0, 8), slug: "x", name: "Phone case", description: null, priceMinor: 1000n, currency: "NGN", fulfilment: "stock" as const, leadTimeHours: 0, maxPerOrder: 5, status: "active" as const, createdAtMs: NOW, stockQuantity: 5 };
    assert.equal(await h.store.insertProduct(prod), true);
    const place = async () => { const o = order(b); try { await h.store.insertOrder(o, [{ productId: prod.id, name: "Phone case", unitPriceMinor: 1000n, quantity: 1 }], pay(b, o.id), null, NOW + D); return o.id; } catch (e) { if ((e as Error).message === "out_of_stock") return null; throw e; } };
    const placed = (await Promise.all(Array.from({ length: 50 }, place))).filter((x): x is string => x !== null);
    assert.equal(placed.length, 5, "never oversells");
    assert.equal((await h.store.getProduct(b.id, prod.id))!.stockQuantity, 0);
    assert.equal((await h.store.catalogue(b.id, [prod.id])).get(prod.id)!.stock, 0);
    await h.store.releaseOrderStock(b.id, placed[0]!);
    assert.equal((await h.store.getProduct(b.id, prod.id))!.stockQuantity, 1);
    const untracked = { ...prod, id: randomUUID(), shortId: randomUUID().replaceAll("-", "").slice(0, 8), stockQuantity: null };
    await h.store.insertProduct(untracked);
    const o2 = order(b); await h.store.insertOrder(o2, [{ productId: untracked.id, name: "X", unitPriceMinor: 1000n, quantity: 3 }], pay(b, o2.id), null, NOW + D);
    assert.equal((await h.store.getProduct(b.id, untracked.id))!.stockQuantity, null, "untracked items stay untracked");
  });

  t("media: one request processes an upload; images attach to products, events and the business; tenant scoping", async (h) => {
    const b = await business(h, "mowner"), c = await business(h);
    const asset = { id: randomUUID(), businessId: b.id, ownerUserId: "mowner", purpose: "product", status: "pending_upload" as const, declaredType: "jpeg", declaredBytes: 1234, detectedType: null, width: null, height: null, variants: [], createdAtMs: NOW };
    await h.store.insertMediaAsset(asset);
    assert.equal(await h.store.getMediaAsset(c.id, asset.id), null, "another business cannot see it");
    const claims = await Promise.all(Array.from({ length: 20 }, () => h.store.setMediaStatus(b.id, asset.id, "pending_upload", "processing")));
    assert.equal(claims.filter(Boolean).length, 1, "exactly one request wins the right to process the upload");
    await h.store.finishMediaAsset(b.id, asset.id, { detectedType: "jpeg", width: 1200, height: 800, variants: ["thumb", "card", "detail"] });
    const done = (await h.store.getMediaAsset(b.id, asset.id))!;
    assert.deepEqual([done.status, done.width, done.variants.length, done.declaredBytes], ["ready", 1200, 3, 1234]);
    assert.equal(await h.store.countMediaAssets(b.id), 1);
    const prod = { id: randomUUID(), businessId: b.id, shortId: randomUUID().replaceAll("-", "").slice(0, 8), slug: "x", name: "X", description: null, priceMinor: 1000n, currency: "NGN", fulfilment: "stock" as const, leadTimeHours: 0, maxPerOrder: 5, status: "active" as const, createdAtMs: NOW };
    await h.store.insertProduct(prod);
    assert.equal(await h.store.patchProduct(b.id, prod.id, { imageAssetId: asset.id }), true);
    assert.equal((await h.store.getProduct(b.id, prod.id))!.imageAssetId, asset.id);
    await h.store.patchBusiness(b.id, { logoAssetId: asset.id });
    assert.equal((await h.store.getBusiness(b.id))!.logoAssetId, asset.id);
  });

  t("search: finds live businesses, active items and upcoming events; wildcard characters are plain text; drafts and suspended businesses stay hidden", async (h) => {
    const tag = randomUUID().slice(0, 8);
    const live = await business(h, undefined, `shop-${tag}`); const dark = await business(h, undefined, `dark-${tag}`);
    await h.store.patchBusiness(live.id, { name: `Zorbo ${tag} Phones` }); await h.store.patchBusiness(dark.id, { name: `Zorbo ${tag} Hidden`, status: "suspended" });
    const mk = (b: typeof live, name: string, status: "active" | "draft") => ({ id: randomUUID(), businessId: b.id, shortId: randomUUID().replaceAll("-", "").slice(0, 8), slug: "x", name, description: null, priceMinor: 1000n, currency: "NGN", fulfilment: "stock" as const, leadTimeHours: 0, maxPerOrder: 5, status, createdAtMs: NOW });
    await h.store.insertProduct(mk(live, `Zorbo ${tag} screen guard`, "active")); await h.store.insertProduct(mk(live, `Zorbo ${tag} secret draft`, "draft")); await h.store.insertProduct(mk(dark, `Zorbo ${tag} hidden item`, "active"));
    const r = await h.store.searchPublic(`zorbo ${tag}`, 20);
    assert.deepEqual(r.businesses.map((x) => x.id), [live.id]);
    assert.deepEqual(r.products.map((x) => x.product.name), [`Zorbo ${tag} screen guard`]);
    assert.equal((await h.store.searchPublic("%", 20)).businesses.length, 0, "a lone percent sign is not a wildcard");
    assert.ok((await h.store.listPublicBusinesses(50, 0, undefined, ["retail"])).some((x) => x.id === live.id));
    assert.equal((await h.store.listPublicBusinesses(50, 0, undefined, ["hotel"])).some((x) => x.id === live.id), false);
    const pubProducts = await h.store.listPublicProducts(50, 0);
    assert.ok(pubProducts.some((x) => x.product.name === `Zorbo ${tag} screen guard`));
    assert.equal(pubProducts.some((x) => x.product.name === `Zorbo ${tag} hidden item`), false);

    const draftBiz = await business(h, undefined, `draft-${tag}`);
    await h.store.patchBusiness(draftBiz.id, { status: "draft" });
    assert.equal((await h.store.getBusiness(draftBiz.id))?.status, "draft");
    assert.equal(await h.store.deleteDraftBusiness(draftBiz.id), true);
    assert.equal(await h.store.getBusiness(draftBiz.id), null);
  });

  t("mobility: operator upsert, nearby radius search, and favorite riders", async (h) => {
    const b = await business(h);
    const opUser = `rider-${randomUUID()}`;
    const custUser = `cust-${randomUUID()}`;
    await h.seedUser(opUser);
    await h.seedUser(custUser);

    const op: MobilityOperatorRecord = {
      id: randomUUID(),
      businessId: b.id,
      userId: opUser,
      name: "Emeka Keke",
      phone: "+2348011223344",
      kind: "keke",
      status: "available",
      rating: 4.85,
      completedTrips: 120,
      currentLocation: { lat: 6.5244, lng: 3.3792, address: "Yaba, Lagos" },
      vehicle: { kind: "keke", registration: "KJA-123-XY", makeModel: "Bajaj RE", color: "Yellow", capacity: 3 },
      isVerified: true,
      languages: ["English", "Yoruba", "Pidgin"],
    };

    await h.store.upsertOperator(op);
    const fetchedOp = await h.store.getOperator(opUser);
    assert.ok(fetchedOp);
    assert.equal(fetchedOp.name, "Emeka Keke");
    assert.equal(fetchedOp.rating, 4.85);

    // Nearby search: within 5km from Yaba (6.5244, 3.3792)
    const nearby = await h.store.listNearbyOperators(6.5200, 3.3750, 5, "keke");
    assert.equal(nearby.length, 1);
    assert.equal(nearby[0]?.userId, opUser);

    // Too far away (> 20km)
    const far = await h.store.listNearbyOperators(6.8000, 3.6000, 5, "keke");
    assert.equal(far.length, 0);

    // Favorite riders
    await h.store.saveFavoriteRider(custUser, opUser);
    const favs = await h.store.listFavoriteRiders(custUser);
    assert.equal(favs.length, 1);
    assert.equal(favs[0]?.userId, opUser);
  });

  t("mobility: ride request, counter-offer negotiation, and status transitions", async (h) => {
    const b = await business(h);
    const custUser = `cust-${randomUUID()}`;
    const opUser = `driver-${randomUUID()}`;
    await h.seedUser(custUser);
    await h.seedUser(opUser);

    const rideId = randomUUID();
    const ride: RideRecord = {
      id: rideId,
      businessId: b.id,
      customerUserId: custUser,
      customerContact: { name: "Chioma", phone: "+2348099887766" },
      operatorUserId: null,
      vehicleKind: "keke",
      pickup: { lat: 6.5244, lng: 3.3792, address: "Commercial Ave, Yaba" },
      destination: { lat: 6.6018, lng: 3.3515, address: "Ikeja City Mall" },
      distanceKm: 10.5,
      customerOfferMinor: 150000n,
      currency: "NGN",
      agreedFareMinor: null,
      counterOffers: [],
      status: "requested",
      scheduledForMs: null,
      deliveryOrderId: null,
      createdAtMs: NOW,
      updatedAtMs: NOW,
    };

    await h.store.insertRide(ride);
    const fetchedRide = await h.store.getRide(rideId);
    assert.ok(fetchedRide);
    assert.equal(fetchedRide.status, "requested");
    assert.equal(fetchedRide.customerOfferMinor, 150000n);

    // Driver submits counter offer N1,800
    const counterUpdated = await h.store.updateRideCounterOffer(rideId, {
      byUserId: opUser,
      counterFareMinor: 180000n,
      createdAtMs: NOW + 1000,
      note: "Traffic is heavy along Ikorodu Road",
    });
    assert.equal(counterUpdated, true);

    const rideAfterCounter = await h.store.getRide(rideId);
    assert.ok(rideAfterCounter);
    assert.equal(rideAfterCounter.status, "counter_offered");
    assert.equal(rideAfterCounter.counterOffers.length, 1);
    assert.equal(rideAfterCounter.counterOffers[0]?.counterFareMinor, 180000n);

    // Customer accepts counter offer -> matched
    const matched = await h.store.setRideStatus(rideId, "counter_offered", "matched", {
      operatorUserId: opUser,
      agreedFareMinor: 180000n,
    });
    assert.equal(matched, true);

    const activeRide = await h.store.getRide(rideId);
    assert.equal(activeRide?.status, "matched");
    assert.equal(activeRide?.operatorUserId, opUser);
    assert.equal(activeRide?.agreedFareMinor, 180000n);

    // Check ride listings for customer and operator
    const custRides = await h.store.listRidesForCustomer(custUser, 10);
    assert.equal(custRides.length, 1);
    const opRides = await h.store.listRidesForOperator(opUser, 10);
    assert.equal(opRides.length, 1);
  });

  t("usage ledger: record completed orders and track billing cycle volume", async (h) => {
    const b = await business(h);
    const o1 = order(b);
    const o2 = order(b);
    await h.seedUser(`cust-${randomUUID()}`);
    await h.store.insertOrder(o1, [], pay(b, o1.id), null, NOW + D);
    await h.store.insertOrder(o2, [], pay(b, o2.id), null, NOW + D);

    await h.store.recordCompletedOrder(b.id, o1.id, 500000n, 3750n, NOW);
    await h.store.recordCompletedOrder(b.id, o2.id, 1000000n, 5000n, NOW + H);

    const countAll = await h.store.countCompletedOrdersSince(b.id, NOW - D);
    assert.equal(countAll, 2);

    const countRecent = await h.store.countCompletedOrdersSince(b.id, NOW + 2 * H);
    assert.equal(countRecent, 0);
  });

  t("escrow: record hold, fetch by orderId, and release on delivery", async (h) => {
    const b = await business(h);
    const o = order(b);
    await h.store.insertOrder(o, [], pay(b, o.id), null, NOW + D);

    const escrow: EscrowRecord = {
      orderId: o.id,
      businessId: b.id,
      buyerUserId: null,
      amountMinor: 500000n,
      currency: "NGN",
      status: "held",
      releasePinHash: "hash1234",
      qrSecretHash: "qrhash5678",
      heldAtMs: NOW,
      releasedAtMs: null,
      disputedAtMs: null,
      disputeReason: null,
    };

    await h.store.insertEscrowRecord(escrow);
    const fetched = await h.store.getEscrowRecord(o.id);
    assert.ok(fetched);
    assert.equal(fetched.status, "held");
    assert.equal(fetched.amountMinor, 500000n);

    // Release escrow
    const released = await h.store.setEscrowStatus(o.id, "held", "released");
    assert.equal(released, true);

    const afterRelease = await h.store.getEscrowRecord(o.id);
    assert.equal(afterRelease?.status, "released");
  });

  t("group cart: create session, find by code or id, update funded amounts", async (h) => {
    const b = await business(h);
    const gId = randomUUID();
    const shortCode = `grp_${randomUUID().slice(0, 8)}`;

    const session: GroupCartSession = {
      id: gId,
      shortCode,
      businessId: b.id,
      hostUserId: null,
      hostName: "Kemi",
      hostEmail: "kemi@fluo.ng",
      splitKind: "itemized",
      targetAmountMinor: 1200000n,
      fundedAmountMinor: 0n,
      currency: "NGN",
      status: "open",
      items: [{ id: "1", productId: randomUUID(), name: "Cakes", unitPriceMinor: 600000n, quantity: 2, addedBy: { name: "Kemi" } }],
      contributions: [],
      createdAtMs: NOW,
      expiresAtMs: NOW + 2 * H,
    };

    await h.store.insertGroupCart(session);

    const byId = await h.store.getGroupCart(gId);
    assert.ok(byId);
    assert.equal(byId.shortCode, shortCode);

    const byCode = await h.store.getGroupCart(shortCode);
    assert.ok(byCode);
    assert.equal(byCode.id, gId);

    // Update funded amount
    const updated = await h.store.updateGroupCart(gId, { fundedAmountMinor: 1200000n, status: "funded" });
    assert.equal(updated, true);

    const finished = await h.store.getGroupCart(gId);
    assert.equal(finished?.status, "funded");
    assert.equal(finished?.fundedAmountMinor, 1200000n);
  });

  t("saves, lists, checks and removes favorite businesses", async (h) => {
    const userA = `user-${randomUUID()}`;
    await h.seedUser(userA);
    const bizA = await business(h);
    const bizB = await business(h);

    assert.equal(await h.store.isFavoriteBusiness(userA, bizA.id), false);
    await h.store.saveFavoriteBusiness(userA, bizA.id);
    assert.equal(await h.store.isFavoriteBusiness(userA, bizA.id), true);

    await h.store.saveFavoriteBusiness(userA, bizB.id);
    const favs = await h.store.listFavoriteBusinesses(userA);
    assert.equal(favs.length, 2);

    await h.store.removeFavoriteBusiness(userA, bizA.id);
    assert.equal(await h.store.isFavoriteBusiness(userA, bizA.id), false);
    const afterFavs = await h.store.listFavoriteBusinesses(userA);
    assert.equal(afterFavs.length, 1);
    assert.equal(afterFavs[0].id, bizB.id);
  });

  void money;
}

