// Group Cart & Split Payment Engine
// Enables friends, students, and teams to pool funds for food runs, groceries, and shared bookings.

export type GroupCartStatus = "open" | "locked" | "funded" | "expired" | "cancelled";
export type SplitKind = "itemized" | "equal" | "custom";

export interface GroupCartItem {
  readonly id: string;
  readonly productId: string;
  readonly name: string;
  readonly unitPriceMinor: bigint;
  readonly quantity: number;
  readonly addedBy: { readonly name: string; readonly email?: string };
}

export interface GroupContribution {
  readonly id: string;
  readonly contributorName: string;
  readonly contributorEmail: string;
  readonly amountMinor: bigint;
  readonly paymentId: string | null;
  readonly status: "pending" | "paid" | "refunded";
  readonly paidAtMs: number | null;
}

export interface GroupCartSession {
  readonly id: string;
  readonly shortCode: string;
  readonly businessId: string;
  readonly hostUserId: string | null;
  readonly hostName: string;
  readonly hostEmail: string;
  readonly splitKind: SplitKind;
  readonly targetAmountMinor: bigint;
  readonly fundedAmountMinor: bigint;
  readonly currency: string;
  readonly status: GroupCartStatus;
  readonly items: readonly GroupCartItem[];
  readonly contributions: readonly GroupContribution[];
  readonly createdAtMs: number;
  readonly expiresAtMs: number;
}

const TRANSITIONS: Record<GroupCartStatus, readonly GroupCartStatus[]> = {
  open: ["locked", "funded", "expired", "cancelled"],
  locked: ["funded", "open", "expired", "cancelled"],
  funded: [],
  expired: [],
  cancelled: [],
};

export function canTransitionGroupCart(from: GroupCartStatus, to: GroupCartStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/**
 * Calculates total order sum from all items in the group cart.
 */
export function calculateGroupCartTotal(items: readonly GroupCartItem[]): bigint {
  return items.reduce((acc, it) => acc + it.unitPriceMinor * BigInt(it.quantity), 0n);
}

/**
 * Calculates equal share per member, rounding up the fraction to avoid underfunding.
 */
export function calculateEqualShare(totalMinor: bigint, memberCount: number): bigint {
  if (memberCount <= 0) return totalMinor;
  const count = BigInt(memberCount);
  return (totalMinor + count - 1n) / count;
}

/**
 * Verifies if the group cart has achieved 100% funding.
 */
export function isGroupCartFullyFunded(session: GroupCartSession): boolean {
  return session.fundedAmountMinor >= session.targetAmountMinor && session.targetAmountMinor > 0n;
}

/**
 * Records a successful member payment and returns an updated session.
 */
export function recordMemberPayment(
  session: GroupCartSession,
  contributionId: string,
  paymentId: string,
  paidAtMs: number
): GroupCartSession {
  const contrib = session.contributions.find((c) => c.id === contributionId);
  if (!contrib || contrib.status === "paid") return session;

  const updatedContributions = session.contributions.map((c) =>
    c.id === contributionId
      ? { ...c, status: "paid" as const, paymentId, paidAtMs }
      : c
  );

  const fundedAmountMinor = session.fundedAmountMinor + contrib.amountMinor;
  const isNowFunded = fundedAmountMinor >= session.targetAmountMinor;

  return {
    ...session,
    contributions: updatedContributions,
    fundedAmountMinor,
    status: isNowFunded ? "funded" : session.status,
  };
}
