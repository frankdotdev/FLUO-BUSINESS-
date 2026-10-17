# Migrating off Supabase to your own server

**Status:** plan. Not rehearsed yet. Supabase Pro is the **runway**: it removes auto-pause, adds backups and capacity, and buys the time to do everything below calmly. It is not the destination.

## Why this migration is small by design
- Everything transactional is **plain PostgreSQL**. No Supabase auth, storage, realtime or edge functions are used. The schema is `database/migrations/*.sql`, **idempotent** (safe to run twice; CI proves it).
- Identity lives in **our** tables (`users`, `sessions`, `accounts`, `verifications`, Better Auth), so users, password hashes and sessions travel inside the database dump.
- Media goes to Cloudflare R2, backups to Backblaze B2, email and payments through provider interfaces: none of that moves.
- Business rules are in `packages/core` and talk to the database only through the `Store` interface. A test fails the build if core imports a framework or vendor SDK. `PgStore` is the only SQL in the product.

Two moves, not one. Do them separately:

**Move 1: the database** (days of work). Same app, new Postgres on your server. Change `DATABASE_URL`. Nothing else changes.
**Move 2: the backend** (weeks, optional). Only if you need a separate API, queue workers or a different language. See "Choosing the backend".

## Move 1: database to your VPS
### Target
Postgres 16/17 on a VPS (same host as the app is fine to start; a separate host is better), TLS on, firewall allowing only the app (and your admin IP), automated backups (pgBackRest or WAL-G to Backblaze B2, encrypted), monitoring, and a connection pooler (PgBouncer, transaction mode) once you have more than a couple of app instances. Required extensions: `citext`, `btree_gist` (both ship with Postgres contrib).

### Roles (least privilege)
`fluo_migrate` (owner, DDL, used only by the migration job), `fluo_app` (DML on application tables only, no DDL, no superuser), `fluo_readonly` (reporting). Revoke UPDATE/DELETE on `audit_events` from `fluo_app` (append-only).

### Steps
1. **Prepare (T-14 days).** Provision the server, harden it, install Postgres, run `npm run db:migrate` against it (an empty database gets the schema), run `TEST_DATABASE_URL=... npm test` against it. Lower DNS TTLs to 60 s.
2. **Rehearse (T-7).** `pg_dump -Fc` the Supabase database (use the **direct** connection string), `pg_restore` into the new server, then
   `SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... node scripts/verify-migration.mjs --skip sessions,verifications`
   (row counts and content checksums per table; exit code 0 only if all match). Point a staging copy of the app at it and run the checks in "Smoke tests". Time every step; that is your downtime estimate.
3. **Freeze (T-0).** Announce a short window. Put the app in read-only maintenance (stop the app and `/api/cron`; the Paystack webhook will retry for hours, and processing is idempotent, so a short gap is safe).
4. **Final dump and restore.** Dump, restore, run `verify-migration.mjs` again. Do not proceed unless it prints "All tables match".
5. **Switch.** Change `DATABASE_URL` (pooled) in the app's environment, restart, lift maintenance.
6. **Smoke tests.** Sign in; open a business; place an order (both payment modes); confirm a manual transfer; book a room; buy a free ticket and scan it; send a chat message; replay a Paystack test webhook; call `/api/cron`; `/api/health` returns ok.
7. **Watch** error rate, latency, slow queries, connection count for 48 hours.
8. **Rollback criteria and method.** If smoke tests fail or errors spike: stop the app, repoint `DATABASE_URL` to Supabase (still intact, read-only), restart. Writes made on the new server since the switch must be replayed from the audit log and Paystack records, so keep the window short and decide in the first hour.
9. **Decommission** Supabase only after two weeks, after payments reconcile against Paystack's records, and after a restore drill from the **new** server's backups.

### Sessions and passwords
Password hashes and sessions are rows in our tables and move with the dump. Better Auth's hash format is an implementation detail: do **not** copy hashes into another auth system. Staying on Better Auth means nothing changes for users. If you ever replace it, plan password resets or relinking (see `authentication-migration.md`).

## Move 2: a dedicated backend (only when measurements justify it)
### Choosing the backend
The business rules are TypeScript. **The lowest-risk path is a TypeScript backend (NestJS or plain Node) that imports `@fluo/core` unchanged**: zero rewrite, same tests. Choose Python (FastAPI plus Celery) only if the team prefers it for its own reasons (data and AI work, staffing). That is a **re-implementation** of the services in `packages/core/src/services`; the existing tests are the executable specification, and `packages/db/src/store-contract.ts` is the database specification.

### Strangler approach (either language)
1. Put the new API behind the same domain, route by route under `/api/v1`, starting with read endpoints, then writes.
2. Next.js server actions become thin: they call the API instead of services. Mobile calls the same API.
3. Run the same behavioural tests against both implementations until equal, then cut that route over.

### What replaces what
| Today | After Move 2 |
|---|---|
| `/api/cron` calling `runMaintenance` and `drainOutbox` | scheduler (Celery beat, or a cron container) running the same two jobs every minute; plus an enqueue after commit for instant sends. Jobs are idempotent and safe to run concurrently (outbox rows are claimed with `SKIP LOCKED`) |
| `after()` flush in the web server | worker consuming the outbox (or a Redis queue fed after commit) |
| per-instance `RateLimiter` | Redis sliding window with the same policy table (`platform/rate-limit.ts`), plus Cloudflare rules |
| none | Redis cache for public listings (key, TTL, invalidate on publish and edit) |
| `container.ts` composition | the new service's dependency wiring |
| `PgStore` | the same SQL, or a Python repository layer that passes the contract suite |

### Service to endpoint map (for the new API)
| Service | Endpoint(s) |
|---|---|
| `createBusiness`, `publishBusiness` | `POST /v1/businesses`, `POST /v1/businesses/:id/publish` |
| `placeOrder`, `markTransferSent`, `confirmTransfer`, `cancelUnpaidOrder` | `POST /v1/orders`, `POST /v1/orders/:id/transfer-sent`, `POST /v1/orders/:id/confirm-transfer`, `POST /v1/orders/:id/cancel` |
| `holdBooking`, `markBookingTransferSent`, `confirmBookingTransfer`, `cancelBooking` | `POST /v1/bookings` and sub-actions |
| `purchaseTickets`, `checkInTicket` | `POST /v1/events/:id/tickets`, `POST /v1/events/:id/check-in` |
| `createProduct`, `updateProduct`, `setProductStatus` | `/v1/businesses/:id/products` |
| `createEvent`, `addTicketType`, `setEventStatus`, `createResourceGroup` | `/v1/businesses/:id/events`, `/bookables` |
| `startConversation`, `sendMessage`, `readConversation` | `/v1/conversations` |
| `inviteMember`, `acceptInvite`, `removeMember`, `transferOwnership` | `/v1/businesses/:id/members` |
| `setPayoutAccount`, `setTransferAccount`, `setPaymentModes` | `/v1/businesses/:id/payments/settings` |
| `startSubscriptionPayment`, `cancelSubscription` | `/v1/businesses/:id/subscription` |
| `applyProviderEvent` | `POST /v1/webhooks/paystack` (URL changes: update it in Paystack, keep the old one alive during the overlap) |

## Migration hygiene rules (always)
- Migrations are numbered, idempotent, and **never edited after being applied** (the runner stores a checksum and refuses). Add a new file instead.
- Keep Supabase-specific features out: no `auth.uid()` policies, no Supabase Storage, Realtime or Edge Functions in core flows.
- Secrets come from the environment only. Rotate on any suspicion.
- Never write to two databases at once. Use a rehearsed cutover.
