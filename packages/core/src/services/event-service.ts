import { authorize } from "../platform/authz.ts";
import { makeSlug, newShortId } from "../platform/routes.ts";
import { type Deps, type EventRecord, type EventStatus, type TicketTypeFull, fail } from "./ports.ts";

export interface EventInput { readonly name: string; readonly description?: string; readonly venue?: string; readonly startsAtMs: number; readonly endsAtMs?: number }
export interface TicketTypeInput { readonly name: string; readonly priceMinor: bigint; readonly capacity: number; readonly salesStartMs?: number; readonly salesEndMs?: number }

async function guard(d: Deps, actor: string, businessId: string) {
  const mine = await d.store.membershipsForUser(actor);
  if (!authorize(mine, actor, businessId, "events.manage").allowed) return fail("forbidden");
  const biz = await d.store.getBusiness(businessId);
  if (!biz) return fail("not_found");
  if (!(await d.store.capabilitiesOf(businessId)).includes("events_ticketing")) return fail("capability_not_enabled");
  return biz;
}

export async function createEvent(d: Deps, actor: string, businessId: string, i: EventInput): Promise<EventRecord> {
  await guard(d, actor, businessId);
  if (i.name.trim().length < 2 || i.name.length > 120) return fail("invalid_name");
  if (!Number.isFinite(i.startsAtMs) || i.startsAtMs <= d.now()) return fail("event_must_be_in_future");
  if (i.endsAtMs !== undefined && !(i.endsAtMs > i.startsAtMs)) return fail("invalid_end_time");
  if ((i.description?.length ?? 0) > 5000 || (i.venue?.length ?? 0) > 200) return fail("invalid_description");
  for (let attempt = 0; attempt < 3; attempt++) {
    const e: EventRecord = { id: d.uuid(), businessId, shortId: newShortId(), slug: makeSlug(i.name), name: i.name.trim(), description: i.description?.trim() || null, venue: i.venue?.trim() || null, startsAtMs: i.startsAtMs, endsAtMs: i.endsAtMs ?? null, status: "draft" };
    if (await d.store.insertEvent(e)) return e;
  }
  return fail("could_not_allocate_id");
}

export async function addTicketType(d: Deps, actor: string, businessId: string, eventId: string, i: TicketTypeInput): Promise<TicketTypeFull> {
  const biz = await guard(d, actor, businessId);
  const ev = await d.store.getEvent(businessId, eventId);
  if (!ev) return fail("not_found");
  if (ev.status === "cancelled" || ev.status === "completed") return fail("event_closed");
  if (i.name.trim().length < 2 || i.name.length > 80) return fail("invalid_name");
  if (typeof i.priceMinor !== "bigint" || i.priceMinor < 0n || i.priceMinor > 1_000_000_000_000n) return fail("invalid_price");
  if (!Number.isInteger(i.capacity) || i.capacity < 1 || i.capacity > 100_000) return fail("invalid_capacity");
  if (i.salesEndMs !== undefined && i.salesEndMs > ev.startsAtMs) return fail("sales_must_end_before_event");
  if (i.salesStartMs !== undefined && i.salesEndMs !== undefined && i.salesEndMs <= i.salesStartMs) return fail("invalid_sales_window");
  if (i.priceMinor > 0n && !biz.acceptsAutomatic) return fail("payments_unavailable");        // paid tickets are online-payment only
  const t: TicketTypeFull = { id: d.uuid(), eventId, businessId, name: i.name.trim(), priceMinor: i.priceMinor, currency: biz.currency, capacity: i.capacity, salesStartMs: i.salesStartMs ?? null, salesEndMs: i.salesEndMs ?? null };
  await d.store.insertTicketType(t);
  return t;
}

export async function setEventStatus(d: Deps, actor: string, businessId: string, eventId: string, status: Extract<EventStatus, "published" | "cancelled">): Promise<void> {
  const biz = await guard(d, actor, businessId);
  const ev = await d.store.getEvent(businessId, eventId);
  if (!ev) return fail("not_found");
  if (status === "published") {
    if (ev.status !== "draft") return fail("invalid_state");
    if (biz.status !== "active") return fail("business_unavailable");
    if ((await d.store.listTicketTypes(businessId, eventId)).length === 0) return fail("no_ticket_types");
    if (ev.startsAtMs <= d.now()) return fail("event_must_be_in_future");
  } else if (ev.status !== "draft" && ev.status !== "published") return fail("invalid_state");
  await d.store.patchEvent(businessId, eventId, { status });
  await d.store.appendAudit({ businessId, actorUserId: actor, action: `event.${status}`, targetId: eventId, atMs: d.now() });
}
