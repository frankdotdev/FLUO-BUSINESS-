// Bookings and events are interpreted in the BUSINESS's own IANA timezone (e.g. Africa/Lagos),
// then stored as UTC instants. Uses Intl only (no dependency).
export interface LocalDateTime { readonly year: number; readonly month: number; readonly day: number; readonly hour: number; readonly minute: number }

function offsetAt(instantMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
  }).formatToParts(new Date(instantMs));
  const g = (t: string): number => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second"));
  return asUtc - Math.floor(instantMs / 1000) * 1000;
}

export function isValidTimezone(tz: string): boolean {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; } catch { return false; }
}

export type ZonedResult = { ok: true; instantMs: number; ambiguous: boolean } | { ok: false; reason: "nonexistent_local_time" };

/** Local wall-clock time in `tz` -> UTC instant. Handles daylight-saving gaps (nonexistent) and repeats (ambiguous). */
export function zonedToInstant(l: LocalDateTime, tz: string, prefer: "earlier" | "later" = "earlier"): ZonedResult {
  const DAY = 86_400_000;
  const guess = Date.UTC(l.year, l.month - 1, l.day, l.hour, l.minute);
  const offsets = new Set([offsetAt(guess - DAY, tz), offsetAt(guess + DAY, tz)]);
  const valid: number[] = [];
  for (const o of offsets) { const t = guess - o; if (offsetAt(t, tz) === o) valid.push(t); }
  if (valid.length === 0) return { ok: false, reason: "nonexistent_local_time" };
  valid.sort((a, b) => a - b);
  return { ok: true, instantMs: prefer === "earlier" ? valid[0]! : valid[valid.length - 1]!, ambiguous: valid.length > 1 };
}

export function parseLocalDate(date: string): { year: number; month: number; day: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) throw new Error("invalid_date");
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) throw new Error("invalid_date");
  return { year: y, month: mo, day: d };
}
export function parseLocalTime(time: string): { hour: number; minute: number } {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!m) throw new Error("invalid_time");
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

/** Hotel stay: check-in date + time and check-out date + time, in the property's timezone -> [start, end) instants. */
export function stayToInterval(args: { checkInDate: string; checkOutDate: string; checkInTime: string; checkOutTime: string; timezone: string }): { start: number; end: number } {
  const at = (date: string, time: string, prefer: "earlier" | "later"): number => {
    const r = zonedToInstant({ ...parseLocalDate(date), ...parseLocalTime(time) }, args.timezone, prefer);
    if (!r.ok) throw new Error(r.reason);
    return r.instantMs;
  };
  const start = at(args.checkInDate, args.checkInTime, "later");     // if ambiguous, the later one is the safer arrival
  const end = at(args.checkOutDate, args.checkOutTime, "earlier");
  if (end <= start) throw new Error("checkout_must_be_after_checkin");
  return { start, end };
}

export const localMidnight = (date: string, tz: string): number => {
  const r = zonedToInstant({ ...parseLocalDate(date), hour: 0, minute: 0 }, tz);
  if (!r.ok) throw new Error(r.reason);
  return r.instantMs;
};
