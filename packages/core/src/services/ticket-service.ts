import { authorize } from "../platform/authz.ts";
import { canSell } from "../commerce/tickets.ts";
import { scanTicket, signTicket } from "../commerce/tickets.ts";
import { planEventSplit } from "../payments/fees.ts";
import { money } from "../money.ts";
import { type Buyer } from "./checkout-service.ts";
import { afterTicketsIssued } from "./lifecycle.ts";
import { type Deps, type PaymentRecord, type TicketRecord, fail } from "./ports.ts";

const HOLD_MINUTES = 15;
export interface Holder { readonly name: string; readonly email: string }
export interface PurchaseTicketsInput { readonly buyer: Buyer; readonly businessId: string; readonly ticketTypeId: string; readonly holders: readonly Holder[]; readonly feeBps: number }
export interface PurchaseResult { paymentId: string | null; totalMinor: bigint; platformFeeMinor: bigint; tickets: { id: string; qrToken: string | null }[]; guestToken: string | null; nextStep: "provider_checkout" | "tickets_issued" }

export async function purchaseTickets(d: Deps, input: PurchaseTicketsInput): Promise<PurchaseResult> {
  if (!d.ticketSecret) return fail("server_misconfigured");
  const biz = await d.store.getBusiness(input.businessId);
  if (!biz || biz.status !== "active") return fail("business_unavailable");
  const type = await d.store.getTicketType(biz.id, input.ticketTypeId);          // scoped to this business
  if (!type || !type.eventPublished) return fail("event_unavailable");
  if (type.currency !== biz.currency) return fail("currency_mismatch");
  const qty = input.holders.length;
  for (const h of input.holders) if (h.name.trim().length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(h.email)) return fail("invalid_holder");
  const now = d.now();
  const sold = await d.store.countLiveTickets(biz.id, type.id, now);
  const ok = canSell({ capacity: type.capacity, salesStartMs: type.salesStartMs, salesEndMs: type.salesEndMs }, sold, qty, now);
  if (!ok.ok) return fail(ok.reason);

  const total = money(type.priceMinor * BigInt(qty), type.currency);
  const free = total.amountMinor === 0n;
  if (!free && !biz.acceptsAutomatic) return fail("payments_unavailable");        // paid tickets are provider-only
  const split = planEventSplit(total, input.feeBps);
  const buyerUserId = input.buyer.kind === "user" ? input.buyer.userId : null;
  void buyerUserId;
  const paymentId = free ? null : d.uuid();
  const payment: PaymentRecord | null = free ? null : {
    id: paymentId!, businessId: biz.id, orderId: d.uuid(), method: "provider", status: "created", amountMinor: total.amountMinor, currency: total.currency,
    reference: null, expiresAtMs: null, purpose: "ticket", platformFeeMinor: split.platformFee.amountMinor,
  };
  const tickets: TicketRecord[] = input.holders.map((h) => ({
    id: d.uuid(), businessId: biz.id, eventId: type.eventId, ticketTypeId: type.id, paymentId,
    holderName: h.name.trim(), holderEmail: h.email.trim().toLowerCase(), status: free ? "valid" : "held",
    usedAtMs: null, holdExpiresMs: free ? null : now + HOLD_MINUTES * 60_000, checkedInBy: null,
  }));
  // Atomic capacity check: if two buyers race for the last seat, exactly one succeeds.
  if (!(await d.store.insertTicketsWithinCapacity(biz.id, type.id, tickets, payment, now))) return fail("sold_out");
  if (free) await afterTicketsIssued(d, tickets, type.eventName);
  return {
    paymentId, totalMinor: total.amountMinor, platformFeeMinor: split.platformFee.amountMinor, guestToken: null,
    tickets: tickets.map((t) => ({ id: t.id, qrToken: free ? signTicket(d.ticketSecret!, t.id, t.eventId) : null })),
    nextStep: free ? "tickets_issued" : "provider_checkout",
  };
}

/** The QR token for a VALID ticket (shown after payment confirmation). */
export async function qrForTicket(d: Deps, businessId: string, ticketId: string): Promise<string | null> {
  if (!d.ticketSecret) return fail("server_misconfigured");
  const t = await d.store.getTicket(businessId, ticketId);
  return t && t.status === "valid" ? signTicket(d.ticketSecret, t.id, t.eventId) : null;
}

export async function checkInTicket(d: Deps, actor: string, businessId: string, eventId: string, token: string): Promise<{ result: string }> {
  if (!d.ticketSecret) return fail("server_misconfigured");
  const mine = await d.store.membershipsForUser(actor);
  if (!authorize(mine, actor, businessId, "events.checkin").allowed) return fail("forbidden");
  const parsed = token.split(".");
  const idPart = parsed.length === 2 ? Buffer.from(parsed[0]!, "base64url").toString("utf8").split(".")[0] : undefined;
  const stored = idPart ? await d.store.getTicket(businessId, idPart) : null;     // only THIS business's tickets are visible
  if (stored?.status === "held") return { result: "not_paid" };
  const decision = scanTicket(d.ticketSecret, token, eventId, stored ? { id: stored.id, eventId: stored.eventId, status: stored.status as "valid" | "used" | "refunded" | "cancelled", usedAtMs: stored.usedAtMs } : null);
  if (decision.result !== "admitted") return { result: decision.result };
  const admitted = await d.store.admitTicket(businessId, stored!.id, actor, d.now());   // atomic: two scanners cannot both admit
  return { result: admitted ? "admitted" : "already_used" };
}
