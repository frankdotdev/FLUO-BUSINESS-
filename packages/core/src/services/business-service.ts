import { authorize } from "../platform/authz.ts";
import { getBusinessType, resolveCapabilities } from "../platform/business-types.ts";
import type { Capability } from "../platform/capabilities.ts";
import { uniqueBusinessSlug } from "../platform/routes.ts";
import { isValidTimezone } from "../platform/timezone.ts";
import { exponentOf } from "../money.ts";
import { newTrial, reminderTimes, trialEligible } from "../billing/trial.ts";
import { DEFAULT_REFUND_POLICY, validateRefundPolicy, type RefundPolicy } from "../platform/refund-policy.ts";
import { notifyRecipient } from "../notifications/notify.ts";
import { type BusinessRecord, type Deps, fail } from "./ports.ts";

export interface CreateBusinessInput {
  readonly name: string; readonly typeId: string; readonly optionalCapabilities?: readonly Capability[];
  readonly countryCode: string; readonly currency: string; readonly timezone: string; readonly allowsTransfer?: boolean; readonly acceptsAutomatic?: boolean; readonly refundPolicy?: RefundPolicy;
}

/** Creates a draft workspace. The creator becomes its owner. Never trusts client-supplied capability lists. */
export async function createBusiness(d: Deps, actorUserId: string, input: CreateBusinessInput): Promise<BusinessRecord> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) fail("invalid_name");
  if (!/^[A-Z]{2}$/.test(input.countryCode)) fail("invalid_country");
  try { exponentOf(input.currency); } catch { fail("unsupported_currency"); }
  if (!isValidTimezone(input.timezone)) fail("invalid_timezone");
  let type; try { type = getBusinessType(input.typeId); } catch { return fail("unknown_business_type"); }
  let caps: Capability[]; try { caps = resolveCapabilities(input.typeId, input.optionalCapabilities ?? []); } catch { return fail("capability_not_available"); }

  let refundPolicy = DEFAULT_REFUND_POLICY;
  if (input.refundPolicy) { try { refundPolicy = validateRefundPolicy(input.refundPolicy); } catch { return fail("invalid_refund_policy"); } }
  const taken = new Set<string>();
  let unique = uniqueBusinessSlug(name, (x) => taken.has(x));
  while (await d.store.slugTaken(unique)) { taken.add(unique); unique = uniqueBusinessSlug(name, (x) => taken.has(x)); }

  const business: BusinessRecord = {
    id: d.uuid(), slug: unique, name, typeId: type.id, typeVersion: type.version,
    countryCode: input.countryCode, currency: input.currency, timezone: input.timezone,
    status: "draft", verificationStatus: type.requiresVerification ? "pending" : "not_required",
    allowsTransfer: input.allowsTransfer ?? true, acceptsAutomatic: input.acceptsAutomatic ?? false, refundPolicy, publishedAtMs: null,
  };
  await d.store.insertBusiness(business, { userId: actorUserId, businessId: business.id, role: "owner", status: "active" }, caps);
  await d.store.appendAudit({ businessId: business.id, actorUserId, action: "business.created", targetId: business.id, atMs: d.now() });
  return business;
}

/** Publishing makes the business public and starts its one free trial. Regulated types need verification first. */
export async function publishBusiness(d: Deps, actorUserId: string, businessId: string): Promise<BusinessRecord> {
  const memberships = await d.store.membershipsForUser(actorUserId);
  if (!authorize(memberships, actorUserId, businessId, "business.manage").allowed) return fail("forbidden");
  const b = await d.store.getBusiness(businessId);
  if (!b) return fail("not_found");
  if (b.status !== "draft") return fail("not_a_draft");
  if (getBusinessType(b.typeId).requiresVerification && b.verificationStatus !== "verified") return fail("verification_required");
  if (!b.acceptsAutomatic && !b.allowsTransfer) return fail("payment_mode_required");

  const now = d.now();
  await d.store.patchBusiness(b.id, { status: "active", publishedAtMs: now });
  const owner = memberships.find((m) => m.businessId === businessId && m.role === "owner");
  if (owner && trialEligible((await d.store.trialsForOwner(owner.userId)).length)) {
    const trial = newTrial(b.id, owner.userId, now);
    await d.store.insertTrial(trial);
    for (const r of reminderTimes(trial)) {                       // before the end, on the day, and a win-back a week later
      const kind = r.offsetDays < 0 ? "biz_trial_ending" : "biz_trial_ended";
      await notifyRecipient(d, { kind: "user", userId: owner.userId }, kind, { daysLeft: String(-r.offsetDays), usageLine: "", businessId: b.id, path: `/app/${b.id}/billing` }, `${b.id}:${r.offsetDays}`, r.atMs);
    }
  }
  await d.store.appendAudit({ businessId: b.id, actorUserId, action: "business.published", targetId: b.id, atMs: now });
  return { ...b, status: "active", publishedAtMs: now };
}

/** Owners can delete/discard an unlaunched draft workspace (e.g. accidental duplicate or testing). */
export async function deleteDraftBusiness(d: Deps, actorUserId: string, businessId: string): Promise<void> {
  const memberships = await d.store.membershipsForUser(actorUserId);
  const owner = memberships.find((m) => m.businessId === businessId && m.role === "owner");
  if (!owner) return fail("forbidden");
  const b = await d.store.getBusiness(businessId);
  if (!b) return fail("not_found");
  if (b.status !== "draft") return fail("cannot_delete_active_business");
  await d.store.deleteDraftBusiness(businessId);
  await d.store.appendAudit({ businessId, actorUserId, action: "business.draft_deleted", targetId: businessId, atMs: d.now() });
}
