import test from "node:test";
import assert from "node:assert/strict";
import { checkLimit, resolvePrice, type PricePoint } from "./pricing.ts";
import { PRICE_BOOK, PLAN_ENTITLEMENTS } from "./plans.ts";

test("resolves price per currency; country override wins; missing price is an error (no silent FX)", () => {
  const book: PricePoint[] = [...PRICE_BOOK, { planKey: "starter", currency: "USD", interval: "month", amountMinor: 300n, country: "GH" }];
  assert.equal(resolvePrice(book, "starter", "NGN", "month").amountMinor, 300000n);
  assert.equal(resolvePrice(book, "starter", "USD", "month").amountMinor, 500n);
  assert.equal(resolvePrice(book, "starter", "USD", "month", "GH").amountMinor, 300n);
  assert.throws(() => resolvePrice(book, "starter", "EUR", "month"));
});
test("entitlements are enforced from plan data", () => {
  const free = PLAN_ENTITLEMENTS["free"]!;
  assert.equal(checkLimit(free, "listings", 9).allowed, true);
  assert.equal(checkLimit(free, "listings", 10).reason, "limit_reached");
  assert.equal(checkLimit(free, "custom_domain", 0).reason, "not_in_plan");
  assert.equal(checkLimit(PLAN_ENTITLEMENTS["business"]!, "listings", 1e9).allowed, true);
});

test("decided NGN prices: Starter 3k, Growth 10k, Business 25k per month", () => {
  for (const [plan, minor] of [["starter", 300000n], ["growth", 1000000n], ["business", 2500000n]] as const) {
    assert.equal(resolvePrice(PRICE_BOOK, plan, "NGN", "month").amountMinor, minor);
  }
});

test("decided USD prices: Starter $5, Growth $15, Business $35 per month", () => {
  for (const [plan, minor] of [["starter", 500n], ["growth", 1500n], ["business", 3500n]] as const) {
    assert.equal(resolvePrice(PRICE_BOOK, plan, "USD", "month").amountMinor, minor);
  }
});

test("Fluo order fee: zero within allowance, applies overage percentage capped at N50 above allowance", async () => {
  const { calculateFluoOrderFee } = await import("./plans.ts");
  // Starter has 100 orders included, 0.75% overage fee, N50 (5000 minor) cap
  // Order 90: within allowance -> 0 fee
  const f1 = calculateFluoOrderFee("starter", 90, 500000n); // N5,000 order
  assert.equal(f1.isOverage, false);
  assert.equal(f1.feeMinor, 0n);

  // Order 101: over allowance -> 0.75% of N5,000 = N37.50 -> 3750 minor
  const f2 = calculateFluoOrderFee("starter", 101, 500000n);
  assert.equal(f2.isOverage, true);
  assert.equal(f2.feeMinor, 3750n);

  // High-value order: 0.75% of N100,000 is N750, but capped at N50 (5000 minor)
  const f3 = calculateFluoOrderFee("starter", 102, 10000000n);
  assert.equal(f3.isOverage, true);
  assert.equal(f3.feeMinor, 5000n, "Fluo fee must be capped at N50");

  // Free plan: 30 included, 1% fee after
  const fFreeWithin = calculateFluoOrderFee("free", 30, 200000n);
  assert.equal(fFreeWithin.isOverage, false);
  const fFreeOver = calculateFluoOrderFee("free", 31, 200000n); // 1% of N2,000 = N20 (2000 minor)
  assert.equal(fFreeOver.isOverage, true);
  assert.equal(fFreeOver.feeMinor, 2000n);
});

test("plan usage reports warnings at 80%, 100%, 120%", async () => {
  const { planUsageReport } = await import("./plans.ts");
  // Starter: 100 included
  const r79 = planUsageReport("starter", 79);
  assert.equal(r79.warningLevel, null);
  assert.equal(r79.shouldPromptUpgrade, false);

  const r80 = planUsageReport("starter", 80);
  assert.equal(r80.warningLevel, "80%");
  assert.equal(r80.shouldPromptUpgrade, true);

  const r100 = planUsageReport("starter", 100);
  assert.equal(r100.warningLevel, "100%");
  assert.equal(r100.isOverAllowance, false);

  const r105 = planUsageReport("starter", 105);
  assert.equal(r105.isOverAllowance, true);
  assert.equal(r105.warningLevel, "100%");

  const r125 = planUsageReport("starter", 125);
  assert.equal(r125.warningLevel, "120%");
});

test("compareUpgradeSavings recommends upgrade when excess overage exceeds subscription delta", async () => {
  const { compareUpgradeSavings } = await import("./plans.ts");
  // On Starter (N3,000 sub, 100 included), processing 300 orders averaging N10,000
  // Excess: 200 orders * N50 cap = N10,000 in overage fees -> Total Starter = N13,000
  // On Growth: N10,000 sub, 300 included -> Total Growth = N10,000
  // Savings: N3,000!
  const cmp = compareUpgradeSavings("starter", "growth", 300, 1000000n);
  assert.equal(cmp.currentTotalMinor, 1300000n);
  assert.equal(cmp.targetTotalMinor, 1000000n);
  assert.equal(cmp.savingsMinor, 300000n);
  assert.equal(cmp.recommended, true);
});
