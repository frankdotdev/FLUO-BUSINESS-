# ADR-005: Future backend: TypeScript first

**Status:** Accepted (guidance)

## Decision
When a separate API is needed, prefer NestJS or plain Node importing `@fluo/core` unchanged. Choose FastAPI and Celery only if the team prefers Python, accepting a re-implementation guided by the tests.

## Consequences
Lowest risk and effort. See `docs/migration/supabase-to-dedicated-backend.md`.
