import { type Money, money } from "../money.ts";

// Refunds are the BUSINESS's decision. Each business states its policy; the customer sees it before paying;
// a snapshot is kept on the booking/order so later edits never change what a customer agreed to.
// Fluo records requests and outcomes; it never holds or moves refund money.
export type RefundPolicy =
  | { readonly kind: "none" }
  | { readonly kind: "full_until"; readonly hoursBefore: number }
  | { readonly kind: "tiered"; readonly tiers: readonly { readonly hoursBefore: number; readonly percentBps: number }[] };

export function validateRefundPolicy(p: unknown): RefundPolicy {
  const o = p as Record<string, unknown> | null;
  if (!o || typeof o !== "object") throw new Error("invalid_refund_policy");
  if (o.kind === "none") return { kind: "none" };
  if (o.kind === "full_until") {
    const h = o.hoursBefore;
    if (typeof h !== "number" || !Number.isInteger(h) || h < 0 || h > 24 * 365) throw new Error("invalid_refund_policy");
    return { kind: "full_until", hoursBefore: h };
  }
  if (o.kind === "tiered" && Array.isArray(o.tiers) && o.tiers.length >= 1 && o.tiers.length <= 6) {
    const tiers = o.tiers.map((t) => {
      const h = (t as any)?.hoursBefore, b = (t as any)?.percentBps;
      if (!Number.isInteger(h) || h < 0 || h > 24 * 365 || !Number.isInteger(b) || b < 0 || b > 10000) throw new Error("invalid_refund_policy");
      return { hoursBefore: h as number, percentBps: b as number };
    }).sort((a, b) => b.hoursBefore - a.hoursBefore);
    if (new Set(tiers.map((t) => t.hoursBefore)).size !== tiers.length) throw new Error("invalid_refund_policy");
    return { kind: "tiered", tiers };
  }
  throw new Error("invalid_refund_policy");
}

/** Share of the paid amount to refund, in basis points. `startMs` null = no scheduled time (an order): the most generous tier applies. */
export function refundBps(policy: RefundPolicy, startMs: number | null, nowMs: number): number {
  if (policy.kind === "none") return 0;
  const hoursUntil = startMs === null ? Number.POSITIVE_INFINITY : (startMs - nowMs) / 3_600_000;
  if (policy.kind === "full_until") return hoursUntil >= policy.hoursBefore ? 10000 : 0;
  for (const t of policy.tiers) if (hoursUntil >= t.hoursBefore) return t.percentBps;
  return 0;
}

export function refundAmount(policy: RefundPolicy, paid: Money, startMs: number | null, nowMs: number): Money {
  const bps = BigInt(refundBps(policy, startMs, nowMs));
  return money((paid.amountMinor * bps) / 10000n, paid.currency);   // rounds down: never refunds more than owed
}

/** Plain-language text shown to customers before they pay. */
export function describePolicy(p: RefundPolicy): string {
  if (p.kind === "none") return "This business does not offer refunds.";
  if (p.kind === "full_until") return p.hoursBefore === 0 ? "Full refund if you cancel before it starts." : `Full refund if you cancel at least ${p.hoursBefore} hours before.`;
  return "Refunds: " + p.tiers.map((t) => `${t.percentBps / 100}% if you cancel at least ${t.hoursBefore} hours before`).join("; ") + "; otherwise no refund.";
}
export const DEFAULT_REFUND_POLICY: RefundPolicy = { kind: "none" };
