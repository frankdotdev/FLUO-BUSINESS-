import { authorize, type Role } from "../platform/authz.ts";
import { hashToken, newGuestToken } from "../platform/guest-access.ts";
import { checkLimit, type Entitlements } from "../billing/pricing.ts";
import { type Deps, fail } from "./ports.ts";

const INVITE_DAYS = 7;
const INVITABLE: readonly Role[] = ["admin", "manager", "staff", "cashier"];       // never "owner"
const isEmail = (s: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

async function requireManage(d: Deps, actor: string, businessId: string) {
  const mine = await d.store.membershipsForUser(actor);
  if (!authorize(mine, actor, businessId, "members.manage").allowed) return fail("forbidden");
  return mine.find((m) => m.businessId === businessId)!;
}

/** Returns the one-time invite token. The caller emails it; only its hash is stored. */
export async function inviteMember(d: Deps, actor: string, businessId: string, email: string, role: Role, entitlements: Entitlements): Promise<{ token: string }> {
  const me = await requireManage(d, actor, businessId);
  if (!INVITABLE.includes(role)) return fail("invalid_role");
  if (role === "admin" && me.role !== "owner") return fail("forbidden");              // only the owner creates admins
  if (!isEmail(email)) return fail("invalid_email");
  const active = (await d.store.membershipsForBusiness(businessId)).filter((m) => m.status === "active").length;
  if (!checkLimit(entitlements, "staff_seats", active).allowed) return fail("seat_limit_reached");
  const { token, hash } = newGuestToken();
  await d.store.insertInvite({ tokenHash: hash, businessId, email: email.trim().toLowerCase(), role, expiresAtMs: d.now() + INVITE_DAYS * 86_400_000, usedAtMs: null, invitedBy: actor });
  await d.store.appendAudit({ businessId, actorUserId: actor, action: "member.invited", targetId: null, atMs: d.now() });
  return { token };
}

/** Accepting needs a VERIFIED email equal to the invited address; any mismatch looks like "no such invite". */
export async function acceptInvite(d: Deps, actor: { userId: string; email: string; emailVerified: boolean }, token: string): Promise<void> {
  const hash = hashToken(token);
  const inv = await d.store.findInvite(hash);
  if (!inv || inv.usedAtMs !== null || d.now() >= inv.expiresAtMs) return fail("not_found");
  if (!actor.emailVerified || actor.email.trim().toLowerCase() !== inv.email) return fail("not_found");
  if (!(await d.store.markInviteUsed(hash, d.now()))) return fail("not_found");     // single use, even under double-click
  const existing = (await d.store.membershipsForBusiness(inv.businessId)).find((m) => m.userId === actor.userId);
  if (existing?.role === "owner" && existing.status === "active") return;            // never demote an owner via an invite
  await d.store.upsertMembership({ userId: actor.userId, businessId: inv.businessId, role: inv.role, status: "active" });
  await d.store.appendAudit({ businessId: inv.businessId, actorUserId: actor.userId, action: "member.joined", targetId: actor.userId, atMs: d.now() });
}

export async function removeMember(d: Deps, actor: string, businessId: string, targetUserId: string): Promise<void> {
  const me = await requireManage(d, actor, businessId);
  const target = (await d.store.membershipsForBusiness(businessId)).find((m) => m.userId === targetUserId && m.status === "active");
  if (!target) return fail("not_found");
  if (target.role === "owner") return fail("cannot_remove_owner");
  if (target.role === "admin" && me.role !== "owner") return fail("forbidden");
  await d.store.upsertMembership({ ...target, status: "removed" });
  await d.store.appendAudit({ businessId, actorUserId: actor, action: "member.removed", targetId: targetUserId, atMs: d.now() });
}

/** Owner hands the business to an existing active admin. Must type the business slug to confirm. Atomic: one owner always. */
export async function transferOwnership(d: Deps, actor: string, businessId: string, newOwnerUserId: string, confirmSlug: string): Promise<void> {
  const mine = await d.store.membershipsForUser(actor);
  const me = mine.find((m) => m.businessId === businessId && m.status === "active");
  if (!me || me.role !== "owner") return fail("forbidden");
  const b = await d.store.getBusiness(businessId);
  if (!b) return fail("not_found");
  if (confirmSlug !== b.slug) return fail("confirmation_mismatch");
  if (newOwnerUserId === actor) return fail("invalid_target");
  if (!(await d.store.swapOwner(businessId, actor, newOwnerUserId))) return fail("target_must_be_active_admin");
  await d.store.appendAudit({ businessId, actorUserId: actor, action: "ownership.transferred", targetId: newOwnerUserId, atMs: d.now() });
}
