# ADR-003: Data access: portable SQL repositories, no ORM

**Status:** Accepted, implemented

## Decision
Application services depend on a `Store` interface; `PgStore` implements it with parameterised SQL. A shared contract suite runs against the in-memory store and PostgreSQL.

## Consequences
No ORM lock-in; a new backend or language can implement the same contract. More hand-written SQL, which the contract suite checks. (The blueprint allows Drizzle or SQL repositories; this is the SQL choice.)
