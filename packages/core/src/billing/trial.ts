// Free trial policy (configuration, not scattered constants). The clock starts when a business PUBLISHES,
// not at sign-up, so no one wastes days while still setting up.
export const TRIAL_DAYS = 30;
export const TRIAL_PLAN = "business";                       // the plan whose features a trialing business gets
export const REMINDER_OFFSET_DAYS = [-7, -3, -1, 0, 7];    // relative to trial end: before, on the day, and a win-back after
const DAY = 86_400_000;

export interface Trial { readonly businessId: string; readonly ownerUserId: string; readonly startedMs: number; readonly endsMs: number }

export type TrialState = { status: "none" } | { status: "active"; daysLeft: number; endsMs: number } | { status: "ended"; endedMs: number };

export function trialState(trial: Trial | null, nowMs: number): TrialState {
  if (!trial) return { status: "none" };
  if (nowMs < trial.endsMs) return { status: "active", daysLeft: Math.ceil((trial.endsMs - nowMs) / DAY), endsMs: trial.endsMs };
  return { status: "ended", endedMs: trial.endsMs };
}

export const newTrial = (businessId: string, ownerUserId: string, startMs: number): Trial =>
  ({ businessId, ownerUserId, startedMs: startMs, endsMs: startMs + TRIAL_DAYS * DAY });

/** One trial per business AND per owner, so creating new businesses can't restart the free month. */
export const trialEligible = (priorTrialsForOwner: number): boolean => priorTrialsForOwner === 0;

/** Which plan's features apply right now. A paid subscription always wins; otherwise trial; otherwise free. */
export function effectivePlanKey(paidPlanKey: string | null, trial: Trial | null, nowMs: number): string {
  if (paidPlanKey) return paidPlanKey;
  return trialState(trial, nowMs).status === "active" ? TRIAL_PLAN : "free";
}

export const reminderTimes = (trial: Trial): { offsetDays: number; atMs: number }[] =>
  REMINDER_OFFSET_DAYS.map((d) => ({ offsetDays: d, atMs: trial.endsMs + d * DAY }));

/** After the trial: nothing is deleted. Items beyond the free limits are PAUSED (hidden from customers, still the
 *  owner's, restored instantly on upgrade). Existing paid orders, bookings and sold tickets are always honoured. */
export function overLimitReport(limits: Readonly<Record<string, number | boolean | "unlimited">>, usage: Readonly<Record<string, number>>): Record<string, { limit: number; usage: number; toPause: number }> {
  const out: Record<string, { limit: number; usage: number; toPause: number }> = {};
  for (const [key, used] of Object.entries(usage)) {
    const lim = limits[key];
    if (typeof lim === "number" && used > lim) out[key] = { limit: lim, usage: used, toPause: used - lim };
  }
  return out;
}
