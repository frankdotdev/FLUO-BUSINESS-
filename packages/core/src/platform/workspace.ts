import { getBusinessType, type BusinessType } from "./business-types.ts";
import type { Capability } from "./capabilities.ts";

// What the product can actually do today. A capability appears here only when a working tool exists for it.
// Keep this honest: it decides which business types can be opened and which tabs appear.
export const BUILT_CAPABILITIES: ReadonlySet<Capability> = new Set<Capability>([
  "catalogue", "orders", "custom_orders", "inventory",   // listings, ordering, made-to-order, stock counts that cannot oversell
  "services", "bookings", "resource_booking",      // appointments, rooms, courts, rentals-by-time
  "events_ticketing",                              // events, tickets, QR check-in
  "enquiries", "messaging",                        // customer chat
  "customers",                                     // customer names on orders and bookings (a full CRM is later)
  "staff",                                         // team invitations and roles
  "mobility_rides",                                // ride requests, fare negotiation, trips, dispatch
]);

export const missingCapabilities = (t: BusinessType): Capability[] => t.defaults.filter((c) => !BUILT_CAPABILITIES.has(c));
/** A type is ready when every capability it starts with has a working tool. */
export const isTypeReady = (t: BusinessType): boolean => missingCapabilities(t).length === 0;

export type ModuleId = "overview" | "orders" | "bookings" | "events" | "products" | "rides" | "messages" | "team" | "payments" | "billing";
export interface WorkspaceModule { readonly id: ModuleId; readonly label: string }

const g = (t: BusinessType, ...groups: string[]): boolean => groups.includes(t.group);

/** The tabs a business sees, in order, named in its own words. Nothing irrelevant is shown. */
export function workspaceModules(typeId: string, caps: readonly Capability[]): WorkspaceModule[] {
  const t = getBusinessType(typeId);
  const has = (...c: Capability[]): boolean => c.some((x) => caps.includes(x));
  const out: WorkspaceModule[] = [{ id: "overview", label: "Overview" }];
  if (has("orders")) out.push({ id: "orders", label: "Orders" });
  if (has("bookings", "resource_booking", "services") && !has("mobility_rides")) out.push({ id: "bookings", label: g(t, "hospitality") ? "Reservations" : g(t, "beauty", "wellness", "health", "professional", "education") ? "Appointments" : "Bookings" });
  if (has("mobility_rides")) out.push({ id: "rides", label: "Rides" });
  if (has("events_ticketing")) out.push({ id: "events", label: "Events" });
  if (has("catalogue")) out.push({ id: "products", label: g(t, "food") ? "Menu" : g(t, "retail", "agri_b2b") ? "Products" : "Items" });
  if (has("messaging", "enquiries")) out.push({ id: "messages", label: has("enquiries") && !has("orders", "bookings", "resource_booking") ? "Enquiries" : "Messages" });
  out.push({ id: "team", label: "Team" }, { id: "payments", label: "Payments" }, { id: "billing", label: "Plan" });
  return out;
}
