"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { BUSINESS_TYPES, PLAN_ENTITLEMENTS, PRICE_BOOK, ServiceError, attachMedia, completeUpload, requestUpload, type MediaTarget, type ImagePurpose, acceptInvite, inviteMember, isTypeReady, removeMember, sendMessage, startConversation, type Role, addTicketType, checkInTicket, createEvent, createResourceGroup, holdBooking, purchaseTickets, setEventStatus, stayToInterval, type PolicyKind, cancelBooking, cancelSubscription, cancelUnpaidOrder, confirmBookingTransfer, confirmTransfer, createBusiness, createProduct,
  initializeProviderCheckout, isCustomerOf, markBookingTransferSent, markTransferSent, parseLocalDate, parseLocalTime, parseMajor, placeOrder, publishBusiness, resolveEntitlements, resolveRefund,
  resumeSubscription, setPaymentModes, setPayoutAccount, setProductStatus, setTransferAccount, startSubscriptionPayment, zonedToInstant, type Capability, type CustomerProof, type ProductStatus,
  generateEscrowSecrets, verifyEscrowPin, verifyEscrowQr, calculateGroupCartTotal, type GroupCartSession, type GroupCartItem, type GroupContribution, type SplitKind } from "@fluo/core";
import { rateLimited } from "@/server/rate.ts";
import { scheduleFlush } from "@/server/flush.ts";
import { container, deps } from "@/server/container.ts";
import { env } from "@/server/env.ts";
import { getSession, requireUser } from "@/server/session.ts";
import { friendly } from "@/server/messages.ts";

const str = (f: FormData, k: string): string => String(f.get(k) ?? "").trim();
const safe = (p: string): string => (p.startsWith("/") && !p.startsWith("//") ? p : "/");
const withParam = (url: string, k: string, v: string): string => `${url}${url.includes("?") ? "&" : "?"}${k}=${encodeURIComponent(v)}`;

/** Runs a service call; a ServiceError becomes a friendly message on the page we came from. Other errors surface as real failures. */
async function guarded<T>(back: string, fn: () => Promise<T>): Promise<T> {
  try { const r = await fn(); scheduleFlush(); return r; }
  catch (e) { if (e instanceof ServiceError) redirect(withParam(safe(back), "error", e.code)); throw e; }
}

// ------------------------------------------------------------------ customers
async function customerProof(f: FormData): Promise<CustomerProof | null> {
  const token = str(f, "token");
  if (token) return { kind: "guest", token };
  const s = await getSession();
  return s ? { kind: "user", userId: s.user.id } : null;
}

export async function placeOrderAction(f: FormData): Promise<void> {
  const back = safe(str(f, "back")), businessId = str(f, "businessId"), method = str(f, "method");
  if (method !== "provider" && method !== "bank_transfer") redirect(withParam(back, "error", "method_not_allowed"));
  if (await rateLimited("order_create")) redirect(withParam(back, "error", "rate_limited"));
  const d = deps(), session = await getSession();
  const guest = { name: str(f, "name"), email: str(f, "email") };
  const biz = await d.store.getBusiness(businessId);
  let requiredByMs: number | undefined;
  const rb = str(f, "requiredBy");
  if (rb && biz) {
    try { const [date, time] = rb.split("T"); const z = zonedToInstant({ ...parseLocalDate(date ?? ""), ...parseLocalTime(time ?? "") }, biz.timezone); if (z.ok) requiredByMs = z.instantMs; }
    catch { redirect(withParam(back, "error", "required_by_needed")); }
  }
  let lines: { productId: string; quantity: number }[] = [];
  const cartJson = str(f, "cartJson");
  if (cartJson) {
    try {
      const parsed = JSON.parse(cartJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        lines = parsed.map((item: any) => ({
          productId: String(item.productId || "").trim(),
          quantity: Math.max(1, Math.min(100, Number(item.quantity) || 1)),
        })).filter((l) => l.productId.length > 0);
      }
    } catch {}
  }
  if (lines.length === 0) {
    const singleProduct = str(f, "productId");
    if (singleProduct) {
      lines = [{ productId: singleProduct, quantity: Number(str(f, "quantity") || 1) }];
    }
  }
  if (lines.length === 0) redirect(withParam(back, "error", "empty_cart"));

  const r = await guarded(back, () => placeOrder(d, {
    buyer: session ? { kind: "user", userId: session.user.id } : { kind: "guest", contact: guest }, businessId, method,
    lines, ...(requiredByMs !== undefined ? { requiredByMs } : {}), ...(str(f, "note") ? { note: str(f, "note") } : {}),
  }));

  const useEscrow = str(f, "useEscrow") === "1" || str(f, "useEscrow") === "true";
  if (useEscrow) {
    const payment = await d.store.getPaymentForOrder(businessId, r.orderId);
    if (payment) {
      const secrets = generateEscrowSecrets(env().TICKET_HMAC_SECRET, r.orderId);
      await d.store.insertEscrowRecord({
        orderId: r.orderId,
        businessId,
        buyerUserId: session ? session.user.id : null,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        status: "held",
        releasePinHash: secrets.releasePinHash,
        qrSecretHash: secrets.qrSecretHash,
        heldAtMs: Date.now(),
        releasedAtMs: null,
        disputedAtMs: null,
        disputeReason: null,
      });
    }
  }

  const path = r.guestToken ? `/g/${r.guestToken}` : `/account/orders/${r.orderId}?b=${businessId}`;
  if (r.nextStep === "provider_checkout") {
    const { checkoutUrl } = await guarded(back, () => initializeProviderCheckout(d, container().providers.get("paystack"), { businessId, paymentId: r.paymentId, customerEmail: session?.user.email ?? guest.email, callbackUrl: `${env().APP_URL}${path}`, eventFeeBps: env().eventFeeBps }));
    redirect(checkoutUrl);
  }
  redirect(path);
}

/** "I have transferred": only the order's own customer (signed in, or holding the secret link). */
export async function markSentAction(f: FormData): Promise<void> {
  const proof = await customerProof(f); const back = safe(str(f, "back"));
  if (!proof) redirect(`/sign-in?next=${encodeURIComponent(back)}`);
  const businessId = str(f, "businessId"), id = str(f, "id");
  await guarded(back, () => (str(f, "kind") === "booking" ? markBookingTransferSent(deps(), { businessId, bookingId: id, as: proof! }) : markTransferSent(deps(), { businessId, orderId: id, as: proof! })));
  revalidatePath(back); redirect(back);
}

export async function payNowAction(f: FormData): Promise<void> {
  const proof = await customerProof(f); const back = safe(str(f, "back"));
  if (!proof) redirect(`/sign-in?next=${encodeURIComponent(back)}`);
  const d = deps(), businessId = str(f, "businessId"), id = str(f, "id");
  const subject = (await d.store.getOrder(businessId, id)) ?? (await d.store.getBooking(businessId, id));
  if (!subject || !(await isCustomerOf(d, subject, proof!))) redirect(withParam(back, "error", "not_found"));
  const session = await getSession();
  const email = subject!.guest?.email ?? session?.user.email ?? "";
  const { checkoutUrl } = await guarded(back, async () => {
    const p = await d.store.getPaymentForOrder(businessId, id);
    if (!p) throw new ServiceError("not_found");
    return initializeProviderCheckout(d, container().providers.get("paystack"), { businessId, paymentId: p.id, customerEmail: email, callbackUrl: `${env().APP_URL}${back}`, eventFeeBps: env().eventFeeBps });
  });
  redirect(checkoutUrl);
}

export async function cancelAction(f: FormData): Promise<void> {
  const proof = await customerProof(f); const back = safe(str(f, "back"));
  if (!proof) redirect(`/sign-in?next=${encodeURIComponent(back)}`);
  const businessId = str(f, "businessId"), id = str(f, "id");
  await guarded(back, async () => {
    if (str(f, "kind") === "booking") {
      await cancelBooking(deps(), { businessId, bookingId: id, by: { kind: "customer", proof: proof! } });
    } else {
      await cancelUnpaidOrder(deps(), { businessId, orderId: id, as: proof! });
    }
  });
  revalidatePath(back); redirect(back);
}

// ------------------------------------------------------------------ business owners and staff
export async function createBusinessAction(f: FormData): Promise<void> {
  const user = await requireUser("/app/new");
  const typeId = str(f, "typeId");
  const type = BUSINESS_TYPES.find((t) => t.id === typeId);
  if (!type || type.tier === "later" || !isTypeReady(type)) redirect(withParam("/app/new", "error", "capability_not_available"));
  const optional = f.getAll("cap").map(String).filter((c) => type!.optional.includes(c as Capability)) as Capability[];
  const hours = Number(str(f, "refundHours") || 0);
  const refundPolicy = str(f, "refundKind") === "full_until" ? { kind: "full_until" as const, hoursBefore: hours } : { kind: "none" as const };
  const b = await guarded("/app/new", () => createBusiness(deps(), user.id, { name: str(f, "name"), typeId, optionalCapabilities: optional, countryCode: "NG", currency: "NGN", timezone: "Africa/Lagos", allowsTransfer: true, acceptsAutomatic: false, refundPolicy }));
  redirect(`/app/${b.id}?tab=payments&welcome=1`);
}

const back = (businessId: string, tab: string): string => `/app/${businessId}?tab=${tab}`;

export async function publishAction(f: FormData): Promise<void> {
  const user = await requireUser(); const id = str(f, "businessId");
  await guarded(back(id, "overview"), () => publishBusiness(deps(), user.id, id));
  revalidatePath(`/app/${id}`); redirect(back(id, "overview"));
}
export async function saveTransferAccountAction(f: FormData): Promise<void> {
  const user = await requireUser(); const id = str(f, "businessId");
  await guarded(back(id, "payments"), () => setTransferAccount(deps(), user.id, id, { bankName: str(f, "bankName"), accountName: str(f, "accountName"), accountNumber: str(f, "accountNumber") }));
  revalidatePath(`/app/${id}`); redirect(back(id, "payments"));
}
export async function savePayoutAction(f: FormData): Promise<void> {
  const user = await requireUser(); const id = str(f, "businessId");
  const r = await guarded(back(id, "payments"), () => setPayoutAccount(deps(), container().providers.get("paystack"), user.id, id, { bankCode: str(f, "bankCode"), accountNumber: str(f, "accountNumber"), ownerName: str(f, "ownerName") || user.name }));
  revalidatePath(`/app/${id}`); redirect(withParam(back(id, "payments"), "payout", r.verified ? "verified" : "review"));
}
export async function setModesAction(f: FormData): Promise<void> {
  const user = await requireUser(); const id = str(f, "businessId");
  await guarded(back(id, "payments"), () => setPaymentModes(deps(), user.id, id, { automatic: f.get("automatic") === "on", manual: f.get("manual") === "on" }));
  revalidatePath(`/app/${id}`); redirect(back(id, "payments"));
}
export async function createProductAction(f: FormData): Promise<void> {
  const user = await requireUser(); const id = str(f, "businessId"), tab = back(id, "products");
  let price: bigint;
  try { price = parseMajor(str(f, "price") || "0", "NGN").amountMinor; } catch { return redirect(withParam(tab, "error", "invalid_price")); }
  const d = deps(); const { entitlements } = await resolveEntitlements(d, id, PLAN_ENTITLEMENTS);
  await guarded(tab, () => createProduct(d, user.id, id, { name: str(f, "name"), priceMinor: price, fulfilment: str(f, "fulfilment") === "made_to_order" ? "made_to_order" : "stock", leadTimeHours: Number(str(f, "leadTimeHours") || 0), publish: f.get("publish") === "on", ...(str(f, "stock") !== "" ? { stockQuantity: Number(str(f, "stock")) } : {}), ...(str(f, "description") ? { description: str(f, "description") } : {}) }, entitlements));
  revalidatePath(`/app/${id}`); redirect(tab);
}
export async function setProductStatusAction(f: FormData): Promise<void> {
  const user = await requireUser(); const id = str(f, "businessId"), tab = back(id, "products");
  const d = deps(); const { entitlements } = await resolveEntitlements(d, id, PLAN_ENTITLEMENTS);
  await guarded(tab, () => setProductStatus(d, user.id, id, str(f, "productId"), str(f, "status") as ProductStatus, entitlements));
  revalidatePath(`/app/${id}`); redirect(tab);
}
export async function confirmOrderTransferAction(f: FormData): Promise<void> {
  const user = await requireUser(); const id = str(f, "businessId");
  await guarded(back(id, "orders"), () => confirmTransfer(deps(), user.id, id, str(f, "orderId")));
  revalidatePath(`/app/${id}`); redirect(back(id, "orders"));
}
export async function confirmBookingTransferAction(f: FormData): Promise<void> {
  const user = await requireUser(); const id = str(f, "businessId");
  await guarded(back(id, "bookings"), () => confirmBookingTransfer(deps(), user.id, id, str(f, "bookingId")));
  revalidatePath(`/app/${id}`); redirect(back(id, "bookings"));
}
export async function cancelBookingAsBusinessAction(f: FormData): Promise<void> {
  const user = await requireUser(); const id = str(f, "businessId");
  await guarded(back(id, "bookings"), () => cancelBooking(deps(), { businessId: id, bookingId: str(f, "bookingId"), by: { kind: "business", actorUserId: user.id } }));
  revalidatePath(`/app/${id}`); redirect(back(id, "bookings"));
}
export async function resolveRefundAction(f: FormData): Promise<void> {
  const user = await requireUser(); const id = str(f, "businessId");
  const outcome = str(f, "outcome") === "declined" ? { status: "declined" as const, reason: str(f, "reason") } : { status: "refunded" as const };
  await guarded(back(id, "orders"), () => resolveRefund(deps(), user.id, id, str(f, "refundId"), outcome));
  revalidatePath(`/app/${id}`); redirect(back(id, "orders"));
}
export async function startSubscriptionAction(f: FormData): Promise<void> {
  const user = await requireUser(); const id = str(f, "businessId"), tab = back(id, "billing");
  const interval = str(f, "interval") === "year" ? "year" : "month";
  const d = deps();
  const { checkoutUrl } = await guarded(tab, async () => {
    const p = await startSubscriptionPayment(d, { actor: user.id, businessId: id, planKey: str(f, "planKey"), interval, prices: PRICE_BOOK });
    return initializeProviderCheckout(d, container().providers.get("paystack"), { businessId: id, paymentId: p.paymentId, customerEmail: user.email, callbackUrl: `${env().APP_URL}${tab}`, eventFeeBps: env().eventFeeBps });
  });
  redirect(checkoutUrl);
}
export async function cancelSubscriptionAction(f: FormData): Promise<void> {
  const user = await requireUser(); const id = str(f, "businessId");
  await guarded(back(id, "billing"), () => (str(f, "resume") === "1" ? resumeSubscription(deps(), user.id, id) : cancelSubscription(deps(), user.id, id)));
  revalidatePath(`/app/${id}`); redirect(back(id, "billing"));
}

// ------------------------------------------------------------------ bookings and tickets (public)
const localInstant = (date: string, time: string, tz: string): number => {
  const z = zonedToInstant({ ...parseLocalDate(date), ...parseLocalTime(time) }, tz);
  if (!z.ok) throw new Error(z.reason);
  return z.instantMs;
};

export async function holdBookingAction(f: FormData): Promise<void> {
  const back = safe(str(f, "back")), businessId = str(f, "businessId"), groupId = str(f, "groupId"), method = str(f, "method");
  if (method !== "provider" && method !== "bank_transfer") redirect(withParam(back, "error", "method_not_allowed"));
  if (await rateLimited("order_create")) redirect(withParam(back, "error", "rate_limited"));
  const d = deps(), session = await getSession();
  const group = await d.store.getResourceGroup(businessId, groupId);
  if (!group) redirect(withParam(back, "error", "unavailable"));
  let startMs: number, endMs: number;
  try {
    if (group!.policy.kind === "nights" || group!.policy.kind === "bed") {
      ({ start: startMs, end: endMs } = stayToInterval({ checkInDate: str(f, "checkInDate"), checkOutDate: str(f, "checkOutDate"), checkInTime: str(f, "checkInTime") || "14:00", checkOutTime: str(f, "checkOutTime") || "11:00", timezone: group!.timezone }));
    } else {
      startMs = localInstant(str(f, "date"), str(f, "startTime"), group!.timezone);
      const minutes = Number(str(f, "durationMinutes"));
      if (!Number.isInteger(minutes) || minutes <= 0) throw new Error("invalid_date");
      endMs = startMs + minutes * 60_000;
    }
  } catch { return redirect(withParam(back, "error", "invalid_date")); }
  const guest = { name: str(f, "name"), email: str(f, "email") };
  const r = await guarded(back, () => holdBooking(d, { buyer: session ? { kind: "user", userId: session.user.id } : { kind: "guest", contact: guest }, businessId, groupId, startMs, endMs, method }));
  const path = r.guestToken ? `/g/${r.guestToken}` : `/account/orders/${r.bookingId}?b=${businessId}`;
  if (r.nextStep === "provider_checkout" && r.paymentId) {
    const { checkoutUrl } = await guarded(back, () => initializeProviderCheckout(d, container().providers.get("paystack"), { businessId, paymentId: r.paymentId!, customerEmail: session?.user.email ?? guest.email, callbackUrl: `${env().APP_URL}${path}`, eventFeeBps: env().eventFeeBps }));
    redirect(checkoutUrl);
  }
  redirect(path);
}

export async function purchaseTicketsAction(f: FormData): Promise<void> {
  const back = safe(str(f, "back")), businessId = str(f, "businessId"), ticketTypeId = str(f, "ticketTypeId");
  if (await rateLimited("order_create")) redirect(withParam(back, "error", "rate_limited"));
  const holders: { name: string; email: string }[] = [];
  for (let n = 1; n <= 4; n++) { const name = str(f, `holderName${n}`), email = str(f, `holderEmail${n}`); if (name || email) holders.push({ name, email }); }
  if (holders.length === 0) redirect(withParam(back, "error", "invalid_holder"));
  const d = deps(), session = await getSession();
  const r = await guarded(back, () => purchaseTickets(d, { buyer: session ? { kind: "user", userId: session.user.id } : { kind: "guest", contact: { name: holders[0]!.name, email: holders[0]!.email } }, businessId, ticketTypeId, holders, feeBps: env().eventFeeBps }));
  if (r.nextStep === "tickets_issued") redirect(`/t/${r.tickets[0]!.qrToken}`);
  const { checkoutUrl } = await guarded(back, () => initializeProviderCheckout(d, container().providers.get("paystack"), { businessId, paymentId: r.paymentId!, customerEmail: session?.user.email ?? holders[0]!.email, callbackUrl: `${env().APP_URL}${withParam(back, "paid", "1")}`, eventFeeBps: env().eventFeeBps }));
  redirect(checkoutUrl);
}

// ------------------------------------------------------------------ events and bookable things (owners and staff)
export async function createEventAction(f: FormData): Promise<void> {
  const user = await requireUser(); const id = str(f, "businessId"), tab = back(id, "events");
  const biz = await deps().store.getBusiness(id);
  let startsAtMs: number, endsAtMs: number | undefined;
  try {
    const [sd, st] = str(f, "start").split("T"); startsAtMs = localInstant(sd ?? "", st ?? "", biz?.timezone ?? "Africa/Lagos");
    const e = str(f, "end"); if (e) { const [ed, et] = e.split("T"); endsAtMs = localInstant(ed ?? "", et ?? "", biz?.timezone ?? "Africa/Lagos"); }
  } catch { return redirect(withParam(tab, "error", "invalid_date")); }
  await guarded(tab, () => createEvent(deps(), user.id, id, { name: str(f, "name"), startsAtMs, ...(endsAtMs !== undefined ? { endsAtMs } : {}), ...(str(f, "venue") ? { venue: str(f, "venue") } : {}), ...(str(f, "description") ? { description: str(f, "description") } : {}) }));
  revalidatePath(`/app/${id}`); redirect(tab);
}
export async function addTicketTypeAction(f: FormData): Promise<void> {
  const user = await requireUser(); const id = str(f, "businessId"), tab = back(id, "events");
  let price: bigint;
  try { price = parseMajor(str(f, "price") || "0", "NGN").amountMinor; } catch { return redirect(withParam(tab, "error", "invalid_price")); }
  await guarded(tab, () => addTicketType(deps(), user.id, id, str(f, "eventId"), { name: str(f, "name"), priceMinor: price, capacity: Number(str(f, "capacity")) }));
  revalidatePath(`/app/${id}`); redirect(tab);
}
export async function setEventStatusAction(f: FormData): Promise<void> {
  const user = await requireUser(); const id = str(f, "businessId"), tab = back(id, "events");
  const status = str(f, "status") === "cancelled" ? "cancelled" : "published";
  await guarded(tab, () => setEventStatus(deps(), user.id, id, str(f, "eventId"), status));
  revalidatePath(`/app/${id}`); redirect(tab);
}
export async function checkInAction(f: FormData): Promise<void> {
  const user = await requireUser(); const id = str(f, "businessId"), tab = back(id, "events");
  if (await rateLimited("ticket_scan", user.id)) redirect(withParam(tab, "error", "rate_limited"));
  const raw = str(f, "token"); const token = raw.includes("/") ? raw.slice(raw.lastIndexOf("/") + 1) : raw;   // accepts a pasted ticket link too
  const r = await guarded(tab, () => checkInTicket(deps(), user.id, id, str(f, "eventId"), token));
  redirect(withParam(tab, "checkin", r.result));
}
export async function createResourceGroupAction(f: FormData): Promise<void> {
  const user = await requireUser(); const id = str(f, "businessId"), tab = back(id, "bookings");
  let price: bigint;
  try { price = parseMajor(str(f, "price") || "0", "NGN").amountMinor; } catch { return redirect(withParam(tab, "error", "invalid_price")); }
  const kind = str(f, "kind") as PolicyKind;
  await guarded(tab, () => createResourceGroup(deps(), user.id, id, { name: str(f, "name"), kind, priceMinor: price, unitLabels: str(f, "units").split(/[\n,]/) }));
  revalidatePath(`/app/${id}`); redirect(tab);
}

// ------------------------------------------------------------------ team
export async function inviteMemberAction(f: FormData): Promise<void> {
  const user = await requireUser(); const id = str(f, "businessId"), tab = back(id, "team");
  const d = deps(); const { entitlements } = await resolveEntitlements(d, id, PLAN_ENTITLEMENTS);
  const email = str(f, "email");
  const { token } = await guarded(tab, () => inviteMember(d, user.id, id, email, str(f, "role") as Role, entitlements));
  const biz = await d.store.getBusiness(id);
  const link = `${env().APP_URL}/invite/${token}`;
  await container().email.send({ to: email.toLowerCase(), subject: `${user.name} invited you to ${biz?.name ?? "a business"} on Fluo`, text: `${user.name} invited you to join ${biz?.name ?? "their business"} on Fluo.\n\nOpen this link while signed in with this email address:\n${link}\n\nThe link works once and expires in 7 days.`,
    html: `<div style="font-family:Inter,Arial,sans-serif"><p>${user.name.replace(/[<>&]/g, "")} invited you to join <strong>${(biz?.name ?? "their business").replace(/[<>&]/g, "")}</strong> on Fluo.</p><p><a href="${link}" style="background:#0B0B0B;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px">Accept the invitation</a></p><p style="color:#5C5C5C;font-size:12px">Sign in with this email address. The link works once and expires in 7 days.</p></div>` });
  redirect(withParam(tab, "invited", email));
}
export async function removeMemberAction(f: FormData): Promise<void> {
  const user = await requireUser(); const id = str(f, "businessId");
  await guarded(back(id, "team"), () => removeMember(deps(), user.id, id, str(f, "userId")));
  revalidatePath(`/app/${id}`); redirect(back(id, "team"));
}
export async function acceptInviteAction(f: FormData): Promise<void> {
  const user = await requireUser(); const token = str(f, "token");
  const d = deps();
  await guarded(`/invite/${token}`, () => acceptInvite(d, { userId: user.id, email: user.email, emailVerified: user.emailVerified }, token));
  redirect("/app");
}

// ------------------------------------------------------------------ chat
export async function startChatAction(f: FormData): Promise<void> {
  const businessId = str(f, "businessId"), back0 = safe(str(f, "back"));
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(back0)}`);
  const c = await guarded(back0, () => startConversation(deps(), session!.user.id, businessId, str(f, "topic")));
  redirect(`/account/messages/${c.id}?b=${businessId}`);
}
export async function sendMessageAction(f: FormData): Promise<void> {
  const user = await requireUser(); const businessId = str(f, "businessId"), cid = str(f, "conversationId"), as = str(f, "as");
  const dest = as === "business" ? `/app/${businessId}?tab=messages&c=${cid}` : `/account/messages/${cid}?b=${businessId}`;
  if (await rateLimited("chat_message", user.id)) redirect(withParam(dest, "error", "rate_limited"));
  await guarded(dest, () => sendMessage(deps(), { kind: as === "business" ? "business" : "customer", userId: user.id }, businessId, cid, str(f, "body")));
  revalidatePath(dest); redirect(dest);
}

// ------------------------------------------------------------------ images (browser uploads straight to storage with a signed URL)
type UploadResult<T> = ({ ok: true } & T) | { ok: false; error: string };
export async function requestUploadAction(a: { businessId: string; purpose: ImagePurpose; contentType: string; bytes: number }): Promise<UploadResult<{ assetId: string; url: string; headers: Record<string, string> }>> {
  const user = await requireUser();
  if (await rateLimited("upload", user.id)) return { ok: false, error: friendly("rate_limited")! };
  try { return { ok: true, ...(await requestUpload(deps(), user.id, a.businessId, { purpose: a.purpose, contentType: a.contentType, bytes: a.bytes })) }; }
  catch (e) { if (e instanceof ServiceError) return { ok: false, error: uploadMessage(e.code) }; throw e; }
}
export async function completeUploadAction(a: { businessId: string; assetId: string; target: MediaTarget }): Promise<UploadResult<Record<string, unknown>>> {
  const user = await requireUser();
  try { const d = deps(); await completeUpload(d, user.id, a.businessId, a.assetId); await attachMedia(d, user.id, a.businessId, a.assetId, a.target); revalidatePath(`/app/${a.businessId}`); return { ok: true }; }
  catch (e) { if (e instanceof ServiceError) return { ok: false, error: uploadMessage(e.code) }; throw e; }
}
const uploadMessage = (code: string): string => ({ unsupported_type: "Please choose a JPEG, PNG or WebP photo.", too_large: "That photo is too big. Please choose one under 10 MB.", type_mismatch: "That file isn't the kind of photo it claims to be.", size_mismatch: "The upload didn't match the file you chose. Please try again.",
  unreadable_image: "We couldn't read that image. Please try another.", upload_missing: "The upload didn't arrive. Please try again.", media_not_configured: "Photo uploads aren't switched on yet.", media_quota_reached: "You've reached the photo limit.", wrong_image_kind: "That photo can't be used there." } as Record<string, string>)[code] ?? friendly(code) ?? "Something went wrong. Please try again.";

// ------------------------------------------------------------------ escrow & handoff
export async function releaseEscrowWithPinAction(f: FormData): Promise<void> {
  const back = safe(str(f, "back")), orderId = str(f, "orderId"), pin = str(f, "pin");
  if (!orderId || !pin) redirect(withParam(back, "error", "invalid_input"));
  const d = deps();
  const escrow = await d.store.getEscrowRecord(orderId);
  if (!escrow) redirect(withParam(back, "error", "not_found"));
  if (escrow.status !== "held") redirect(withParam(back, "error", "escrow_not_held"));

  const valid = verifyEscrowPin(env().TICKET_HMAC_SECRET, orderId, pin, escrow.releasePinHash);
  if (!valid) redirect(withParam(back, "error", "invalid_pin"));

  await d.store.setEscrowStatus(orderId, "held", "released", { releasedAtMs: Date.now() });
  revalidatePath(back);
  redirect(withParam(back, "success", "escrow_released"));
}

export async function releaseEscrowWithQrAction(f: FormData): Promise<void> {
  const back = safe(str(f, "back")), qrToken = str(f, "qrToken");
  if (!qrToken) redirect(withParam(back, "error", "invalid_input"));
  const verified = verifyEscrowQr(env().TICKET_HMAC_SECRET, qrToken);
  if (!verified.valid || !verified.orderId) redirect(withParam(back, "error", "invalid_qr"));
  const d = deps();
  const escrow = await d.store.getEscrowRecord(verified.orderId);
  if (!escrow) redirect(withParam(back, "error", "not_found"));
  if (escrow.status !== "held") redirect(withParam(back, "error", "escrow_not_held"));

  await d.store.setEscrowStatus(verified.orderId, "held", "released", { releasedAtMs: Date.now() });
  revalidatePath(back);
  redirect(withParam(back, "success", "escrow_released"));
}

export async function disputeEscrowAction(f: FormData): Promise<void> {
  const back = safe(str(f, "back")), orderId = str(f, "orderId"), reason = str(f, "reason");
  if (!orderId || !reason) redirect(withParam(back, "error", "invalid_input"));
  const d = deps();
  const escrow = await d.store.getEscrowRecord(orderId);
  if (!escrow || escrow.status !== "held") redirect(withParam(back, "error", "escrow_not_held"));

  await d.store.setEscrowStatus(orderId, "held", "disputed", { disputedAtMs: Date.now(), disputeReason: reason });
  revalidatePath(back);
  redirect(withParam(back, "success", "escrow_disputed"));
}

// ------------------------------------------------------------------ favorites / regulars
export async function toggleFavoriteBusinessAction(f: FormData): Promise<void> {
  const back = safe(str(f, "back")), businessId = str(f, "businessId");
  const session = await getSession();
  if (!session) redirect(`/sign-in?next=${encodeURIComponent(back)}`);
  const d = deps();
  const isFav = await d.store.isFavoriteBusiness(session.user.id, businessId);
  if (isFav) {
    await d.store.removeFavoriteBusiness(session.user.id, businessId);
  } else {
    await d.store.saveFavoriteBusiness(session.user.id, businessId);
  }
  revalidatePath(back);
  redirect(back);
}

// ------------------------------------------------------------------ group carts & split payments
export async function createGroupCartAction(f: FormData): Promise<void> {
  const back = safe(str(f, "back")), businessId = str(f, "businessId");
  const hostName = str(f, "hostName"), hostEmail = str(f, "hostEmail");
  const splitKind = (str(f, "splitKind") || "itemized") as SplitKind;
  const session = await getSession();
  const d = deps();
  const biz = await d.store.getBusiness(businessId);
  if (!biz) redirect(withParam(back, "error", "not_found"));

  const shortCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  const cartId = randomUUID();
  const sessionRecord: GroupCartSession = {
    id: cartId,
    shortCode,
    businessId,
    hostUserId: session ? session.user.id : null,
    hostName: hostName || (session?.user.name ?? "Host"),
    hostEmail: hostEmail || (session?.user.email ?? ""),
    splitKind,
    targetAmountMinor: 0n,
    fundedAmountMinor: 0n,
    currency: biz.currency,
    status: "open",
    items: [],
    contributions: [],
    createdAtMs: Date.now(),
    expiresAtMs: Date.now() + 24 * 3600 * 1000,
  };
  await d.store.insertGroupCart(sessionRecord);
  redirect(`/cart/${shortCode}`);
}

export async function addGroupCartItemAction(f: FormData): Promise<void> {
  const shortCode = str(f, "shortCode"), productId = str(f, "productId"), quantity = Math.max(1, Number(str(f, "quantity") || 1));
  const memberName = str(f, "memberName") || "Friend";
  const d = deps();
  const cart = await d.store.getGroupCart(shortCode);
  if (!cart || cart.status !== "open") redirect(`/cart/${shortCode}?error=cart_locked`);
  const prod = await d.store.getProduct(cart.businessId, productId);
  if (!prod) redirect(`/cart/${shortCode}?error=product_not_found`);

  const newItem: GroupCartItem = {
    id: randomUUID(),
    productId: prod.id,
    name: prod.name,
    unitPriceMinor: prod.priceMinor,
    quantity,
    addedBy: { name: memberName },
  };
  const updatedItems = [...cart.items, newItem];
  const newTarget = calculateGroupCartTotal(updatedItems);
  await d.store.updateGroupCart(cart.id, {
    items: updatedItems,
    targetAmountMinor: newTarget,
  });
  revalidatePath(`/cart/${shortCode}`);
  redirect(`/cart/${shortCode}`);
}

export async function contributeGroupCartAction(f: FormData): Promise<void> {
  const shortCode = str(f, "shortCode");
  const contributorName = str(f, "contributorName"), contributorEmail = str(f, "contributorEmail");
  const amountStr = str(f, "amount");
  const d = deps();
  const cart = await d.store.getGroupCart(shortCode);
  if (!cart || cart.status !== "open") redirect(`/cart/${shortCode}?error=cart_not_open`);

  let amountMinor = 0n;
  try {
    amountMinor = parseMajor(amountStr, cart.currency).amountMinor;
  } catch {
    redirect(`/cart/${shortCode}?error=invalid_amount`);
  }
  if (amountMinor <= 0n) redirect(`/cart/${shortCode}?error=invalid_amount`);

  const contribId = randomUUID();
  const updatedContribs: GroupContribution[] = [
    ...cart.contributions,
    {
      id: contribId,
      contributorName: contributorName || "Contributor",
      contributorEmail: contributorEmail || "",
      amountMinor,
      paymentId: null,
      status: "pending",
      paidAtMs: null,
    },
  ];
  await d.store.updateGroupCart(cart.id, {
    contributions: updatedContribs,
  });

  const paymentId = randomUUID();
  const payRecord = {
    id: paymentId,
    businessId: cart.businessId,
    orderId: cart.id,
    purpose: "order" as const,
    method: "provider" as const,
    status: "created" as const,
    amountMinor,
    currency: cart.currency,
    reference: null,
    expiresAtMs: Date.now() + 3600 * 1000,
    platformFeeMinor: 0n,
  };
  await d.store.insertPayment(payRecord);

  const { checkoutUrl } = await initializeProviderCheckout(d, container().providers.get("paystack"), {
    businessId: cart.businessId,
    paymentId,
    customerEmail: contributorEmail || "customer@fluo.ng",
    callbackUrl: `${env().APP_URL}/cart/${shortCode}?paid=${contribId}`,
    eventFeeBps: env().eventFeeBps,
  });

  redirect(checkoutUrl);
}

