import test from "node:test";
import assert from "node:assert/strict";
import { money } from "../money.ts";
import { canTransitionOrder, meetsLeadTime, priceCart, type CatalogueEntry } from "./orders.ts";
import { canSell, scanTicket, signTicket, verifyTicketToken } from "./tickets.ts";
import { canClaimGuestActivity, newGuestToken, tokenMatches } from "../platform/guest-access.ts";
import { IMAGE_POLICY, mediaKey, sniffImageType, validateUpload } from "../media/image-policy.ts";

const cat = new Map<string, CatalogueEntry>([
  ["cake", { price: money(3500000, "NGN"), active: true, maxPerOrder: 5 }],
  ["old", { price: money(1000, "NGN"), active: false, maxPerOrder: 5 }],
]);

test("cart is priced from the server catalogue only; hostile input is refused", () => {
  const r = priceCart(cat, [{ productId: "cake", quantity: 2 }], "NGN");
  assert.equal(r.total.amountMinor, 7000000n);
  assert.throws(() => priceCart(cat, [], "NGN"), /empty/);
  assert.throws(() => priceCart(cat, [{ productId: "old", quantity: 1 }], "NGN"), /unavailable/);
  assert.throws(() => priceCart(cat, [{ productId: "nope", quantity: 1 }], "NGN"), /unavailable/);
  assert.throws(() => priceCart(cat, [{ productId: "cake", quantity: 0 }], "NGN"), /quantity/);
  assert.throws(() => priceCart(cat, [{ productId: "cake", quantity: 99 }], "NGN"), /quantity/);
  assert.throws(() => priceCart(cat, [{ productId: "cake", quantity: 1.5 }], "NGN"), /quantity/);
  assert.throws(() => priceCart(cat, [{ productId: "cake", quantity: 1 }, { productId: "cake", quantity: 1 }], "NGN"), /duplicate/);
  assert.throws(() => priceCart(cat, [{ productId: "cake", quantity: 1 }], "USD"), /currency/);
});
test("order lifecycle differs for made-to-order and cannot skip or reopen", () => {
  assert.equal(canTransitionOrder("standard", "paid", "accepted"), true);
  assert.equal(canTransitionOrder("standard", "accepted", "in_production"), false);
  assert.equal(canTransitionOrder("made_to_order", "accepted", "ready"), false);
  assert.equal(canTransitionOrder("made_to_order", "accepted", "in_production"), true);
  assert.equal(canTransitionOrder("made_to_order", "in_production", "ready"), true);
  assert.equal(canTransitionOrder("standard", "awaiting_payment", "accepted"), false);   // never accepted before payment
  assert.equal(canTransitionOrder("standard", "cancelled", "paid"), false);
  assert.equal(canTransitionOrder("standard", "completed", "refunded"), true);
});
test("made-to-order lead time", () => {
  const H = 3600_000;
  assert.equal(meetsLeadTime(0, 48 * H, 48), true);
  assert.equal(meetsLeadTime(0, 47 * H, 48), false);
});

test("ticket sales respect capacity, window and quantity", () => {
  const t = { capacity: 100, salesStartMs: 1000, salesEndMs: 9000 };
  assert.deepEqual(canSell(t, 98, 2, 5000), { ok: true });
  assert.deepEqual(canSell(t, 99, 2, 5000), { ok: false, reason: "sold_out" });
  assert.deepEqual(canSell(t, 0, 1, 500), { ok: false, reason: "sales_not_started" });
  assert.deepEqual(canSell(t, 0, 1, 9000), { ok: false, reason: "sales_ended" });
  assert.deepEqual(canSell(t, 0, 0, 5000), { ok: false, reason: "invalid_quantity" });
});
test("QR token: valid round-trips; tampering and wrong secret fail", () => {
  const tok = signTicket("s3cret", "t1", "ev1");
  assert.deepEqual(verifyTicketToken("s3cret", tok), { ticketId: "t1", eventId: "ev1" });
  assert.equal(verifyTicketToken("other", tok), null);
  const [body, sig] = tok.split(".") as [string, string];
  const forged = Buffer.from("t2.ev1").toString("base64url");
  assert.equal(verifyTicketToken("s3cret", `${forged}.${sig}`), null);
  assert.equal(verifyTicketToken("s3cret", `${body}.AAAA`), null);
  assert.equal(verifyTicketToken("s3cret", "garbage"), null);
});
test("check-in: admits once, then reports already used; wrong event, refunded and forged are refused", () => {
  const tok = signTicket("k", "t1", "ev1");
  const valid = { id: "t1", eventId: "ev1", status: "valid" as const, usedAtMs: null };
  assert.equal(scanTicket("k", tok, "ev1", valid).result, "admitted");
  assert.equal(scanTicket("k", tok, "ev1", { ...valid, status: "used", usedAtMs: 5 }).result, "already_used");
  assert.equal(scanTicket("k", tok, "ev2", valid).result, "wrong_event");
  assert.equal(scanTicket("k", tok, "ev1", { ...valid, status: "refunded" }).result, "refunded");
  assert.equal(scanTicket("k", "forged.token", "ev1", valid).result, "invalid");
  assert.equal(scanTicket("k", tok, "ev1", null).result, "invalid");
});

test("guest links: only the hash is stored; expiry and revocation enforced", () => {
  const { token, hash } = newGuestToken();
  assert.equal(token.length >= 43, true);
  assert.equal(tokenMatches(token, hash, 2000, 1000, false), true);
  assert.equal(tokenMatches(token, hash, 2000, 2000, false), false);   // expired
  assert.equal(tokenMatches(token, hash, 2000, 1000, true), false);    // revoked
  assert.equal(tokenMatches(newGuestToken().token, hash, 2000, 1000, false), false);
});
test("guest activity can only be claimed with a verified matching email", () => {
  assert.equal(canClaimGuestActivity("Ada@x.com", { email: "ada@x.com", emailVerified: true }), true);
  assert.equal(canClaimGuestActivity("ada@x.com", { email: "ada@x.com", emailVerified: false }), false);
  assert.equal(canClaimGuestActivity("ada@x.com", { email: "eve@x.com", emailVerified: true }), false);
});

test("image uploads: type sniffed from bytes; svg/html/oversized/empty rejected", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
  const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  assert.deepEqual([sniffImageType(jpeg), sniffImageType(png), sniffImageType(webp)], ["jpeg", "png", "webp"]);
  assert.equal(validateUpload("product", new TextEncoder().encode("<svg onload=alert(1)>")).ok, false);
  assert.equal(validateUpload("product", new TextEncoder().encode("<html>")).ok, false);
  assert.deepEqual(validateUpload("product", new Uint8Array(0)), { ok: false, reason: "empty" });
  const big = new Uint8Array(IMAGE_POLICY.avatar.maxUploadBytes + 1); big.set(jpeg);
  assert.deepEqual(validateUpload("avatar", big), { ok: false, reason: "too_large" });
  assert.deepEqual(validateUpload("product", jpeg), { ok: true, type: "jpeg" });
});
test("media keys: no user filenames, private files isolated", () => {
  assert.equal(mediaKey("product", "biz-1", "asset-9", "card", "webp"), "public/biz-1/asset-9/card.webp");
  assert.equal(mediaKey("proof_of_payment", "biz-1", "a1", "detail", "webp").startsWith("private/"), true);
  assert.throws(() => mediaKey("product", "../etc", "a", "card", "webp"), /unsafe/);
});
