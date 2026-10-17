# ADR-010: Idempotent, immutable migrations

**Status:** Accepted, implemented

## Decision
Every migration is safe to run twice; applied files are checksummed and never edited; CI applies them twice.

## Consequences
Safe retries and easy moves between servers.
