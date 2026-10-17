# Fluo Documentation

Fluo is a local business network: people discover, buy, book and attend; businesses get a workspace with the tools their business needs. Launch wedge: **built for campus, open to everyone.**

## Status legend
`planned` · `in progress` · `implemented` · `verified`

## Current state (Phase 2 — foundations)
| Area | Status |
|---|---|
| Product vision, capability matrix, MVP scope | in progress (draft, needs owner review) |
| Architecture decisions (ADRs) | in progress (drafted, unverified against current vendor docs) |
| Design tokens | in progress (contrast-checked, not yet used in code) |
| Core rules and services (business, orders, stock, bookings, tickets, events, chat, team, refunds, plans, notifications) | implemented; 136 tests (one skipped) |
| Adapters (Paystack, Resend/Gmail, Expo push) | implemented; request/response shapes unit-tested; not yet run against live services |
| PostgreSQL store + migration runner | written; shared contract test ready; **not yet run against a database** |
| Next.js web app (auth, onboarding, dashboard, storefront, checkout, webhooks, cron) | written; **not yet installed or run** |
| Expo mobile app (auth, explore, business page, push) | written; **not yet installed or run** |
| Database schema | baseline migration 0001 written, not yet executed |
| Everything else | planned |

Nothing in this folder claims a feature exists. See `open-questions.md` for unresolved decisions.

## Index
- **Start here:** operations/getting-started.md, product/feature-status.md (what is and is not built), product/user-flows.md
- **Architecture:** architecture/system-overview.md, module-boundaries.md, api-contract.md, scalability.md, booking-availability.md, payments-and-money-flow.md, service-layer.md, internationalisation.md, delivery-plan.md, decisions.md
- **Decisions (ADRs):** decisions/ADR-001 to ADR-010, decisions-log.md
- **Security:** security/threat-model.md, tenant-isolation.md, security-rules.md
- **Operations:** operations/deployment.md, backups-and-restore.md, backups-backblaze-b2.md, load-testing.md, vendor-limits.md, better-auth-setup.md
- **Migration:** migration/supabase-to-dedicated-backend.md, migration/authentication-migration.md
- **Product:** product/business-type-support.md (generated), vision-and-mvp.md, capability-matrix.md, verticals-catalogue.md, verification.md, trial-and-growth.md, tax-and-pricing.md, pilot-campus-plan.md, ideas-backlog.md
- **Also:** ux/, open-questions.md, CHANGELOG.md
