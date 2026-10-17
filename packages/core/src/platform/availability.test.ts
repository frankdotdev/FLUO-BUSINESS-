import test from "node:test";
import assert from "node:assert/strict";
import { allocateResource, freeResources, isFree, overlaps, validateRequest, type AvailabilityPolicy } from "./availability.ts";

const H = 3600_000, D = 24 * H;
const hotel: AvailabilityPolicy = { kind: "nights", minDurationMs: D, maxDurationMs: 30 * D, granularityMs: D, alignmentOriginMs: 0, bufferMs: 2 * H, minNoticeMs: 0, maxAdvanceMs: 365 * D };
const court: AvailabilityPolicy = { kind: "time_block", minDurationMs: H, maxDurationMs: 3 * H, granularityMs: H, alignmentOriginMs: 0, bufferMs: 0, minNoticeMs: 2 * H, maxAdvanceMs: 30 * D };
const NOW = 1_000 * D;

test("half-open intervals: checkout and next check-in at the same instant do not overlap", () => {
  assert.equal(overlaps({ start: 0, end: 10 }, { start: 10, end: 20 }), false);
  assert.equal(overlaps({ start: 0, end: 11 }, { start: 10, end: 20 }), true);
});
test("hotel: a stay needs the turnaround buffer after the previous guest", () => {
  const prev = [{ start: NOW + 2 * D, end: NOW + 4 * D }];
  assert.equal(isFree(prev, { start: NOW + 4 * D, end: NOW + 5 * D }, hotel.bufferMs), false);   // same-day arrival, buffer not met
  assert.equal(isFree(prev, { start: NOW + 5 * D, end: NOW + 6 * D }, hotel.bufferMs), true);
  assert.equal(isFree(prev, { start: NOW + 1 * D, end: NOW + 2 * D }, hotel.bufferMs), false);   // would need turnaround before the next guest
  assert.equal(isFree(prev, { start: NOW, end: NOW + 1 * D }, hotel.bufferMs), true);
});
test("request validation: duration, alignment, notice, advance window", () => {
  assert.deepEqual(validateRequest(court, { start: NOW + 3 * H, end: NOW + 4 * H }, NOW), { ok: true });
  assert.equal((validateRequest(court, { start: NOW + 3 * H, end: NOW + 3 * H }, NOW) as any).reason, "invalid_interval");
  assert.equal((validateRequest(court, { start: NOW + 3 * H, end: NOW + 3 * H + 30 * 60_000 }, NOW) as any).reason, "too_short");
  assert.equal((validateRequest(court, { start: NOW + 3 * H, end: NOW + 8 * H }, NOW) as any).reason, "too_long");
  assert.equal((validateRequest(court, { start: NOW + 3 * H + 1000, end: NOW + 4 * H + 1000 }, NOW) as any).reason, "not_aligned");
  assert.equal((validateRequest(court, { start: NOW + H, end: NOW + 2 * H }, NOW) as any).reason, "too_soon");
  assert.equal((validateRequest(court, { start: NOW + 60 * D, end: NOW + 60 * D + H }, NOW) as any).reason, "too_far");
});
test("room types: a free unit is assigned, otherwise fully booked; double-booking is impossible", () => {
  const stay = { start: NOW + 10 * D, end: NOW + 12 * D };
  const rooms = [
    { resourceId: "room-101", bookings: [stay] },
    { resourceId: "room-102", bookings: [] },
  ];
  assert.deepEqual(allocateResource(rooms, hotel, stay, NOW), { ok: true, resourceId: "room-102" });
  const full = [{ resourceId: "room-101", bookings: [stay] }, { resourceId: "room-102", bookings: [stay] }];
  assert.deepEqual(allocateResource(full, hotel, stay, NOW), { ok: false, reason: "fully_booked" });
});
test("hostel beds are individual resources", () => {
  const stay = { start: NOW + 3 * D, end: NOW + 6 * D };
  const beds = ["bed-1", "bed-2", "bed-3", "bed-4"].map((id, i) => ({ resourceId: id, bookings: i < 3 ? [stay] : [] }));
  assert.deepEqual(freeResources(beds, stay, 0), ["bed-4"]);
});
