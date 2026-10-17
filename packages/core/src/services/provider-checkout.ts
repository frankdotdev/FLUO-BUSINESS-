import { planEventSplit, planStandardSplit } from "../payments/fees.ts";
import type { PaymentProvider } from "../payments/provider.ts";
import { money } from "../money.ts";
import { type Deps, fail } from "./ports.ts";

/** Starts an automatic payment. Called by the server right after the order/booking/ticket purchase is created
 *  (never exposed as a public endpoint that accepts a payment id from a browser). The business's money goes
 *  straight to its own sub-account; only paid event tickets carry Fluo's fee; subscriptions are plain charges to Fluo. */
export async function initializeProviderCheckout(d: Deps, provider: PaymentProvider, a: { businessId: string; paymentId: string; customerEmail: string; callbackUrl: string; eventFeeBps: number }): Promise<{ checkoutUrl: string }> {
  const payment = await d.store.getPayment(a.businessId, a.paymentId);
  if (!payment || payment.method !== "provider" || payment.status !== "created") return fail("invalid_state");
  const amount = money(payment.amountMinor, payment.currency);
  let split: { subaccount: string; platformFee: ReturnType<typeof money> } | undefined;
  if (payment.purpose !== "subscription") {
    const biz = await d.store.getBusiness(a.businessId);
    const payout = await d.store.getPayoutAccount(a.businessId);
    if (!biz || !biz.acceptsAutomatic || !payout?.verified || !payout.providerRef) return fail("payments_unavailable");
    const plan = payment.purpose === "ticket" ? planEventSplit(amount, a.eventFeeBps) : planStandardSplit(amount);
    split = { subaccount: payout.providerRef, platformFee: plan.platformFee };
  }
  const reference = `fl_${d.uuid().replaceAll("-", "")}`;
  const { checkoutUrl } = await provider.initialize({ reference, amount, customerEmail: a.customerEmail, callbackUrl: a.callbackUrl, ...(split ? { split } : {}) });
  if (!(await d.store.attachProviderReference(a.businessId, a.paymentId, provider.id, reference))) return fail("already_started");
  return { checkoutUrl };
}
