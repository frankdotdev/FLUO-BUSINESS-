# Security Rules

**Status:** rules that are enforced in tested code are marked [tested]; the rest are requirements for the pieces still to be built.

## Access control
- [tested] Authorisation from server-loaded memberships; per-business roles; removed/suspended members denied.
- [tested] Cross-tenant: another business's order or product is "not found"; owners of one business cannot act on another's.
- [tested] Customer actions on an order need the order's own account or secret guest link.
- [tested] Staff invites: hashed single-use tokens, verified-email match, seat limits, role ceilings (only the owner makes admins), owner cannot be removed, ownership transfer is atomic.
- [tested] Bookings: a business's resource groups are invisible to other tenants; double-booking is refused (and the database exclusion constraint is the final arbiter); only members with `bookings.manage` confirm transfers.
- [tested] Check-in needs the `events.checkin` permission and only sees the acting business's tickets.
- Every new endpoint must call a service that authorises. A frontend check is never enough. Database row-level security may be added as a second layer only with tests.

## Money
- [tested] Prices only from the server catalogue; quantity and currency validated; money is integer minor units.
- [tested] Fluo never bears provider fees; paid tickets and subscriptions are provider-only; transfers are confirmed only by the business.
- [tested] Payment and order state changes are compare-and-set; illegal and out-of-order transitions rejected; webhook signature check and duplicate-delivery protection exist as logic.
- [tested] Provider payments are fulfilled only after a signature-verified event AND a server-to-provider re-check AND a matching amount and currency; duplicates and retries are safe; mismatches fulfil nothing.
- A redirect or "I paid" click is never proof of provider payment.

## Data
- [tested] Guest links: random 256-bit secret, only the hash is stored, 30-day expiry, revocable.
- [tested] Sensitive fields (transfer account numbers) encrypted with AES-256-GCM, key outside the database, key id for rotation.
- [tested] Uploads: type from file bytes, SVG/HTML rejected, size limits per purpose, no user filenames in storage keys, private files separate.
- Never log secrets, tokens or full account numbers. Show a transfer account only at checkout.

## Abuse and availability
- [tested] Email budget protects critical mail under the Gmail cap.
- [tested] Rate limiter and per-action policies exist as logic; **not yet wired to endpoints**. Required before launch: wire them, add Cloudflare rules for coarse limits, bot protection on public forms, audit review.
- [tested] A test fails if the core imports Supabase, a framework or a database client (keeps migration cheap).
- Manual transfers can be faked with edited screenshots: businesses must confirm in their own bank app; the UI says so.

## Secrets and operations
- Secrets only in environment variables or a secret manager; never committed; separate keys per environment; rotate on staff change or leak.
- Backups per operations/backups-backblaze-b2.md; restore drills.

## Known gaps (honest list)
No database-backed tests yet; no rate limiting; no real provider adapters; no admin role; no penetration test. Not production-ready.
