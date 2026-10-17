# Monitoring

**Status:** checklist.
- **Uptime:** probe `GET /api/health` every minute from outside (503 means the database is unreachable). Alert after 3 failures.
- **Scheduler:** alert if `/api/cron` has not succeeded for 15 minutes (emails and reminders stop otherwise).
- **Errors:** an error reporter on the Next.js server (Sentry or similar); alert on any spike in 5xx.
- **Database:** connections used vs limit, slow queries (`pg_stat_statements`), disk, replication or backup age, outbox backlog (`select count(*) from notification_outbox where sent_at is null and send_after < now()`).
- **Payments:** alert on audit actions `payment.amount_mismatch`, `payment.needs_reconciliation`, `payment.paid_without_*_refund_needed`, `payment.unknown_reference`. Each needs a human.
- **Email:** daily sent count against the cap (80% warns).
- Logs are structured, never contain secrets, tokens or full account numbers.
