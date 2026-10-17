import { authorize } from "../platform/authz.ts";
import { freeResources, validateRequest, type PolicyKind } from "../platform/availability.ts";
import { policyDefaults, type PolicyDefaults } from "../platform/resource-defaults.ts";
import { makeSlug, newShortId } from "../platform/routes.ts";
import { type Deps, type PriceUnit, type ResourceGroupRecord, fail } from "./ports.ts";

export interface ResourceGroupInput extends Partial<PolicyDefaults> {
  readonly name: string; readonly kind: PolicyKind; readonly priceMinor: bigint; readonly unitLabels: readonly string[];   // e.g. room numbers, bed numbers, court names, staff names
}
const KINDS: readonly PolicyKind[] = ["nights", "time_block", "rental_period", "bed"];
const UNITS: readonly PriceUnit[] = ["per_night", "per_hour", "per_day", "per_bed_night", "flat"];

/** Creates something customers can book (a room type, a court, a barber, a vehicle) and its bookable units. */
export async function createResourceGroup(d: Deps, actor: string, businessId: string, i: ResourceGroupInput): Promise<ResourceGroupRecord> {
  const mine = await d.store.membershipsForUser(actor);
  if (!authorize(mine, actor, businessId, "bookings.manage").allowed) return fail("forbidden");
  const biz = await d.store.getBusiness(businessId);
  if (!biz) return fail("not_found");
  const caps = await d.store.capabilitiesOf(businessId);
  if (!caps.includes("resource_booking") && !caps.includes("bookings")) return fail("capability_not_enabled");
  if (!KINDS.includes(i.kind)) return fail("invalid_kind");
  const def = { ...policyDefaults(i.kind), ...Object.fromEntries(Object.entries(i).filter(([k, v]) => v !== undefined && k in policyDefaults(i.kind))) } as PolicyDefaults;
  if (i.name.trim().length < 2 || i.name.length > 80) return fail("invalid_name");
  if (typeof i.priceMinor !== "bigint" || i.priceMinor < 0n || i.priceMinor > 1_000_000_000_000n) return fail("invalid_price");
  if (!UNITS.includes(def.priceUnit)) return fail("invalid_price_unit");
  const labels = i.unitLabels.map((l) => l.trim()).filter(Boolean);
  if (labels.length < 1 || labels.length > 200 || new Set(labels.map((l) => l.toLowerCase())).size !== labels.length || labels.some((l) => l.length > 60)) return fail("invalid_units");
  const pos = (n: number): boolean => Number.isInteger(n) && n > 0;
  if (!pos(def.minDurationMinutes) || !pos(def.granularityMinutes) || (def.maxDurationMinutes !== null && def.maxDurationMinutes < def.minDurationMinutes)) return fail("invalid_rules");
  if (def.bufferMinutes < 0 || def.minNoticeMinutes < 0 || !Number.isInteger(def.bufferMinutes) || !Number.isInteger(def.minNoticeMinutes)) return fail("invalid_rules");
  const M = 60_000;
  for (let attempt = 0; attempt < 3; attempt++) {
    const g: ResourceGroupRecord & { shortId: string; slug: string } = {
      id: d.uuid(), shortId: newShortId(), slug: makeSlug(i.name), businessId, name: i.name.trim(), timezone: biz.timezone, priceMinor: i.priceMinor, priceUnit: def.priceUnit, currency: biz.currency, active: true,
      policy: { kind: i.kind, minDurationMs: def.minDurationMinutes * M, maxDurationMs: def.maxDurationMinutes === null ? null : def.maxDurationMinutes * M, granularityMs: def.granularityMinutes * M, alignmentOriginMs: 0, bufferMs: def.bufferMinutes * M, minNoticeMs: def.minNoticeMinutes * M, maxAdvanceMs: def.maxAdvanceMinutes === null ? null : def.maxAdvanceMinutes * M },
    };
    if (await d.store.insertResourceGroup(g, labels.map((label) => ({ id: d.uuid(), label })))) {
      await d.store.appendAudit({ businessId, actorUserId: actor, action: "bookable.created", targetId: g.id, atMs: d.now() });
      return g;
    }
  }
  return fail("could_not_allocate_id");
}

/** Start times (ms) on one local day when at least one unit is free for `durationMs`. Used by the booking page's time picker. */
export async function freeSlots(d: Deps, a: { businessId: string; groupId: string; dayStartMs: number; durationMs: number; limit?: number }): Promise<number[]> {
  const group = await d.store.getResourceGroup(a.businessId, a.groupId);
  if (!group || !group.active) return [];
  const now = d.now();
  const units = await d.store.resourcesInGroup(a.businessId, group.id);
  const booked = await Promise.all(units.map(async (u) => ({ resourceId: u.id, bookings: await d.store.activeBookingIntervals(a.businessId, u.id, now) })));
  const out: number[] = [];
  for (let t = a.dayStartMs; t < a.dayStartMs + 86_400_000 && out.length < (a.limit ?? 48); t += group.policy.granularityMs) {
    const req = { start: t, end: t + a.durationMs };
    if (validateRequest(group.policy, req, now).ok && freeResources(booked, req, group.policy.bufferMs).length > 0) out.push(t);
  }
  return out;
}
