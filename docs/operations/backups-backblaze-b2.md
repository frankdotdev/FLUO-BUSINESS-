# Backups with Backblaze B2

**Status:** plan only; nothing configured. (Assumes "Blackbase" means Backblaze B2.)

- **What to back up:** the Postgres database (scheduled `pg_dump`, encrypted before upload) and R2 media (periodic sync). Auth configuration, environment secrets and Paystack records are NOT covered by a DB backup; keep documented steps to recreate them.
- **Isolation:** use a separate B2 account or bucket, with an application key limited to that bucket and write-only (no delete) on the production server. Enable versioning or object lock where available, so a compromised server can't erase every recovery copy. Keep the admin key off the server.
- **Encryption:** encrypt dumps client-side (e.g. age or gpg) before upload; store the decryption key separately from B2.
- **Schedule (proposed):** daily DB dump, weekly media sync; retention period to be decided.
- **Restore drill:** restore into a scratch database monthly and record the result. A backup you haven't restored isn't proven.
- **Also check** which backups and point-in-time recovery your Supabase plan includes; don't assume.
