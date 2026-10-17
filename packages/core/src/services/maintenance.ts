import type { Deps } from "./ports.ts";

/** Run every few minutes by a scheduler. Safe to run repeatedly and concurrently. Releases locked inventory.
 *  Transfers the customer has marked as sent are never auto-expired: the business must decide. */
export async function runMaintenance(d: Deps): Promise<{ bookings: number; tickets: number; transfers: number }> {
  const now = d.now();
  return {
    bookings: await d.store.expireHeldBookings(now),
    tickets: await d.store.expireHeldTickets(now),
    transfers: await d.store.expireStaleTransfers(now),
  };
}
