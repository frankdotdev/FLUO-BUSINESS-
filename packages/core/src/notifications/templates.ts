import type { NotificationKind } from "../services/ports.ts";
import type { EmailClass } from "../platform/email-budget.ts";

// Every notification kind: who it is for, how important it is (decides email budget priority), and its wording.
export const CLASS_BY_KIND: Readonly<Record<NotificationKind, EmailClass>> = {
  order_placed_transfer: "important", order_paid: "critical", booking_held_transfer: "important", booking_confirmed: "critical",
  booking_reminder_24h: "important", booking_reminder_2h: "important", booking_cancelled: "critical", ticket_issued: "critical", refund_update: "critical",
  biz_new_order: "important", biz_new_booking: "important", biz_transfer_marked_sent: "important", biz_transfer_nudge: "important",
  biz_booking_reminder_2h: "important", biz_refund_requested: "important", biz_trial_ending: "important", biz_trial_ended: "important", biz_subscription_renewal: "important", new_message: "important", biz_plan_usage_warning: "important",
};

export type Vars = Readonly<Record<string, string>>;
export interface Rendered { subject: string; text: string; html: string; push: { title: string; body: string; path: string } }
interface Body { subject: string; lines: string[]; pushTitle: string; pushBody: string; cta?: string }

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const v = (x: Vars, k: string): string => x[k] ?? "";

const BODIES: Record<NotificationKind, (x: Vars) => Body> = {
  order_placed_transfer: (x) => ({ subject: `Pay ${v(x, "total")} to ${v(x, "businessName")}`, pushTitle: "Order placed", pushBody: `Send ${v(x, "total")} to ${v(x, "businessName")}, then tap "I have transferred".`,
    lines: [`Your order with ${v(x, "businessName")} is reserved.`, `Send ${v(x, "total")} to the account shown on your order page, then tap "I have transferred".`, `Put this reference in the transfer narration: ${v(x, "reference")}.`], cta: "Open your order" }),
  order_paid: (x) => ({ subject: `Payment confirmed by ${v(x, "businessName")}`, pushTitle: "Payment confirmed", pushBody: `${v(x, "businessName")} confirmed your payment of ${v(x, "total")}.`, lines: [`${v(x, "businessName")} confirmed your payment of ${v(x, "total")}.`, "They will prepare your order."], cta: "View your order" }),
  booking_held_transfer: (x) => ({ subject: `Your booking is held until ${v(x, "holdUntil")}`, pushTitle: "Booking held", pushBody: `Send ${v(x, "total")} before ${v(x, "holdUntil")} to keep it.`,
    lines: [`${v(x, "title")} at ${v(x, "businessName")} is held for you until ${v(x, "holdUntil")}.`, `Send ${v(x, "total")} and tap "I have transferred" on your booking page.`, `Reference: ${v(x, "reference")}.`], cta: "Open your booking" }),
  booking_confirmed: (x) => ({ subject: `Booking confirmed: ${v(x, "title")}`, pushTitle: "Booking confirmed", pushBody: `${v(x, "title")}, ${v(x, "startsAt")}.`, lines: [`Your booking at ${v(x, "businessName")} is confirmed.`, `${v(x, "title")}: ${v(x, "startsAt")} to ${v(x, "endsAt")}.`, v(x, "policy")], cta: "View booking" }),
  booking_reminder_24h: (x) => ({ subject: `Tomorrow: ${v(x, "title")} at ${v(x, "businessName")}`, pushTitle: "Booking tomorrow", pushBody: `${v(x, "title")}, ${v(x, "startsAt")}.`, lines: [`A reminder of your booking at ${v(x, "businessName")}.`, `${v(x, "title")}: ${v(x, "startsAt")}.`], cta: "View booking" }),
  booking_reminder_2h: (x) => ({ subject: `Starting soon: ${v(x, "title")}`, pushTitle: "Starting in 2 hours", pushBody: `${v(x, "title")} at ${v(x, "businessName")}, ${v(x, "startsAt")}.`, lines: [`Your booking at ${v(x, "businessName")} starts at ${v(x, "startsAt")}.`], cta: "View booking" }),
  booking_cancelled: (x) => ({ subject: `Booking cancelled: ${v(x, "title")}`, pushTitle: "Booking cancelled", pushBody: v(x, "refundNote") || `${v(x, "title")} was cancelled.`, lines: [`${v(x, "title")} at ${v(x, "businessName")} was cancelled.`, v(x, "refundNote")], cta: "View details" }),
  ticket_issued: (x) => ({ subject: `Your ticket for ${v(x, "eventName")}`, pushTitle: "Your ticket is ready", pushBody: `${v(x, "eventName")}: open it to show the QR code at the gate.`, lines: [`Your ticket for ${v(x, "eventName")} is ready.`, "Open it and show the QR code at the gate."], cta: "Open ticket" }),
  refund_update: (x) => ({ subject: `Refund ${v(x, "status")}`, pushTitle: `Refund ${v(x, "status")}`, pushBody: `${v(x, "businessName")}: ${v(x, "amount")}.`, lines: [`${v(x, "businessName")} marked your refund of ${v(x, "amount")} as ${v(x, "status")}.`] }),
  biz_new_order: (x) => ({ subject: `New paid order: ${v(x, "total")}`, pushTitle: "New order", pushBody: `${v(x, "customerName")} paid ${v(x, "total")}.`, lines: [`${v(x, "customerName")} placed an order of ${v(x, "total")}.`], cta: "Open order" }),
  biz_new_booking: (x) => ({ subject: `New booking: ${v(x, "startsAt")}`, pushTitle: "New booking", pushBody: `${v(x, "customerName")}: ${v(x, "title")}, ${v(x, "startsAt")}.`, lines: [`${v(x, "customerName")} booked ${v(x, "title")} for ${v(x, "startsAt")}.`], cta: "Open booking" }),
  biz_transfer_marked_sent: (x) => ({ subject: `${v(x, "customerName")} says they paid ${v(x, "total")}`, pushTitle: "Confirm a transfer", pushBody: `${v(x, "customerName")} says they sent ${v(x, "total")}. Check your bank app.`,
    lines: [`${v(x, "customerName")} tapped "I have transferred" for ${v(x, "total")} (reference ${v(x, "reference")}).`, "Check your bank app. When the money is there, confirm it in Fluo so the order or booking can continue."], cta: "Confirm payment" }),
  biz_transfer_nudge: (x) => ({ subject: `Still waiting: confirm ${v(x, "total")} from ${v(x, "customerName")}`, pushTitle: "Payment awaiting your confirmation", pushBody: `${v(x, "customerName")}, ${v(x, "total")}.`, lines: [`${v(x, "customerName")} is waiting for you to confirm a transfer of ${v(x, "total")} (reference ${v(x, "reference")}).`], cta: "Confirm payment" }),
  biz_booking_reminder_2h: (x) => ({ subject: `In 2 hours: ${v(x, "customerName")}, ${v(x, "title")}`, pushTitle: "Booking in 2 hours", pushBody: `${v(x, "customerName")}: ${v(x, "title")}, ${v(x, "startsAt")}.`, lines: [`${v(x, "customerName")} is booked for ${v(x, "title")} at ${v(x, "startsAt")}.`], cta: "Open booking" }),
  biz_refund_requested: (x) => ({ subject: `Refund requested: ${v(x, "amount")}`, pushTitle: "Refund requested", pushBody: `${v(x, "customerName")} asked for ${v(x, "amount")}.`, lines: [`${v(x, "customerName")} cancelled and is entitled to ${v(x, "amount")} under your refund policy.`, "Refund them yourself, then mark it as refunded in Fluo."], cta: "Open refund" }),
  biz_trial_ending: (x) => ({ subject: `Your free month ends in ${v(x, "daysLeft")} days`, pushTitle: `Free month ends in ${v(x, "daysLeft")} days`, pushBody: "Keep every feature by choosing a plan.",
    lines: [`Your free month on Fluo ends in ${v(x, "daysLeft")} days.`, v(x, "usageLine"), "After that you move to the Free plan: nothing is deleted, items beyond the Free limits are simply paused until you upgrade."], cta: "Choose a plan" }),
  biz_trial_ended: (x) => ({ subject: "Your free month has ended", pushTitle: "Free month ended", pushBody: "You're on the Free plan. Nothing was deleted.", lines: ["Your free month has ended and your business is now on the Free plan.", "Nothing was deleted. Items beyond the Free limits are paused and come back the moment you upgrade."], cta: "See plans" }),
  new_message: (x) => ({ subject: `New message from ${v(x, "fromName")}`, pushTitle: `Message from ${v(x, "fromName")}`, pushBody: v(x, "preview"), lines: [`${v(x, "fromName")} sent you a message:`, v(x, "preview")], cta: "Reply" }),
  biz_subscription_renewal: (x) => ({ subject: `Your plan ${v(x, "endsPhrase")}`, pushTitle: "Plan renewal", pushBody: `Your ${v(x, "planName")} plan ${v(x, "endsPhrase")}.`, lines: [`Your ${v(x, "planName")} plan ${v(x, "endsPhrase")}.`, "Renew to keep all features. You can cancel any time; access continues to the end of the period."], cta: "Renew" }),
  biz_plan_usage_warning: (x) => ({
    subject: `Usage Alert: ${v(x, "percentUsed")}% of your monthly allowance reached`,
    pushTitle: `Allowance ${v(x, "percentUsed")}% used`,
    pushBody: `You have completed ${v(x, "usedCount")} of ${v(x, "includedCount")} orders on ${v(x, "planName")}.`,
    lines: [
      `You have completed ${v(x, "usedCount")} of ${v(x, "includedCount")} orders this month (${v(x, "percentUsed")}% of your plan allowance).`,
      v(x, "warningDetail"),
    ],
    cta: "View plans & usage",
  }),
};

export function renderNotification(kind: NotificationKind, vars: Vars, appUrl?: string): Rendered {
  const b = BODIES[kind](vars);
  const path = vars.path ?? "/";
  const link = appUrl && b.cta ? `${appUrl.replace(/\/$/, "")}${path}` : null;
  const lines = b.lines.filter((l) => l.trim().length > 0);
  const text = [...lines, ...(link ? [`${b.cta}: ${link}`] : [])].join("\n\n");
  const html = `<div style="font-family:Inter,Arial,sans-serif;color:#0B0B0B;max-width:520px">${lines.map((l) => `<p>${esc(l)}</p>`).join("")}${link ? `<p><a href="${esc(link)}" style="display:inline-block;background:#0B0B0B;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px">${esc(b.cta!)}</a></p>` : ""}<p style="color:#5C5C5C;font-size:12px">Sent by Fluo</p></div>`;
  return { subject: b.subject, text, html, push: { title: b.pushTitle, body: b.pushBody, path } };
}
