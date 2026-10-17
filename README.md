# Fluo

One place to discover, buy, book and attend, with a workspace for every business. Built for campus, open to everyone.

```
packages/core      business rules, services, tests (pure TypeScript, no framework)      -> verified: 149 tests
packages/adapters  Paystack, Resend / Gmail SMTP, Expo push (real HTTP, injected fetch)   -> verified: unit-tested request/response shapes
packages/db        PostgreSQL store, pool, migration runner, shared store contract tests  -> written; run the contract test against a real DB
apps/web           Next.js 16 (PWA): auth, onboarding, dashboard, storefront, checkout    -> written; NOT yet installed or run
apps/mobile        Expo / React Native: auth, explore, business page, push                -> written; NOT yet installed or run
database/migrations      plain-PostgreSQL schema (no Supabase-specific features)
docs/              product, architecture, security, operations
```

## Layout of what you are holding
This is one repository (an npm-workspaces monorepo) containing **a complete Next.js project** (`apps/web`) and **a complete React Native / Expo project** (`apps/mobile`), plus the shared packages both depend on. The mobile app talks to the web app's API, so the two are always the same product.

## Run it (about 20 minutes)
See `docs/operations/getting-started.md`. In short: `npm install`, create a Postgres database, copy `apps/web/.env.example` to `.env.local`, `npm run db:migrate`, `npm run dev:web`.

## Check it
```
npm test                                   # 149 tests, no database needed
TEST_DATABASE_URL=postgres://.../fluo_test npm test   # also runs the SAME contract against real PostgreSQL
```
