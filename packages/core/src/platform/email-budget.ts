// Gmail SMTP is a launch stopgap (~500 messages/day). Protect the emails that matter most as the cap nears.
export type EmailClass = "critical" | "important" | "marketing";   // critical: verification, reset, tickets, receipts
export const DEFAULT_DAILY_CAP = 500;
const LIMITS: Readonly<Record<EmailClass, number>> = { critical: 1.0, important: 0.9, marketing: 0.6 };   // share of cap usable by class

export function emailDecision(sentToday: number, klass: EmailClass, cap = DEFAULT_DAILY_CAP): "send" | "defer" {
  return sentToday < Math.floor(cap * LIMITS[klass]) ? "send" : "defer";   // deferred mail waits for the next day's budget
}
export const shouldAlertOps = (sentToday: number, cap = DEFAULT_DAILY_CAP): boolean => sentToday >= Math.floor(cap * 0.8);
