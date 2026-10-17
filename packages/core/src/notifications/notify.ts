import { format, money } from "../money.ts";
import { ROLE_PERMISSIONS, type Permission } from "../platform/authz.ts";
import { DEFAULT_DAILY_CAP, emailDecision } from "../platform/email-budget.ts";
import { type Deps, type EmailProvider, type NotificationKind, type OutboxRecord, type PushProvider } from "../services/ports.ts";
import { CLASS_BY_KIND, renderNotification, type Vars } from "./templates.ts";

export const fmtMoney = (amountMinor: bigint, currency: string): string => format(money(amountMinor, currency), currency === "NGN" ? "en-NG" : "en");
export const fmtLocal = (ms: number, tz: string): string => new Intl.DateTimeFormat("en-GB", { timeZone: tz, dateStyle: "medium", timeStyle: "short" }).format(new Date(ms));

async function enqueue(d: Deps, o: { subjectKey: string; userId: string | null; email: string | null; kind: NotificationKind; vars: Vars; sendAfterMs?: number }): Promise<void> {
  if (!o.userId && !o.email) return;
  const rec: OutboxRecord = {
    id: d.uuid(), dedupeKey: `${o.kind}:${o.subjectKey}:${o.userId ?? o.email}`, userId: o.userId, email: o.email, kind: o.kind, klass: CLASS_BY_KIND[o.kind],
    vars: o.vars, sendAfterMs: o.sendAfterMs ?? d.now(), sentAtMs: null, attempts: 0, lastError: null,
  };
  await d.store.enqueueNotification(rec);            // duplicates (same kind, subject, recipient) are ignored
}

export type Recipient = { kind: "user"; userId: string } | { kind: "email"; email: string };
export async function notifyRecipient(d: Deps, to: Recipient, kind: NotificationKind, vars: Vars, subjectKey: string, sendAfterMs?: number): Promise<void> {
  if (to.kind === "email") return enqueue(d, { subjectKey, userId: null, email: to.email.trim().toLowerCase(), kind, vars, sendAfterMs });
  const c = await d.store.getUserContact(to.userId);
  return enqueue(d, { subjectKey, userId: to.userId, email: c?.email ?? null, kind, vars, sendAfterMs });
}

/** Notify every active member whose role grants `permission` (e.g. everyone who may confirm payments). */
export async function notifyBusiness(d: Deps, businessId: string, permission: Permission, kind: NotificationKind, vars: Vars, subjectKey: string, sendAfterMs?: number): Promise<void> {
  const members = (await d.store.membershipsForBusiness(businessId)).filter((m) => m.status === "active" && ROLE_PERMISSIONS[m.role].includes(permission));
  for (const m of members) await notifyRecipient(d, { kind: "user", userId: m.userId }, kind, vars, subjectKey, sendAfterMs);
}

// ---- reminders: both sides, scheduled at booking confirmation. Cancelled bookings are skipped at send time. ----
const H = 3_600_000;
export async function scheduleBookingReminders(d: Deps, o: { customer: Recipient; businessId: string; bookingId: string; startMs: number; customerVars: Vars; businessVars: Vars }): Promise<void> {
  const now = d.now();
  for (const [kind, before] of [["booking_reminder_24h", 24 * H], ["booking_reminder_2h", 2 * H]] as const) {
    if (o.startMs - before > now) await notifyRecipient(d, o.customer, kind, o.customerVars, o.bookingId, o.startMs - before);
  }
  if (o.startMs - 2 * H > now) await notifyBusiness(d, o.businessId, "bookings.manage", "biz_booking_reminder_2h", o.businessVars, o.bookingId, o.startMs - 2 * H);
}
export async function scheduleTransferNudges(d: Deps, businessId: string, paymentId: string, vars: Vars): Promise<void> {
  for (const [label, after] of [["1h", H], ["6h", 6 * H], ["24h", 24 * H]] as const) {
    await notifyBusiness(d, businessId, "orders.write", "biz_transfer_nudge", vars, `${paymentId}:${label}`, d.now() + after);
  }
}

// ---- sending ----
const BACKOFF_MS = [60_000, 300_000, 1_800_000, 7_200_000, 43_200_000];
export interface Senders { readonly email: EmailProvider; readonly push: PushProvider; readonly dailyEmailCap?: number }

async function stillRelevant(d: Deps, n: OutboxRecord): Promise<boolean> {
  const x = n.vars, now = d.now();
  switch (n.kind) {
    case "booking_reminder_24h": case "booking_reminder_2h": case "biz_booking_reminder_2h": {
      const b = x.businessId && x.bookingId ? await d.store.getBooking(x.businessId, x.bookingId) : null;
      return b?.status === "confirmed";
    }
    case "biz_transfer_nudge": {
      const p = x.businessId && x.paymentId ? await d.store.getPayment(x.businessId, x.paymentId) : null;
      return p?.status === "awaiting_confirmation";
    }
    case "biz_trial_ending": case "biz_trial_ended": {
      const s = x.businessId ? await d.store.getSubscription(x.businessId) : null;
      return !(s && s.paidUntilMs > now);
    }
    case "biz_subscription_renewal": {
      const s = x.businessId ? await d.store.getSubscription(x.businessId) : null;
      return !!s && !s.cancelAtPeriodEnd && String(s.paidUntilMs) === x.paidUntilMs;       // renewed or cancelled: stop reminding
    }
    default: return true;
  }
}

/** Sends due notifications. Safe to run repeatedly: failures retry with backoff, irrelevant ones are dropped,
 *  and email respects the daily budget (critical mail keeps priority). Secrets in `vars` are wiped after sending. */
export async function drainOutbox(d: Deps, senders: Senders, limit = 50): Promise<{ sent: number; deferred: number; failed: number; dropped: number }> {
  const out = { sent: 0, deferred: 0, failed: 0, dropped: 0 };
  const now = d.now();
  const dayStart = Math.floor(now / 86_400_000) * 86_400_000;
  let emailsToday = await d.store.countEmailsSentSince(dayStart);
  const cap = senders.dailyEmailCap ?? DEFAULT_DAILY_CAP;

  for (const n of await d.store.dueNotifications(now, limit)) {
    if (!(await stillRelevant(d, n))) { await d.store.markNotificationSent(n.id, now); out.dropped++; continue; }
    const msg = renderNotification(n.kind, n.vars, d.appUrl);
    const wantsEmail = n.email !== null;
    if (wantsEmail && emailDecision(emailsToday, n.klass, cap) === "defer") { out.deferred++; continue; }   // waits for budget; not a failure
    try {
      if (n.userId) {
        const tokens = await d.store.pushTokensForUsers([n.userId]);
        if (tokens.length > 0) {
          const r = await senders.push.send(tokens.map((t) => ({ token: t.token, title: msg.push.title, body: msg.push.body, data: { path: msg.push.path, kind: n.kind } })));
          if (r.invalidTokens.length > 0) await d.store.removePushTokens(r.invalidTokens);
        }
      }
      if (wantsEmail) { await senders.email.send({ to: n.email!, subject: msg.subject, html: msg.html, text: msg.text }); emailsToday++; }
      await d.store.markNotificationSent(n.id, d.now()); out.sent++;
    } catch (e) {
      const attempts = n.attempts + 1;
      await d.store.markNotificationFailed(n.id, attempts, attempts >= BACKOFF_MS.length ? null : now + BACKOFF_MS[attempts - 1]!, (e as Error).message.slice(0, 300));
      out.failed++;
    }
  }
  return out;
}
