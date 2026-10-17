import test from "node:test";
import assert from "node:assert/strict";
import {
  generateEscrowSecrets,
  verifyEscrowPin,
  verifyEscrowQr,
  canTransitionEscrow,
} from "./escrow.ts";
import {
  calculateGroupCartTotal,
  calculateEqualShare,
  isGroupCartFullyFunded,
  recordMemberPayment,
  canTransitionGroupCart,
  type GroupCartSession,
} from "./group-cart.ts";
import {
  renderThermalReceipt,
  renderHtmlReceipt,
  type ReceiptData,
} from "./receipts.ts";

const HMAC_SECRET = "0123456789abcdef0123456789abcdef";

test("escrow: generates valid 4-digit PIN and signed QR token", () => {
  const orderId = "c2b64d11-66c6-43b6-96ec-c5806c5ee779";
  const secrets = generateEscrowSecrets(HMAC_SECRET, orderId);

  assert.equal(secrets.pin.length, 4);
  assert.match(secrets.pin, /^\d{4}$/);

  // Validate correct PIN
  assert.equal(verifyEscrowPin(HMAC_SECRET, orderId, secrets.pin, secrets.releasePinHash), true);

  // Reject wrong PIN
  const wrongPin = secrets.pin === "1234" ? "4321" : "1234";
  assert.equal(verifyEscrowPin(HMAC_SECRET, orderId, wrongPin, secrets.releasePinHash), false);

  // Validate QR token
  const qrCheck = verifyEscrowQr(HMAC_SECRET, secrets.qrToken);
  assert.equal(qrCheck.valid, true);
  assert.equal(qrCheck.orderId, orderId);

  // Reject tampered QR token
  const tampered = secrets.qrToken.slice(0, -4) + "XXXX";
  assert.equal(verifyEscrowQr(HMAC_SECRET, tampered).valid, false);
});

test("escrow: state machine transitions", () => {
  assert.equal(canTransitionEscrow("held", "released"), true);
  assert.equal(canTransitionEscrow("held", "disputed"), true);
  assert.equal(canTransitionEscrow("held", "refunded"), true);
  assert.equal(canTransitionEscrow("released", "disputed"), false);
});

test("group cart: calculations and funding tracking", () => {
  const items = [
    { id: "1", productId: "p1", name: "Jollof Rice + Chicken", unitPriceMinor: 350000n, quantity: 2, addedBy: { name: "Ada" } },
    { id: "2", productId: "p2", name: "Shawarma", unitPriceMinor: 200000n, quantity: 1, addedBy: { name: "Chidi" } },
  ];

  const total = calculateGroupCartTotal(items);
  assert.equal(total, 900000n); // (3500 * 2) + 2000 = 9000 NGN = 900,000 minor

  // Split equally between 3 people -> 300,000 each
  const share = calculateEqualShare(total, 3);
  assert.equal(share, 300000n);

  // Fractional rounding up: 10,001 / 2 = 5,001
  assert.equal(calculateEqualShare(10001n, 2), 5001n);

  let session: GroupCartSession = {
    id: "g-1",
    shortCode: "grp_test",
    businessId: "b-1",
    hostUserId: "u-1",
    hostName: "Ada",
    hostEmail: "ada@fluo.ng",
    splitKind: "equal",
    targetAmountMinor: 900000n,
    fundedAmountMinor: 0n,
    currency: "NGN",
    status: "open",
    items,
    contributions: [
      { id: "c1", contributorName: "Ada", contributorEmail: "ada@fluo.ng", amountMinor: 300000n, paymentId: null, status: "pending", paidAtMs: null },
      { id: "c2", contributorName: "Chidi", contributorEmail: "chidi@fluo.ng", amountMinor: 300000n, paymentId: null, status: "pending", paidAtMs: null },
      { id: "c3", contributorName: "Tunde", contributorEmail: "tunde@fluo.ng", amountMinor: 300000n, paymentId: null, status: "pending", paidAtMs: null },
    ],
    createdAtMs: Date.now(),
    expiresAtMs: Date.now() + 7200000,
  };

  assert.equal(isGroupCartFullyFunded(session), false);

  // Ada pays
  session = recordMemberPayment(session, "c1", "pay-1", Date.now());
  assert.equal(session.fundedAmountMinor, 300000n);
  assert.equal(isGroupCartFullyFunded(session), false);

  // Chidi & Tunde pay
  session = recordMemberPayment(session, "c2", "pay-2", Date.now());
  session = recordMemberPayment(session, "c3", "pay-3", Date.now());
  assert.equal(session.fundedAmountMinor, 900000n);
  assert.equal(session.status, "funded");
  assert.equal(isGroupCartFullyFunded(session), true);
});

test("receipts: thermal and HTML rendering prominently shows business name and Powered by Fluo", () => {
  const data: ReceiptData = {
    receiptNumber: "RCP-20261017-0042",
    businessName: "Mama Put Delight",
    businessSlug: "mama-put",
    timezone: "Africa/Lagos",
    currency: "NGN",
    issuedAtMs: Date.UTC(2026, 9, 17, 10, 0),
    customerName: "Obi Emeka",
    items: [
      { name: "Special Jollof + Turkey", quantity: 2, unitPriceMinor: 400000n, lineTotalMinor: 800000n },
      { name: "Fresh Zobo Drink", quantity: 2, unitPriceMinor: 50000n, lineTotalMinor: 100000n },
    ],
    subtotalMinor: 900000n,
    totalMinor: 900000n,
    paymentMethod: "provider",
    paymentReference: "T123456789",
    escrowStatus: "held",
  };

  const thermal = renderThermalReceipt(data);
  assert.ok(thermal.includes("MAMA PUT DELIGHT"), "thermal receipt has business name in uppercase");
  assert.ok(thermal.includes("Powered by Fluo"), "thermal receipt has Powered by Fluo branding");
  assert.ok(thermal.includes("HELD IN FLUO ESCROW"), "thermal receipt mentions escrow status");

  const html = renderHtmlReceipt(data);
  assert.ok(html.includes("Mama Put Delight"), "html receipt has business name");
  assert.ok(html.includes("Powered by Fluo"), "html receipt has Powered by Fluo branding");
  assert.ok(html.includes("Protected by Fluo Escrow"), "html receipt has escrow badge");
});
