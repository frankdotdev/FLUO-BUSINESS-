# ADR-006: Package manager and task runner

**Status:** Accepted

## Decision
npm workspaces today (a lockfile could not be generated without network access; commit `package-lock.json` after the first install). `pnpm-workspace.yaml` and `turbo.json` are included so switching to pnpm and Turborepo, as the blueprint recommends, is `pnpm install` plus replacing `npm run` in CI.

## Consequences
Either works with the same layout.
