# ADR-009: Notifications: durable outbox

**Status:** Accepted, implemented

## Decision
Messages are written to a table in the same transaction as the event, then sent after the response and by a scheduler. Rows are claimed with a lease; duplicates are impossible by key; failures retry with backoff; one-time links are wiped after sending.

## Consequences
Reliable and portable. Mail can be delayed (never lost); an external scheduler is required.
