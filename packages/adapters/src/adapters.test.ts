import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { money, selectProviders } from "@fluo/core";
import { createPaystackProvider, listPaystackBanks } from "./paystack.ts";
import { createEmailProvider, createResendProvider } from "./email.ts";
import { createExpoPushProvider } from "./expo-push.ts";
import { ProviderRegistry, assertProviderContract } from "./registry.ts";
import type { Fetch } from "./http.ts";

interface Seen { url: string; method?: string; headers: Record<string, string>; body: any }
function fakeFetch(responses: { status?: number; json: unknown }[]) {
  const seen: Seen[] = []; let i = 0;
  const f: Fetch = async (url, init) => {
    seen.push({ url, method: init?.method, headers: (init?.headers ?? {}) as Record<string, string>, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const r = responses[Math.min(i++, responses.length - 1)]!;
    return new Response(JSON.stringify(r.json), { status: r.status ?? 200, headers: { "content-type": "application/json" } });
  };
  return { f, seen };
}

test("paystack initialize: automatic payment splits to the business sub-account; business bears the fee", async () => {
  const { f, seen } = fakeFetch([{ json: { status: true, data: { authorization_url: "https://checkout.paystack.com/abc", reference: "r1" } } }]);
  const p = createPaystackProvider({ secretKey: "sk_test_x", fetch: f });
  const out = await p.initialize({ reference: "r1", amount: money(500000, "NGN"), customerEmail: "a@x.com", callbackUrl: "https://fluo/cb", split: { subaccount: "ACCT_1", platformFee: money(10000, "NGN") } });
  assert.equal(out.checkoutUrl, "https://checkout.paystack.com/abc");
  assert.equal(seen[0]!.url, "https://api.paystack.co/transaction/initialize");
  assert.equal(seen[0]!.headers["authorization"], "Bearer sk_test_x");
  assert.deepEqual(seen[0]!.body, { email: "a@x.com", amount: 500000, currency: "NGN", reference: "r1", callback_url: "https://fluo/cb", subaccount: "ACCT_1", transaction_charge: 10000, bearer: "subaccount" });
  const plain = fakeFetch([{ json: { status: true, data: { authorization_url: "u" } } }]);
  await createPaystackProvider({ secretKey: "k", fetch: plain.f }).initialize({ reference: "r2", amount: money(100, "NGN"), customerEmail: "a@x.com", callbackUrl: "c" });
  assert.equal("subaccount" in plain.seen[0]!.body, false);          // subscriptions: no split
});
test("paystack verify maps statuses and keeps exact minor units", async () => {
  const mk = (status: string) => createPaystackProvider({ secretKey: "k", fetch: fakeFetch([{ json: { status: true, data: { status, amount: 500000, currency: "NGN" } } }]).f });
  assert.deepEqual(await mk("success").verify("r1"), { status: "succeeded", amount: money(500000, "NGN") });
  assert.equal((await mk("failed").verify("r1")).status, "failed");
  assert.equal((await mk("abandoned").verify("r1")).status, "pending");
  const { f, seen } = fakeFetch([{ json: { status: true, data: { status: "success", amount: 1, currency: "NGN" } } }]);
  await createPaystackProvider({ secretKey: "k", fetch: f }).verify("a/b c");
  assert.equal(seen[0]!.url, "https://api.paystack.co/transaction/verify/a%2Fb%20c", "reference is URL-encoded");
});
test("paystack webhook: signature required; success/failed/other mapped; tampering rejected", () => {
  const p = createPaystackProvider({ secretKey: "sk_test_x" });
  const body = JSON.stringify({ event: "charge.success", data: { id: 99, reference: "r1", amount: 500000, currency: "NGN" } });
  const sig = createHmac("sha512", "sk_test_x").update(body).digest("hex");
  assert.deepEqual(p.parseWebhook(body, { "x-paystack-signature": sig }), { provider: "paystack", eventId: "charge.success:99", type: "payment.succeeded", providerReference: "r1", amount: money(500000, "NGN") });
  assert.equal(p.parseWebhook(body, { "x-paystack-signature": "00" }), null);
  assert.equal(p.parseWebhook(body, {}), null);
  assert.equal(p.parseWebhook(body + " ", { "x-paystack-signature": sig }), null);
  const other = JSON.stringify({ event: "transfer.success", data: { reference: "r2" } });
  assert.equal(p.parseWebhook(other, { "x-paystack-signature": createHmac("sha512", "sk_test_x").update(other).digest("hex") })!.type, "other");
  const junk = "not json"; assert.equal(p.parseWebhook(junk, { "x-paystack-signature": createHmac("sha512", "sk_test_x").update(junk).digest("hex") }), null);
});
test("paystack account lookup and sub-account creation; errors never leak the secret", async () => {
  const a = fakeFetch([{ json: { status: true, data: { account_name: "FRANK OKON" } } }, { json: { status: true, data: { subaccount_code: "ACCT_9", account_name: "FRANK OKON" } } }]);
  const p = createPaystackProvider({ secretKey: "sk_live_secret", fetch: a.f });
  assert.deepEqual(await p.resolveAccount!({ bankCode: "058", accountNumber: "0123456789" }), { accountName: "FRANK OKON" });
  assert.equal(a.seen[0]!.url, "https://api.paystack.co/bank/resolve?account_number=0123456789&bank_code=058");
  assert.deepEqual(await p.createSubaccount!({ businessName: "Frank Bakes", bankCode: "058", accountNumber: "0123456789" }), { ref: "ACCT_9", accountName: "FRANK OKON" });
  assert.deepEqual(a.seen[1]!.body, { business_name: "Frank Bakes", settlement_bank: "058", account_number: "0123456789", percentage_charge: 0 });
  const bad = createPaystackProvider({ secretKey: "sk_live_secret", fetch: fakeFetch([{ status: 401, json: { message: "Invalid key" } }]).f });
  await assert.rejects(() => bad.verify("r"), (e: Error) => /401/.test(e.message) && !e.message.includes("sk_live_secret"));
  assert.throws(() => createPaystackProvider({ secretKey: "" }));
});

test("email: Resend when a key exists, Gmail SMTP otherwise, a loud error when neither", async () => {
  const sent: any[] = [];
  const transport = { sendMail: async (m: any) => { sent.push(m); } };
  const smtp = createEmailProvider({ GMAIL_USER: "fluo@gmail.com", GMAIL_APP_PASSWORD: "app-pass" }, () => transport);
  await smtp.send({ to: "a@x.com", subject: "S", html: "<p>h</p>", text: "t" });
  assert.deepEqual(sent[0], { from: "Fluo <fluo@gmail.com>", to: "a@x.com", subject: "S", html: "<p>h</p>", text: "t" });
  const r = fakeFetch([{ json: { id: "em_1" } }]);
  const resend = createEmailProvider({ RESEND_API_KEY: "re_x", EMAIL_FROM: "Fluo <hello@fluo.app>", GMAIL_USER: "u", GMAIL_APP_PASSWORD: "p" }, () => { throw new Error("must not use SMTP"); }, r.f);
  await resend.send({ to: "a@x.com", subject: "S", html: "h", text: "t" });
  assert.equal(r.seen[0]!.url, "https://api.resend.com/emails");
  assert.equal(r.seen[0]!.headers["authorization"], "Bearer re_x");
  assert.deepEqual(r.seen[0]!.body, { from: "Fluo <hello@fluo.app>", to: ["a@x.com"], subject: "S", html: "h", text: "t" });
  assert.throws(() => createEmailProvider({}, () => transport), /No email provider configured/);
  assert.throws(() => createEmailProvider({ RESEND_API_KEY: "re_x" }, () => transport), /EMAIL_FROM/);
  await assert.rejects(() => createResendProvider({ apiKey: "k", from: "f", fetch: fakeFetch([{ status: 422, json: { message: "bad" } }]).f }).send({ to: "a@x.com", subject: "s", html: "h", text: "t" }));
});
test("expo push: chunks, drops malformed tokens, reports unregistered devices", async () => {
  const good = "ExponentPushToken[abc]", gone = "ExponentPushToken[old]";
  const { f, seen } = fakeFetch([{ json: { data: [{ status: "ok" }, { status: "error", details: { error: "DeviceNotRegistered" } }] } }]);
  const push = createExpoPushProvider({ fetch: f });
  const r = await push.send([{ token: good, title: "T", body: "B" }, { token: gone, title: "T", body: "B", data: { path: "/x" } }, { token: "garbage", title: "T", body: "B" }]);
  assert.deepEqual(r.invalidTokens.sort(), [gone, "garbage"].sort());
  assert.equal(seen[0]!.body.length, 2);
  assert.equal(seen[0]!.body[1].data.path, "/x");
  const many = fakeFetch([{ json: { data: [] } }]);
  await createExpoPushProvider({ fetch: many.f }).send(Array.from({ length: 250 }, (_, i) => ({ token: `ExponentPushToken[t${i}]`, title: "T", body: "B" })));
  assert.equal(many.seen.length, 3);
});

test("registry: adapters must satisfy the contract; adding a provider is one entry plus a routing rule", () => {
  const paystack = createPaystackProvider({ secretKey: "k" });
  const flutterwaveLike = { ...paystack, id: "flutterwave", pairs: ["UG:UGX"], countries: ["UG"], currencies: ["UGX"] };
  const reg = new ProviderRegistry([paystack, flutterwaveLike]);
  assert.equal(reg.get("paystack").id, "paystack");
  assert.throws(() => reg.get("stripe"), /not configured/);
  assert.throws(() => new ProviderRegistry([paystack, paystack]), /duplicate/);
  assert.throws(() => assertProviderContract({ ...paystack, verify: undefined as any }), /must implement verify/);
  const ids = selectProviders({ country: "UG", currency: "UGX", providers: reg.list(), enabled: reg.ids(), rules: [] });
  assert.deepEqual(ids, ["flutterwave"]);
});

test("bank list: sorted, inactive banks dropped", async () => {
  const { f, seen } = fakeFetch([{ json: { status: true, data: [{ name: "Zenith Bank", code: "057", active: true }, { name: "Access Bank", code: "044", active: true }, { name: "Old Bank", code: "999", active: false }] } }]);
  assert.deepEqual(await listPaystackBanks({ secretKey: "k", fetch: f }), [{ name: "Access Bank", code: "044" }, { name: "Zenith Bank", code: "057" }]);
  assert.match(seen[0]!.url, /\/bank\?country=nigeria/);
});
