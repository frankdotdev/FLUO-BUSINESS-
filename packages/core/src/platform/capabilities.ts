// Capabilities are the unit of product behaviour. Code asks "does this business have X?",
// never "is this business a barber?". Dependencies are enforced here.
export const CAPABILITIES = {
  catalogue: [], inventory: ["catalogue"], orders: ["catalogue"], custom_orders: ["orders"],
  delivery: ["orders"], wholesale_pricing: ["catalogue"], batch_expiry: ["inventory"],
  services: [], bookings: ["services"], recurring_schedules: ["services"], classes: ["services"],
  resource_booking: [], rentals: ["resource_booking"], housekeeping: ["resource_booking"],
  job_cards: ["services"], quotes: [], enquiries: [], listings: [],
  events_ticketing: [], memberships: [], seat_inventory: [], dispatch: [],
  donations: [], documents: [], mobility_rides: [],
  customers: [], staff: [], messaging: [], promotions: [],
} as const satisfies Record<string, readonly string[]>;

export type Capability = keyof typeof CAPABILITIES;
export const isCapability = (s: string): s is Capability => Object.hasOwn(CAPABILITIES, s);

/** Adds missing dependencies; throws on unknown capability. */
export function withDependencies(requested: readonly string[]): Capability[] {
  const out = new Set<Capability>();
  const visit = (c: string): void => {
    if (!isCapability(c)) throw new Error(`Unknown capability: ${c}`);
    if (out.has(c)) return;
    out.add(c);
    for (const d of CAPABILITIES[c]) visit(d);
  };
  requested.forEach(visit);
  return [...out];
}
