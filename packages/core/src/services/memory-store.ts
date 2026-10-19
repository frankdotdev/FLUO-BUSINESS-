import type { Capability } from "../platform/capabilities.ts";
import type { Membership } from "../platform/authz.ts";
import type { Trial } from "../billing/trial.ts";
import type { OrderStatus } from "../commerce/orders.ts";
import type { PaymentStatus } from "../payments/provider.ts";
import { money } from "../money.ts";
import { isFree } from "../platform/availability.ts";
import type { TimeInterval } from "../platform/availability.ts";
import type { Subscription } from "../billing/subscription.ts";
import type { MediaAssetRecord, MediaStatus, ConversationRecord, MessageRecord, EventRecord, TicketTypeFull, TransferAccountRecord, OutboxRecord, PayoutAccountRecord, ProductRecord, ProductStatus, PushToken, RefundRequestRecord, UserContact } from "./ports.ts";
import type { AuditEvent, BookingRecord, BookingStatus, BusinessRecord, ResourceGroupRecord, CatalogueItem, InviteRecord, OrderItemRecord, OrderRecord, PaymentRecord, Store, StoredTicketStatus, TicketRecord, TicketTypeRecord } from "./ports.ts";
import { estimateDistanceKm, type MobilityOperatorRecord, type RideRecord, type RideStatus, type CounterOffer, type OperatorKind } from "../mobility/rides.ts";
import type { EscrowRecord, EscrowStatus } from "../commerce/escrow.ts";
import type { GroupCartSession } from "../commerce/group-cart.ts";

/** In-memory Store for tests and local development. Mirrors the tenant scoping the Postgres version must have. */
export class MemoryStore implements Store {
  businesses = new Map<string, BusinessRecord>();
  members: Membership[] = [];
  caps = new Map<string, Capability[]>();
  invites = new Map<string, InviteRecord>();
  trials: Trial[] = [];
  audit: AuditEvent[] = [];
  items = new Map<string, Map<string, CatalogueItem>>();          // businessId -> productId -> item
  orders = new Map<string, OrderRecord>();
  orderCreated = new Map<string, number>();
  private readonly clock: () => number;
  constructor(now: () => number = () => Date.now()) { this.clock = now; }
  orderItems = new Map<string, OrderItemRecord[]>();
  payments = new Map<string, PaymentRecord>();
  tokens = new Map<string, { orderId: string; businessId: string; expiresAtMs: number; revoked: boolean }>();
  webhooks = new Set<string>();
  ticketTypes = new Map<string, TicketTypeRecord>();
  tickets = new Map<string, TicketRecord>();
  groups = new Map<string, ResourceGroupRecord>();
  resources: { id: string; businessId: string; groupId: string; label: string }[] = [];
  bookings = new Map<string, BookingRecord>();
  payouts = new Map<string, PayoutAccountRecord>();
  products = new Map<string, ProductRecord>();
  refunds = new Map<string, RefundRequestRecord>();
  subs = new Map<string, Subscription>();
  outbox = new Map<string, OutboxRecord>();
  pushTokens: PushToken[] = [];
  contacts = new Map<string, UserContact>();
  transferAccounts = new Map<string, TransferAccountRecord>();
  events = new Map<string, EventRecord>();
  conversations = new Map<string, ConversationRecord>();
  operators = new Map<string, MobilityOperatorRecord>();
  rides = new Map<string, RideRecord>();
  favoriteRiders = new Map<string, Set<string>>();
  completedOrdersLog: { businessId: string; orderId: string; amountMinor: bigint; feeMinor: bigint; atMs: number }[] = [];
  media = new Map<string, MediaAssetRecord>();
  messages: MessageRecord[] = [];
  ticketTypesFull = new Map<string, TicketTypeFull>();
  escrows = new Map<string, EscrowRecord>();
  groupCarts = new Map<string, GroupCartSession>();
  favoriteBusinesses = new Map<string, Set<string>>();

  async slugTaken(slug: string) { return [...this.businesses.values()].some((b) => b.slug === slug); }
  async insertBusiness(b: BusinessRecord, owner: Membership, caps: readonly Capability[]) { this.businesses.set(b.id, b); this.members.push(owner); this.caps.set(b.id, [...caps]); }
  async getBusiness(id: string) { return this.businesses.get(id) ?? null; }
  async patchBusiness(id: string, patch: Partial<BusinessRecord>) { const b = this.businesses.get(id); if (b) this.businesses.set(id, { ...b, ...patch }); }
  async membershipsForUser(userId: string) { return this.members.filter((m) => m.userId === userId); }
  async membershipsForBusiness(businessId: string) { return this.members.filter((m) => m.businessId === businessId); }
  async upsertMembership(m: Membership) {
    const i = this.members.findIndex((x) => x.userId === m.userId && x.businessId === m.businessId);
    if (i === -1) this.members.push(m); else this.members[i] = m;
  }
  async swapOwner(businessId: string, fromUserId: string, toUserId: string) {
    const from = this.members.find((m) => m.businessId === businessId && m.userId === fromUserId && m.role === "owner" && m.status === "active");
    const to = this.members.find((m) => m.businessId === businessId && m.userId === toUserId && m.status === "active" && m.role === "admin");
    if (!from || !to) return false;
    this.members = this.members.map((m) => m === from ? { ...m, role: "admin" as const } : m === to ? { ...m, role: "owner" as const } : m);
    return true;
  }
  async insertInvite(i: InviteRecord) { this.invites.set(i.tokenHash.toString("hex"), i); }
  async findInvite(hash: Buffer) { return this.invites.get(hash.toString("hex")) ?? null; }
  async markInviteUsed(hash: Buffer, atMs: number) {
    const k = hash.toString("hex"); const i = this.invites.get(k);
    if (!i || i.usedAtMs !== null) return false;
    this.invites.set(k, { ...i, usedAtMs: atMs }); return true;
  }
  async trialsForOwner(ownerUserId: string) { return this.trials.filter((t) => t.ownerUserId === ownerUserId); }
  async insertTrial(t: Trial) { this.trials.push(t); }
  async appendAudit(e: AuditEvent) { this.audit.push(e); }
  async catalogue(businessId: string, ids: readonly string[]) {
    const out = new Map<string, CatalogueItem>(); const mine = this.items.get(businessId);
    for (const id of ids) {
      const p = this.products.get(id);                                               // same rule as Postgres: this business's ACTIVE products
      if (p && p.businessId === businessId && p.status === "active") out.set(id, { stock: p.stockQuantity ?? null, price: money(p.priceMinor, p.currency), active: true, maxPerOrder: p.maxPerOrder, name: p.name, fulfilment: p.fulfilment, leadTimeHours: p.leadTimeHours });
      else if (!p) { const it = mine?.get(id); if (it) out.set(id, it); }              // hand-seeded fixtures used by older tests
    }
    return out;
  }
  async insertOrder(o: OrderRecord, items: readonly OrderItemRecord[], p: PaymentRecord, hash: Buffer | null, tokenExpiresMs: number) {
    for (const i of items) { const pr = this.products.get(i.productId); if (pr && pr.stockQuantity != null && pr.stockQuantity < i.quantity) throw new Error("out_of_stock"); }   // check all, then reserve all: atomic
    for (const i of items) { const pr = this.products.get(i.productId); if (pr && pr.stockQuantity != null) this.products.set(pr.id, { ...pr, stockQuantity: pr.stockQuantity - i.quantity }); }
    this.orders.set(o.id, o); this.orderCreated.set(o.id, this.clock()); this.orderItems.set(o.id, [...items]); this.payments.set(p.id, p);
    if (hash) this.tokens.set(hash.toString("hex"), { orderId: o.id, businessId: o.businessId, expiresAtMs: tokenExpiresMs, revoked: false });
  }
  async releaseOrderStock(businessId: string, orderId: string) {
    for (const i of this.orderItems.get(orderId) ?? []) { const pr = this.products.get(i.productId); if (pr && pr.businessId === businessId && pr.stockQuantity != null) this.products.set(pr.id, { ...pr, stockQuantity: pr.stockQuantity + i.quantity }); }
  }
  async getOrder(businessId: string, orderId: string) { const o = this.orders.get(orderId); return o && o.businessId === businessId ? o : null; }
  async getPaymentForOrder(businessId: string, orderId: string) { return [...this.payments.values()].find((p) => p.orderId === orderId && p.businessId === businessId) ?? null; }
  async setOrderStatus(businessId: string, orderId: string, from: OrderStatus, to: OrderStatus) {
    const o = this.orders.get(orderId); if (!o || o.businessId !== businessId || o.status !== from) return false;
    this.orders.set(orderId, { ...o, status: to }); return true;
  }
  async setPaymentStatus(businessId: string, paymentId: string, from: PaymentStatus, to: PaymentStatus) {
    const p = this.payments.get(paymentId); if (!p || p.businessId !== businessId || p.status !== from) return false;
    this.payments.set(paymentId, { ...p, status: to }); return true;
  }
  async findGuestToken(hash: Buffer) { return this.tokens.get(hash.toString("hex")) ?? null; }
  async attachProviderReference(businessId: string, paymentId: string, provider: string, ref: string) {
    const p = this.payments.get(paymentId); if (!p || p.businessId !== businessId || p.status !== "created" || p.method !== "provider") return false;
    this.payments.set(paymentId, { ...p, status: "pending", provider, providerReference: ref }); return true;
  }
  async findPaymentByProviderRef(provider: string, ref: string) { return [...this.payments.values()].find((p) => p.provider === provider && p.providerReference === ref) ?? null; }
  async recordWebhook(provider: string, eventId: string) { const k = `${provider}:${eventId}`; if (this.webhooks.has(k)) return false; this.webhooks.add(k); return true; }
  async forgetWebhook(provider: string, eventId: string) { this.webhooks.delete(`${provider}:${eventId}`); }

  async getTicketType(businessId: string, id: string): Promise<TicketTypeRecord | null> {
    const full = this.ticketTypesFull.get(id);
    if (full && full.businessId === businessId) {
      const ev = this.events.get(full.eventId);
      return { id: full.id, eventId: full.eventId, businessId, eventName: ev?.name ?? "Event", priceMinor: full.priceMinor, currency: full.currency, capacity: full.capacity, salesStartMs: full.salesStartMs, salesEndMs: full.salesEndMs, eventPublished: ev?.status === "published" };
    }
    const t = this.ticketTypes.get(id); return t && t.businessId === businessId ? t : null;
  }
  private live(businessId: string, typeId: string, nowMs: number) {
    return [...this.tickets.values()].filter((t) => t.businessId === businessId && t.ticketTypeId === typeId &&
      (t.status === "valid" || t.status === "used" || (t.status === "held" && (t.holdExpiresMs ?? 0) > nowMs))).length;
  }
  async countLiveTickets(businessId: string, typeId: string, nowMs: number) { return this.live(businessId, typeId, nowMs); }
  async insertTicketsWithinCapacity(businessId: string, typeId: string, tickets: readonly TicketRecord[], payment: PaymentRecord | null, nowMs: number) {
    const type = (await this.getTicketType(businessId, typeId)); if (!type) return false;
    if (this.live(businessId, typeId, nowMs) + tickets.length > type.capacity) return false;     // the DB version locks the ticket_types row
    for (const t of tickets) this.tickets.set(t.id, t);
    if (payment) this.payments.set(payment.id, payment);
    return true;
  }
  async setTicketsForPayment(businessId: string, paymentId: string, from: StoredTicketStatus, to: StoredTicketStatus, nowMs: number) {
    let n = 0;
    for (const t of this.tickets.values()) {
      if (t.businessId !== businessId || t.paymentId !== paymentId || t.status !== from) continue;
      if (from === "held" && to === "valid" && (t.holdExpiresMs ?? 0) <= nowMs) continue;       // hold expired: not fulfilled
      this.tickets.set(t.id, { ...t, status: to, holdExpiresMs: null }); n++;
    }
    return n;
  }
  async getTicket(businessId: string, ticketId: string) { const t = this.tickets.get(ticketId); return t && t.businessId === businessId ? t : null; }
  async admitTicket(businessId: string, ticketId: string, byUserId: string, nowMs: number) {
    const t = this.tickets.get(ticketId); if (!t || t.businessId !== businessId || t.status !== "valid") return false;
    this.tickets.set(ticketId, { ...t, status: "used", usedAtMs: nowMs, checkedInBy: byUserId }); return true;
  }

  // ---- bookings ----
  async getResourceGroup(businessId: string, id: string) { const g = this.groups.get(id); return g && g.businessId === businessId ? g : null; }
  async resourcesInGroup(businessId: string, groupId: string) { return this.resources.filter((r) => r.businessId === businessId && r.groupId === groupId).map((r) => ({ id: r.id, label: r.label })); }
  private activeFor(businessId: string, resourceId: string, nowMs: number): BookingRecord[] {
    return [...this.bookings.values()].filter((b) => b.businessId === businessId && b.resourceId === resourceId &&
      (b.status === "confirmed" || b.status === "checked_in" || (b.status === "held" && (b.holdExpiresMs ?? 0) > nowMs)));
  }
  async activeBookingIntervals(businessId: string, resourceId: string, nowMs: number): Promise<TimeInterval[]> {
    return this.activeFor(businessId, resourceId, nowMs).map((b) => ({ start: b.startMs, end: b.endMs }));
  }
  async insertBookingIfFree(b: BookingRecord, p: PaymentRecord | null, bufferMs: number, hash: Buffer | null, tokenExpiresMs: number, nowMs: number) {
    const existing = this.activeFor(b.businessId, b.resourceId, nowMs).map((x) => ({ start: x.startMs, end: x.endMs }));
    if (!isFree(existing, { start: b.startMs, end: b.endMs }, bufferMs)) return false;      // the DB exclusion constraint does this in production
    this.bookings.set(b.id, b);
    if (p) this.payments.set(p.id, p);
    if (hash) this.tokens.set(hash.toString("hex"), { orderId: b.id, businessId: b.businessId, expiresAtMs: tokenExpiresMs, revoked: false });
    return true;
  }
  async getBooking(businessId: string, id: string) { const b = this.bookings.get(id); return b && b.businessId === businessId ? b : null; }
  async setBookingStatus(businessId: string, id: string, from: BookingStatus, to: BookingStatus) {
    const b = this.bookings.get(id); if (!b || b.businessId !== businessId || b.status !== from) return false;
    this.bookings.set(id, { ...b, status: to }); return true;
  }
  async expireHeldBookings(nowMs: number) {
    let n = 0;
    for (const b of this.bookings.values()) if (b.status === "held" && (b.holdExpiresMs ?? 0) <= nowMs) { this.bookings.set(b.id, { ...b, status: "expired" }); n++; }
    return n;
  }
  async expireHeldTickets(nowMs: number) {
    let n = 0;
    for (const t of this.tickets.values()) if (t.status === "held" && (t.holdExpiresMs ?? 0) <= nowMs) { this.tickets.set(t.id, { ...t, status: "cancelled", holdExpiresMs: null }); n++; }
    return n;
  }
  async expireStaleTransfers(nowMs: number) {
    let n = 0;
    for (const p of this.payments.values()) {
      if (p.method !== "bank_transfer" || p.status !== "created" || p.expiresAtMs === null || p.expiresAtMs > nowMs) continue;
      this.payments.set(p.id, { ...p, status: "expired" });
      if (p.purpose === "booking") { const b = this.bookings.get(p.orderId); if (b?.status === "held") this.bookings.set(b.id, { ...b, status: "expired" }); }
      else { const o = this.orders.get(p.orderId); if (o?.status === "awaiting_payment") { this.orders.set(o.id, { ...o, status: "cancelled" }); await this.releaseOrderStock(o.businessId, o.id); } }
      n++;
    }
    return n;
  }

  // ---- additions ----
  async insertPayment(p: PaymentRecord) { this.payments.set(p.id, p); }
  async getTransferAccount(businessId: string) { return this.transferAccounts.get(businessId) ?? null; }
  async saveTransferAccount(r: TransferAccountRecord) { this.transferAccounts.set(r.businessId, r); }
  async insertGuestToken(hash: Buffer, subjectId: string, businessId: string, expiresAtMs: number) { this.tokens.set(hash.toString("hex"), { orderId: subjectId, businessId, expiresAtMs, revoked: false }); }
  async getPayment(businessId: string, paymentId: string) { const p = this.payments.get(paymentId); return p && p.businessId === businessId ? p : null; }
  async getPayoutAccount(businessId: string) { return this.payouts.get(businessId) ?? null; }
  async savePayoutAccount(r: PayoutAccountRecord) { this.payouts.set(r.businessId, r); }
  async capabilitiesOf(businessId: string) { return [...(this.caps.get(businessId) ?? [])]; }
  async setCapabilities(businessId: string, caps: readonly Capability[]) { this.caps.set(businessId, [...caps]); }
  async getUserContact(userId: string) { return this.contacts.get(userId) ?? null; }
  async insertProduct(p: ProductRecord) { if ([...this.products.values()].some((x) => x.shortId === p.shortId)) return false; this.products.set(p.id, p); return true; }
  async getProduct(businessId: string, id: string) { const p = this.products.get(id); return p && p.businessId === businessId ? p : null; }
  async patchProduct(businessId: string, id: string, patch: Partial<ProductRecord>) { const p = this.products.get(id); if (!p || p.businessId !== businessId) return false; this.products.set(id, { ...p, ...patch }); return true; }
  async listProducts(businessId: string, statuses: readonly ProductStatus[], limit: number, offset: number) {
    return [...this.products.values()].filter((p) => p.businessId === businessId && statuses.includes(p.status)).sort((a, b) => b.createdAtMs - a.createdAtMs).slice(offset, offset + limit);
  }
  async countProducts(businessId: string, statuses: readonly ProductStatus[]) { return [...this.products.values()].filter((p) => p.businessId === businessId && statuses.includes(p.status)).length; }
  async pauseNewestActiveProducts(businessId: string, keep: number) {
    const active = [...this.products.values()].filter((p) => p.businessId === businessId && p.status === "active").sort((a, b) => a.createdAtMs - b.createdAtMs);
    const extra = active.slice(keep); for (const p of extra) this.products.set(p.id, { ...p, status: "paused" }); return extra.length;
  }
  async deleteDraftBusiness(businessId: string) {
    const b = this.businesses.get(businessId);
    if (!b || b.status !== "draft") return false;
    this.businesses.delete(businessId);
    return true;
  }
  async getPublicBusinessBySlug(slug: string) { const b = [...this.businesses.values()].find((x) => x.slug === slug); return b && b.status === "active" ? b : null; }
  async listPublicBusinesses(limit: number, offset: number, countryCode?: string, typeIds?: readonly string[]) {
    return [...this.businesses.values()].filter((b) => b.status === "active" && (!countryCode || b.countryCode === countryCode) && (!typeIds || typeIds.includes(b.typeId))).sort((a, b) => (b.publishedAtMs ?? 0) - (a.publishedAtMs ?? 0)).slice(offset, offset + limit);
  }
  async listPublicProducts(limit: number, offset: number = 0) {
    const live = (id: string) => { const b = this.businesses.get(id); return b && b.status === "active" ? b : null; };
    const out: { product: ProductRecord; business: BusinessRecord }[] = [];
    for (const p of this.products.values()) {
      const b = live(p.businessId);
      if (b && p.status === "active") out.push({ product: p, business: b });
    }
    return out.sort((a, b) => b.product.createdAtMs - a.product.createdAtMs).slice(offset, offset + limit);
  }
  async searchPublic(needle: string, limit: number) {
    const q = needle.toLowerCase(); const live = (id: string) => { const b = this.businesses.get(id); return b && b.status === "active" ? b : null; };
    const businesses = [...this.businesses.values()].filter((b) => b.status === "active" && b.name.toLowerCase().includes(q)).slice(0, limit);
    const products: { product: ProductRecord; business: BusinessRecord }[] = [];
    for (const p of this.products.values()) { const b = live(p.businessId); if (b && p.status === "active" && (p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q))) products.push({ product: p, business: b }); }
    const events: { event: EventRecord; business: BusinessRecord }[] = [];
    for (const e of this.events.values()) { const b = live(e.businessId); if (b && e.status === "published" && e.name.toLowerCase().includes(q)) events.push({ event: e, business: b }); }
    return { businesses, products: products.slice(0, limit), events: events.slice(0, limit) };
  }
  async getPublicProductByShortId(shortId: string) {
    const product = [...this.products.values()].find((p) => p.shortId === shortId && p.status === "active"); if (!product) return null;
    const business = this.businesses.get(product.businessId); return business && business.status === "active" ? { product, business } : null;
  }
  async listOrders(businessId: string, limit: number, offset: number) { return [...this.orders.values()].filter((o) => o.businessId === businessId).reverse().slice(offset, offset + limit); }
  async listOrdersForUser(userId: string, limit: number) { return [...this.orders.values()].filter((o) => o.userId === userId).reverse().slice(0, limit); }
  async getOrderItems(businessId: string, orderId: string) { const o = this.orders.get(orderId); return o && o.businessId === businessId ? [...(this.orderItems.get(orderId) ?? [])] : []; }
  async listBookings(businessId: string, fromMs: number, toMs: number) { return [...this.bookings.values()].filter((b) => b.businessId === businessId && b.startMs < toMs && b.endMs > fromMs).sort((a, b) => a.startMs - b.startMs); }
  async listBookingsForUser(userId: string, limit: number) { return [...this.bookings.values()].filter((b) => b.userId === userId).sort((a, b) => b.startMs - a.startMs).slice(0, limit); }
  async ticketsForPayment(businessId: string, paymentId: string) { return [...this.tickets.values()].filter((t) => t.businessId === businessId && t.paymentId === paymentId); }
  async insertRefundRequest(r: RefundRequestRecord) { this.refunds.set(r.id, r); }
  async getRefundRequest(businessId: string, id: string) { const r = this.refunds.get(id); return r && r.businessId === businessId ? r : null; }
  async setRefundStatus(businessId: string, id: string, from: RefundRequestRecord["status"], to: RefundRequestRecord["status"], nowMs: number) {
    const r = this.refunds.get(id); if (!r || r.businessId !== businessId || r.status !== from) return false; this.refunds.set(id, { ...r, status: to, resolvedAtMs: nowMs }); return true;
  }
  async listRefundRequests(businessId: string, status?: RefundRequestRecord["status"]) { return [...this.refunds.values()].filter((r) => r.businessId === businessId && (!status || r.status === status)); }
  async getSubscription(businessId: string) { return this.subs.get(businessId) ?? null; }
  async upsertSubscription(s: Subscription) { this.subs.set(s.businessId, s); }
  async trialForBusiness(businessId: string) { return this.trials.find((t) => t.businessId === businessId) ?? null; }
  async enqueueNotification(n: OutboxRecord) { if ([...this.outbox.values()].some((x) => x.dedupeKey === n.dedupeKey)) return false; this.outbox.set(n.id, n); return true; }
  async dueNotifications(nowMs: number, limit: number) { return [...this.outbox.values()].filter((n) => n.sentAtMs === null && n.sendAfterMs <= nowMs).sort((a, b) => a.sendAfterMs - b.sendAfterMs).slice(0, limit); }
  async markNotificationSent(id: string, nowMs: number) { const n = this.outbox.get(id); if (n) this.outbox.set(id, { ...n, sentAtMs: nowMs, vars: {} }); }
  async markNotificationFailed(id: string, attempts: number, nextAtMs: number | null, error: string) {
    const n = this.outbox.get(id); if (n) this.outbox.set(id, { ...n, attempts, lastError: error, sendAfterMs: nextAtMs ?? Number.MAX_SAFE_INTEGER });
  }
  async countEmailsSentSince(sinceMs: number) { return [...this.outbox.values()].filter((n) => n.sentAtMs !== null && n.sentAtMs >= sinceMs && n.email !== null).length; }
  async pushTokensForUsers(userIds: readonly string[]) { return this.pushTokens.filter((t) => userIds.includes(t.userId)); }
  async savePushToken(t: PushToken) { if (!this.pushTokens.some((x) => x.token === t.token)) this.pushTokens.push(t); else this.pushTokens = this.pushTokens.map((x) => x.token === t.token ? t : x); }
  async removePushTokens(tokens: readonly string[]) { this.pushTokens = this.pushTokens.filter((t) => !tokens.includes(t.token)); }
  async setBookingHold(businessId: string, id: string, holdExpiresMs: number) { const b = this.bookings.get(id); if (!b || b.businessId !== businessId || b.status !== "held") return false; this.bookings.set(id, { ...b, holdExpiresMs }); return true; }

  // ---- events, bookable resources, limits ----
  async insertEvent(e: EventRecord) { if ([...this.events.values()].some((x) => x.shortId === e.shortId)) return false; this.events.set(e.id, e); return true; }
  async getEvent(businessId: string, id: string) { const e = this.events.get(id); return e && e.businessId === businessId ? e : null; }
  async patchEvent(businessId: string, id: string, patch: Partial<EventRecord>) { const e = this.events.get(id); if (!e || e.businessId !== businessId) return false; this.events.set(id, { ...e, ...patch }); return true; }
  async listEvents(businessId: string, limit: number) { return [...this.events.values()].filter((e) => e.businessId === businessId).sort((a, b) => b.startsAtMs - a.startsAtMs).slice(0, limit); }
  async insertTicketType(t: TicketTypeFull) { this.ticketTypesFull.set(t.id, t); }
  async listTicketTypes(businessId: string, eventId: string) { return [...this.ticketTypesFull.values()].filter((t) => t.businessId === businessId && t.eventId === eventId); }
  async getPublicEventByShortId(shortId: string) {
    const event = [...this.events.values()].find((e) => e.shortId === shortId && e.status === "published"); if (!event) return null;
    const business = this.businesses.get(event.businessId); if (!business || business.status !== "active") return null;
    return { event, business, ticketTypes: await this.listTicketTypes(event.businessId, event.id) };
  }
  async listPublicEvents(limit: number) {
    const out: { event: EventRecord; business: BusinessRecord }[] = [];
    for (const event of [...this.events.values()].filter((e) => e.status === "published").sort((a, b) => a.startsAtMs - b.startsAtMs)) {
      const business = this.businesses.get(event.businessId); if (business?.status === "active") out.push({ event, business });
    }
    return out.slice(0, limit);
  }
  async findTicketById(ticketId: string) { return this.tickets.get(ticketId) ?? null; }
  async countOrdersSince(businessId: string, sinceMs: number) { void sinceMs; return [...this.orders.values()].filter((o) => o.businessId === businessId && o.status !== "cancelled" && (this.orderCreated.get(o.id) ?? 0) >= sinceMs).length; }
  async insertResourceGroup(g: ResourceGroupRecord & { shortId: string; slug: string }, resources: readonly { id: string; label: string }[]) {
    if ([...this.groups.values()].some((x) => x.shortId === g.shortId)) return false;
    this.groups.set(g.id, g); for (const r of resources) this.resources.push({ id: r.id, businessId: g.businessId, groupId: g.id, label: r.label }); return true;
  }
  async listResourceGroups(businessId: string) { return [...this.groups.values()].filter((g) => g.businessId === businessId); }
  async getPublicResourceGroupByShortId(shortId: string) {
    const group = [...this.groups.values()].find((g) => g.shortId === shortId && g.active); if (!group) return null;
    const business = this.businesses.get(group.businessId); return business && business.status === "active" ? { group, business } : null;
  }

  // ---- messaging ----
  async getOrCreateConversation(c: ConversationRecord) {
    const existing = [...this.conversations.values()].find((x) => x.businessId === c.businessId && x.customerUserId === c.customerUserId);
    if (existing) return existing; this.conversations.set(c.id, c); return c;
  }
  async getConversation(businessId: string, id: string) { const c = this.conversations.get(id); return c && c.businessId === businessId ? c : null; }
  async listConversationsForBusiness(businessId: string, limit: number) { return [...this.conversations.values()].filter((c) => c.businessId === businessId).sort((a, b) => b.lastMessageAtMs - a.lastMessageAtMs).slice(0, limit); }
  async listConversationsForCustomer(userId: string, limit: number) { return [...this.conversations.values()].filter((c) => c.customerUserId === userId).sort((a, b) => b.lastMessageAtMs - a.lastMessageAtMs).slice(0, limit); }
  async insertMessage(m: MessageRecord) {
    const c = this.conversations.get(m.conversationId); if (!c || c.businessId !== m.businessId) throw new Error("conversation_not_found");
    this.messages.push(m);
    this.conversations.set(c.id, { ...c, lastMessageAtMs: m.createdAtMs, businessUnread: c.businessUnread + (m.senderKind === "customer" ? 1 : 0), customerUnread: c.customerUnread + (m.senderKind === "business" ? 1 : 0) });
  }
  async listMessages(businessId: string, conversationId: string, limit: number) { return this.messages.filter((m) => m.businessId === businessId && m.conversationId === conversationId).slice(-limit); }
  async markConversationRead(businessId: string, conversationId: string, side: "business" | "customer") {
    const c = this.conversations.get(conversationId); if (!c || c.businessId !== businessId) return;
    this.conversations.set(c.id, side === "business" ? { ...c, businessUnread: 0 } : { ...c, customerUnread: 0 });
  }

  // ---- media ----
  async insertMediaAsset(m: MediaAssetRecord) { this.media.set(m.id, m); }
  async getMediaAsset(businessId: string, id: string) { const m = this.media.get(id); return m && m.businessId === businessId ? m : null; }
  async setMediaStatus(businessId: string, id: string, from: MediaStatus, to: MediaStatus) { const m = this.media.get(id); if (!m || m.businessId !== businessId || m.status !== from) return false; this.media.set(id, { ...m, status: to }); return true; }
  async finishMediaAsset(businessId: string, id: string, f: { detectedType: string; width: number; height: number; variants: readonly string[] }) {
    const m = this.media.get(id); if (m && m.businessId === businessId) this.media.set(id, { ...m, status: "ready", detectedType: f.detectedType, width: f.width, height: f.height, variants: f.variants });
  }
  async countMediaAssets(businessId: string) { return [...this.media.values()].filter((m) => m.businessId === businessId).length; }

  // ---- mobility and rides ----
  async upsertOperator(op: MobilityOperatorRecord) { this.operators.set(op.userId, op); }
  async getOperator(userId: string) { return this.operators.get(userId) ?? null; }
  async listNearbyOperators(lat: number, lng: number, radiusKm: number, kind?: OperatorKind) {
    return [...this.operators.values()].filter((op) => {
      if (kind && op.kind !== kind) return false;
      if (!op.currentLocation || op.status === "offline") return false;
      const d = estimateDistanceKm({ lat, lng }, op.currentLocation);
      return d <= radiusKm;
    });
  }
  async insertRide(r: RideRecord) { this.rides.set(r.id, r); }
  async getRide(id: string) { return this.rides.get(id) ?? null; }
  async setRideStatus(id: string, from: RideStatus, to: RideStatus, patch?: Partial<RideRecord>) {
    const r = this.rides.get(id);
    if (!r || r.status !== from) return false;
    this.rides.set(id, { ...r, ...patch, status: to });
    return true;
  }
  async updateRideCounterOffer(rideId: string, offer: CounterOffer) {
    const r = this.rides.get(rideId);
    if (!r) return false;
    const others = r.counterOffers.filter((c) => c.operatorUserId !== offer.operatorUserId);
    this.rides.set(rideId, { ...r, counterOffers: [...others, offer], status: "counter_offered" });
    return true;
  }
  async listRidesForCustomer(customerUserId: string, limit: number) {
    return [...this.rides.values()].filter((r) => r.customerUserId === customerUserId).reverse().slice(0, limit);
  }
  async listRidesForOperator(operatorUserId: string, limit: number) {
    return [...this.rides.values()].filter((r) => r.operatorUserId === operatorUserId).reverse().slice(0, limit);
  }
  async saveFavoriteRider(customerUserId: string, operatorUserId: string) {
    let s = this.favoriteRiders.get(customerUserId);
    if (!s) { s = new Set(); this.favoriteRiders.set(customerUserId, s); }
    s.add(operatorUserId);
  }
  async listFavoriteRiders(customerUserId: string) {
    const s = this.favoriteRiders.get(customerUserId);
    if (!s) return [];
    return [...s].map((id) => this.operators.get(id)).filter(Boolean) as MobilityOperatorRecord[];
  }

  // ---- order usage & overage ledger ----
  async recordCompletedOrder(businessId: string, orderId: string, amountMinor: bigint, feeMinor: bigint, atMs: number) {
    this.completedOrdersLog.push({ businessId, orderId, amountMinor, feeMinor, atMs });
  }
  async countCompletedOrdersSince(businessId: string, sinceMs: number) {
    return this.completedOrdersLog.filter((x) => x.businessId === businessId && x.atMs >= sinceMs).length;
  }

  // ---- escrow ----
  async insertEscrowRecord(e: EscrowRecord) { this.escrows.set(e.orderId, e); }
  async getEscrowRecord(orderId: string) { return this.escrows.get(orderId) ?? null; }
  async setEscrowStatus(orderId: string, from: EscrowStatus, to: EscrowStatus, patch?: Partial<EscrowRecord>) {
    const e = this.escrows.get(orderId);
    if (!e || e.status !== from) return false;
    this.escrows.set(orderId, { ...e, ...patch, status: to });
    return true;
  }

  // ---- group carts ----
  async insertGroupCart(g: GroupCartSession) { this.groupCarts.set(g.id, g); }
  async getGroupCart(idOrCode: string) {
    const byId = this.groupCarts.get(idOrCode);
    if (byId) return byId;
    return [...this.groupCarts.values()].find((g) => g.shortCode === idOrCode) ?? null;
  }
  async updateGroupCart(id: string, patch: Partial<GroupCartSession>) {
    const g = this.groupCarts.get(id);
    if (!g) return false;
    this.groupCarts.set(id, { ...g, ...patch });
    return true;
  }

  // ---- favorite businesses / regulars ----
  async saveFavoriteBusiness(customerUserId: string, businessId: string) {
    const set = this.favoriteBusinesses.get(customerUserId) ?? new Set<string>();
    set.add(businessId);
    this.favoriteBusinesses.set(customerUserId, set);
  }
  async removeFavoriteBusiness(customerUserId: string, businessId: string) {
    const set = this.favoriteBusinesses.get(customerUserId);
    if (set) set.delete(businessId);
  }
  async listFavoriteBusinesses(customerUserId: string) {
    const set = this.favoriteBusinesses.get(customerUserId);
    if (!set || set.size === 0) return [];
    const res: BusinessRecord[] = [];
    for (const id of set) {
      const b = this.businesses.get(id);
      if (b && b.status === "active") res.push(b);
    }
    return res;
  }
  async isFavoriteBusiness(customerUserId: string, businessId: string) {
    return this.favoriteBusinesses.get(customerUserId)?.has(businessId) ?? false;
  }
}
