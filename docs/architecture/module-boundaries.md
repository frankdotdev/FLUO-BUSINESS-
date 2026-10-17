# Module boundaries

**Status:** implemented. The blueprint's `server/` layers exist under different names; this table is the translation. Rule of the whole design: **business rules never import a framework, a database client or a vendor SDK.** A test fails the build if they do (`services/ops.test.ts`, "BOUNDARY").

| Blueprint | What it is in this repository |
|---|---|
| `server/domain` | `packages/core/src/platform`, `commerce`, `billing`, `payments` (pure rules: money, availability, refund policy, authz, state machines, tickets, trial and plans) |
| `server/application` | `packages/core/src/services` (use cases: business, checkout, bookings, tickets, events, catalogue, staff, messaging, refunds, subscriptions, notifications) |
| `server/ports` | `packages/core/src/services/ports.ts` (the `Store` interface and provider interfaces) plus `payments/provider.ts` |
| `server/adapters/postgres` | `packages/db` (`PgStore`, pool, migration runner) |
| `server/adapters/payments, email, push` | `packages/adapters` (Paystack, Resend, SMTP, Expo push, provider registry) |
| `server/adapters/supabase` | none, deliberately: plain Postgres only, nothing Supabase-specific |
| `server/adapters/storage` (R2) | not built; `platform/image-policy.ts` holds the validation rules |
| `server/adapters/ai` (Groq) | not built |
| `server/composition` | `apps/web/src/server/container.ts` |
| `database/` | `database/migrations` (idempotent SQL), plus README |
| `packages/domain` | the pure parts of `packages/core`, exported to clients as `@fluo/core/client` |
| `packages/contracts`, `api-client`, `validation` | not built: today the web app calls services directly and mobile reads `/api/v1`. Required before native checkout |
| `packages/design-tokens` | CSS tokens in `docs/ux/design-tokens.css`, mirrored in `apps/mobile/lib/theme.ts` (extract when a third consumer appears) |
| `apps/api`, `apps/worker` | not needed yet; see `docs/migration/supabase-to-dedicated-backend.md` |

## Dependency direction
`apps/*` -> `@fluo/db`, `@fluo/adapters` -> `@fluo/core`. `@fluo/core` depends on nothing. `@fluo/core/client` contains no Node APIs, so the mobile app can import it.

## Why not the blueprint's exact folders now
Moving a working, tested core into `server/application` plus ten empty directories would add risk without adding capability. The boundaries are what matter, and they are enforced by tests. If you want the physical layout later it is a mechanical move (imports are by package name).
