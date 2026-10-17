import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { canTransition, type NormalizedEvent, type ProviderCapabilities } from "./provider.ts";
import { NoProviderError, selectProviders, type RoutingRule } from "./router.ts";
import { receiveWebhook, verifyHmacSha512, type WebhookStore } from "./webhooks.ts";

const providers: ProviderCapabilities[] = [
  { id: "paystack", countries: ["NG", "GH", "ZA", "KE"], currencies: ["NGN", "GHS", "ZAR", "KES", "USD"] },
  { id: "stripe", countries: "*", currencies: ["USD", "GBP", "EUR", "CAD"] },
  { id: "flutterwave", countries: ["NG", "GH", "KE", "UG", "RW"], currencies: ["NGN", "GHS", "KES", "UGX", "RWF", "USD"] },
];
const rules: RoutingRule[] = [
  { countries: ["NG"], currencies: ["NGN"], providers: ["paystack", "flutterwave"] },
  { currencies: ["USD", "GBP", "EUR"], providers: ["stripe"] },
];

test("Nigeria routes to Paystack first; adding Stripe later changes nothing for NGN", () => {
  const only = new Set(["paystack"]);
  assert.deepEqual(selectProviders({ country: "NG", currency: "NGN", providers, enabled: only, rules }), ["paystack"]);
  const both = new Set(["paystack", "stripe", "flutterwave"]);
  assert.deepEqual(selectProviders({ country: "NG", currency: "NGN", providers, enabled: both, rules }), ["paystack", "flutterwave"]);
});
test("international users route to Stripe once enabled", () => {
  const enabled = new Set(["paystack", "stripe"]);
  assert.deepEqual(selectProviders({ country: "GB", currency: "GBP", providers, enabled, rules }), ["stripe"]);
});
test("unsupported market fails loudly instead of guessing", () => {
  assert.throws(() => selectProviders({ country: "GB", currency: "GBP", providers, enabled: new Set(["paystack"]), rules }), NoProviderError);
});

test("payment state machine blocks out-of-order and illegal transitions", () => {
  assert.equal(canTransition("pending", "succeeded"), true);
  assert.equal(canTransition("succeeded", "failed"), false);   // late 'failed' webhook after success
  assert.equal(canTransition("failed", "succeeded"), false);   // must go through reconciliation, not silent flip
  assert.equal(canTransition("succeeded", "refunded"), true);
});

test("HMAC signature verification", () => {
  const body = JSON.stringify({ event: "charge.success" });
  const sig = createHmac("sha512", "sk_test").update(body).digest("hex");
  assert.equal(verifyHmacSha512(body, sig, "sk_test"), true);
  assert.equal(verifyHmacSha512(body, sig, "other"), false);
  assert.equal(verifyHmacSha512(body, undefined, "sk_test"), false);
  assert.equal(verifyHmacSha512(body + " ", sig, "sk_test"), false);   // tampered body
});

test("webhook: invalid rejected, duplicate delivery ignored", async () => {
  const ev: NormalizedEvent = { provider: "paystack", eventId: "e1", type: "payment.succeeded", providerReference: "r1" };
  const seen = new Set<string>();
  const store: WebhookStore = { insertIfNew: async (p, id) => { const k = `${p}:${id}`; if (seen.has(k)) return false; seen.add(k); return true; } };
  const good = { parseWebhook: () => ev };
  const bad = { parseWebhook: () => null };
  assert.equal((await receiveWebhook(bad, store, "{}", {})).kind, "rejected");
  assert.equal((await receiveWebhook(good, store, "{}", {})).kind, "accepted");
  assert.equal((await receiveWebhook(good, store, "{}", {})).kind, "duplicate");
});
