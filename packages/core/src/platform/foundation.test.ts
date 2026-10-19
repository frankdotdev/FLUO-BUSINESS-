import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { isValidTimezone, localMidnight, stayToInterval, zonedToInstant } from "./timezone.ts";
import { emailDecision, shouldAlertOps } from "./email-budget.ts";
import { decryptField, encryptField } from "./crypto-fields.ts";
import { TRIAL_DAYS, effectivePlanKey, newTrial, overLimitReport, reminderTimes, trialEligible, trialState } from "../billing/trial.ts";
import { PLAN_ENTITLEMENTS } from "../billing/plans.ts";
import { isTransferReference, newTransferReference } from "../payments/transfer.ts";
import { canTransition } from "../payments/provider.ts";

const H = 3_600_000;

test("timezones: a Lagos hotel's 14:00 check-in is 13:00 UTC (no daylight saving)", () => {
  const r = zonedToInstant({ year: 2026, month: 10, day: 12, hour: 14, minute: 0 }, "Africa/Lagos");
  assert.deepEqual(r, { ok: true, instantMs: Date.UTC(2026, 9, 12, 13, 0), ambiguous: false });
  assert.equal(localMidnight("2026-10-12", "Africa/Lagos"), Date.UTC(2026, 9, 11, 23, 0));
});
test("timezones: daylight-saving zones shift correctly, gaps are refused, repeats are flagged", () => {
  assert.equal((zonedToInstant({ year: 2026, month: 7, day: 1, hour: 12, minute: 0 }, "Europe/London") as any).instantMs, Date.UTC(2026, 6, 1, 11, 0));   // BST
  assert.equal((zonedToInstant({ year: 2026, month: 12, day: 1, hour: 12, minute: 0 }, "Europe/London") as any).instantMs, Date.UTC(2026, 11, 1, 12, 0));
  assert.deepEqual(zonedToInstant({ year: 2026, month: 3, day: 8, hour: 2, minute: 30 }, "America/New_York"), { ok: false, reason: "nonexistent_local_time" });
  const amb = zonedToInstant({ year: 2026, month: 11, day: 1, hour: 1, minute: 30 }, "America/New_York", "earlier") as any;
  assert.equal(amb.ambiguous, true);
  const later = zonedToInstant({ year: 2026, month: 11, day: 1, hour: 1, minute: 30 }, "America/New_York", "later") as any;
  assert.equal(later.instantMs - amb.instantMs, H);
});
test("hotel stay uses the property's timezone; bad input is refused", () => {
  const s = stayToInterval({ checkInDate: "2026-10-12", checkOutDate: "2026-10-14", checkInTime: "14:00", checkOutTime: "11:00", timezone: "Africa/Lagos" });
  assert.equal(s.end - s.start, 45 * H);
  assert.throws(() => stayToInterval({ checkInDate: "2026-10-14", checkOutDate: "2026-10-12", checkInTime: "14:00", checkOutTime: "11:00", timezone: "Africa/Lagos" }), /after/);
  assert.throws(() => stayToInterval({ checkInDate: "2026-02-30", checkOutDate: "2026-03-02", checkInTime: "14:00", checkOutTime: "11:00", timezone: "Africa/Lagos" }), /invalid_date/);
  assert.throws(() => stayToInterval({ checkInDate: "2026-10-12", checkOutDate: "2026-10-13", checkInTime: "25:00", checkOutTime: "11:00", timezone: "Africa/Lagos" }), /invalid_time/);
  assert.equal(isValidTimezone("Africa/Lagos"), true);
  assert.equal(isValidTimezone("Mars/Base"), false);
});

test("email budget protects critical mail as the 500/day cap nears", () => {
  assert.equal(emailDecision(100, "marketing"), "send");
  assert.equal(emailDecision(300, "marketing"), "defer");     // 60% of cap
  assert.equal(emailDecision(300, "important"), "send");
  assert.equal(emailDecision(460, "important"), "defer");     // 90%
  assert.equal(emailDecision(499, "critical"), "send");
  assert.equal(emailDecision(500, "critical"), "defer");
  assert.equal(shouldAlertOps(399), false); assert.equal(shouldAlertOps(400), true);
});

test("field encryption: round trip, rotation, tamper and wrong-key failures", () => {
  const k1 = randomBytes(32), k2 = randomBytes(32);
  const ring = { k1, k2 };
  const stored = encryptField(ring, "k1", "0123456789");
  assert.equal(decryptField(ring, stored), "0123456789");
  assert.notEqual(encryptField(ring, "k1", "0123456789"), stored);          // fresh nonce each time
  assert.equal(decryptField(ring, encryptField(ring, "k2", "x")), "x");     // old and new keys coexist
  const parts = stored.split(":"); parts[4] = Buffer.from("tampered!!").toString("base64url");
  assert.throws(() => decryptField(ring, parts.join(":")));
  assert.throws(() => decryptField({ k1: randomBytes(32) }, stored));
  assert.throws(() => encryptField({ k1: randomBytes(16) }, "k1", "x"), /invalid_key/);
  assert.throws(() => decryptField(ring, "v1:k1:only"), /invalid_format/);
});

test("trial: 30 days from publish, plan switching, reminders, one trial per owner", () => {
  const t = newTrial("b1", "u1", 0);
  assert.equal(t.endsMs, TRIAL_DAYS * 24 * H);
  const s = trialState(t, 5 * 24 * H);
  assert.deepEqual(s, { status: "active", daysLeft: 25, endsMs: t.endsMs });
  assert.equal(trialState(t, t.endsMs).status, "ended");
  assert.equal(trialState(null, 0).status, "none");
  assert.equal(effectivePlanKey(null, t, 0), "growth");
  assert.equal(effectivePlanKey(null, t, t.endsMs), "free");
  assert.equal(effectivePlanKey("starter", t, t.endsMs), "starter");
  assert.deepEqual(reminderTimes(t).map((r) => r.offsetDays), [-7, -3, -1, 0, 7]);
  assert.equal(trialEligible(0), true); assert.equal(trialEligible(1), false);
});
test("after the trial, items over the free limit are paused, never deleted", () => {
  const free = PLAN_ENTITLEMENTS["free"]!;
  assert.deepEqual(overLimitReport(free, { listings: 37, staff_seats: 1 }), { listings: { limit: 10, usage: 37, toPause: 27 } });
  assert.deepEqual(overLimitReport(free, { listings: 10 }), {});
});

test("transfer references are readable and valid; transfer payment states", () => {
  const r = newTransferReference();
  assert.equal(isTransferReference(r), true);
  assert.equal(isTransferReference("FLU-0O1IL1"), false);
  assert.equal(canTransition("created", "awaiting_confirmation"), true);
  assert.equal(canTransition("awaiting_confirmation", "succeeded"), true);
  assert.equal(canTransition("awaiting_confirmation", "created"), false);
});
