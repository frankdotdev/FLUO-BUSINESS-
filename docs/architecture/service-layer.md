# Application Service Layer

**Status:** implemented and tested in memory (`packages/core/src/services`). Postgres implementation: planned.

Request path: route/handler -> **service** (authorise, validate, apply rules) -> **Store port** (interface) -> Postgres (Drizzle) later. Today the Store is `MemoryStore`, so all business rules and security checks are tested without a database.

## Rules every service follows
1. Authorisation uses memberships loaded for the authenticated user server-side. Roles, business ids and prices from the client are never trusted.
2. Every business-scoped Store method takes `businessId`. Looking up another tenant's record returns "not found", the same answer as a record that doesn't exist, so ids can't be probed.
3. State changes are **compare-and-set** (`from -> to`), so a double click or a replayed request cannot apply twice.
4. Multi-row writes (business + owner + capabilities; order + items + payment + guest token) are single atomic Store operations.
5. Failures throw `ServiceError(code)` with a stable code; the web layer maps codes to messages. Internal details are not leaked.
6. Sensitive actions append an audit event (who, what, when).

## Implemented services
- `createBusiness`: validates input, resolves capabilities from the business-type registry, unique slug, owner membership, regulated types start as verification-pending.
- `publishBusiness`: owner/admin only; regulated types need verification; starts the one free trial.
- `placeOrder`: prices from the business's own catalogue, made-to-order lead time, allowed payment methods, transfer reference + 24h hold, one-time guest link.
- `markTransferSent` / `confirmTransfer`: customer (account or guest link) and business (needs `orders.write`) steps for manual bank transfers.

- `inviteMember` / `acceptInvite` / `removeMember` / `transferOwnership`: invite tokens are hashed, single-use, expire in 7 days and need a verified matching email; seat limits come from plan entitlements; admins can't create or remove admins; the owner can't be removed; ownership moves to an active admin atomically with slug confirmation.
- `applyProviderEvent`: called only after the webhook signature is verified; deduplicates, re-verifies with the provider, compares amount and currency to our own record, applies state changes idempotently, retries safely after errors, and flags "paid but no tickets" and "unknown reference" for reconciliation.
- `purchaseTickets` / `qrForTicket` / `checkInTicket`: atomic capacity check (last seat goes to one buyer), 15-minute holds, 2% fee computed server-side, QR only after payment, one-time admit.
- Rate limiter policies (`platform/rate-limit.ts`) for sign-in, orders, guest links, scans, uploads, chat and invites. Not yet wired to any endpoint.

- `holdBooking` / `confirmBookingTransfer`: timezone-correct, server-priced, race-safe room/slot holds (see booking-availability.md).
- `runMaintenance`: releases expired booking and ticket holds, and cancels orders whose transfer was never marked as sent. Idempotent, safe to run concurrently. Not yet scheduled.

## Not yet written
Provider checkout initialisation (needs the Paystack adapter), refunds, messaging, verification review, stale-hold and expired-transfer jobs, outbox email worker, Postgres Store.
