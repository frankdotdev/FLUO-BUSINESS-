# Threat model

**Status:** each row says what stops the attack, where it is tested, and whether it is fully covered. "Logic only" means the rule exists and is unit-tested but the feature that would use it is not built yet. Nothing here has had an independent penetration test: **schedule one before launch.**

| Threat | Control | Tested in | State |
|---|---|---|---|
| User A reads user B's orders or bookings | every read needs the order's own account or its secret link (`isCustomerOf`); queries are scoped by `business_id`; not-found looks the same as forbidden | `services.test.ts` SECURITY, `product.test.ts` | covered |
| Staff read another business's customers or orders | membership is loaded server-side per request and checked against the business in the request; other tenants' rows are "not found" | `services.test.ts`, `ops.test.ts`, `messaging.test.ts`, contract suite | covered |
| Removed staff keep access | no cached roles; every action re-reads memberships; removal sets status | `ops.test.ts` | covered |
| Guest guesses an order, ticket or invite URL | 256-bit random secrets, stored only as hashes; tickets use HMAC-signed tokens; invites are single use and expire; pages are `noindex` with no referrer; lookups are rate limited | `guest-access` and ticket tests, `ops.test.ts` | covered (rate limit is per instance) |
| User changes a business id, role or price in a request | business id is checked against memberships; roles come from the database; prices and totals come from the server catalogue | `services.test.ts`, `commerce.test.ts` | covered |
| Fake "payment succeeded" (browser redirect, forged webhook) | fulfilment only after: valid HMAC on the raw body, server-to-Paystack re-check, matching amount and currency | `ops.test.ts`, `adapters.test.ts` | covered |
| Duplicate or out-of-order webhook issues a second ticket | unique event key, compare-and-set states | `ops.test.ts`, contract suite | covered |
| Overselling under a stampede | row lock / atomic stock update / exclusion constraint | contract suite (100 and 50 parallel) | covered once run on real PostgreSQL |
| Manual-transfer fraud (edited screenshot) | the business confirms from its own bank app; the UI says so; confirmations are audit logged | `services.test.ts` | mitigated by process, not code |
| Disguised or oversized image upload | the signed URL pins content type and exact size; the server re-reads the stored file and checks real bytes, declared type and size; SVG/HTML rejected; undecodable or oversized-pixel images refused; originals deleted; no user filenames in keys | `commerce.test.ts` | covered in code; **unrun against a real bucket** |
| Public cache serves private data | private pages are dynamic; public API goes through an allow-list of fields | `server/public.ts`, contract suite | covered by design; verify headers in staging |
| Search or lists expose drafts | public reads filter on active/published and live business | contract suite | covered (there is no search yet) |
| Brute force sign-in, spam orders or chat | Better Auth limiter; per-action limiter on orders, bookings, tickets, check-in, chat, lookups | `ops.test.ts` | partial: per instance; add Cloudflare rules |
| Cross-site request forgery | Next.js server actions check origin; Better Auth trusted origins; cookies set by Better Auth | framework | verify in staging |
| XSS | React escapes output; emails escape variables; the only `dangerouslySetInnerHTML` renders SVG produced by the QR library from our own token | `templates` test | covered; **no Content-Security-Policy header yet** |
| Leaked secrets | environment only; validated at startup; not in the repo; sent notifications are wiped of one-time links | `env.ts`, secret scan | covered |
| Account number exposure | transfer account encrypted at rest (AES-256-GCM, key outside the database), shown only to the order's own customer; payout number never stored (last 4 only) | `product.test.ts`, `crypto` test | covered |
| Compromised admin or database credentials | no admin console exists yet; use least-privilege database roles and an append-only audit role (see `database/README.md`) | n/a | open |
| Business sells under a stolen identity | payout name must match owner or business name; mismatches are held for review | `product.test.ts` | partial: **no admin review screen yet** |

## Known gaps (do not ship without deciding on each)
Content-Security-Policy header, an admin console (payout and licence review), reviews and abuse reporting, data export and deletion, shared (Redis) rate limiting, independent penetration test, private-file bucket.
