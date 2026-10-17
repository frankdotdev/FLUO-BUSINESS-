# Cloudflare setup (checklist)

**Status:** instructions; nothing configured yet.

**DNS and TLS:** proxy the app's hostname (orange cloud); SSL mode Full (strict); "Always use HTTPS"; HSTS is already sent by the app.
**Cache rules**
- Cache: `/_next/static/*` (immutable), `/api/v1/*` (honour the origin's `s-maxage=30`).
- Bypass cache: `/app*`, `/account*`, `/g/*`, `/t/*`, `/invite/*`, `/api/auth/*`, `/api/webhooks/*`, `/api/cron`, `/api/health`.
**WAF and rate-limiting rules (per IP; tune with real traffic)**
- `/api/auth/*` POST: 10 per minute.
- Any POST to `/p/*`, `/r/*`, `/e/*` (checkout actions): 20 per minute.
- `/g/*`, `/t/*`: 30 per minute.
- Challenge (Turnstile) on sign-up when abuse appears (not built into the app yet).
**R2 (photos): setup, in order**
1. Create the bucket `fluo-public`. Add a **custom domain** to it (for example `media.yourdomain.com`); that URL is `R2_PUBLIC_BASE_URL`. Do not use the shared r2.dev URL in production.
2. Create an **R2 API token** limited to this bucket with *Object Read & Write*. Put its account id, key id and secret in `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`; set `R2_BUCKET`.
3. **CORS policy on the bucket** (required, or browser uploads fail): allow origin `APP_URL` (and your staging URL), method `PUT`, headers `content-type`, max age 3600. Allow `GET` from `*` for the public domain.
4. **Lifecycle rule:** delete objects under `incoming/` after 1 day (abandoned uploads). Nothing under `incoming/` is ever linked publicly.
5. Cache: media keys include the asset id and never change, so they are served with `immutable` for a year.
Images are public by design. Private documents and payment proofs need a second, non-public bucket with signed reads (not built).
**Origin lock:** allow only Cloudflare's IP ranges to reach the origin where the host supports it, so the per-IP limiter sees real client addresses (`cf-connecting-ip`).
