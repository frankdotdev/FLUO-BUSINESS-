# Backups and restore

**Status:** plan; nothing is scheduled yet. Provider notes are in `backups-backblaze-b2.md`.

- **What:** PostgreSQL (daily logical dump, plus WAL archiving for point-in-time recovery once on your own server), R2 media (weekly sync), non-secret configuration, and a written list of how to recreate secrets. A database backup does **not** cover R2 objects, OAuth settings, environment secrets, or Paystack's own records.
- **Where:** encrypted before upload, in a separate Backblaze B2 account, written with a key that cannot delete; versioning or object lock on.
- **Retention:** daily for 90 days (your choice), plus a monthly copy for 12 months.
- **Objectives to confirm before launch:** RPO (data you can afford to lose, e.g. 24 hours until WAL archiving, minutes after) and RTO (time to restore, e.g. 4 hours).
- **Restore drill, monthly:** restore the newest dump into a scratch database, run `database` migrations (idempotent, a no-op), run `scripts/verify-migration.mjs` against production for row counts, run the contract tests against it, record the time taken in this file.

| Date | Source | Restore time | Verified by | Result |
|---|---|---|---|---|
| | | | | |
