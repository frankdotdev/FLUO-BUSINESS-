import { applyProviderEvent } from "@fluo/core";
import { container, deps } from "./container.ts";
import { scheduleFlush } from "./flush.ts";

/** Verifies a payment reference directly against Paystack and applies fulfillment if paid.
 *  Ensures orders transition to paid and emails send even if Paystack webhooks are not configured. */
export async function syncOrderPayment(
  businessId: string,
  orderId: string,
  reference?: string | null
): Promise<boolean> {
  const d = deps();
  let payment = reference
    ? await d.store.findPaymentByProviderRef("paystack", reference)
    : null;

  if (!payment && businessId && orderId) {
    payment = await d.store.getPaymentForOrder(businessId, orderId);
  }

  const providerRef = reference || payment?.providerReference || (payment as any)?.providerRef;
  if (!payment || payment.status === "succeeded" || payment.method !== "provider" || !providerRef) {
    return false;
  }

  try {
    const paystack = container().providers.get("paystack");
    const v = await paystack.verify(providerRef);

    if (v.status === "succeeded") {
      await applyProviderEvent(
        d,
        {
          provider: "paystack",
          eventId: `sync_${providerRef}_${Date.now()}`,
          providerReference: providerRef,
          type: "payment.succeeded",
          amount: v.amount,
          atMs: Date.now(),
        },
        async () => ({
          status: v.status,
          amountMinor: v.amount.amountMinor,
          currency: v.amount.currency,
        })
      );
      scheduleFlush();
      return true;
    }
  } catch (err) {
    console.warn("[Paystack Sync Verification Error]", err);
  }
  return false;
}
