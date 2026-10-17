# API contract

**Status:** partial. Reads for mobile exist; writes happen through web server actions.

## Endpoints today
| Method and path | Auth | Purpose |
|---|---|---|
| `GET /api/v1/businesses?limit&offset` | public, cached 30 s | live businesses (public fields only) |
| `GET /api/v1/businesses/:slug` | public, cached 30 s | one business and its active products |
| `GET /api/v1/events` | public, cached 30 s | upcoming published events |
| `GET /api/v1/search?q=` | public, rate limited, cached 20 s | businesses, items, events |
| `POST /api/v1/push` | session | register an Expo push token |
| `POST /api/webhooks/paystack` | HMAC signature | payment events (the only write from outside) |
| `POST /api/cron` | `Authorization: Bearer CRON_SECRET` | maintenance and notification sending |
| `GET /api/health` | public | database reachable? up/down only |
| `/api/auth/*` | Better Auth | sign-up, sign-in, sessions, verification, reset |

Everything else is a Next.js server action calling a service. Services return typed results or throw `ServiceError(code)` with a **stable code** (`not_found`, `forbidden`, `out_of_stock`, ...). The web layer maps codes to plain-language messages (`server/messages.ts`); no stack traces reach clients.

## Conventions
Money is integer minor units plus currency (strings in JSON for bigints). Times are UTC milliseconds; business-local time is converted with the business's IANA timezone. Public responses go through `server/public.ts`, an allow-list of fields.

## Gap against the blueprint
No `packages/contracts` or typed `api-client` yet, and no OpenAPI. Native checkout, tickets wallet and workspace screens in the mobile app need write endpoints under `/api/v1` (orders, bookings, tickets, messages) that call the same services. Do this before building them, then generate the OpenAPI document from the contracts.
