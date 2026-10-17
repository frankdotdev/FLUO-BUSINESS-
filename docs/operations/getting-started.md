# Getting started

**Status:** written but not yet executed end to end (the build environment had no network). Follow it once and report any error; each step names what to expect.

## 0. Prerequisites
Node.js 22+, npm 10+, a PostgreSQL 14+ database (a Supabase project works; so does local Postgres), a Paystack account (test keys), a Gmail account with an app password (or a Resend key).

## Fastest path: Docker (needs Docker only)
```
cp apps/web/.env.example .env     # fill the REQUIRED values; set DATABASE_URL=postgres://fluo:fluo@db:5432/fluo
docker compose up --build         # starts Postgres, applies migrations, serves the app on http://localhost:3000
```
`/api/health` reports up/down. For development without Docker, continue below.

## 1. Install
```
npm install
```
npm workspaces link `@fluo/core`, `@fluo/adapters`, `@fluo/db` into the apps.

## 2. Database
1. Create a database. Enable nothing special: the migration creates the `citext` and `btree_gist` extensions (both exist on Supabase).
2. Apply the schema with the DIRECT connection string (not the pooler):
   `DATABASE_URL=postgres://... npm run db:migrate`  (expect: `applying 0001_baseline.sql`, then `migrations up to date`).
3. Verify the SQL store: create an empty database whose name contains `test`, then
   `TEST_DATABASE_URL=postgres://.../fluo_test npm test`. The PgStore contract must pass (it drops and recreates that database's public schema).

## 3. Configure the web app
`cp apps/web/.env.example apps/web/.env.local` and fill every REQUIRED value (generate secrets with `openssl rand -base64 32`). The app refuses to start and lists anything missing or malformed. Use the POOLED connection string for `DATABASE_URL` at runtime.
- **Email:** with `RESEND_API_KEY` set, Resend is used; otherwise Gmail SMTP (`GMAIL_USER` + `GMAIL_APP_PASSWORD`). One of them is required.
- **Google sign-in (optional):** create an OAuth client; authorised redirect URI `APP_URL/api/auth/callback/google`.

- **Photos (optional):** follow `infra/cloudflare/README.md` (bucket, custom domain, API token, CORS) and set the five `R2_*` variables. With them empty, photo upload buttons report that uploads are off and everything else works.

## 4. Verify the Better Auth mapping (one time)
Run `npx @better-auth/cli generate` from `apps/web` and compare its proposed tables with `database/migrations/0001_baseline.sql` (`users`, `sessions`, `accounts`, `verifications`; snake_case columns mapped in `src/server/auth.ts`). If it asks for a column we lack, add a new migration (never edit an applied one).

## 5. Run
`npm run dev:web` then open http://localhost:3000. Sign up, confirm the email, open a business, add payout or transfer details, add an item, publish.

## 6. Connect Paystack
- Webhook URL in the Paystack dashboard: `APP_URL/api/webhooks/paystack`. The signature is verified with your secret key.
- For local testing expose your machine with a tunnel (e.g. Cloudflare Tunnel) and use that URL as `APP_URL`.

## 7. Schedule the background job (required)
Every 5 minutes call: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron`
It sends emails and push notifications, releases expired holds and cancels stale transfer orders. Use any scheduler (cron-job.org, a Cloudflare Cron Trigger, a VPS cron). Without it, reminders and emails queue but never send.

## 8. Mobile
```
cd apps/mobile && cp .env.example .env && npx expo install --fix && npm run start
```
`expo install --fix` aligns package versions with the installed Expo SDK. Set `EXPO_PUBLIC_API_URL` to the web app's address (your computer's LAN address on a real phone). Push notifications need a real device and an EAS project id (`eas init`).

## 9. Production notes
Build with `npm run build -w @fluo/web` (standalone output). Run behind HTTPS and Cloudflare. Move the database to Supabase Pro (or your own server) before real payments. Rotate secrets on any leak. See `docs/migration/supabase-to-dedicated-backend.md` for leaving Supabase.
