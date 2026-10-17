# Feature status (audit against the specification)

**Legend:** **Done** = built and covered by tests. **Built, unrun** = written and type-checked but never executed end to end (web and mobile UI, `PgStore`). **Partial** = works for a subset. **Not built**.
Counts of tests are from `npm test` (149 tests, one skipped: the PostgreSQL run).

## Customer marketplace
| Feature | Status |
|---|---|
| Landing page, live businesses, upcoming events | Built, unrun |
| Public storefront, item page, event page, booking page | Built, unrun |
| Shareable links open the exact resource; renamed items keep working | Done (routing logic), pages Built, unrun |
| Guest checkout (no account) | Done (services), UI Built, unrun |
| Orders: one item per order | **Partial: no multi-item cart** |
| Made-to-order with lead time | Done |
| Pay now (Paystack) or manual transfer, business chooses | Done (services and adapters), UI Built, unrun |
| "I have transferred" and business confirmation | Done, UI Built, unrun |
| Bookings (rooms, courts, appointments) with timezone, buffers, holds | Done, UI Built, unrun |
| Events and QR tickets, staff check-in with camera | Done, UI Built, unrun |
| Chat between customer and business | Done, UI Built, unrun |
| Order and booking history for signed-in customers | Built, unrun |
| Guest-to-account conversion (claim past guest orders) | **Partial: rule exists, no screen or store method** |
| Search (businesses, items, events, business types; wildcard-safe; indexed) and browse by category | Done (service and Postgres, contract-tested), UI Built, unrun |
| Filters (price, availability), nearby / location | **Not built** |
| Saved items, recently viewed | **Not built** |
| Reviews, ratings, reporting, moderation | **Not built** |
| Product photos, event covers, business logos (signed browser upload to R2, real-file checks, WebP variants, EXIF stripped) | Done (service, R2 adapter verified against AWS test vector), UI Built, unrun. Needs R2 configured (`getting-started.md`) |
| Customer profile and settings page | **Not built** |

## Business tools
| Feature | Status |
|---|---|
| Onboarding from the business-type registry; refund policy; payments setup | Built, unrun |
| Each business sees only its own tools, named in its own words | Done (rule), UI Built, unrun |
| Business types you can open today | **21 of 71** (`business-type-support.md`) |
| Items with stock counts that cannot oversell | Done |
| Orders list, confirm transfers, refund recording | Done, UI Built, unrun |
| Bookings: set up rooms/courts/people, list, confirm, cancel | Done, UI Built, unrun |
| Events: create, ticket types, publish, cancel, check-in | Done, UI Built, unrun |
| Team: invite by email, roles, remove, ownership transfer service | Done (ownership transfer has no screen) |
| Plan, free month, limits (listings, orders, seats), one-tap cancel | Done, UI Built, unrun |
| Quotes and job cards (18 + 3 types: repairs, printing, caterers, tailors, construction...) | **Not built** |
| Delivery, memberships and classes, documents, wholesale pricing, housekeeping, recurring services, property listings, rentals by period, donations, seat sales | **Not built** (each blocks the types listed in `business-type-support.md`) |
| Customer records (CRM), analytics and reports, exports | **Not built** (names appear on orders and bookings only) |
| Business hours, branches, promotions and discounts | **Not built** |
| Storefront logo | Done (upload), Built, unrun. Banner not built |
| Admin console: review payout name mismatches and professional licences | **Not built** (licensed types stay closed) |
| Custom websites, custom domains | **Not built** |

## Money, security, operations
| Feature | Status |
|---|---|
| Server-side pricing, payment verification, signed and de-duplicated webhooks, amount match | Done |
| Fluo never holds money; business bears provider fees; 2% on paid tickets | Done |
| Tenant isolation, roles, audit events, encrypted account numbers, hashed guest links | Done (see `threat-model.md`) |
| Contention safety (stampede tests) | Done in memory; **contract suite must be run on real PostgreSQL** |
| Rate limiting | Partial: per instance; Cloudflare rules documented |
| Content-Security-Policy | **Not built** |
| Data export and deletion, retention rules | **Not built** |
| Email: Resend first, Gmail fallback, budget, retries | Done (adapters unit-tested, never run live) |
| Push: Expo | Done in code, unrun; **web push and service worker not built** |
| Groq AI helper | **Not built** (optional) |
| Docker, compose, CI with PostgreSQL contract, health, load-test and migration-verification scripts | Built, unrun |
| Backups and restore drill | Plan only |
| Independent security review, load measurements | **Not done** |

## Mobile
Sign-in and sign-up, Explore, Events, business page, Account, push registration, notification deep links, hand-off to web checkout: Built, unrun. Native checkout, tickets wallet, native workspace, offline: **Not built**.

## Recommended build order (by launch impact)
1. **Run what exists**: Docker, migrations, contract tests on PostgreSQL, fix what breaks (blocking).
2. ~~Media~~, ~~search and categories~~ done. Next: cart with several items; business hours; filters.
4. Quotes and job cards (opens 21 more types), then delivery.
5. Admin console (payout and licence review) and reviews with reporting.
6. Content-Security-Policy, data export and deletion, shared rate limiting; independent security review.
7. Customer records and analytics; web push and offline; native checkout; Groq helper.
8. Load measurements at 100, 500 and 1,000 (`docs/architecture/scalability.md`).
