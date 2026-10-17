// PLAN CONFIGURATION. Four core plans: Free (N0), Starter (N3,000), Growth (N10,000), Business (N25,000).
// Each plan combines access to business tools + an included monthly completed online order allowance.
// Completed online orders exceeding the allowance incur a modest, capped Fluo usage fee.
import type { Entitlements, PricePoint } from "./pricing.ts";

export const EVENT_FEE_BPS = 200;                  // 2% per paid ticket
export const DEFAULT_OVERAGE_CAP_MINOR = 5000n;    // N50 cap per order initially, configurable

export const PLAN_ENTITLEMENTS: Readonly<Record<string, Entitlements>> = {
  free:     { listings: 10, orders_per_month: 30, staff_seats: 1, overage_fee_bps: 100, custom_domain: false },   // N0: 30 orders included, 1% fee after
  starter:  { listings: 100, orders_per_month: 100, staff_seats: 3, overage_fee_bps: 75, custom_domain: false },  // N3k: 100 orders included, 0.75% fee after
  growth:   { listings: 500, orders_per_month: 300, staff_seats: 6, overage_fee_bps: 50, custom_domain: false },  // N10k: 300 orders included, 0.5% fee after
  business: { listings: "unlimited", orders_per_month: 1000, staff_seats: 15, overage_fee_bps: 25, custom_domain: true }, // N25k: 1000 orders included, 0.25% fee after
  pro:      { listings: "unlimited", orders_per_month: "unlimited", staff_seats: 50, overage_fee_bps: 0, custom_domain: true },  // custom/unlimited
};

export const PRICE_BOOK: readonly PricePoint[] = [
  { planKey: "starter",  currency: "NGN", interval: "month", amountMinor: 300000n },    // N3,000
  { planKey: "growth",   currency: "NGN", interval: "month", amountMinor: 1000000n },   // N10,000
  { planKey: "business", currency: "NGN", interval: "month", amountMinor: 2500000n },   // N25,000
  { planKey: "pro",      currency: "NGN", interval: "month", amountMinor: 2500000n },   // alias
  // USD (international)
  { planKey: "starter",  currency: "USD", interval: "month", amountMinor: 500n },       // $5
  { planKey: "growth",   currency: "USD", interval: "month", amountMinor: 1500n },      // $15
  { planKey: "business", currency: "USD", interval: "month", amountMinor: 3500n },      // $35
  { planKey: "pro",      currency: "USD", interval: "month", amountMinor: 3500n },
];

export interface OrderFeeCalculation {
  readonly isOverage: boolean;
  readonly feeMinor: bigint;
  readonly overageBps: number;
  readonly capMinor: bigint;
}

/**
 * Calculates Fluo's platform fee on a completed online order.
 * - Free within the included monthly allowance.
 * - Above the allowance: applies the plan's overage percentage (e.g. 0.75% for Starter), capped at `capMinor` (default N50).
 * - Applies ONLY to completed, paid online orders.
 */
export function calculateFluoOrderFee(
  planKey: string,
  completedOrdersThisMonth: number,
  orderTotalMinor: bigint,
  entitlements = PLAN_ENTITLEMENTS,
  capMinor = DEFAULT_OVERAGE_CAP_MINOR
): OrderFeeCalculation {
  const ent = entitlements[planKey] ?? entitlements["free"]!;
  const included = typeof ent["orders_per_month"] === "number" ? ent["orders_per_month"] : Infinity;
  const overageBps = typeof ent["overage_fee_bps"] === "number" ? ent["overage_fee_bps"] : 100;

  if (completedOrdersThisMonth <= included) {
    return { isOverage: false, feeMinor: 0n, overageBps, capMinor };
  }
  const rawFee = (orderTotalMinor * BigInt(overageBps) + 9999n) / 10000n; // round up
  const feeMinor = capMinor > 0n && rawFee > capMinor ? capMinor : rawFee;
  return { isOverage: true, feeMinor, overageBps, capMinor };
}

export type UpgradePromptLevel = null | "80%" | "100%" | "120%";

export interface PlanUsageReport {
  readonly planKey: string;
  readonly usedCount: number;
  readonly includedCount: number | "unlimited";
  readonly remainingCount: number | "unlimited";
  readonly percentUsed: number;
  readonly warningLevel: UpgradePromptLevel;
  readonly isOverAllowance: boolean;
  readonly shouldPromptUpgrade: boolean;
}

/**
 * Reports current monthly transaction allowance usage and warns merchants at 80%, 100%, and 120%.
 */
export function planUsageReport(
  planKey: string,
  completedOrdersThisMonth: number,
  entitlements = PLAN_ENTITLEMENTS
): PlanUsageReport {
  const ent = entitlements[planKey] ?? entitlements["free"]!;
  const included = ent["orders_per_month"];
  if (included === "unlimited" || typeof included !== "number") {
    return {
      planKey, usedCount: completedOrdersThisMonth, includedCount: "unlimited", remainingCount: "unlimited",
      percentUsed: 0, warningLevel: null, isOverAllowance: false, shouldPromptUpgrade: false,
    };
  }
  const remaining = Math.max(0, included - completedOrdersThisMonth);
  const percentUsed = Math.round((completedOrdersThisMonth / included) * 100);
  let warningLevel: UpgradePromptLevel = null;
  if (percentUsed >= 120) warningLevel = "120%";
  else if (percentUsed >= 100) warningLevel = "100%";
  else if (percentUsed >= 80) warningLevel = "80%";

  return {
    planKey,
    usedCount: completedOrdersThisMonth,
    includedCount: included,
    remainingCount: remaining,
    percentUsed,
    warningLevel,
    isOverAllowance: completedOrdersThisMonth > included,
    shouldPromptUpgrade: percentUsed >= 80,
  };
}

/**
 * Compares the projected monthly cost of remaining on the current plan versus upgrading to the next tier.
 */
export function compareUpgradeSavings(
  currentPlanKey: string,
  targetPlanKey: string,
  projectedOrdersCount: number,
  avgOrderValueMinor: bigint,
  priceBook = PRICE_BOOK,
  entitlements = PLAN_ENTITLEMENTS,
  capMinor = DEFAULT_OVERAGE_CAP_MINOR
): { currentTotalMinor: bigint; targetTotalMinor: bigint; savingsMinor: bigint; recommended: boolean } {
  const getSub = (k: string): bigint => priceBook.find((p) => p.planKey === k && p.currency === "NGN" && p.interval === "month")?.amountMinor ?? 0n;
  const currentSub = getSub(currentPlanKey);
  const targetSub = getSub(targetPlanKey);

  const calcOverageTotal = (planKey: string): bigint => {
    const ent = entitlements[planKey] ?? entitlements["free"]!;
    const inc = typeof ent["orders_per_month"] === "number" ? ent["orders_per_month"] : Infinity;
    if (projectedOrdersCount <= inc) return 0n;
    const overageCount = BigInt(projectedOrdersCount - inc);
    const bps = BigInt(typeof ent["overage_fee_bps"] === "number" ? ent["overage_fee_bps"] : 100);
    const perOrderFee = (avgOrderValueMinor * bps + 9999n) / 10000n;
    const capped = capMinor > 0n && perOrderFee > capMinor ? capMinor : perOrderFee;
    return overageCount * capped;
  };

  const currentTotalMinor = currentSub + calcOverageTotal(currentPlanKey);
  const targetTotalMinor = targetSub + calcOverageTotal(targetPlanKey);
  const savingsMinor = currentTotalMinor > targetTotalMinor ? currentTotalMinor - targetTotalMinor : 0n;
  return {
    currentTotalMinor,
    targetTotalMinor,
    savingsMinor,
    recommended: targetTotalMinor < currentTotalMinor,
  };
}
