import type { Interval } from "./pricing.ts";

// Prepaid periods, no card-on-file surprises. Paying extends access; not paying lets it lapse to Free (paused, never deleted).
// Cancelling is one tap: access simply continues until the paid-until date and reminders stop.
const DAY = 86_400_000;
export const PERIOD_DAYS: Readonly<Record<Interval, number>> = { month: 30, year: 365 };

export interface Subscription { readonly businessId: string; readonly planKey: string; readonly paidUntilMs: number; readonly cancelAtPeriodEnd: boolean; readonly currency: string }

/** Renewing early adds to the remaining time instead of wasting it. */
export const extendPaidUntil = (currentPaidUntilMs: number | null, nowMs: number, interval: Interval): number =>
  Math.max(currentPaidUntilMs ?? 0, nowMs) + PERIOD_DAYS[interval] * DAY;

export const isPaid = (s: Subscription | null, nowMs: number): boolean => !!s && s.paidUntilMs > nowMs;
export const paidPlanKey = (s: Subscription | null, nowMs: number): string | null => (isPaid(s, nowMs) ? s!.planKey : null);

/** Renewal reminders: 7, 3 and 1 days before the end, and on the day. Skipped entirely once the owner cancelled. */
export function renewalReminderTimes(s: Subscription): number[] {
  return s.cancelAtPeriodEnd ? [] : [-7, -3, -1, 0].map((d) => s.paidUntilMs + d * DAY);
}
