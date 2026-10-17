import test from "node:test";
import assert from "node:assert/strict";
import { money } from "../money.ts";
import { describePolicy, refundAmount, refundBps, validateRefundPolicy } from "./refund-policy.ts";
import { namesLikelyMatch } from "./name-match.ts";
import { breakdown } from "../billing/tax.ts";
import { extendPaidUntil, isPaid, paidPlanKey, renewalReminderTimes, type Subscription } from "../billing/subscription.ts";
import { allowedMethods } from "../payments/methods.ts";

const H = 3_600_000, D = 24 * H;

test("refund policies: none, full-until, tiered; rounds down; text for customers", () => {
  const none = validateRefundPolicy({ kind: "none" });
  const full = validateRefundPolicy({ kind: "full_until", hoursBefore: 24 });
  const tiered = validateRefundPolicy({ kind: "tiered", tiers: [{ hoursBefore: 24, percentBps: 5000 }, { hoursBefore: 72, percentBps: 10000 }] });
  assert.equal(refundBps(none, 100 * H, 0), 0);
  assert.equal(refundBps(full, 25 * H, 0), 10000); assert.equal(refundBps(full, 23 * H, 0), 0);
  assert.equal(refundBps(tiered, 80 * H, 0), 10000); assert.equal(refundBps(tiered, 30 * H, 0), 5000); assert.equal(refundBps(tiered, 5 * H, 0), 0);
  assert.equal(refundBps(full, null, 0), 10000);                       // an order with no schedule: the generous tier
  assert.equal(refundAmount(tiered, money(3333, "NGN"), 30 * H, 0).amountMinor, 1666n);
  assert.match(describePolicy(full), /24 hours/); assert.match(describePolicy(none), /does not offer/); assert.match(describePolicy(tiered), /50% if you cancel at least 24/);
  for (const bad of [null, {}, { kind: "full_until", hoursBefore: -1 }, { kind: "full_until", hoursBefore: 1.5 }, { kind: "tiered", tiers: [] }, { kind: "tiered", tiers: [{ hoursBefore: 1, percentBps: 20000 }] }, { kind: "tiered", tiers: [{ hoursBefore: 1, percentBps: 1 }, { hoursBefore: 1, percentBps: 2 }] }]) {
    assert.throws(() => validateRefundPolicy(bad), /invalid_refund_policy/);
  }
});

test("payout name matching is conservative", () => {
  assert.equal(namesLikelyMatch("FRANK ADEBAYO OKON", "Frank Okon"), true);
});
test("payout name matching: typical cases", () => {
  assert.equal(namesLikelyMatch("ADA OBI", "Ada Obi"), true);
  assert.equal(namesLikelyMatch("OKON FRANK", "Frank Okon Enterprises"), true);
  assert.equal(namesLikelyMatch("Tunde Bello", "Frank Okon"), false);
  assert.equal(namesLikelyMatch("Frank", "Frank Okon Bakery"), false);                        // a lone first name is not enough
  assert.equal(namesLikelyMatch("", "x y"), false);
});

test("tax: inclusive prices are split, exclusive prices get tax added; rounding stays exact", () => {
  const inc = breakdown(money(300000, "NGN"), 750, "inclusive");     // illustrative 7.5% rate
  assert.equal(inc.net.amountMinor + inc.tax.amountMinor, 300000n);
  assert.equal(inc.gross.amountMinor, 300000n);
  const exc = breakdown(money(300000, "NGN"), 750, "exclusive");
  assert.equal(exc.tax.amountMinor, 22500n); assert.equal(exc.gross.amountMinor, 322500n);
  assert.equal(breakdown(money(1000, "USD"), 0, "inclusive").tax.amountMinor, 0n);
  assert.throws(() => breakdown(money(1, "USD"), -1, "inclusive"), /invalid_rate/);
});

test("subscriptions: renewing early keeps remaining time; lapsed starts fresh; cancel stops reminders", () => {
  const now = 100 * D;
  assert.equal(extendPaidUntil(null, now, "month"), now + 30 * D);
  assert.equal(extendPaidUntil(now + 10 * D, now, "month"), now + 40 * D);
  assert.equal(extendPaidUntil(now - 5 * D, now, "year"), now + 365 * D);
  const sub: Subscription = { businessId: "b", planKey: "starter", paidUntilMs: now + 10 * D, cancelAtPeriodEnd: false, currency: "NGN" };
  assert.equal(isPaid(sub, now), true); assert.equal(paidPlanKey(sub, now + 11 * D), null);
  assert.equal(renewalReminderTimes(sub).length, 4);
  assert.deepEqual(renewalReminderTimes({ ...sub, cancelAtPeriodEnd: true }), []);
});

test("payment modes: the business chooses automatic, manual, or both", () => {
  assert.deepEqual(allowedMethods("order", 100n, { provider: true, transfer: true }), ["provider", "bank_transfer"]);
  assert.deepEqual(allowedMethods("order", 100n, { provider: false, transfer: true }), ["bank_transfer"]);
  assert.deepEqual(allowedMethods("booking", 100n, { provider: true, transfer: false }), ["provider"]);
  assert.deepEqual(allowedMethods("ticket", 100n, { provider: true, transfer: true }), ["provider"]);
  assert.deepEqual(allowedMethods("ticket", 100n, { provider: false, transfer: true }), []);     // manual-only business cannot sell paid tickets
  assert.deepEqual(allowedMethods("subscription", 100n, { provider: true, transfer: true }), ["provider"]);
  assert.deepEqual(allowedMethods("order", 0n, { provider: true, transfer: true }), []);
});
