# Load testing

How to run: see `docs/architecture/scalability.md`, section 6. Script: `tests/load/loadtest.mjs` (no dependencies). It exercises read-heavy public paths. Write-path correctness under contention is covered by the contract suite (`packages/db/src/store-contract.ts`).

## Results log (fill in; empty until measured)
| Date | Stack (instances, DB plan) | Users | p50 | p95 | p99 | Errors | Notes |
|---|---|---|---|---|---|---|---|
| | | 100 | | | | | |
| | | 500 | | | | | |
| | | 1000 | | | | | |

Never test a production system you do not control, and never test with real customers' data.
