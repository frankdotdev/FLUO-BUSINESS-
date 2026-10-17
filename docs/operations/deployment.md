# Deployment

**Status:** the container build and compose file exist and have not yet been run (see `getting-started.md`).

## Environments
Local, CI, staging, production. Separate databases, R2 buckets, Google OAuth clients and Paystack keys for each (Paystack test keys for everything but production). Never use production data or secrets in development.

## Release procedure
1. CI is green (type-check, tests including the PostgreSQL contract, build).
2. Deploy to staging; run `npm run db:migrate` (direct connection); smoke tests; load test if the change touches hot paths.
3. Production: take a backup, run migrations (they are additive and idempotent), deploy the app, watch error rate and `/api/health`.
4. **Migrations that remove or rename things are done in two releases** (add the new, move the code, then drop the old) so a rollback of the app never meets a schema it cannot use.

## Configuration
Every variable is documented in `apps/web/.env.example` and validated at startup with a complete list of problems. Rotate `BETTER_AUTH_SECRET`, `TICKET_HMAC_SECRET` (existing tickets stop validating), `CRON_SECRET`, `FIELD_ENCRYPTION_KEYS` (add a new key first; old keys stay for reading), and the Paystack key on any suspicion.

## Scheduler
Call `POST /api/cron` every 5 minutes with the bearer secret (cron-job.org, a Cloudflare Cron Trigger, or the host's cron). Alert if it has not succeeded for 15 minutes.

## Rollback
Redeploy the previous image. Because migrations are additive, the old app runs on the new schema. Database restore is a last resort (`backups-and-restore.md`).
