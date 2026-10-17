import { authorize } from "../platform/authz.ts";
import { resolvePrice, type Entitlements, type Interval, type PricePoint } from "../billing/pricing.ts";
import { effectivePlanKey } from "../billing/trial.ts";
import { paidPlanKey, type Subscription } from "../billing/subscription.ts";
import { type Deps, type PaymentRecord, fail } from "./ports.ts";

/** Creates the payment record for a plan period. The caller then starts provider checkout (initializeProviderCheckout).
 *  Price comes from the price book for the business's currency and country; the client never supplies an amount. */
export async function startSubscriptionPayment(d: Deps, a: { actor: string; businessId: string; planKey: string; interval: Interval; prices: readonly PricePoint[] }): Promise<{ paymentId: string; amountMinor: bigint; currency: string }> {
  const mine = await d.store.membershipsForUser(a.actor);
  if (!authorize(mine, a.actor, a.businessId, "billing.manage").allowed) return fail("forbidden");
  const biz = await d.store.getBusiness(a.businessId);
  if (!biz) return fail("not_found");
  let price; try { price = resolvePrice(a.prices, a.planKey, biz.currency, a.interval, biz.countryCode); } catch { return fail("plan_not_available"); }
  const p: PaymentRecord = {
    id: d.uuid(), businessId: biz.id, orderId: d.uuid(), purpose: "subscription", method: "provider", status: "created",
    amountMinor: price.amountMinor, currency: price.currency, reference: null, expiresAtMs: null, planKey: a.planKey, interval: a.interval,
  };
  await d.store.insertPayment(p);
  return { paymentId: p.id, amountMinor: p.amountMinor, currency: p.currency };
}

/** One tap. Access continues to the end of the paid period, reminders stop, nothing is deleted. */
export async function cancelSubscription(d: Deps, actor: string, businessId: string): Promise<void> { await setCancel(d, actor, businessId, true); }
export async function resumeSubscription(d: Deps, actor: string, businessId: string): Promise<void> { await setCancel(d, actor, businessId, false); }
async function setCancel(d: Deps, actor: string, businessId: string, cancel: boolean): Promise<void> {
  const mine = await d.store.membershipsForUser(actor);
  if (!authorize(mine, actor, businessId, "billing.manage").allowed) return fail("forbidden");
  const sub = await d.store.getSubscription(businessId);
  if (!sub || sub.paidUntilMs <= d.now()) return fail("no_active_subscription");
  const next: Subscription = { ...sub, cancelAtPeriodEnd: cancel };
  await d.store.upsertSubscription(next);
  await d.store.appendAudit({ businessId, actorUserId: actor, action: cancel ? "subscription.cancelled" : "subscription.resumed", targetId: null, atMs: d.now() });
}

/** The plan and limits that apply right now: paid plan, else the trial's plan, else Free. */
export async function resolveEntitlements(d: Deps, businessId: string, table: Readonly<Record<string, Entitlements>>): Promise<{ planKey: string; entitlements: Entitlements }> {
  const now = d.now();
  const key = effectivePlanKey(paidPlanKey(await d.store.getSubscription(businessId), now), await d.store.trialForBusiness(businessId), now);
  return { planKey: key, entitlements: table[key] ?? table["free"]! };
}
