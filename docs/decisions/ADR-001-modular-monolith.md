# ADR-001: Modular monolith

**Status:** Accepted, implemented

## Decision
One deployable web server containing the application services, with clear module boundaries (`packages/core`, `db`, `adapters`). No microservices.

## Consequences
Simple to run and migrate; modules can be extracted later. Boundaries are enforced by a test that forbids vendor imports in core.
