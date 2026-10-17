import test from "node:test";
import assert from "node:assert/strict";
import { isBusinessOpenNow, DEFAULT_WEEKLY_SCHEDULE } from "./operating-hours.ts";

test("operating hours: open on a weekday afternoon in Lagos", () => {
  // Friday Oct 16, 2026, 14:30 Lagos time (UTC+1 -> 13:30 UTC)
  const fridayAfternoonMs = Date.UTC(2026, 9, 16, 13, 30);
  const status = isBusinessOpenNow(DEFAULT_WEEKLY_SCHEDULE, "Africa/Lagos", fridayAfternoonMs);
  assert.equal(status.isOpen, true);
  assert.equal(status.day, "fri");
  assert.equal(status.localTime, "14:30");
  assert.equal(status.label, "Open now (until 20:00)");
});

test("operating hours: closed before opening hours", () => {
  // Monday Oct 12, 2026, 06:15 Lagos time (UTC+1 -> 05:15 UTC)
  const mondayEarlyMs = Date.UTC(2026, 9, 12, 5, 15);
  const status = isBusinessOpenNow(DEFAULT_WEEKLY_SCHEDULE, "Africa/Lagos", mondayEarlyMs);
  assert.equal(status.isOpen, false);
  assert.equal(status.day, "mon");
  assert.equal(status.localTime, "06:15");
  assert.equal(status.label, "Closed (opens at 08:00)");
});

test("operating hours: closed after closing hours", () => {
  // Wednesday Oct 14, 2026, 21:45 Lagos time (UTC+1 -> 20:45 UTC)
  const wedNightMs = Date.UTC(2026, 9, 14, 20, 45);
  const status = isBusinessOpenNow(DEFAULT_WEEKLY_SCHEDULE, "Africa/Lagos", wedNightMs);
  assert.equal(status.isOpen, false);
  assert.equal(status.day, "wed");
  assert.equal(status.localTime, "21:45");
  assert.equal(status.label, "Closed (closed at 20:00)");
});

test("operating hours: closed all day on Sunday by default", () => {
  // Sunday Oct 18, 2026, 14:00 Lagos time (UTC+1 -> 13:00 UTC)
  const sundayMs = Date.UTC(2026, 9, 18, 13, 0);
  const status = isBusinessOpenNow(DEFAULT_WEEKLY_SCHEDULE, "Africa/Lagos", sundayMs);
  assert.equal(status.isOpen, false);
  assert.equal(status.day, "sun");
  assert.equal(status.label, "Closed today");
});

test("operating hours: custom schedule overrides default", () => {
  // Sunday with open schedule for Sunday restaurant / bakery
  const sundayOpenSchedule = {
    ...DEFAULT_WEEKLY_SCHEDULE,
    sun: { open: true, openTime: "10:00", closeTime: "22:00" },
  };
  const sundayMs = Date.UTC(2026, 9, 18, 13, 0); // 14:00 in Lagos
  const status = isBusinessOpenNow(sundayOpenSchedule, "Africa/Lagos", sundayMs);
  assert.equal(status.isOpen, true);
  assert.equal(status.day, "sun");
  assert.equal(status.label, "Open now (until 22:00)");
});
