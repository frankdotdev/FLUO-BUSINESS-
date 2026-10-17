import test from "node:test";
import assert from "node:assert/strict";
import { money } from "../money.ts";
import { planEventSplit, planStandardSplit, toPaystackSplit } from "./fees.ts";
import { allowedMethods } from "./methods.ts";
import { PAYSTACK, POLAR_BILLING, BILLING_RULES, MARKETPLACE_RULES } from "./defaults.ts";
import { NoProviderError, selectProviders } from "./router.ts";
import { EVENT_FEE_BPS } from "../billing/plans.ts";

test("2% event fee: N5,000 ticket -> N100 to Fluo; the business always bears the provider fee", () => {
  const plan = planEventSplit(money(500000, "NGN"), EVENT_FEE_BPS);
  assert.equal(plan.platformFee.amountMinor, 10000n);
  assert.deepEqual(toPaystackSplit(plan, "ACCT_x"), { subaccount: "ACCT_x", transaction_charge: 10000, bearer: "subaccount" });
});
test("free tickets and ordinary orders carry no Fluo fee", () => {
  assert.equal(planEventSplit(money(0, "NGN"), EVENT_FEE_BPS).platformFee.amountMinor, 0n);
  assert.equal(planStandardSplit(money(1234500, "NGN")).platformFee.amountMinor, 0n);
});
test("payment method rules: paid tickets are Paystack-only; transfers only where the business allows", () => {
  assert.deepEqual(allowedMethods("ticket", 500000n, { provider: true, transfer: true }), ["provider"]);
  assert.deepEqual(allowedMethods("subscription", 300000n, { provider: true, transfer: true }), ["provider"]);
  assert.deepEqual(allowedMethods("order", 100000n, { provider: true, transfer: true }), ["provider", "bank_transfer"]);
  assert.deepEqual(allowedMethods("order", 100000n, { provider: true, transfer: false }), ["provider"]);
  assert.deepEqual(allowedMethods("ticket", 0n, { provider: true, transfer: true }), []);
});

test("Paystack-only today: NG/GH/KE/ZA businesses route; others have no marketplace provider", () => {
  const args = { providers: [PAYSTACK], enabled: new Set(["paystack"]), rules: MARKETPLACE_RULES };
  assert.deepEqual(selectProviders({ country: "NG", currency: "NGN", ...args }), ["paystack"]);
  assert.deepEqual(selectProviders({ country: "KE", currency: "USD", ...args }), ["paystack"]);
  assert.throws(() => selectProviders({ country: "GH", currency: "USD", ...args }), NoProviderError);
  assert.throws(() => selectProviders({ country: "GB", currency: "GBP", ...args }), NoProviderError);
});
test("subscription billing: Nigerian business pays via Paystack; once Polar is enabled, others pay in USD", () => {
  const providers = [PAYSTACK, POLAR_BILLING];
  assert.deepEqual(selectProviders({ country: "NG", currency: "NGN", providers, enabled: new Set(["paystack"]), rules: BILLING_RULES }), ["paystack"]);
  assert.throws(() => selectProviders({ country: "GB", currency: "USD", providers, enabled: new Set(["paystack"]), rules: BILLING_RULES }), NoProviderError);
  assert.deepEqual(selectProviders({ country: "GB", currency: "USD", providers, enabled: new Set(["paystack", "polar"]), rules: BILLING_RULES }), ["polar"]);
});
