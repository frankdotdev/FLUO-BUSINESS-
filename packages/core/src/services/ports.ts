import type { Capability } from "../platform/capabilities.ts";
import type { Membership, Role } from "../platform/authz.ts";
import type { CatalogueEntry, OrderKind, OrderStatus } from "../commerce/orders.ts";
import type { PaymentStatus } from "../payments/provider.ts";
import type { Trial } from "../billing/trial.ts";
import type { AvailabilityPolicy, TimeInterval } from "../platform/availability.ts";
import type { RefundPolicy } from "../platform/refund-policy.ts";
import type { Subscription } from "../billing/subscription.ts";
import type { EmailClass } from "../platform/email-budget.ts";
import type { KeyRing } from "../platform/crypto-fields.ts";
import type { MobilityOperatorRecord, RideRecord, RideStatus, CounterOffer, OperatorKind } from "../mobility/rides.ts";
import type { EscrowRecord, EscrowStatus } from "../commerce/escrow.ts";
import type { GroupCartSession } from "../commerce/group-cart.ts";

// Services depend on these interfaces only. Production implements them with Postgres (Drizzle);
// tests use the in-memory store. Every business-scoped method takes businessId: tenancy is part of the signature.
export class ServiceError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code = code; this.name = "ServiceError"; }
}
export const fail = (code: string): never => { throw new ServiceError(code); };

export interface Deps { readonly store: Store; readonly now: () => number; readonly uuid: () => string; readonly ticketSecret?: string; readonly appUrl?: string; readonly keys?: KeyRing; readonly keyId?: string; readonly storage?: ObjectStorage; readonly images?: ImageProcessor; readonly publicMediaBase?: string }

export type BusinessStatus = "draft" | "active" | "suspended" | "archived";
export type VerificationStatus = "not_required" | "pending" | "verified" | "rejected";
export interface BusinessRecord {
  readonly id: string; readonly slug: string; readonly name: string;
  readonly typeId: string; readonly typeVersion: number;
  readonly countryCode: string; readonly currency: string; readonly timezone: string;
  readonly status: BusinessStatus; readonly verificationStatus: VerificationStatus;
  readonly allowsTransfer: boolean; readonly acceptsAutomatic: boolean; readonly refundPolicy: RefundPolicy; readonly publishedAtMs: number | null; readonly logoAssetId?: string | null;
}

export interface CatalogueItem extends CatalogueEntry { readonly stock?: number | null; readonly name: string; readonly fulfilment: "stock" | "made_to_order"; readonly leadTimeHours: number }
export interface GuestContact { readonly name: string; readonly email: string; readonly phone?: string }

export interface OrderRecord {
  readonly id: string; readonly businessId: string; readonly userId: string | null; readonly guest: GuestContact | null;
  readonly kind: OrderKind; readonly status: OrderStatus; readonly currency: string; readonly totalMinor: bigint;
  readonly requiredByMs: number | null; readonly note: string | null; readonly refundPolicy: RefundPolicy;
}
export interface OrderItemRecord { readonly productId: string; readonly name: string; readonly unitPriceMinor: bigint; readonly quantity: number }
export interface PaymentRecord {
  readonly id: string; readonly businessId: string; readonly orderId: string;   // orderId = the order, or the ticket purchase id
  readonly method: "provider" | "bank_transfer";
  readonly status: PaymentStatus; readonly amountMinor: bigint; readonly currency: string;
  readonly reference: string | null; readonly expiresAtMs: number | null;
  readonly purpose?: "order" | "ticket" | "booking" | "subscription"; readonly provider?: string | null; readonly providerReference?: string | null;
  readonly platformFeeMinor?: bigint; readonly planKey?: string; readonly interval?: "month" | "year";
}
export interface AuditEvent { readonly businessId: string | null; readonly actorUserId: string | null; readonly action: string; readonly targetId: string | null; readonly atMs: number }

export type StoredTicketStatus = "held" | "valid" | "used" | "refunded" | "cancelled";
export interface TicketRecord {
  readonly id: string; readonly businessId: string; readonly eventId: string; readonly ticketTypeId: string; readonly paymentId: string | null;
  readonly holderName: string; readonly holderEmail: string; readonly status: StoredTicketStatus;
  readonly usedAtMs: number | null; readonly holdExpiresMs: number | null; readonly checkedInBy: string | null;
}
export interface TicketTypeRecord {
  readonly eventName: string; readonly id: string; readonly eventId: string; readonly businessId: string; readonly priceMinor: bigint; readonly currency: string;
  readonly capacity: number; readonly salesStartMs: number | null; readonly salesEndMs: number | null; readonly eventPublished: boolean;
}
export type PriceUnit = "per_night" | "per_hour" | "per_day" | "per_bed_night" | "flat";
export interface ResourceGroupRecord {
  readonly shortId?: string; readonly slug?: string;
  readonly id: string; readonly businessId: string; readonly name: string; readonly policy: AvailabilityPolicy; readonly timezone: string;
  readonly priceMinor: bigint; readonly priceUnit: PriceUnit; readonly currency: string; readonly active: boolean;
}
export type BookingStatus = "held" | "confirmed" | "checked_in" | "completed" | "cancelled" | "expired" | "no_show";
export interface BookingRecord {
  readonly id: string; readonly businessId: string; readonly resourceId: string; readonly groupId: string;
  readonly userId: string | null; readonly guest: GuestContact | null;
  readonly startMs: number; readonly endMs: number; readonly status: BookingStatus;
  readonly holdExpiresMs: number | null; readonly paymentId: string | null; readonly refundPolicy: RefundPolicy;
}
export interface TransferAccountRecord { readonly businessId: string; readonly bankName: string; readonly accountName: string; readonly accountNumberEncrypted: string; readonly accountLast4: string }
export interface PayoutAccountRecord { readonly businessId: string; readonly provider: string; readonly providerRef: string; readonly bankCode: string; readonly accountLast4: string; readonly accountName: string; readonly verified: boolean }
export type ProductStatus = "draft" | "active" | "paused" | "archived";
export interface ProductRecord {
  readonly id: string; readonly businessId: string; readonly shortId: string; readonly slug: string; readonly name: string; readonly description: string | null;
  readonly priceMinor: bigint; readonly currency: string; readonly fulfilment: "stock" | "made_to_order"; readonly leadTimeHours: number;
  readonly maxPerOrder: number; readonly status: ProductStatus; readonly createdAtMs: number;
  readonly stockQuantity?: number | null;      // null or missing = not tracked (made to order, services, unlimited)
  readonly imageAssetId?: string | null;
  readonly galleryAssetIds?: readonly string[];
  readonly compareAtPriceMinor?: bigint | null;
  readonly promoBadge?: string | null;
}
export interface RefundRequestRecord {
  readonly id: string; readonly businessId: string; readonly paymentId: string; readonly subjectKind: "booking" | "order"; readonly subjectId: string;
  readonly amountMinor: bigint; readonly currency: string; readonly status: "requested" | "refunded" | "declined"; readonly reason: string | null;
  readonly createdAtMs: number; readonly resolvedAtMs: number | null;
}
export type NotificationKind =
  | "order_placed_transfer" | "order_paid" | "booking_held_transfer" | "booking_confirmed" | "booking_reminder_24h" | "booking_reminder_2h"
  | "booking_cancelled" | "ticket_issued" | "refund_update"
  | "biz_new_order" | "biz_new_booking" | "biz_transfer_marked_sent" | "biz_transfer_nudge" | "biz_booking_reminder_2h" | "biz_refund_requested"
  | "biz_trial_ending" | "biz_trial_ended" | "biz_subscription_renewal" | "new_message" | "biz_plan_usage_warning";
export interface OutboxRecord {
  readonly id: string; readonly dedupeKey: string; readonly userId: string | null; readonly email: string | null; readonly kind: NotificationKind;
  readonly klass: EmailClass; readonly vars: Readonly<Record<string, string>>; readonly sendAfterMs: number; readonly sentAtMs: number | null;
  readonly attempts: number; readonly lastError: string | null;
}
export interface UserContact { readonly email: string; readonly name: string }
export interface PushToken { readonly userId: string; readonly token: string; readonly platform: "ios" | "android" | "web" }
export interface EmailProvider { send(msg: { to: string; subject: string; html: string; text: string }): Promise<void> }
export interface PushProvider { send(msgs: { token: string; title: string; body: string; data?: Record<string, string> }[]): Promise<{ invalidTokens: string[] }> }
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export interface EventRecord { readonly id: string; readonly businessId: string; readonly shortId: string; readonly slug: string; readonly name: string; readonly description: string | null; readonly venue: string | null; readonly startsAtMs: number; readonly endsAtMs: number | null; readonly status: EventStatus; readonly coverAssetId?: string | null }
export interface TicketTypeFull { readonly id: string; readonly eventId: string; readonly businessId: string; readonly name: string; readonly priceMinor: bigint; readonly currency: string; readonly capacity: number; readonly salesStartMs: number | null; readonly salesEndMs: number | null }
export interface ConversationRecord { readonly id: string; readonly businessId: string; readonly customerUserId: string; readonly topic: string | null; readonly createdAtMs: number; readonly lastMessageAtMs: number; readonly businessUnread: number; readonly customerUnread: number }
export interface MessageRecord { readonly id: string; readonly conversationId: string; readonly businessId: string; readonly senderKind: "customer" | "business"; readonly senderUserId: string; readonly body: string; readonly createdAtMs: number }
export type MediaStatus = "pending_upload" | "processing" | "ready" | "failed";
export interface MediaAssetRecord { readonly id: string; readonly businessId: string; readonly ownerUserId: string; readonly purpose: string; readonly status: MediaStatus; readonly declaredType: string; readonly declaredBytes: number; readonly detectedType: string | null; readonly width: number | null; readonly height: number | null; readonly variants: readonly string[]; readonly createdAtMs: number }
/** Object storage (Cloudflare R2 or any S3-compatible store). The browser uploads straight to it using a short-lived signed URL. */
export interface ObjectStorage {
  presignPut(a: { key: string; contentType: string; contentLength: number; expiresSec: number }): Promise<{ url: string; headers: Record<string, string> }>;
  get(key: string, maxBytes: number): Promise<Uint8Array | null>;
  put(key: string, bytes: Uint8Array, contentType: string, cacheControl?: string): Promise<void>;
  delete(key: string): Promise<void>;
}
export interface ImageVariant { readonly name: string; readonly bytes: Uint8Array; readonly width: number; readonly height: number }
export interface ImageProcessor { makeVariants(bytes: Uint8Array, specs: readonly { name: string; maxWidth: number; quality: number }[]): Promise<ImageVariant[]> }
export interface InviteRecord { readonly tokenHash: Buffer; readonly businessId: string; readonly email: string; readonly role: Role; readonly expiresAtMs: number; readonly usedAtMs: number | null; readonly invitedBy: string }

export interface Store {
  slugTaken(slug: string): Promise<boolean>;
  insertBusiness(b: BusinessRecord, owner: Membership, caps: readonly Capability[]): Promise<void>;   // atomic
  getBusiness(id: string): Promise<BusinessRecord | null>;
  patchBusiness(id: string, patch: Partial<BusinessRecord>): Promise<void>;
  membershipsForUser(userId: string): Promise<Membership[]>;
  membershipsForBusiness(businessId: string): Promise<Membership[]>;
  upsertMembership(m: Membership): Promise<void>;
  swapOwner(businessId: string, fromUserId: string, toUserId: string): Promise<boolean>;   // atomic; exactly one active owner afterwards
  insertInvite(i: InviteRecord): Promise<void>;
  findInvite(hash: Buffer): Promise<InviteRecord | null>;
  markInviteUsed(hash: Buffer, atMs: number): Promise<boolean>;                              // compare-and-set: unused -> used
  trialsForOwner(ownerUserId: string): Promise<Trial[]>;
  insertTrial(t: Trial): Promise<void>;
  appendAudit(e: AuditEvent): Promise<void>;
  catalogue(businessId: string, ids: readonly string[]): Promise<Map<string, CatalogueItem>>;   // only items of THIS business
  insertOrder(o: OrderRecord, items: readonly OrderItemRecord[], p: PaymentRecord, guestTokenHash: Buffer | null, tokenExpiresMs: number): Promise<void>;   // atomic; reserves stock and throws Error("out_of_stock") if any tracked item is short
  releaseOrderStock(businessId: string, orderId: string): Promise<void>;                     // gives back stock reserved by an order that will never be paid
  getOrder(businessId: string, orderId: string): Promise<OrderRecord | null>;
  getPaymentForOrder(businessId: string, orderId: string): Promise<PaymentRecord | null>;
  setOrderStatus(businessId: string, orderId: string, from: OrderStatus, to: OrderStatus): Promise<boolean>;     // compare-and-set
  setPaymentStatus(businessId: string, paymentId: string, from: PaymentStatus, to: PaymentStatus): Promise<boolean>;
  findGuestToken(hash: Buffer): Promise<{ orderId: string; businessId: string; expiresAtMs: number; revoked: boolean } | null>;
  // provider payments / webhooks
  attachProviderReference(businessId: string, paymentId: string, provider: string, ref: string): Promise<boolean>;   // created -> pending
  findPaymentByProviderRef(provider: string, ref: string): Promise<PaymentRecord | null>;
  recordWebhook(provider: string, eventId: string): Promise<boolean>;      // false if already recorded
  forgetWebhook(provider: string, eventId: string): Promise<void>;         // so a failed attempt can be retried
  insertPayment(p: PaymentRecord): Promise<void>;                                       // standalone payments, e.g. subscriptions
  getTransferAccount(businessId: string): Promise<TransferAccountRecord | null>;
  saveTransferAccount(r: TransferAccountRecord): Promise<void>;
  insertGuestToken(hash: Buffer, subjectId: string, businessId: string, expiresAtMs: number): Promise<void>;
  getPayment(businessId: string, paymentId: string): Promise<PaymentRecord | null>;
  getPayoutAccount(businessId: string): Promise<PayoutAccountRecord | null>;
  savePayoutAccount(r: PayoutAccountRecord): Promise<void>;
  capabilitiesOf(businessId: string): Promise<Capability[]>;
  setCapabilities(businessId: string, caps: readonly Capability[]): Promise<void>;
  getUserContact(userId: string): Promise<UserContact | null>;
  // catalogue
  insertProduct(p: ProductRecord): Promise<boolean>;                                  // false if short_id collides
  getProduct(businessId: string, id: string): Promise<ProductRecord | null>;
  patchProduct(businessId: string, id: string, patch: Partial<ProductRecord>): Promise<boolean>;
  listProducts(businessId: string, statuses: readonly ProductStatus[], limit: number, offset: number): Promise<ProductRecord[]>;
  countProducts(businessId: string, statuses: readonly ProductStatus[]): Promise<number>;
  pauseNewestActiveProducts(businessId: string, keep: number): Promise<number>;       // over-limit items are paused, never deleted
  deleteDraftBusiness(businessId: string): Promise<boolean>;
  // public reads (active businesses and active products only)
  getPublicBusinessBySlug(slug: string): Promise<BusinessRecord | null>;
  listPublicBusinesses(limit: number, offset: number, countryCode?: string, typeIds?: readonly string[]): Promise<BusinessRecord[]>;
  listPublicProducts(limit: number, offset?: number): Promise<{ product: ProductRecord; business: BusinessRecord }[]>;
  /** Text search over live businesses (by name), active items (name, description) and upcoming published events (name). `needle` is plain text, never a pattern. */
  searchPublic(needle: string, limit: number): Promise<{ businesses: BusinessRecord[]; products: { product: ProductRecord; business: BusinessRecord }[]; events: { event: EventRecord; business: BusinessRecord }[] }>;
  getPublicProductByShortId(shortId: string): Promise<{ product: ProductRecord; business: BusinessRecord } | null>;
  // dashboards and customer history
  listOrders(businessId: string, limit: number, offset: number): Promise<OrderRecord[]>;
  listOrdersForUser(userId: string, limit: number): Promise<OrderRecord[]>;
  getOrderItems(businessId: string, orderId: string): Promise<OrderItemRecord[]>;
  listBookings(businessId: string, fromMs: number, toMs: number): Promise<BookingRecord[]>;
  listBookingsForUser(userId: string, limit: number): Promise<BookingRecord[]>;
  ticketsForPayment(businessId: string, paymentId: string): Promise<TicketRecord[]>;
  // refunds (decided and performed by the business)
  insertRefundRequest(r: RefundRequestRecord): Promise<void>;
  getRefundRequest(businessId: string, id: string): Promise<RefundRequestRecord | null>;
  setRefundStatus(businessId: string, id: string, from: RefundRequestRecord["status"], to: RefundRequestRecord["status"], nowMs: number): Promise<boolean>;
  listRefundRequests(businessId: string, status?: RefundRequestRecord["status"]): Promise<RefundRequestRecord[]>;
  // subscriptions and trials
  getSubscription(businessId: string): Promise<Subscription | null>;
  upsertSubscription(s: Subscription): Promise<void>;
  trialForBusiness(businessId: string): Promise<Trial | null>;
  // notifications
  enqueueNotification(n: OutboxRecord): Promise<boolean>;                              // false if dedupeKey already exists
  dueNotifications(nowMs: number, limit: number): Promise<OutboxRecord[]>;
  markNotificationSent(id: string, nowMs: number): Promise<void>;
  markNotificationFailed(id: string, attempts: number, nextAtMs: number | null, error: string): Promise<void>;
  countEmailsSentSince(sinceMs: number): Promise<number>;
  pushTokensForUsers(userIds: readonly string[]): Promise<PushToken[]>;
  savePushToken(t: PushToken): Promise<void>;
  removePushTokens(tokens: readonly string[]): Promise<void>;
  // events, bookable resources, limits
  insertEvent(e: EventRecord): Promise<boolean>;                                             // false if short_id collides
  getEvent(businessId: string, id: string): Promise<EventRecord | null>;
  patchEvent(businessId: string, id: string, patch: Partial<EventRecord>): Promise<boolean>;
  listEvents(businessId: string, limit: number): Promise<EventRecord[]>;
  insertTicketType(t: TicketTypeFull): Promise<void>;
  listTicketTypes(businessId: string, eventId: string): Promise<TicketTypeFull[]>;
  getPublicEventByShortId(shortId: string): Promise<{ event: EventRecord; business: BusinessRecord; ticketTypes: TicketTypeFull[] } | null>;   // published events of live businesses only
  listPublicEvents(limit: number): Promise<{ event: EventRecord; business: BusinessRecord }[]>;                                               // published events of live businesses
  findTicketById(ticketId: string): Promise<TicketRecord | null>;                            // unscoped: callers must hold the signed ticket token
  countOrdersSince(businessId: string, sinceMs: number): Promise<number>;
  insertResourceGroup(g: ResourceGroupRecord & { shortId: string; slug: string }, resources: readonly { id: string; label: string }[]): Promise<boolean>;
  listResourceGroups(businessId: string): Promise<ResourceGroupRecord[]>;
  getPublicResourceGroupByShortId(shortId: string): Promise<{ group: ResourceGroupRecord; business: BusinessRecord } | null>;
  // messaging: one thread per customer per business
  getOrCreateConversation(c: ConversationRecord): Promise<ConversationRecord>;               // returns the existing thread if there is one
  getConversation(businessId: string, id: string): Promise<ConversationRecord | null>;
  listConversationsForBusiness(businessId: string, limit: number): Promise<ConversationRecord[]>;
  listConversationsForCustomer(userId: string, limit: number): Promise<ConversationRecord[]>;
  insertMessage(m: MessageRecord): Promise<void>;                                            // atomic: stores it, bumps the thread, increments the OTHER side's unread count
  listMessages(businessId: string, conversationId: string, limit: number): Promise<MessageRecord[]>;   // oldest first, most recent `limit`
  markConversationRead(businessId: string, conversationId: string, side: "business" | "customer"): Promise<void>;
  // media
  insertMediaAsset(m: MediaAssetRecord): Promise<void>;
  getMediaAsset(businessId: string, id: string): Promise<MediaAssetRecord | null>;
  setMediaStatus(businessId: string, id: string, from: MediaStatus, to: MediaStatus): Promise<boolean>;   // compare-and-set: one request processes an upload
  finishMediaAsset(businessId: string, id: string, f: { detectedType: string; width: number; height: number; variants: readonly string[] }): Promise<void>;
  countMediaAssets(businessId: string): Promise<number>;
  // bookings
  setBookingHold(businessId: string, id: string, holdExpiresMs: number): Promise<boolean>;
  getResourceGroup(businessId: string, id: string): Promise<ResourceGroupRecord | null>;
  resourcesInGroup(businessId: string, groupId: string): Promise<{ id: string; label: string }[]>;
  activeBookingIntervals(businessId: string, resourceId: string, nowMs: number): Promise<TimeInterval[]>;   // confirmed + unexpired holds
  insertBookingIfFree(b: BookingRecord, p: PaymentRecord | null, bufferMs: number, guestTokenHash: Buffer | null, tokenExpiresMs: number, nowMs: number): Promise<boolean>;   // atomic; DB exclusion constraint is the arbiter
  getBooking(businessId: string, id: string): Promise<BookingRecord | null>;
  setBookingStatus(businessId: string, id: string, from: BookingStatus, to: BookingStatus): Promise<boolean>;
  // maintenance jobs
  expireHeldBookings(nowMs: number): Promise<number>;
  expireHeldTickets(nowMs: number): Promise<number>;
  expireStaleTransfers(nowMs: number): Promise<number>;   // only transfers the customer never marked as sent
  // tickets
  getTicketType(businessId: string, id: string): Promise<TicketTypeRecord | null>;
  countLiveTickets(businessId: string, ticketTypeId: string, nowMs: number): Promise<number>;
  insertTicketsWithinCapacity(businessId: string, ticketTypeId: string, tickets: readonly TicketRecord[], payment: PaymentRecord | null, nowMs: number): Promise<boolean>;   // atomic capacity check
  setTicketsForPayment(businessId: string, paymentId: string, from: StoredTicketStatus, to: StoredTicketStatus, nowMs: number): Promise<number>;
  getTicket(businessId: string, ticketId: string): Promise<TicketRecord | null>;
  admitTicket(businessId: string, ticketId: string, byUserId: string, nowMs: number): Promise<boolean>;   // compare-and-set: valid -> used
  // mobility and rides
  upsertOperator(op: MobilityOperatorRecord): Promise<void>;
  getOperator(userId: string): Promise<MobilityOperatorRecord | null>;
  listNearbyOperators(lat: number, lng: number, radiusKm: number, kind?: OperatorKind): Promise<MobilityOperatorRecord[]>;
  insertRide(r: RideRecord): Promise<void>;
  getRide(id: string): Promise<RideRecord | null>;
  setRideStatus(id: string, from: RideStatus, to: RideStatus, patch?: Partial<RideRecord>): Promise<boolean>;
  updateRideCounterOffer(rideId: string, offer: CounterOffer): Promise<boolean>;
  listRidesForCustomer(customerUserId: string, limit: number): Promise<RideRecord[]>;
  listRidesForOperator(operatorUserId: string, limit: number): Promise<RideRecord[]>;
  saveFavoriteRider(customerUserId: string, operatorUserId: string): Promise<void>;
  listFavoriteRiders(customerUserId: string): Promise<MobilityOperatorRecord[]>;
  // order usage & overage ledger
  recordCompletedOrder(businessId: string, orderId: string, amountMinor: bigint, feeMinor: bigint, atMs: number): Promise<void>;
  countCompletedOrdersSince(businessId: string, sinceMs: number): Promise<number>;
  // escrow
  insertEscrowRecord(e: EscrowRecord): Promise<void>;
  getEscrowRecord(orderId: string): Promise<EscrowRecord | null>;
  setEscrowStatus(orderId: string, from: EscrowStatus, to: EscrowStatus, patch?: Partial<EscrowRecord>): Promise<boolean>;
  // group carts
  insertGroupCart(g: GroupCartSession): Promise<void>;
  getGroupCart(idOrCode: string): Promise<GroupCartSession | null>;
  updateGroupCart(id: string, patch: Partial<GroupCartSession>): Promise<boolean>;
  // favorite businesses / regulars
  saveFavoriteBusiness(customerUserId: string, businessId: string): Promise<void>;
  removeFavoriteBusiness(customerUserId: string, businessId: string): Promise<void>;
  listFavoriteBusinesses(customerUserId: string): Promise<BusinessRecord[]>;
  isFavoriteBusiness(customerUserId: string, businessId: string): Promise<boolean>;
}
