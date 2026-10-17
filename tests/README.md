# Tests

- `packages/**/**.test.ts`: unit, service and contract tests (`npm test`; no database needed except the optional PostgreSQL contract).
- `tests/load/`: `loadtest.mjs` (see `docs/architecture/scalability.md`).
- `tests/e2e/`, `tests/security/`, `tests/integration/`: reserved for Playwright journeys (guest checkout, booking, ticket, owner onboarding, staff access, webhook replay), HTTP-level security checks, and API integration tests. **Not written yet**; they require the running stack, which this build environment could not start.
