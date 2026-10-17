import test from "node:test";
import assert from "node:assert/strict";
import { add, allocate, format, money, parseMajor, percentBps } from "./money.ts";

test("parses decimals without floating point", () => {
  assert.equal(parseMajor("0.1", "USD").amountMinor, 10n);
  assert.equal(parseMajor("3000", "NGN").amountMinor, 300000n);
  assert.equal(parseMajor("1500", "UGX").amountMinor, 1500n);       // zero-decimal currency
  assert.equal(parseMajor("1.234", "KWD").amountMinor, 1234n);      // three-decimal currency
  assert.throws(() => parseMajor("1.234", "USD"));
});
test("rejects currency mixing and unsafe numbers", () => {
  assert.throws(() => add(money(1, "USD"), money(1, "NGN")));
  assert.throws(() => money(0.5, "USD"));
  assert.throws(() => money(1, "XXX"));
});
test("allocation always sums exactly", () => {
  const parts = allocate(money(100, "USD"), [1, 1, 1]);
  assert.equal(parts.reduce((a, p) => a + p.amountMinor, 0n), 100n);
  assert.deepEqual(parts.map((p) => p.amountMinor), [34n, 33n, 33n]);
});
test("percent in basis points rounds half up", () => {
  assert.equal(percentBps(money(10000, "NGN"), 250).amountMinor, 250n);
  assert.equal(percentBps(money(1, "NGN"), 5000).amountMinor, 1n);
});
test("formats per locale", () => {
  assert.match(format(money(300000, "NGN"), "en-NG"), /3,000\.00/);
});
