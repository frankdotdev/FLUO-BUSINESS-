import { calculateFluoOrderFee, planUsageReport } from "../billing/plans.ts";
import { signTicket } from "../commerce/tickets.ts";
import { newGuestToken } from "../platform/guest-access.ts";
import { describePolicy } from "../platform/refund-policy.ts";
import { fmtLocal, fmtMoney, notifyBusiness, notifyRecipient, scheduleBookingReminders, type Recipient } from "../notifications/notify.ts";
import { type BookingRecord, type Deps, type GuestContact, type OrderRecord, type TicketRecord } from "./ports.ts";

const DAY = 86_400_000;

/** Who gets customer-facing messages, and a link they can open. Guests get a fresh secret link per message (only its hash is stored). */
export async function customerTarget(d: Deps, s: { id: string; businessId: string; userId: string | null; guest: GuestContact | null }, area: "orders" | "bookings"): Promise<{ to: Recipient; path: string } | null> {
  if (s.userId) return { to: { kind: "user", userId: s.userId }, path: `/account/${area}/${s.id}` };
  if (s.guest) {
    const { token, hash } = newGuestToken();
    await d.store.insertGuestToken(hash, s.id, s.businessId, d.now() + 30 * DAY);
    return { to: { kind: "email", email: s.guest.email }, path: `/g/${token}` };
  }
  return null;
}
export const customerName = async (d: Deps, s: { userId: string | null; guest: GuestContact | null }): Promise<string> =>
  s.guest?.name ?? (s.userId ? (await d.store.getUserContact(s.userId))?.name : undefined) ?? "A customer";

export async function afterOrderPaid(d: Deps, o: OrderRecord): Promise<void> {
  const biz = await d.store.getBusiness(o.businessId); if (!biz) return;
  const now = d.now();
  const monthStart = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), 1);
  const cycleCount = await d.store.countCompletedOrdersSince(biz.id, monthStart);

  let planKey = "free";
  try {
    const sub = await d.store.getSubscription(biz.id);
    if (sub && sub.paidUntilMs > now) planKey = sub.planKey;
  } catch {}

  const feeCalc = calculateFluoOrderFee(planKey, cycleCount + 1, o.totalMinor);
  await d.store.recordCompletedOrder(biz.id, o.id, o.totalMinor, feeCalc.feeMinor, now);

  const report = planUsageReport(planKey, cycleCount + 1);
  if (report.warningLevel) {
    const warningDetail = report.isOverAllowance
      ? `You have exceeded your included allowance. Additional orders incur a small Fluo usage fee (${feeCalc.overageBps / 100}%, capped at ₦50/order). Upgrading to a higher plan lowers your fee and increases your allowance.`
      : `You are approaching your plan's included orders limit (${report.percentUsed}% used). Upgrading now unlocks higher limits and lower fees.`;
    await notifyBusiness(
      d,
      biz.id,
      "billing.manage",
      "biz_plan_usage_warning",
      {
        planName: planKey.charAt(0).toUpperCase() + planKey.slice(1),
        percentUsed: String(report.percentUsed),
        usedCount: String(report.usedCount),
        includedCount: String(report.includedCount),
        warningDetail,
        path: `/app/${biz.id}/billing`,
      },
      `usage_${report.warningLevel}_${monthStart}`
    );
  }

  const total = fmtMoney(o.totalMinor, o.currency);
  const t = await customerTarget(d, o, "orders");
  if (t) await notifyRecipient(d, t.to, "order_paid", { businessName: biz.name, total, path: t.path }, o.id);
  await notifyBusiness(d, biz.id, "orders.write", "biz_new_order", { customerName: await customerName(d, o), total, path: `/app/${biz.id}/orders/${o.id}` }, o.id);
}

export async function afterBookingConfirmed(d: Deps, b: BookingRecord): Promise<void> {
  const biz = await d.store.getBusiness(b.businessId); if (!biz) return;
  const group = await d.store.getResourceGroup(b.businessId, b.groupId);
  const title = group?.name ?? "Booking";
  const startsAt = fmtLocal(b.startMs, biz.timezone), endsAt = fmtLocal(b.endMs, biz.timezone);
  const t = await customerTarget(d, b, "bookings");
  const cname = await customerName(d, b);
  const bizVars = { customerName: cname, title, startsAt, businessId: biz.id, bookingId: b.id, path: `/app/${biz.id}/bookings/${b.id}` };
  if (t) await notifyRecipient(d, t.to, "booking_confirmed", { businessName: biz.name, title, startsAt, endsAt, policy: describePolicy(b.refundPolicy), path: t.path }, b.id);
  await notifyBusiness(d, biz.id, "bookings.manage", "biz_new_booking", bizVars, b.id);
  if (t) {
    await scheduleBookingReminders(d, { customer: t.to, businessId: biz.id, bookingId: b.id, startMs: b.startMs, businessVars: bizVars,
      customerVars: { businessName: biz.name, title, startsAt, businessId: biz.id, bookingId: b.id, path: t.path } });
  }
}

export async function afterTicketsIssued(d: Deps, tickets: readonly TicketRecord[], eventName: string): Promise<void> {
  if (!d.ticketSecret) return;
  for (const t of tickets) {
    const qr = signTicket(d.ticketSecret, t.id, t.eventId);
    await notifyRecipient(d, { kind: "email", email: t.holderEmail }, "ticket_issued", { eventName, path: `/t/${qr}` }, t.id);
  }
}
