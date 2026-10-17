# ADR-007: Row-level security not used yet

**Status:** Accepted, revisit

## Decision
Tenant isolation is enforced in code and schema (composite keys, scoped queries, membership checks) and tested. RLS is not enabled because the app connects with one role and would need to set a per-request business id in every transaction to be meaningful.

## Consequences
If added later it is defence in depth: set `app.business_id` per transaction and write policies plus tests. Never rely on an untested policy.
