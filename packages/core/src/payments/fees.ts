import { type Money, percentBps } from "../money.ts";

// Policy (decided): Fluo never holds customer money and NEVER bears the provider's processing fee.
// The provider splits at settlement; the business's share goes to its own payout account.
export interface SplitPlan {
  readonly gross: Money;
  readonly platformFee: Money;   // flat amount that goes to Fluo; zero for everything except paid event tickets
}

/** feeBps comes from configuration (200 = 2%). A free ticket (gross 0) has no payment and no fee. */
export function planEventSplit(gross: Money, feeBps: number): SplitPlan {
  if (gross.amountMinor < 0n) throw new Error("negative_amount");
  const platformFee = percentBps(gross, feeBps);
  if (gross.amountMinor > 0n && platformFee.amountMinor >= gross.amountMinor) throw new Error("fee_not_less_than_amount");
  return { gross, platformFee };
}

/** Orders, bookings and everything else: Fluo takes no cut (revenue is the subscription). */
export function planStandardSplit(gross: Money): SplitPlan {
  if (gross.amountMinor < 0n) throw new Error("negative_amount");
  return { gross, platformFee: percentBps(gross, 0) };
}

/** Paystack: transaction_charge is a flat amount (minor units) kept by the main account;
 *  bearer is always "subaccount", so the business pays Paystack's fee. */
export function toPaystackSplit(plan: SplitPlan, subaccountCode: string): { subaccount: string; transaction_charge: number; bearer: "subaccount" } {
  const charge = Number(plan.platformFee.amountMinor);
  if (!Number.isSafeInteger(charge)) throw new Error("charge_out_of_range");
  return { subaccount: subaccountCode, transaction_charge: charge, bearer: "subaccount" };
}
