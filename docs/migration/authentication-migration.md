# Authentication migration

**Status:** guidance. Better Auth stores users, sessions, OAuth accounts and verification tokens in our own PostgreSQL tables (`users`, `sessions`, `accounts`, `verifications`), keyed by an internal stable `users.id`. Every other table references that id, never a provider's id.

- **Database move:** these tables are in the dump. Users keep passwords and linked Google accounts. Active sessions survive if the new deployment uses the same `BETTER_AUTH_SECRET`; if it changes, users sign in again.
- **Keep the secret stable** across the move (`BETTER_AUTH_SECRET`), and keep `APP_URL` and OAuth redirect URIs consistent, or update them in the Google console first.
- **Moving to a separate backend:** simplest is to keep Better Auth inside the Next.js server as the identity gateway and let the API verify the session cookie or token through it. Re-implementing authentication in another language means password resets or relinking for everyone, because hash formats are not portable by design.
- **Never** copy password hashes into a different system without that system's documented import path.
- **Test before cutover:** sign-up, email verification, sign-in, Google sign-in, password reset, session revocation, account deletion.
