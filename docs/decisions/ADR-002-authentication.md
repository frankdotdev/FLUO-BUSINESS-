# ADR-002: Authentication: Better Auth with our own tables

**Status:** Accepted, implemented (unverified until first run)

## Decision
Better Auth (Google and email/password) storing users, sessions and accounts in our PostgreSQL, keyed by a stable internal user id. Supabase Auth is not used. Not two systems.

## Consequences
No separate identity provider to migrate; identities move with the database. We own session and recovery correctness; mapping verified with `npx @better-auth/cli generate` (see getting-started).
