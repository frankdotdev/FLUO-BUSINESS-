# Database

PostgreSQL 14+ (Supabase today, your server later). Plain SQL only: nothing Supabase-specific.

## Migrations (`database/migrations`)
- Numbered files applied in order by `npm run db:migrate` (use the **direct** connection, not the pooler). Each runs in a transaction under an advisory lock; applied files are recorded with a checksum and the runner refuses if one was edited later.
- **Idempotent:** `create ... if not exists`, `add column if not exists`, constraints added inside `do $$ ... $$` guards, seeds with `on conflict do nothing`. CI applies every file twice against real PostgreSQL.
- **Never edit an applied file.** Add the next number.
- Destructive changes take two releases (see `docs/operations/deployment.md`).

## Contents
`0001_baseline` (identity, businesses, members, catalogue, bookings, orders, payments, events and tickets, media, outbox), `0002_messaging`, `0003_inventory`.

## Conventions
UUID primary keys (identity ids are text because Better Auth issues them), `timestamptz` everywhere, money as `bigint` minor units plus a 3-letter currency, tenant column `business_id`, composite `(id, business_id)` uniqueness for anything a child references.

## Roles (set up on your own server; on Supabase use the closest available)
`fluo_migrate` (DDL), `fluo_app` (DML only, no DDL), `fluo_readonly`. `audit_events`: INSERT and SELECT only for `fluo_app`.

## Seeds and policies
`seeds/`: none (the only reference data, `markets`, is inserted by the baseline). `policies/`: empty on purpose, row-level security is not used yet (`docs/decisions/ADR-007`). `functions/`: no database functions are used.

## Testing the database
`TEST_DATABASE_URL=postgres://.../fluo_test npm test` (the name must contain "test"; the public schema is dropped and recreated). The shared contract suite proves tenant scoping, atomic counters, locking, exclusion constraints, leases and idempotent migrations.
