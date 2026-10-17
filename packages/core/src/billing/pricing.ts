import { type Money, money } from "../money.ts";

// Plans, entitlements and prices are DATA (DB tables in production). Nothing here hardcodes a price.
export type EntitlementValue = number | boolean | "unlimited";
export type Entitlements = Readonly<Record<string, EntitlementValue>>;
export type Interval = "month" | "year";

export interface PricePoint {
  readonly planKey: string;
  readonly currency: string;
  readonly interval: Interval;
  readonly amountMinor: bigint;
  readonly country?: string;     // optional market-specific override (e.g. purchasing-power pricing)
}

/** Most specific wins: (country+currency) > currency. No silent FX conversion: a missing price is an error. */
export function resolvePrice(book: readonly PricePoint[], planKey: string, currency: string, interval: Interval, country?: string): Money {
  const rows = book.filter((p) => p.planKey === planKey && p.currency === currency && p.interval === interval);
  const hit = (country && rows.find((p) => p.country === country)) || rows.find((p) => p.country === undefined);
  if (!hit) throw new Error(`No price for plan ${planKey} in ${currency}/${interval}`);
  return money(hit.amountMinor, currency);
}

export function checkLimit(ent: Entitlements, key: string, currentUsage: number): { allowed: boolean; reason: string } {
  const v = ent[key];
  if (v === undefined || v === false) return { allowed: false, reason: "not_in_plan" };
  if (v === true || v === "unlimited") return { allowed: true, reason: "ok" };
  return currentUsage < v ? { allowed: true, reason: "ok" } : { allowed: false, reason: "limit_reached" };
}
