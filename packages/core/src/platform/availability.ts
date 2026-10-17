// One booking engine, several availability POLICIES (decided design):
//   nights         hotels, guest houses, short-lets: whole-night stays, turnaround/cleaning buffer
//   time_block     venues, courts, meeting rooms, appointments: slots of a granularity
//   rental_period  cars, equipment: pickup/return instants, prep buffer
//   bed            hostels: every bed is its own resource, so capacity is one per bed
// All intervals are half-open [start, end): a guest checking out at 11:00 never conflicts with one checking in at 11:00.
export type PolicyKind = "nights" | "time_block" | "rental_period" | "bed";

export interface TimeInterval { readonly start: number; readonly end: number }   // epoch milliseconds

export interface AvailabilityPolicy {
  readonly kind: PolicyKind;
  readonly minDurationMs: number;
  readonly maxDurationMs: number | null;
  readonly granularityMs: number;          // start and end must be multiples of this, measured from alignmentOriginMs
  readonly alignmentOriginMs: number;      // e.g. local midnight in the business's timezone for the first day
  readonly bufferMs: number;               // turnaround time AFTER each booking (cleaning, vehicle prep)
  readonly minNoticeMs: number;
  readonly maxAdvanceMs: number | null;
}

export const overlaps = (a: TimeInterval, b: TimeInterval): boolean => a.start < b.end && b.start < a.end;

/** The span a booking actually occupies: its own time plus the turnaround buffer. */
export const blocked = (i: TimeInterval, bufferMs: number): TimeInterval => ({ start: i.start, end: i.end + bufferMs });

export type Validation = { ok: true } | { ok: false; reason: "invalid_interval" | "too_short" | "too_long" | "not_aligned" | "too_soon" | "too_far" };

export function validateRequest(policy: AvailabilityPolicy, req: TimeInterval, nowMs: number): Validation {
  if (!Number.isFinite(req.start) || !Number.isFinite(req.end) || req.end <= req.start) return { ok: false, reason: "invalid_interval" };
  const dur = req.end - req.start;
  if (dur < policy.minDurationMs) return { ok: false, reason: "too_short" };
  if (policy.maxDurationMs !== null && dur > policy.maxDurationMs) return { ok: false, reason: "too_long" };
  const aligned = (t: number): boolean => (((t - policy.alignmentOriginMs) % policy.granularityMs) + policy.granularityMs) % policy.granularityMs === 0;
  if (!aligned(req.start) || !aligned(req.end)) return { ok: false, reason: "not_aligned" };
  if (req.start < nowMs + policy.minNoticeMs) return { ok: false, reason: "too_soon" };
  if (policy.maxAdvanceMs !== null && req.start > nowMs + policy.maxAdvanceMs) return { ok: false, reason: "too_far" };
  return { ok: true };
}

export interface ResourceBookings { readonly resourceId: string; readonly bookings: readonly TimeInterval[] }   // only ACTIVE bookings/holds

/** A request fits a resource only if its blocked span overlaps no existing blocked span. */
export function isFree(existing: readonly TimeInterval[], req: TimeInterval, bufferMs: number): boolean {
  const r = blocked(req, bufferMs);
  return existing.every((b) => !overlaps(r, blocked(b, bufferMs)));
}

export function freeResources(resources: readonly ResourceBookings[], req: TimeInterval, bufferMs: number): string[] {
  return resources.filter((r) => isFree(r.bookings, req, bufferMs)).map((r) => r.resourceId).sort();
}

/** Room-type booking: assign a specific free unit (deterministic: lowest id). The database exclusion constraint
 *  is the final arbiter, so a race between two requests ends with one success and one retry. */
export function allocateResource(resources: readonly ResourceBookings[], policy: AvailabilityPolicy, req: TimeInterval, nowMs: number): { ok: true; resourceId: string } | { ok: false; reason: string } {
  const v = validateRequest(policy, req, nowMs);
  if (!v.ok) return v;
  const free = freeResources(resources, req, policy.bufferMs);
  return free.length > 0 ? { ok: true, resourceId: free[0]! } : { ok: false, reason: "fully_booked" };
}
