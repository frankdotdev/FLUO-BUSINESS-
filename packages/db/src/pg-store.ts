import { randomUUID } from "node:crypto";
import { money, type AuditEvent, type BookingRecord, type BookingStatus, type BusinessRecord, type Capability, type CatalogueItem, type InviteRecord, type Membership, type OrderItemRecord,
  type OrderRecord, type OrderStatus, type OutboxRecord, type PaymentRecord, type PaymentStatus, type PayoutAccountRecord, type ProductRecord, type ProductStatus, type PushToken, type RefundRequestRecord,
  type ResourceGroupRecord, type Store, type StoredTicketStatus, type Subscription, type TicketRecord, type TicketTypeRecord, type TransferAccountRecord, type Trial, type UserContact, type TimeInterval, type EventRecord, type TicketTypeFull, type ConversationRecord, type MessageRecord, type MediaAssetRecord, type MediaStatus,
  type MobilityOperatorRecord, type RideRecord, type RideStatus, type CounterOffer, type OperatorKind, estimateDistanceKm,
  type EscrowRecord, type EscrowStatus, type GroupCartSession } from "@fluo/core";

// Structural types so this file needs no import of `pg` (and can be type-checked and unit-tested without it).
export interface Db { query(text: string, params?: unknown[]): Promise<{ rows: any[]; rowCount: number | null }> }
export interface PoolClientLike extends Db { release(): void }
export interface PoolLike extends Db { connect(): Promise<PoolClientLike> }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s: string): boolean => UUID.test(s);
const d = (ms: number): Date => new Date(ms);
const ms = (v: Date | null): number | null => (v ? v.getTime() : null);
const big = (v: string | number | bigint): bigint => BigInt(v);

const mBusiness = (r: any): BusinessRecord => ({
  id: r.id, slug: r.slug, name: r.name, typeId: r.business_type_id, typeVersion: r.business_type_ver, countryCode: r.country_code, currency: r.currency, timezone: r.timezone,
  status: r.status, verificationStatus: r.verification_status, allowsTransfer: r.allows_transfer, acceptsAutomatic: r.accepts_automatic, refundPolicy: r.refund_policy, publishedAtMs: ms(r.published_at), logoAssetId: r.logo_asset_id ?? null,
});
const mMember = (r: any): Membership => ({ userId: r.user_id, businessId: r.business_id, role: r.role, status: r.status });
const guestOf = (r: any) => (r.guest_contact_id ? { name: r.g_name, email: r.g_email, ...(r.g_phone ? { phone: r.g_phone } : {}) } : null);
const mOrder = (r: any): OrderRecord => ({ id: r.id, businessId: r.business_id, userId: r.user_id, guest: guestOf(r), kind: r.kind, status: r.status, currency: r.currency, totalMinor: big(r.total_minor), requiredByMs: ms(r.required_by), note: r.customer_note, refundPolicy: r.refund_policy });
const mPayment = (r: any): PaymentRecord => ({ id: r.id, businessId: r.business_id, orderId: r.subject_id, purpose: r.purpose, method: r.method, status: r.status, amountMinor: big(r.amount_minor), currency: r.currency, reference: r.transfer_reference, expiresAtMs: ms(r.expires_at), provider: r.provider, providerReference: r.provider_reference, platformFeeMinor: big(r.platform_fee_minor), ...(r.plan_key ? { planKey: r.plan_key } : {}), ...(r.billing_interval ? { interval: r.billing_interval } : {}) });
const mProduct = (r: any): ProductRecord => ({ id: r.id, businessId: r.business_id, shortId: r.short_id, slug: r.slug, name: r.name, description: r.description, priceMinor: big(r.price_minor), currency: r.currency, fulfilment: r.fulfilment, leadTimeHours: r.lead_time_hours, maxPerOrder: r.max_per_order, status: r.status, createdAtMs: r.created_at.getTime(), stockQuantity: r.stock_quantity, imageAssetId: r.image_asset_id ?? null, galleryAssetIds: r.gallery_asset_ids ?? (r.image_asset_id ? [r.image_asset_id] : []), compareAtPriceMinor: r.compare_at_price_minor ? big(r.compare_at_price_minor) : null, promoBadge: r.promo_badge ?? null });
const mBooking = (r: any): BookingRecord => ({ id: r.id, businessId: r.business_id, resourceId: r.resource_id, groupId: r.group_id, userId: r.user_id, guest: guestOf(r), startMs: r.start_at.getTime(), endMs: r.end_at.getTime(), status: r.status, holdExpiresMs: ms(r.hold_expires_at), paymentId: r.payment_id, refundPolicy: r.refund_policy });
const mTicket = (r: any): TicketRecord => ({ id: r.id, businessId: r.business_id, eventId: r.event_id, ticketTypeId: r.ticket_type_id, paymentId: r.payment_id, holderName: r.holder_name, holderEmail: r.holder_email, status: r.status, usedAtMs: ms(r.used_at), holdExpiresMs: ms(r.hold_expires_at), checkedInBy: r.checked_in_by });
const mRefund = (r: any): RefundRequestRecord => ({ id: r.id, businessId: r.business_id, paymentId: r.payment_id, subjectKind: r.subject_kind, subjectId: r.subject_id, amountMinor: big(r.amount_minor), currency: r.currency, status: r.status, reason: r.reason, createdAtMs: r.created_at.getTime(), resolvedAtMs: ms(r.resolved_at) });
const mOutbox = (r: any): OutboxRecord => ({ id: r.id, dedupeKey: r.dedupe_key, userId: r.user_id, email: r.email, kind: r.kind, klass: r.email_class, vars: r.vars, sendAfterMs: r.send_after.getTime(), sentAtMs: ms(r.sent_at), attempts: r.attempts, lastError: r.last_error });

const MIN = 60_000;
const mGroup = (r: any): ResourceGroupRecord => ({ id: r.id, businessId: r.business_id, shortId: r.short_id, slug: r.slug, name: r.name, timezone: r.timezone, priceMinor: big(r.price_minor), priceUnit: r.price_unit, currency: r.currency, active: r.status === "active",
  policy: { kind: r.policy_kind, minDurationMs: r.min_duration_minutes * MIN, maxDurationMs: r.max_duration_minutes === null ? null : r.max_duration_minutes * MIN, granularityMs: r.granularity_minutes * MIN, alignmentOriginMs: 0, bufferMs: r.buffer_minutes * MIN, minNoticeMs: r.min_notice_minutes * MIN, maxAdvanceMs: r.max_advance_minutes === null ? null : r.max_advance_minutes * MIN } });
const mEvent = (r: any): EventRecord => ({ id: r.id, businessId: r.business_id, shortId: r.short_id, slug: r.slug, name: r.name, description: r.description, venue: r.venue, startsAtMs: r.starts_at.getTime(), endsAtMs: ms(r.ends_at), status: r.status, coverAssetId: r.cover_asset_id ?? null });
const mTicketType = (r: any): TicketTypeFull => ({ id: r.id, eventId: r.event_id, businessId: r.business_id, name: r.name, priceMinor: big(r.price_minor), currency: r.currency, capacity: r.capacity, salesStartMs: ms(r.sales_start), salesEndMs: ms(r.sales_end) });
const mConversation = (r: any): ConversationRecord => ({ id: r.id, businessId: r.business_id, customerUserId: r.customer_user_id, topic: r.topic, createdAtMs: r.created_at.getTime(), lastMessageAtMs: r.last_message_at.getTime(), businessUnread: r.business_unread, customerUnread: r.customer_unread });
const mMessage = (r: any): MessageRecord => ({ id: r.id, conversationId: r.conversation_id, businessId: r.business_id, senderKind: r.sender_kind, senderUserId: r.sender_user_id, body: r.body, createdAtMs: r.created_at.getTime() });
const mOperator = (r: any): MobilityOperatorRecord => ({
  id: r.id, businessId: r.business_id, userId: r.user_id, name: r.name, phone: r.phone,
  kind: r.kind, status: r.status, rating: Number(r.rating), completedTrips: Number(r.completed_trips),
  currentLocation: r.current_lat != null ? { lat: Number(r.current_lat), lng: Number(r.current_lng), address: r.current_address ?? "" } : null,
  vehicle: r.vehicle ?? { kind: r.kind, registration: "", makeModel: "", color: "", capacity: 1 },
  isVerified: r.is_verified, languages: r.languages ?? ["English"],
});
const mRide = (r: any): RideRecord => ({
  id: r.id, businessId: r.business_id, customerUserId: r.customer_user_id,
  customerContact: { name: r.customer_name, phone: r.customer_phone, ...(r.customer_email ? { email: r.customer_email } : {}) },
  operatorUserId: r.operator_user_id, vehicleKind: r.vehicle_kind,
  pickup: { lat: Number(r.pickup_lat), lng: Number(r.pickup_lng), address: r.pickup_address },
  destination: { lat: Number(r.dest_lat), lng: Number(r.dest_lng), address: r.dest_address },
  distanceKm: Number(r.distance_km), customerOfferMinor: big(r.customer_offer_minor), currency: r.currency,
  agreedFareMinor: r.agreed_fare_minor != null ? big(r.agreed_fare_minor) : null,
  counterOffers: (r.counter_offers ?? []).map((c: any) => ({ ...c, counterFareMinor: big(c.counterFareMinor) })),
  status: r.status, scheduledForMs: ms(r.scheduled_for), deliveryOrderId: r.delivery_order_id,
  createdAtMs: r.created_at.getTime(), updatedAtMs: r.updated_at.getTime(),
});
const mEscrow = (r: any): EscrowRecord => ({
  orderId: r.order_id, businessId: r.business_id, buyerUserId: r.buyer_user_id,
  amountMinor: big(r.amount_minor), currency: r.currency, status: r.status,
  releasePinHash: r.release_pin_hash, qrSecretHash: r.qr_secret_hash,
  heldAtMs: r.held_at.getTime(), releasedAtMs: ms(r.released_at),
  disputedAtMs: ms(r.disputed_at), disputeReason: r.dispute_reason,
});
const mGroupCart = (r: any): GroupCartSession => ({
  id: r.id, shortCode: r.short_code, businessId: r.business_id,
  hostUserId: r.host_user_id, hostName: r.host_name, hostEmail: r.host_email,
  splitKind: r.split_kind, targetAmountMinor: big(r.target_amount_minor),
  fundedAmountMinor: big(r.funded_amount_minor), currency: r.currency, status: r.status,
  items: (r.items ?? []).map((it: any) => ({ ...it, unitPriceMinor: big(it.unitPriceMinor) })),
  contributions: (r.contributions ?? []).map((c: any) => ({ ...c, amountMinor: big(c.amountMinor) })),
  createdAtMs: r.created_at.getTime(), expiresAtMs: r.expires_at.getTime(),
});

async function releaseStock(db: Db, businessId: string, orderId: string): Promise<void> {
  if (!isUuid(orderId) || !isUuid(businessId)) return;
  await db.query(`update products p set stock_quantity = p.stock_quantity + oi.q from (select product_id, sum(quantity) as q from order_items where order_id = $1 and business_id = $2 group by product_id) oi
    where p.id = oi.product_id and p.business_id = $2 and p.stock_quantity is not null`, [orderId, businessId]);
}
const BOOKING_SELECT = `select b.*, lower(b.during) as start_at, upper(b.during) as end_at, g.name as g_name, g.email as g_email, g.phone as g_phone from bookings b left join guest_contacts g on g.id = b.guest_contact_id`;
const ORDER_SELECT = `select o.*, g.name as g_name, g.email as g_email, g.phone as g_phone from orders o left join guest_contacts g on g.id = o.guest_contact_id`;
const PAYMENT_INSERT = `insert into payments (id, business_id, purpose, subject_id, amount_minor, currency, method, provider, provider_reference, status, transfer_reference, expires_at, platform_fee_minor, plan_key, billing_interval)
  values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`;
const paymentParams = (p: PaymentRecord): unknown[] => [p.id, p.businessId, p.purpose ?? "order", p.orderId, p.amountMinor.toString(), p.currency, p.method, p.provider ?? null, p.providerReference ?? null, p.status, p.reference, p.expiresAtMs === null ? null : d(p.expiresAtMs), (p.platformFeeMinor ?? 0n).toString(), p.planKey ?? null, p.interval ?? null];

/** PostgreSQL implementation of the Store port. Every business-scoped query filters by business_id; ids from URLs are validated
 *  as UUIDs before they reach SQL; state changes are compare-and-set UPDATEs; multi-row writes run in one transaction. */
export class PgStore implements Store {
  private readonly pool: PoolLike;
  constructor(pool: PoolLike) { this.pool = pool; }

  private async tx<T>(fn: (c: Db) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try { await c.query("begin"); const r = await fn(c); await c.query("commit"); return r; }
    catch (e) { await c.query("rollback").catch(() => undefined); throw e; }
    finally { c.release(); }
  }
  private async one(sql: string, p: unknown[]): Promise<any | null> { return (await this.pool.query(sql, p)).rows[0] ?? null; }
  private async changed(sql: string, p: unknown[]): Promise<boolean> { return (await this.pool.query(sql, p)).rowCount === 1; }

  // ---- businesses, members, invites ----
  async slugTaken(slug: string) { return (await this.one("select 1 from businesses where slug = $1", [slug])) !== null; }
  async insertBusiness(b: BusinessRecord, owner: Membership, caps: readonly Capability[]) {
    await this.tx(async (c) => {
      await c.query(`insert into businesses (id, slug, name, business_type_id, business_type_ver, country_code, currency, timezone, status, verification_status, allows_transfer, accepts_automatic, refund_policy)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [b.id, b.slug, b.name, b.typeId, b.typeVersion, b.countryCode, b.currency, b.timezone, b.status, b.verificationStatus, b.allowsTransfer, b.acceptsAutomatic, JSON.stringify(b.refundPolicy)]);
      await c.query("insert into business_members (business_id, user_id, role, status) values ($1,$2,$3,$4)", [b.id, owner.userId, owner.role, owner.status]);
      for (const cap of caps) await c.query("insert into business_capabilities (business_id, capability) values ($1,$2)", [b.id, cap]);
    });
  }
  async getBusiness(id: string) { return isUuid(id) ? (r => (r ? mBusiness(r) : null))(await this.one("select * from businesses where id = $1 and deleted_at is null", [id])) : null; }
  async patchBusiness(id: string, patch: Partial<BusinessRecord>) {
    const cols: Record<string, [string, (v: any) => unknown]> = {
      name: ["name", (v) => v], status: ["status", (v) => v], verificationStatus: ["verification_status", (v) => v], allowsTransfer: ["allows_transfer", (v) => v],
      acceptsAutomatic: ["accepts_automatic", (v) => v], logoAssetId: ["logo_asset_id", (v) => v], publishedAtMs: ["published_at", (v) => (v === null ? null : d(v))], refundPolicy: ["refund_policy", (v) => JSON.stringify(v)],
    };
    const sets: string[] = [], vals: unknown[] = [id];
    for (const [k, v] of Object.entries(patch)) { const c = cols[k]; if (c) { vals.push(c[1](v)); sets.push(`${c[0]} = $${vals.length}`); } }
    if (sets.length > 0) await this.pool.query(`update businesses set ${sets.join(", ")} where id = $1`, vals);
  }
  async membershipsForUser(userId: string) { return (await this.pool.query("select * from business_members where user_id = $1", [userId])).rows.map(mMember); }
  async membershipsForBusiness(businessId: string) { return isUuid(businessId) ? (await this.pool.query("select * from business_members where business_id = $1", [businessId])).rows.map(mMember) : []; }
  async upsertMembership(m: Membership) {
    await this.pool.query(`insert into business_members (business_id, user_id, role, status) values ($1,$2,$3,$4)
      on conflict (business_id, user_id) do update set role = excluded.role, status = excluded.status`, [m.businessId, m.userId, m.role, m.status]);
  }
  async swapOwner(businessId: string, fromUserId: string, toUserId: string) {
    return this.tx(async (c) => {
      const to = await c.query("select 1 from business_members where business_id=$1 and user_id=$2 and role='admin' and status='active'", [businessId, toUserId]);
      if (to.rowCount !== 1) return false;
      const a = await c.query("update business_members set role='admin' where business_id=$1 and user_id=$2 and role='owner' and status='active'", [businessId, fromUserId]);
      if (a.rowCount !== 1) return false;
      await c.query("update business_members set role='owner' where business_id=$1 and user_id=$2", [businessId, toUserId]);
      return true;
    });
  }
  async insertInvite(i: InviteRecord) {
    await this.pool.query("insert into member_invites (token_hash, business_id, email, role, invited_by, expires_at, used_at) values ($1,$2,$3,$4,$5,$6,null)", [i.tokenHash, i.businessId, i.email, i.role, i.invitedBy, d(i.expiresAtMs)]);
  }
  async findInvite(hash: Buffer) {
    const r = await this.one("select * from member_invites where token_hash = $1", [hash]);
    return r ? { tokenHash: r.token_hash, businessId: r.business_id, email: r.email, role: r.role, expiresAtMs: r.expires_at.getTime(), usedAtMs: ms(r.used_at), invitedBy: r.invited_by } : null;
  }
  async markInviteUsed(hash: Buffer, atMs: number) { return this.changed("update member_invites set used_at = $2 where token_hash = $1 and used_at is null", [hash, d(atMs)]); }
  async capabilitiesOf(businessId: string) { return isUuid(businessId) ? (await this.pool.query("select capability from business_capabilities where business_id = $1", [businessId])).rows.map((r) => r.capability) : []; }
  async getUserContact(userId: string): Promise<UserContact | null> { const r = await this.one("select email, name from users where id = $1", [userId]); return r ? { email: r.email, name: r.name } : null; }

  // ---- trials, subscriptions, audit ----
  async trialsForOwner(ownerUserId: string): Promise<Trial[]> { return (await this.pool.query("select * from business_trials where owner_user_id = $1", [ownerUserId])).rows.map((r) => ({ businessId: r.business_id, ownerUserId: r.owner_user_id, startedMs: r.started_at.getTime(), endsMs: r.ends_at.getTime() })); }
  async insertTrial(t: Trial) { await this.pool.query("insert into business_trials (business_id, owner_user_id, started_at, ends_at) values ($1,$2,$3,$4) on conflict do nothing", [t.businessId, t.ownerUserId, d(t.startedMs), d(t.endsMs)]); }
  async trialForBusiness(businessId: string): Promise<Trial | null> {
    const r = isUuid(businessId) ? await this.one("select * from business_trials where business_id = $1", [businessId]) : null;
    return r ? { businessId: r.business_id, ownerUserId: r.owner_user_id, startedMs: r.started_at.getTime(), endsMs: r.ends_at.getTime() } : null;
  }
  async getSubscription(businessId: string): Promise<Subscription | null> {
    const r = isUuid(businessId) ? await this.one("select * from subscriptions where business_id = $1", [businessId]) : null;
    return r ? { businessId: r.business_id, planKey: r.plan_key, paidUntilMs: r.paid_until.getTime(), cancelAtPeriodEnd: r.cancel_at_period_end, currency: r.currency } : null;
  }
  async upsertSubscription(s: Subscription) {
    await this.pool.query(`insert into subscriptions (business_id, plan_key, paid_until, cancel_at_period_end, currency) values ($1,$2,$3,$4,$5)
      on conflict (business_id) do update set plan_key = excluded.plan_key, paid_until = excluded.paid_until, cancel_at_period_end = excluded.cancel_at_period_end, currency = excluded.currency`, [s.businessId, s.planKey, d(s.paidUntilMs), s.cancelAtPeriodEnd, s.currency]);
  }
  async appendAudit(e: AuditEvent) {
    await this.pool.query("insert into audit_events (business_id, actor_user_id, action, target_id, created_at) values ($1,$2,$3,$4,$5)", [e.businessId && isUuid(e.businessId) ? e.businessId : null, e.actorUserId, e.action, e.targetId, d(e.atMs)]);
  }

  // ---- payout / transfer accounts ----
  async getPayoutAccount(businessId: string): Promise<PayoutAccountRecord | null> {
    const r = isUuid(businessId) ? await this.one("select * from business_payout_accounts where business_id = $1", [businessId]) : null;
    return r ? { businessId: r.business_id, provider: r.provider, providerRef: r.provider_ref, bankCode: r.bank_code, accountLast4: r.account_last4, accountName: r.account_name, verified: r.verified } : null;
  }
  async savePayoutAccount(a: PayoutAccountRecord) {
    await this.pool.query(`insert into business_payout_accounts (business_id, provider, provider_ref, bank_code, account_last4, account_name, verified) values ($1,$2,$3,$4,$5,$6,$7)
      on conflict (business_id) do update set provider=excluded.provider, provider_ref=excluded.provider_ref, bank_code=excluded.bank_code, account_last4=excluded.account_last4, account_name=excluded.account_name, verified=excluded.verified`,
      [a.businessId, a.provider, a.providerRef, a.bankCode, a.accountLast4, a.accountName, a.verified]);
  }
  async getTransferAccount(businessId: string): Promise<TransferAccountRecord | null> {
    const r = isUuid(businessId) ? await this.one("select * from business_transfer_accounts where business_id = $1", [businessId]) : null;
    return r ? { businessId: r.business_id, bankName: r.bank_name, accountName: r.account_name, accountNumberEncrypted: r.account_number_encrypted, accountLast4: r.account_last4 } : null;
  }
  async saveTransferAccount(a: TransferAccountRecord) {
    await this.pool.query(`insert into business_transfer_accounts (business_id, bank_name, account_name, account_number_encrypted, account_last4) values ($1,$2,$3,$4,$5)
      on conflict (business_id) do update set bank_name=excluded.bank_name, account_name=excluded.account_name, account_number_encrypted=excluded.account_number_encrypted, account_last4=excluded.account_last4`,
      [a.businessId, a.bankName, a.accountName, a.accountNumberEncrypted, a.accountLast4]);
  }

  // ---- catalogue ----
  async catalogue(businessId: string, ids: readonly string[]) {
    const out = new Map<string, CatalogueItem>();
    const valid = ids.filter(isUuid);
    if (!isUuid(businessId) || valid.length === 0) return out;
    const rows = (await this.pool.query("select * from products where business_id = $1 and id = any($2::uuid[]) and status = 'active'", [businessId, valid])).rows;
    for (const r of rows) out.set(r.id, { stock: r.stock_quantity, price: money(big(r.price_minor), r.currency), active: true, maxPerOrder: r.max_per_order, name: r.name, fulfilment: r.fulfilment, leadTimeHours: r.lead_time_hours });
    return out;
  }
  async insertProduct(p: ProductRecord) {
    return this.changed(`insert into products (id, business_id, short_id, slug, name, description, price_minor, currency, fulfilment, lead_time_hours, max_per_order, status, created_at, stock_quantity, compare_at_price_minor, promo_badge, gallery_asset_ids)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) on conflict (short_id) do nothing`,
      [p.id, p.businessId, p.shortId, p.slug, p.name, p.description, p.priceMinor.toString(), p.currency, p.fulfilment, p.leadTimeHours, p.maxPerOrder, p.status, d(p.createdAtMs), p.stockQuantity ?? null, p.compareAtPriceMinor ? p.compareAtPriceMinor.toString() : null, p.promoBadge ?? null, p.galleryAssetIds ? [...p.galleryAssetIds] : []]);
  }
  async getProduct(businessId: string, id: string) { return isUuid(id) && isUuid(businessId) ? (r => (r ? mProduct(r) : null))(await this.one("select * from products where id = $1 and business_id = $2", [id, businessId])) : null; }
  async patchProduct(businessId: string, id: string, patch: Partial<ProductRecord>) {
    const cols: Record<string, [string, (v: any) => unknown]> = {
      name: ["name", (v) => v], slug: ["slug", (v) => v], description: ["description", (v) => v], priceMinor: ["price_minor", (v) => v.toString()], stockQuantity: ["stock_quantity", (v) => v], imageAssetId: ["image_asset_id", (v) => v], fulfilment: ["fulfilment", (v) => v], leadTimeHours: ["lead_time_hours", (v) => v], maxPerOrder: ["max_per_order", (v) => v], status: ["status", (v) => v],
      compareAtPriceMinor: ["compare_at_price_minor", (v) => (v === null ? null : v.toString())], promoBadge: ["promo_badge", (v) => v], galleryAssetIds: ["gallery_asset_ids", (v) => [...v]],
    };
    const sets: string[] = [], vals: unknown[] = [id, businessId];
    for (const [k, v] of Object.entries(patch)) { const c = cols[k]; if (c) { vals.push(c[1](v)); sets.push(`${c[0]} = $${vals.length}`); } }
    return sets.length > 0 && isUuid(id) && isUuid(businessId) ? this.changed(`update products set ${sets.join(", ")} where id = $1 and business_id = $2`, vals) : false;
  }
  async listProducts(businessId: string, statuses: readonly ProductStatus[], limit: number, offset: number) {
    return isUuid(businessId) ? (await this.pool.query("select * from products where business_id = $1 and status = any($2::text[]) order by created_at desc limit $3 offset $4", [businessId, statuses, limit, offset])).rows.map(mProduct) : [];
  }
  async countProducts(businessId: string, statuses: readonly ProductStatus[]) { return isUuid(businessId) ? Number((await this.one("select count(*) as n from products where business_id = $1 and status = any($2::text[])", [businessId, statuses])).n) : 0; }
  async pauseNewestActiveProducts(businessId: string, keep: number) {
    const r = await this.pool.query(`update products set status = 'paused' where id in (select id from products where business_id = $1 and status = 'active' order by created_at asc offset $2)`, [businessId, keep]);
    return r.rowCount ?? 0;
  }
  async deleteDraftBusiness(businessId: string) {
    if (!isUuid(businessId)) return false;
    const r = await this.pool.query("update businesses set deleted_at = now(), status = 'archived' where id = $1 and status = 'draft'", [businessId]);
    return (r.rowCount ?? 0) > 0;
  }

  // ---- public reads ----
  async getPublicBusinessBySlug(slug: string) { const r = await this.one("select * from businesses where slug = $1 and status = 'active' and deleted_at is null", [slug]); return r ? mBusiness(r) : null; }
  async listPublicBusinesses(limit: number, offset: number, countryCode?: string, typeIds?: readonly string[]) {
    return (await this.pool.query("select * from businesses where status = 'active' and deleted_at is null and ($3::text is null or country_code = $3) and ($4::text[] is null or business_type_id = any($4)) order by published_at desc nulls last limit $1 offset $2", [limit, offset, countryCode ?? null, typeIds ? [...typeIds] : null])).rows.map(mBusiness);
  }
  async listPublicProducts(limit: number, offset: number = 0) {
    const bizOf = (r: any) => mBusiness({ ...r.biz, published_at: r.biz.published_at ? new Date(r.biz.published_at) : null });
    const rows = (await this.pool.query("select p.*, row_to_json(b) as biz from products p join businesses b on b.id = p.business_id where p.status = 'active' and b.status = 'active' and b.deleted_at is null order by p.created_at desc limit $1 offset $2", [limit, offset])).rows;
    return rows.map((r: any) => ({ product: mProduct(r), business: bizOf(r) }));
  }
  async searchPublic(needle: string, limit: number) {
    const like = `%${needle.replace(/[\\%_]/g, "\\$&")}%`;                                   // the search text is data: wildcard characters are escaped
    const bizOf = (r: any) => mBusiness({ ...r.biz, published_at: r.biz.published_at ? new Date(r.biz.published_at) : null });
    const [b, p, e] = await Promise.all([
      this.pool.query("select * from businesses where status = 'active' and deleted_at is null and name ilike $1 escape '\\' order by published_at desc nulls last limit $2", [like, limit]),
      this.pool.query("select p.*, row_to_json(b) as biz from products p join businesses b on b.id = p.business_id where p.status = 'active' and b.status = 'active' and b.deleted_at is null and (p.name ilike $1 escape '\\' or p.description ilike $1 escape '\\') order by p.created_at desc limit $2", [like, limit]),
      this.pool.query("select e.*, row_to_json(b) as biz from events e join businesses b on b.id = e.business_id where e.status = 'published' and e.starts_at > now() and b.status = 'active' and b.deleted_at is null and e.name ilike $1 escape '\\' order by e.starts_at limit $2", [like, limit]),
    ]);
    return { businesses: b.rows.map(mBusiness), products: p.rows.map((r: any) => ({ product: mProduct(r), business: bizOf(r) })), events: e.rows.map((r: any) => ({ event: mEvent(r), business: bizOf(r) })) };
  }
  async getPublicProductByShortId(shortId: string) {
    const r = await this.one("select p.*, row_to_json(b) as biz from products p join businesses b on b.id = p.business_id where p.short_id = $1 and p.status = 'active' and b.status = 'active' and b.deleted_at is null", [shortId]);
    if (!r) return null;
    const b = r.biz; // row_to_json yields ISO strings for timestamps
    return { product: mProduct(r), business: mBusiness({ ...b, published_at: b.published_at ? new Date(b.published_at) : null }) };
  }

  // ---- orders and payments ----
  async insertOrder(o: OrderRecord, items: readonly OrderItemRecord[], p: PaymentRecord, hash: Buffer | null, tokenExpiresMs: number) {
    await this.tx(async (c) => {
      let guestId: string | null = null;
      if (o.guest) { guestId = randomUUID(); await c.query("insert into guest_contacts (id, name, email, phone) values ($1,$2,$3,$4)", [guestId, o.guest.name, o.guest.email, o.guest.phone ?? null]); }
      await c.query(`insert into orders (id, business_id, user_id, guest_contact_id, kind, status, currency, total_minor, required_by, customer_note, refund_policy) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [o.id, o.businessId, o.userId, guestId, o.kind, o.status, o.currency, o.totalMinor.toString(), o.requiredByMs === null ? null : d(o.requiredByMs), o.note, JSON.stringify(o.refundPolicy)]);
      for (const i of items) {
        if (!Number.isInteger(i.quantity) || i.quantity <= 0) throw new Error("invalid_quantity");
        // Reserve stock in the same transaction. One atomic UPDATE per item: it only succeeds if enough is left (or stock isn't tracked).
        const r = await c.query("update products set stock_quantity = case when stock_quantity is null then null else stock_quantity - $3 end where id = $1 and business_id = $2 and (stock_quantity is null or stock_quantity >= $3)", [i.productId, o.businessId, i.quantity]);
        if (r.rowCount !== 1) throw new Error("out_of_stock");
        await c.query("insert into order_items (order_id, business_id, product_id, name_snapshot, unit_price_minor, quantity) values ($1,$2,$3,$4,$5,$6)", [o.id, o.businessId, i.productId, i.name, i.unitPriceMinor.toString(), i.quantity]);
      }
      await c.query(PAYMENT_INSERT, paymentParams(p));
      if (hash) await c.query("insert into guest_access_tokens (token_hash, subject_id, business_id, expires_at) values ($1,$2,$3,$4)", [hash, o.id, o.businessId, d(tokenExpiresMs)]);
    });
  }
  async insertPayment(p: PaymentRecord) { await this.pool.query(PAYMENT_INSERT, paymentParams(p)); }
  async releaseOrderStock(businessId: string, orderId: string) { await releaseStock(this.pool, businessId, orderId); }
  async getOrder(businessId: string, orderId: string) { return isUuid(orderId) && isUuid(businessId) ? (r => (r ? mOrder(r) : null))(await this.one(`${ORDER_SELECT} where o.id = $1 and o.business_id = $2`, [orderId, businessId])) : null; }
  async listOrders(businessId: string, limit: number, offset: number) { return isUuid(businessId) ? (await this.pool.query(`${ORDER_SELECT} where o.business_id = $1 order by o.created_at desc limit $2 offset $3`, [businessId, limit, offset])).rows.map(mOrder) : []; }
  async listOrdersForUser(userId: string, limit: number) { return (await this.pool.query(`${ORDER_SELECT} where o.user_id = $1 order by o.created_at desc limit $2`, [userId, limit])).rows.map(mOrder); }
  async getOrderItems(businessId: string, orderId: string): Promise<OrderItemRecord[]> {
    return isUuid(orderId) && isUuid(businessId) ? (await this.pool.query("select * from order_items where order_id = $1 and business_id = $2 order by id", [orderId, businessId])).rows.map((r) => ({ productId: r.product_id, name: r.name_snapshot, unitPriceMinor: big(r.unit_price_minor), quantity: r.quantity })) : [];
  }
  async setOrderStatus(businessId: string, orderId: string, from: OrderStatus, to: OrderStatus) { return isUuid(orderId) && isUuid(businessId) && (await this.changed("update orders set status = $4 where id = $1 and business_id = $2 and status = $3", [orderId, businessId, from, to])); }
  async getPayment(businessId: string, paymentId: string) { return isUuid(paymentId) && isUuid(businessId) ? (r => (r ? mPayment(r) : null))(await this.one("select * from payments where id = $1 and business_id = $2", [paymentId, businessId])) : null; }
  async getPaymentForOrder(businessId: string, subjectId: string) { return isUuid(subjectId) && isUuid(businessId) ? (r => (r ? mPayment(r) : null))(await this.one("select * from payments where subject_id = $1 and business_id = $2 order by created_at desc limit 1", [subjectId, businessId])) : null; }
  async setPaymentStatus(businessId: string, paymentId: string, from: PaymentStatus, to: PaymentStatus) { return isUuid(paymentId) && isUuid(businessId) && (await this.changed("update payments set status = $4, updated_at = now() where id = $1 and business_id = $2 and status = $3", [paymentId, businessId, from, to])); }
  async attachProviderReference(businessId: string, paymentId: string, provider: string, ref: string) {
    return isUuid(paymentId) && isUuid(businessId) && (await this.changed("update payments set status = 'pending', provider = $3, provider_reference = $4, updated_at = now() where id = $1 and business_id = $2 and status = 'created' and method = 'provider'", [paymentId, businessId, provider, ref]));
  }
  async findPaymentByProviderRef(provider: string, ref: string) { const r = await this.one("select * from payments where provider = $1 and provider_reference = $2", [provider, ref]); return r ? mPayment(r) : null; }
  async recordWebhook(provider: string, eventId: string) { return this.changed("insert into webhook_events (provider, event_id) values ($1,$2) on conflict do nothing", [provider, eventId]); }
  async forgetWebhook(provider: string, eventId: string) { await this.pool.query("delete from webhook_events where provider = $1 and event_id = $2", [provider, eventId]); }
  async findGuestToken(hash: Buffer) {
    const r = await this.one("select * from guest_access_tokens where token_hash = $1", [hash]);
    return r ? { orderId: r.subject_id, businessId: r.business_id, expiresAtMs: r.expires_at.getTime(), revoked: r.revoked_at !== null } : null;
  }
  async insertGuestToken(hash: Buffer, subjectId: string, businessId: string, expiresAtMs: number) { await this.pool.query("insert into guest_access_tokens (token_hash, subject_id, business_id, expires_at) values ($1,$2,$3,$4)", [hash, subjectId, businessId, d(expiresAtMs)]); }

  // ---- refunds ----
  async insertRefundRequest(r: RefundRequestRecord) {
    await this.pool.query("insert into refund_requests (id, business_id, payment_id, subject_kind, subject_id, amount_minor, currency, status, reason, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [r.id, r.businessId, r.paymentId, r.subjectKind, r.subjectId, r.amountMinor.toString(), r.currency, r.status, r.reason, d(r.createdAtMs)]);
  }
  async getRefundRequest(businessId: string, id: string) { return isUuid(id) && isUuid(businessId) ? (r => (r ? mRefund(r) : null))(await this.one("select * from refund_requests where id = $1 and business_id = $2", [id, businessId])) : null; }
  async setRefundStatus(businessId: string, id: string, from: RefundRequestRecord["status"], to: RefundRequestRecord["status"], nowMs: number) { return isUuid(id) && isUuid(businessId) && (await this.changed("update refund_requests set status = $4, resolved_at = $5 where id = $1 and business_id = $2 and status = $3", [id, businessId, from, to, d(nowMs)])); }
  async listRefundRequests(businessId: string, status?: RefundRequestRecord["status"]) { return isUuid(businessId) ? (await this.pool.query("select * from refund_requests where business_id = $1 and ($2::text is null or status = $2) order by created_at desc", [businessId, status ?? null])).rows.map(mRefund) : []; }

  // ---- bookings ----
  async getResourceGroup(businessId: string, id: string): Promise<ResourceGroupRecord | null> {
    const r = isUuid(id) && isUuid(businessId) ? await this.one("select * from resource_groups where id = $1 and business_id = $2", [id, businessId]) : null;
    return r ? mGroup(r) : null;
  }
  async resourcesInGroup(businessId: string, groupId: string) { return isUuid(groupId) && isUuid(businessId) ? (await this.pool.query("select id, label from resources where group_id = $1 and business_id = $2 and status = 'active' order by label", [groupId, businessId])).rows : []; }
  async activeBookingIntervals(businessId: string, resourceId: string, nowMs: number): Promise<TimeInterval[]> {
    if (!isUuid(resourceId) || !isUuid(businessId)) return [];
    const rows = (await this.pool.query(`select lower(during) as s, upper(during) as e from bookings where business_id = $1 and resource_id = $2 and (status in ('confirmed','checked_in') or (status = 'held' and hold_expires_at > $3))`, [businessId, resourceId, d(nowMs)])).rows;
    return rows.map((r) => ({ start: r.s.getTime(), end: r.e.getTime() }));
  }
  async insertBookingIfFree(b: BookingRecord, p: PaymentRecord | null, bufferMs: number, hash: Buffer | null, tokenExpiresMs: number, nowMs: number) {
    try {
      return await this.tx(async (c) => {
        await c.query("update bookings set status = 'expired' where resource_id = $1 and status = 'held' and hold_expires_at <= $2", [b.resourceId, d(nowMs)]);   // lapsed holds must not block
        let guestId: string | null = null;
        if (b.guest) { guestId = randomUUID(); await c.query("insert into guest_contacts (id, name, email, phone) values ($1,$2,$3,$4)", [guestId, b.guest.name, b.guest.email, b.guest.phone ?? null]); }
        if (p) await c.query(PAYMENT_INSERT, paymentParams(p));
        await c.query(`insert into bookings (id, business_id, resource_id, group_id, user_id, guest_contact_id, during, blocked, status, hold_expires_at, payment_id, refund_policy)
          values ($1,$2,$3,$4,$5,$6, tstzrange($7::timestamptz, $8::timestamptz, '[)'), tstzrange($7::timestamptz, $9::timestamptz, '[)'), $10, $11, $12, $13)`,
          [b.id, b.businessId, b.resourceId, b.groupId, b.userId, guestId, d(b.startMs), d(b.endMs), d(b.endMs + bufferMs), b.status, b.holdExpiresMs === null ? null : d(b.holdExpiresMs), b.paymentId, JSON.stringify(b.refundPolicy)]);
        if (hash) await c.query("insert into guest_access_tokens (token_hash, subject_id, business_id, expires_at) values ($1,$2,$3,$4)", [hash, b.id, b.businessId, d(tokenExpiresMs)]);
        return true;
      });
    } catch (e) {
      if ((e as { code?: string }).code === "23P01") return false;       // exclusion_violation: someone else holds that slot
      throw e;
    }
  }
  async getBooking(businessId: string, id: string) { return isUuid(id) && isUuid(businessId) ? (r => (r ? mBooking(r) : null))(await this.one(`${BOOKING_SELECT} where b.id = $1 and b.business_id = $2`, [id, businessId])) : null; }
  async listBookings(businessId: string, fromMs: number, toMs: number) { return isUuid(businessId) ? (await this.pool.query(`${BOOKING_SELECT} where b.business_id = $1 and b.during && tstzrange($2::timestamptz, $3::timestamptz, '[)') order by lower(b.during)`, [businessId, d(fromMs), d(toMs)])).rows.map(mBooking) : []; }
  async listBookingsForUser(userId: string, limit: number) { return (await this.pool.query(`${BOOKING_SELECT} where b.user_id = $1 order by lower(b.during) desc limit $2`, [userId, limit])).rows.map(mBooking); }
  async setBookingStatus(businessId: string, id: string, from: BookingStatus, to: BookingStatus) { return isUuid(id) && isUuid(businessId) && (await this.changed("update bookings set status = $4 where id = $1 and business_id = $2 and status = $3", [id, businessId, from, to])); }
  async setBookingHold(businessId: string, id: string, holdExpiresMs: number) { return isUuid(id) && isUuid(businessId) && (await this.changed("update bookings set hold_expires_at = $3 where id = $1 and business_id = $2 and status = 'held'", [id, businessId, d(holdExpiresMs)])); }
  async expireHeldBookings(nowMs: number) { return (await this.pool.query("update bookings set status = 'expired' where status = 'held' and hold_expires_at <= $1", [d(nowMs)])).rowCount ?? 0; }
  async expireHeldTickets(nowMs: number) { return (await this.pool.query("update tickets set status = 'cancelled', hold_expires_at = null where status = 'held' and hold_expires_at <= $1", [d(nowMs)])).rowCount ?? 0; }
  async expireStaleTransfers(nowMs: number) {
    return this.tx(async (c) => {
      const rows = (await c.query("update payments set status = 'expired', updated_at = now() where method = 'bank_transfer' and status = 'created' and expires_at <= $1 returning purpose, subject_id, business_id", [d(nowMs)])).rows;
      for (const r of rows) {
        if (r.purpose === "booking") await c.query("update bookings set status = 'expired' where id = $1 and business_id = $2 and status = 'held'", [r.subject_id, r.business_id]);
        else if (r.purpose === "order") {
          const cancelled = await c.query("update orders set status = 'cancelled' where id = $1 and business_id = $2 and status = 'awaiting_payment'", [r.subject_id, r.business_id]);
          if (cancelled.rowCount === 1) await releaseStock(c, r.business_id, r.subject_id);
        }
      }
      return rows.length;
    });
  }

  // ---- tickets ----
  async getTicketType(businessId: string, id: string): Promise<TicketTypeRecord | null> {
    const r = isUuid(id) && isUuid(businessId) ? await this.one("select tt.*, e.name as event_name, (e.status = 'published') as published from ticket_types tt join events e on e.id = tt.event_id and e.business_id = tt.business_id where tt.id = $1 and tt.business_id = $2", [id, businessId]) : null;
    return r ? { id: r.id, eventId: r.event_id, businessId: r.business_id, eventName: r.event_name, priceMinor: big(r.price_minor), currency: r.currency, capacity: r.capacity, salesStartMs: ms(r.sales_start), salesEndMs: ms(r.sales_end), eventPublished: r.published } : null;
  }
  private async live(c: Db, businessId: string, typeId: string, nowMs: number): Promise<number> {
    return Number((await c.query("select count(*) as n from tickets where business_id = $1 and ticket_type_id = $2 and (status in ('valid','used') or (status = 'held' and hold_expires_at > $3))", [businessId, typeId, d(nowMs)])).rows[0].n);
  }
  async countLiveTickets(businessId: string, typeId: string, nowMs: number) { return isUuid(typeId) && isUuid(businessId) ? this.live(this.pool, businessId, typeId, nowMs) : 0; }
  async insertTicketsWithinCapacity(businessId: string, typeId: string, tickets: readonly TicketRecord[], payment: PaymentRecord | null, nowMs: number) {
    if (!isUuid(typeId) || !isUuid(businessId)) return false;
    return this.tx(async (c) => {
      const t = (await c.query("select capacity from ticket_types where id = $1 and business_id = $2 for update", [typeId, businessId])).rows[0];   // serialises concurrent buyers
      if (!t || (await this.live(c, businessId, typeId, nowMs)) + tickets.length > t.capacity) return false;
      if (payment) await c.query(PAYMENT_INSERT, paymentParams(payment));
      for (const k of tickets) await c.query(`insert into tickets (id, business_id, event_id, ticket_type_id, payment_id, holder_name, holder_email, status, hold_expires_at) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [k.id, k.businessId, k.eventId, k.ticketTypeId, k.paymentId, k.holderName, k.holderEmail, k.status, k.holdExpiresMs === null ? null : d(k.holdExpiresMs)]);
      return true;
    });
  }
  async setTicketsForPayment(businessId: string, paymentId: string, from: StoredTicketStatus, to: StoredTicketStatus, nowMs: number) {
    if (!isUuid(paymentId) || !isUuid(businessId)) return 0;
    const guard = from === "held" && to === "valid" ? " and hold_expires_at > $5" : "";       // an expired hold is not fulfilled
    const params: unknown[] = [businessId, paymentId, from, to]; if (guard) params.push(d(nowMs));
    return (await this.pool.query(`update tickets set status = $4, hold_expires_at = null where business_id = $1 and payment_id = $2 and status = $3${guard}`, params)).rowCount ?? 0;
  }
  async getTicket(businessId: string, ticketId: string) { return isUuid(ticketId) && isUuid(businessId) ? (r => (r ? mTicket(r) : null))(await this.one("select * from tickets where id = $1 and business_id = $2", [ticketId, businessId])) : null; }
  async ticketsForPayment(businessId: string, paymentId: string) { return isUuid(paymentId) && isUuid(businessId) ? (await this.pool.query("select * from tickets where payment_id = $1 and business_id = $2", [paymentId, businessId])).rows.map(mTicket) : []; }
  async admitTicket(businessId: string, ticketId: string, byUserId: string, nowMs: number) { return isUuid(ticketId) && isUuid(businessId) && (await this.changed("update tickets set status = 'used', used_at = $4, checked_in_by = $3 where id = $2 and business_id = $1 and status = 'valid'", [businessId, ticketId, byUserId, d(nowMs)])); }

  // ---- notifications ----
  async enqueueNotification(n: OutboxRecord) {
    return this.changed("insert into notification_outbox (id, dedupe_key, user_id, email, kind, email_class, vars, send_after) values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (dedupe_key) do nothing", [n.id, n.dedupeKey, n.userId, n.email, n.kind, n.klass, JSON.stringify(n.vars), d(n.sendAfterMs)]);
  }
  /** Claims due rows by pushing their send time forward 5 minutes (a lease), so two workers never send the same message. */
  async dueNotifications(nowMs: number, limit: number) {
    const rows = (await this.pool.query(`update notification_outbox set send_after = $1::timestamptz + interval '5 minutes' where id in
      (select id from notification_outbox where sent_at is null and send_after <= $1 order by send_after limit $2 for update skip locked) returning *`, [d(nowMs), limit])).rows;
    return rows.map(mOutbox);
  }
  async markNotificationSent(id: string, nowMs: number) { await this.pool.query("update notification_outbox set sent_at = $2, vars = '{}' where id = $1", [id, d(nowMs)]); }
  async markNotificationFailed(id: string, attempts: number, nextAtMs: number | null, error: string) { await this.pool.query("update notification_outbox set attempts = $2, send_after = $3, last_error = $4 where id = $1", [id, attempts, nextAtMs === null ? "infinity" : d(nextAtMs), error]); }
  async countEmailsSentSince(sinceMs: number) { return Number((await this.one("select count(*) as n from notification_outbox where sent_at >= $1 and email is not null", [d(sinceMs)])).n); }
  async pushTokensForUsers(userIds: readonly string[]): Promise<PushToken[]> { return (await this.pool.query("select user_id, token, platform from push_tokens where user_id = any($1::text[])", [userIds])).rows.map((r) => ({ userId: r.user_id, token: r.token, platform: r.platform })); }
  async savePushToken(t: PushToken) { await this.pool.query("insert into push_tokens (token, user_id, platform) values ($1,$2,$3) on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform", [t.token, t.userId, t.platform]); }
  async removePushTokens(tokens: readonly string[]) { await this.pool.query("delete from push_tokens where token = any($1::text[])", [tokens]); }

  // ---- events, bookable resources, limits ----
  async insertEvent(e: EventRecord) {
    return this.changed(`insert into events (id, business_id, short_id, slug, name, description, venue, starts_at, ends_at, status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict (short_id) do nothing`,
      [e.id, e.businessId, e.shortId, e.slug, e.name, e.description, e.venue, d(e.startsAtMs), e.endsAtMs === null ? null : d(e.endsAtMs), e.status]);
  }
  async getEvent(businessId: string, id: string) { return isUuid(id) && isUuid(businessId) ? (r => (r ? mEvent(r) : null))(await this.one("select * from events where id = $1 and business_id = $2", [id, businessId])) : null; }
  async patchEvent(businessId: string, id: string, patch: Partial<EventRecord>) {
    const cols: Record<string, [string, (v: any) => unknown]> = { name: ["name", (v) => v], slug: ["slug", (v) => v], description: ["description", (v) => v], venue: ["venue", (v) => v], startsAtMs: ["starts_at", (v) => d(v)], endsAtMs: ["ends_at", (v) => (v === null ? null : d(v))], status: ["status", (v) => v], coverAssetId: ["cover_asset_id", (v) => v] };
    const sets: string[] = [], vals: unknown[] = [id, businessId];
    for (const [k, v] of Object.entries(patch)) { const c = cols[k]; if (c) { vals.push(c[1](v)); sets.push(`${c[0]} = $${vals.length}`); } }
    return sets.length > 0 && isUuid(id) && isUuid(businessId) ? this.changed(`update events set ${sets.join(", ")} where id = $1 and business_id = $2`, vals) : false;
  }
  async listEvents(businessId: string, limit: number) { return isUuid(businessId) ? (await this.pool.query("select * from events where business_id = $1 order by starts_at desc limit $2", [businessId, limit])).rows.map(mEvent) : []; }
  async insertTicketType(t: TicketTypeFull) {
    await this.pool.query("insert into ticket_types (id, event_id, business_id, name, price_minor, currency, capacity, sales_start, sales_end) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [t.id, t.eventId, t.businessId, t.name, t.priceMinor.toString(), t.currency, t.capacity, t.salesStartMs === null ? null : d(t.salesStartMs), t.salesEndMs === null ? null : d(t.salesEndMs)]);
  }
  async listTicketTypes(businessId: string, eventId: string) { return isUuid(eventId) && isUuid(businessId) ? (await this.pool.query("select * from ticket_types where business_id = $1 and event_id = $2 order by price_minor, name", [businessId, eventId])).rows.map(mTicketType) : []; }
  async getPublicEventByShortId(shortId: string) {
    const r = await this.one("select e.*, row_to_json(b) as biz from events e join businesses b on b.id = e.business_id where e.short_id = $1 and e.status = 'published' and b.status = 'active' and b.deleted_at is null", [shortId]);
    if (!r) return null;
    return { event: mEvent(r), business: mBusiness({ ...r.biz, published_at: r.biz.published_at ? new Date(r.biz.published_at) : null }), ticketTypes: await this.listTicketTypes(r.business_id, r.id) };
  }
  async listPublicEvents(limit: number) {
    const rows = (await this.pool.query("select e.*, row_to_json(b) as biz from events e join businesses b on b.id = e.business_id where e.status = 'published' and b.status = 'active' and b.deleted_at is null and e.starts_at > now() order by e.starts_at limit $1", [limit])).rows;
    return rows.map((r) => ({ event: mEvent(r), business: mBusiness({ ...r.biz, published_at: r.biz.published_at ? new Date(r.biz.published_at) : null }) }));
  }
  async findTicketById(ticketId: string) { return isUuid(ticketId) ? (r => (r ? mTicket(r) : null))(await this.one("select * from tickets where id = $1", [ticketId])) : null; }
  async countOrdersSince(businessId: string, sinceMs: number) { return isUuid(businessId) ? Number((await this.one("select count(*) as n from orders where business_id = $1 and created_at >= $2 and status <> 'cancelled'", [businessId, d(sinceMs)])).n) : 0; }
  async insertResourceGroup(g: ResourceGroupRecord & { shortId: string; slug: string }, resources: readonly { id: string; label: string }[]) {
    try {
      await this.tx(async (c) => {
        const p = g.policy;
        await c.query(`insert into resource_groups (id, business_id, short_id, slug, name, policy_kind, timezone, min_duration_minutes, max_duration_minutes, granularity_minutes, buffer_minutes, min_notice_minutes, max_advance_minutes, price_minor, price_unit, currency, status)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
          [g.id, g.businessId, g.shortId, g.slug, g.name, p.kind, g.timezone, p.minDurationMs / MIN, p.maxDurationMs === null ? null : p.maxDurationMs / MIN, p.granularityMs / MIN, p.bufferMs / MIN, p.minNoticeMs / MIN, p.maxAdvanceMs === null ? null : p.maxAdvanceMs / MIN, g.priceMinor.toString(), g.priceUnit, g.currency, g.active ? "active" : "draft"]);
        for (const r of resources) await c.query("insert into resources (id, business_id, group_id, label) values ($1,$2,$3,$4)", [r.id, g.businessId, g.id, r.label]);
      });
      return true;
    } catch (e) {
      if ((e as { code?: string; constraint?: string }).code === "23505" && (e as { constraint?: string }).constraint?.includes("short_id")) return false;   // random short id collided: caller retries
      throw e;
    }
  }
  async listResourceGroups(businessId: string) { return isUuid(businessId) ? (await this.pool.query("select * from resource_groups where business_id = $1 order by name", [businessId])).rows.map(mGroup) : []; }
  async getPublicResourceGroupByShortId(shortId: string) {
    const r = await this.one("select g.*, row_to_json(b) as biz from resource_groups g join businesses b on b.id = g.business_id where g.short_id = $1 and g.status = 'active' and b.status = 'active' and b.deleted_at is null", [shortId]);
    return r ? { group: mGroup(r), business: mBusiness({ ...r.biz, published_at: r.biz.published_at ? new Date(r.biz.published_at) : null }) } : null;
  }

  // ---- messaging ----
  async getOrCreateConversation(c: ConversationRecord) {
    await this.pool.query("insert into conversations (id, business_id, customer_user_id, topic, created_at, last_message_at) values ($1,$2,$3,$4,$5,$5) on conflict (business_id, customer_user_id) do nothing", [c.id, c.businessId, c.customerUserId, c.topic, d(c.createdAtMs)]);
    return mConversation(await this.one("select * from conversations where business_id = $1 and customer_user_id = $2", [c.businessId, c.customerUserId]));
  }
  async getConversation(businessId: string, id: string) { return isUuid(id) && isUuid(businessId) ? (r => (r ? mConversation(r) : null))(await this.one("select * from conversations where id = $1 and business_id = $2", [id, businessId])) : null; }
  async listConversationsForBusiness(businessId: string, limit: number) { return isUuid(businessId) ? (await this.pool.query("select * from conversations where business_id = $1 order by last_message_at desc limit $2", [businessId, limit])).rows.map(mConversation) : []; }
  async listConversationsForCustomer(userId: string, limit: number) { return (await this.pool.query("select * from conversations where customer_user_id = $1 order by last_message_at desc limit $2", [userId, limit])).rows.map(mConversation); }
  async insertMessage(m: MessageRecord) {
    if (!isUuid(m.id) || !isUuid(m.conversationId) || !isUuid(m.businessId)) throw new Error("invalid_id");
    await this.tx(async (c) => {
      const r = await c.query(`update conversations set last_message_at = $3,
        business_unread = business_unread + (case when $4 = 'customer' then 1 else 0 end), customer_unread = customer_unread + (case when $4 = 'business' then 1 else 0 end)
        where id = $1 and business_id = $2`, [m.conversationId, m.businessId, d(m.createdAtMs), m.senderKind]);
      if (r.rowCount !== 1) throw new Error("conversation_not_found");
      await c.query("insert into messages (id, conversation_id, business_id, sender_kind, sender_user_id, body, created_at) values ($1,$2,$3,$4,$5,$6,$7)", [m.id, m.conversationId, m.businessId, m.senderKind, m.senderUserId, m.body, d(m.createdAtMs)]);
    });
  }
  async listMessages(businessId: string, conversationId: string, limit: number) {
    return isUuid(conversationId) && isUuid(businessId) ? (await this.pool.query("select * from (select * from messages where business_id = $1 and conversation_id = $2 order by created_at desc, id desc limit $3) t order by created_at asc, id asc", [businessId, conversationId, limit])).rows.map(mMessage) : [];
  }
  async markConversationRead(businessId: string, conversationId: string, side: "business" | "customer") {
    if (!isUuid(conversationId) || !isUuid(businessId)) return;
    await this.pool.query(`update conversations set ${side === "business" ? "business_unread" : "customer_unread"} = 0 where id = $1 and business_id = $2`, [conversationId, businessId]);
  }

  // ---- media ----
  async insertMediaAsset(m: MediaAssetRecord) {
    await this.pool.query("insert into media_assets (id, business_id, owner_user_id, purpose, status, declared_type, declared_bytes, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8)", [m.id, m.businessId, m.ownerUserId, m.purpose, m.status, m.declaredType, m.declaredBytes, d(m.createdAtMs)]);
  }
  async getMediaAsset(businessId: string, id: string): Promise<MediaAssetRecord | null> {
    const r = isUuid(id) && isUuid(businessId) ? await this.one("select * from media_assets where id = $1 and business_id = $2", [id, businessId]) : null;
    return r ? { id: r.id, businessId: r.business_id, ownerUserId: r.owner_user_id, purpose: r.purpose, status: r.status, declaredType: r.declared_type, declaredBytes: Number(r.declared_bytes), detectedType: r.detected_type, width: r.width, height: r.height, variants: r.variants, createdAtMs: r.created_at.getTime() } : null;
  }
  async setMediaStatus(businessId: string, id: string, from: MediaStatus, to: MediaStatus) { return isUuid(id) && isUuid(businessId) && (await this.changed("update media_assets set status = $4 where id = $1 and business_id = $2 and status = $3", [id, businessId, from, to])); }
  async finishMediaAsset(businessId: string, id: string, f: { detectedType: string; width: number; height: number; variants: readonly string[] }) {
    await this.pool.query("update media_assets set status = 'ready', detected_type = $3, width = $4, height = $5, variants = $6 where id = $1 and business_id = $2", [id, businessId, f.detectedType, f.width, f.height, [...f.variants]]);
  }
  async countMediaAssets(businessId: string) { return isUuid(businessId) ? Number((await this.one("select count(*) as n from media_assets where business_id = $1", [businessId])).n) : 0; }

  // ---- mobility and rides ----
  async upsertOperator(op: MobilityOperatorRecord): Promise<void> {
    if (!isUuid(op.id) || !isUuid(op.businessId)) throw new Error("invalid_id");
    await this.pool.query(
      `insert into mobility_operators (id, business_id, user_id, name, phone, kind, status, rating, completed_trips, current_lat, current_lng, current_address, vehicle, is_verified, languages, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now())
       on conflict (user_id) do update set
         name = excluded.name, phone = excluded.phone, kind = excluded.kind, status = excluded.status,
         rating = excluded.rating, completed_trips = excluded.completed_trips, current_lat = excluded.current_lat,
         current_lng = excluded.current_lng, current_address = excluded.current_address, vehicle = excluded.vehicle,
         is_verified = excluded.is_verified, languages = excluded.languages, updated_at = now()`,
      [op.id, op.businessId, op.userId, op.name, op.phone, op.kind, op.status, op.rating, op.completedTrips,
       op.currentLocation?.lat ?? null, op.currentLocation?.lng ?? null, op.currentLocation?.address ?? null,
       JSON.stringify(op.vehicle), op.isVerified, op.languages]
    );
  }

  async getOperator(userId: string): Promise<MobilityOperatorRecord | null> {
    const r = await this.one("select * from mobility_operators where user_id = $1", [userId]);
    return r ? mOperator(r) : null;
  }

  async listNearbyOperators(lat: number, lng: number, radiusKm: number, kind?: OperatorKind): Promise<MobilityOperatorRecord[]> {
    const params: unknown[] = [];
    let sql = "select * from mobility_operators where status = 'available' and current_lat is not null and current_lng is not null";
    if (kind) {
      params.push(kind);
      sql += ` and kind = $${params.length}`;
    }
    const res = await this.pool.query(sql, params);
    return res.rows
      .map(mOperator)
      .filter((o) => {
        if (!o.currentLocation) return false;
        const dist = estimateDistanceKm({ lat, lng }, o.currentLocation);
        return dist <= radiusKm;
      })
      .sort((a, b) => b.rating - a.rating);
  }

  async insertRide(r: RideRecord): Promise<void> {
    if (!isUuid(r.id) || !isUuid(r.businessId)) throw new Error("invalid_id");
    const jsonCounterOffers = JSON.stringify(r.counterOffers.map((c) => ({ ...c, counterFareMinor: c.counterFareMinor.toString() })));
    await this.pool.query(
      `insert into rides (id, business_id, customer_user_id, customer_name, customer_phone, customer_email, operator_user_id, vehicle_kind,
        pickup_lat, pickup_lng, pickup_address, dest_lat, dest_lng, dest_address, distance_km, customer_offer_minor, currency,
        agreed_fare_minor, counter_offers, status, scheduled_for, delivery_order_id, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
      [r.id, r.businessId, r.customerUserId, r.customerContact.name, r.customerContact.phone, r.customerContact.email ?? null,
       r.operatorUserId, r.vehicleKind, r.pickup.lat, r.pickup.lng, r.pickup.address, r.destination.lat, r.destination.lng,
       r.destination.address, r.distanceKm, r.customerOfferMinor.toString(), r.currency,
       r.agreedFareMinor != null ? r.agreedFareMinor.toString() : null, jsonCounterOffers, r.status,
       r.scheduledForMs ? d(r.scheduledForMs) : null, r.deliveryOrderId, d(r.createdAtMs), d(r.updatedAtMs)]
    );
  }

  async getRide(id: string): Promise<RideRecord | null> {
    if (!isUuid(id)) return null;
    const r = await this.one("select * from rides where id = $1", [id]);
    return r ? mRide(r) : null;
  }

  async setRideStatus(id: string, from: RideStatus, to: RideStatus, patch?: Partial<RideRecord>): Promise<boolean> {
    if (!isUuid(id)) return false;
    let sql = "update rides set status = $3, updated_at = now()";
    const params: unknown[] = [id, from, to];
    if (patch?.operatorUserId !== undefined) {
      params.push(patch.operatorUserId);
      sql += `, operator_user_id = $${params.length}`;
    }
    if (patch?.agreedFareMinor !== undefined) {
      params.push(patch.agreedFareMinor !== null ? patch.agreedFareMinor.toString() : null);
      sql += `, agreed_fare_minor = $${params.length}`;
    }
    sql += " where id = $1 and status = $2";
    return this.changed(sql, params);
  }

  async updateRideCounterOffer(rideId: string, offer: CounterOffer): Promise<boolean> {
    if (!isUuid(rideId)) return false;
    const existing = await this.getRide(rideId);
    if (!existing) return false;
    const serializedOffer = { ...offer, counterFareMinor: offer.counterFareMinor.toString() };
    const counterOffers = [...(existing.counterOffers.map((c) => ({ ...c, counterFareMinor: c.counterFareMinor.toString() }))), serializedOffer];
    return this.changed(
      "update rides set counter_offers = $2, status = 'counter_offered', updated_at = now() where id = $1 and status in ('requested', 'counter_offered')",
      [rideId, JSON.stringify(counterOffers)]
    );
  }

  async listRidesForCustomer(customerUserId: string, limit: number): Promise<RideRecord[]> {
    const res = await this.pool.query("select * from rides where customer_user_id = $1 order by created_at desc limit $2", [customerUserId, limit]);
    return res.rows.map(mRide);
  }

  async listRidesForOperator(operatorUserId: string, limit: number): Promise<RideRecord[]> {
    const res = await this.pool.query("select * from rides where operator_user_id = $1 order by created_at desc limit $2", [operatorUserId, limit]);
    return res.rows.map(mRide);
  }

  async saveFavoriteRider(customerUserId: string, operatorUserId: string): Promise<void> {
    await this.pool.query("insert into favorite_riders (customer_user_id, operator_user_id) values ($1, $2) on conflict do nothing", [customerUserId, operatorUserId]);
  }

  async listFavoriteRiders(customerUserId: string): Promise<MobilityOperatorRecord[]> {
    const res = await this.pool.query(
      `select o.* from mobility_operators o
       join favorite_riders f on f.operator_user_id = o.user_id
       where f.customer_user_id = $1 order by o.rating desc`,
      [customerUserId]
    );
    return res.rows.map(mOperator);
  }

  // ---- order usage ledger ----
  async recordCompletedOrder(businessId: string, orderId: string, amountMinor: bigint, feeMinor: bigint, atMs: number): Promise<void> {
    if (!isUuid(businessId) || !isUuid(orderId)) throw new Error("invalid_id");
    await this.pool.query(
      `insert into order_usage_ledger (id, business_id, order_id, amount_minor, fee_minor, completed_at)
       values ($1, $2, $3, $4, $5, $6) on conflict (order_id) do nothing`,
      [randomUUID(), businessId, orderId, amountMinor.toString(), feeMinor.toString(), d(atMs)]
    );
  }

  async countCompletedOrdersSince(businessId: string, sinceMs: number): Promise<number> {
    if (!isUuid(businessId)) return 0;
    const r = await this.one("select count(*) as n from order_usage_ledger where business_id = $1 and completed_at >= $2", [businessId, d(sinceMs)]);
    return r ? Number(r.n) : 0;
  }

  // ---- escrow ----
  async insertEscrowRecord(e: EscrowRecord): Promise<void> {
    if (!isUuid(e.orderId) || !isUuid(e.businessId)) throw new Error("invalid_id");
    await this.pool.query(
      `insert into escrow_records (order_id, business_id, buyer_user_id, amount_minor, currency, status, release_pin_hash, qr_secret_hash, held_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [e.orderId, e.businessId, e.buyerUserId, e.amountMinor.toString(), e.currency, e.status, e.releasePinHash, e.qrSecretHash, d(e.heldAtMs)]
    );
  }

  async getEscrowRecord(orderId: string): Promise<EscrowRecord | null> {
    if (!isUuid(orderId)) return null;
    const r = await this.one("select * from escrow_records where order_id = $1", [orderId]);
    return r ? mEscrow(r) : null;
  }

  async setEscrowStatus(orderId: string, from: EscrowStatus, to: EscrowStatus, patch?: Partial<EscrowRecord>): Promise<boolean> {
    if (!isUuid(orderId)) return false;
    let sql = "update escrow_records set status = $3";
    const params: unknown[] = [orderId, from, to];
    if (to === "released") {
      sql += ", released_at = now()";
    } else if (to === "disputed") {
      sql += `, disputed_at = now(), dispute_reason = $${params.length + 1}`;
      params.push(patch?.disputeReason ?? null);
    }
    sql += " where order_id = $1 and status = $2";
    return this.changed(sql, params);
  }

  // ---- group carts ----
  async insertGroupCart(g: GroupCartSession): Promise<void> {
    if (!isUuid(g.id) || !isUuid(g.businessId)) throw new Error("invalid_id");
    const jsonItems = JSON.stringify(g.items.map((it) => ({ ...it, unitPriceMinor: it.unitPriceMinor.toString() })));
    const jsonContributions = JSON.stringify(g.contributions.map((c) => ({ ...c, amountMinor: c.amountMinor.toString() })));
    await this.pool.query(
      `insert into group_cart_sessions (id, short_code, business_id, host_user_id, host_name, host_email, split_kind, target_amount_minor, funded_amount_minor, currency, status, items, contributions, created_at, expires_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [g.id, g.shortCode, g.businessId, g.hostUserId, g.hostName, g.hostEmail, g.splitKind, g.targetAmountMinor.toString(), g.fundedAmountMinor.toString(), g.currency, g.status, jsonItems, jsonContributions, d(g.createdAtMs), d(g.expiresAtMs)]
    );
  }

  async getGroupCart(idOrCode: string): Promise<GroupCartSession | null> {
    const isId = isUuid(idOrCode);
    const sql = isId ? "select * from group_cart_sessions where id = $1" : "select * from group_cart_sessions where short_code = $1";
    const r = await this.one(sql, [idOrCode]);
    return r ? mGroupCart(r) : null;
  }

  async updateGroupCart(id: string, patch: Partial<GroupCartSession>): Promise<boolean> {
    if (!isUuid(id)) return false;
    const existing = await this.getGroupCart(id);
    if (!existing) return false;
    const target = patch.targetAmountMinor !== undefined ? patch.targetAmountMinor : existing.targetAmountMinor;
    const funded = patch.fundedAmountMinor !== undefined ? patch.fundedAmountMinor : existing.fundedAmountMinor;
    const status = patch.status !== undefined ? patch.status : existing.status;
    const items = patch.items !== undefined ? patch.items : existing.items;
    const contributions = patch.contributions !== undefined ? patch.contributions : existing.contributions;

    const jsonItems = JSON.stringify(items.map((it) => ({ ...it, unitPriceMinor: it.unitPriceMinor.toString() })));
    const jsonContributions = JSON.stringify(contributions.map((c) => ({ ...c, amountMinor: c.amountMinor.toString() })));

    return this.changed(
      `update group_cart_sessions set target_amount_minor = $2, funded_amount_minor = $3, status = $4, items = $5, contributions = $6 where id = $1`,
      [id, target.toString(), funded.toString(), status, jsonItems, jsonContributions]
    );
  }

  // ---- favorite businesses / regulars ----
  async saveFavoriteBusiness(customerUserId: string, businessId: string): Promise<void> {
    if (!isUuid(businessId)) throw new Error("invalid_id");
    await this.pool.query(
      "insert into customer_favorite_businesses (customer_user_id, business_id) values ($1, $2) on conflict do nothing",
      [customerUserId, businessId]
    );
  }
  async removeFavoriteBusiness(customerUserId: string, businessId: string): Promise<void> {
    if (!isUuid(businessId)) return;
    await this.pool.query(
      "delete from customer_favorite_businesses where customer_user_id = $1 and business_id = $2",
      [customerUserId, businessId]
    );
  }
  async listFavoriteBusinesses(customerUserId: string): Promise<BusinessRecord[]> {
    const rows = (await this.pool.query(
      "select b.* from businesses b join customer_favorite_businesses f on f.business_id = b.id where f.customer_user_id = $1 and b.status = 'active' and b.deleted_at is null order by f.created_at desc",
      [customerUserId]
    )).rows;
    return rows.map(mBusiness);
  }
  async isFavoriteBusiness(customerUserId: string, businessId: string): Promise<boolean> {
    if (!isUuid(businessId)) return false;
    const r = await this.one(
      "select 1 as exists from customer_favorite_businesses where customer_user_id = $1 and business_id = $2",
      [customerUserId, businessId]
    );
    return Boolean(r);
  }
}

