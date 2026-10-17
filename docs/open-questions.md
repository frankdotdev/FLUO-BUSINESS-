# Open Questions

Decided items are in decisions-log.md and docs/decisions/. Still open:

1. **Run it.** Nothing in `apps/` or `packages/db` has executed yet: `docker compose up --build`, then the PostgreSQL contract (`getting-started.md`). Fix whatever it finds.
2. **Better Auth table mapping**: confirm with `npx @better-auth/cli generate`.
3. **Measured capacity**: the numbers in `architecture/scalability.md` are estimates until `tests/load/loadtest.mjs` has run on a real stack.
4. **Polar / Flutterwave** terms, countries, fees before adding adapters.
5. **Paystack** written confirmation for sub-account use (owner reports permission; keep it on file).
6. **Media**: moderation of uploaded photos, a private bucket for documents and proofs, and a lifecycle rule for `incoming/` (see infra/cloudflare).
7. **Public page caching**: move session state out of the root layout when traffic needs CDN caching (`scalability.md` item 2).
8. **Content-Security-Policy**, data export and deletion, retention rules.
9. **Half-hour timezones** for slot alignment.
10. **Gmail cap** re-check; auth emails are not counted in the outbox budget.
11. **Free-plan and trial tuning** from pilot data.
12. **Packaging**: commit `package-lock.json` after the first install; decide npm versus pnpm (ADR-006).
