# Architecture Decision Records

**Status:** drafts. Vendor limits and library state below were NOT verified live; confirm before committing (see ../open-questions.md).

## ADR-0001 Modular monolith
Single Next.js (TypeScript, strict) app with separated layers: routes → auth/authz → services → repository interfaces → Postgres implementations. Provider interfaces for payments, email, storage, AI. No microservices. Future backend (NestJS preferred to stay in TypeScript; FastAPI if Python-heavy work dominates) implements the same API contract.

## ADR-0002 Authentication (proposed: application-managed auth)
Options: (A) Supabase Auth; (B) Better Auth/Auth.js with app-managed users/sessions on Supabase Postgres.
Proposed: **B**. Reason: founder intends to leave Supabase; identities live in our own tables, so migration is a database move rather than an identity-provider migration. Cost: we own email verification, reset, session revocation and account linking, and must test them.
Rules: internal stable `users.id` (UUID); external identities (Google subject) in a separate `auth_identities` table; memberships and permissions separate from identity. Do not run two auth systems. Check current Better Auth/Auth.js guidance before starting.

## ADR-0003 Database access and portability
Postgres on Supabase; Drizzle (or similar) with versioned SQL migrations. No Supabase SDK calls inside business modules. Money as integer minor units + currency. Every tenant-owned row carries `business_id`. Enforce tenancy in service code first; add RLS as defence in depth only if tested.

## ADR-0004 Identity, workspaces, permissions
One user, many roles: `business_members(user_id, business_id, role)`. Permissions evaluated against the currently selected business on every request. Client-supplied business IDs, prices and payment status are never trusted.

## ADR-0005 Payments
Paystack behind a `PaymentProvider` interface. Redirect success is never proof; verify server-side and via signed webhook; dedupe by provider reference; payment state separate from order/booking/ticket state. Whether payments can be split to businesses or held depends on Paystack products and rules — unresolved.

## ADR-0006 Media
Cloudflare R2, public and private buckets separated. Pipeline: validate real type/size, strip metadata, resize into thumb/card/detail variants, WebP/AVIF, store metadata and owner in Postgres. Quality set per purpose, not a blanket KB target.

## ADR-0007 Email and AI
Gmail SMTP behind an `EmailProvider` interface (swap to Resend later; Gmail sending limits make it launch-only). Groq behind an `AiProvider` interface.

## Capacity statement
No concurrency claim (100/500/1,000) is made until measured on the real deployment. Free tiers are a launch strategy, not a guarantee. Caching public pages, pagination, indexed queries and async jobs are required from the start.

## ADR-0008 International by data, not by code
Markets, currencies, price points and payment routing are rows/config. Adding Stripe or another provider = adapter + routing rule + enable flag. Per-business currency and country on `businesses`. See internationalisation.md.

## ADR-0009 Business types are versioned configuration
Registry of types referencing capabilities; capability dependencies enforced in code and tests; regulated types gated by verification. New types never require a new app or schema redesign.
