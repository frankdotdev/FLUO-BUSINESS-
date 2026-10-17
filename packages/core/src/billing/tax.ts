import { type Money, money } from "../money.ts";

// Fluo's own revenue (subscriptions, event fee) may carry VAT. Rates are DATA per country (table tax_rates),
// never hard-coded. Default presentation: prices are shown VAT-INCLUSIVE ("pay N3,000") and the receipt itemises the tax.
export type TaxMode = "inclusive" | "exclusive";
export interface TaxBreakdown { readonly net: Money; readonly tax: Money; readonly gross: Money }

export function breakdown(amount: Money, rateBps: number, mode: TaxMode): TaxBreakdown {
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000) throw new Error("invalid_rate");
  const a = amount.amountMinor, r = BigInt(rateBps);
  if (mode === "inclusive") {
    const net = (a * 10000n + (10000n + r) / 2n) / (10000n + r);        // rounded to the nearest minor unit
    return { net: money(net, amount.currency), tax: money(a - net, amount.currency), gross: amount };
  }
  const tax = (a * r + 5000n) / 10000n;
  return { net: amount, tax: money(tax, amount.currency), gross: money(a + tax, amount.currency) };
}
