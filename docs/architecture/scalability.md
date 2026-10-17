# Scalability, concurrency and capacity

**Status:** the guarantees below are implemented and tested in memory; the database-level ones are tested by the shared contract suite, which must be run against real PostgreSQL (CI does this). The **capacity numbers are planning estimates, not measurements**: nothing has been load-tested on a real deployment. `tests/load/loadtest.mjs` and the procedure at the end replace estimates with evidence.

## 1. "100 people click the same button at once" (correctness under contention)
Every contended action is decided by the database, never by application code racing itself.

| Situation | What happens | Mechanism | Verified by |
|---|---|---|---|
| 100 buyers, 10 tickets left | exactly 10 succeed, 90 get "sold out" | `SELECT ... FOR UPDATE` on the ticket type row, count, insert in one transaction | contract test "stampede" (100 parallel) |
| 50 orders, 5 items in stock | exactly 5 succeed, never oversells | one atomic `UPDATE ... WHERE stock >= qty` per item inside the order transaction | contract test "inventory" (50 parallel) |
| 100 people book the same room and dates | one booking, the rest "fully booked" (or the next free unit) | PostgreSQL exclusion constraint on (unit, occupied range) | contract test "bookings" |
| Owner double-clicks "I received it" (or 100 do) | the order changes once | compare-and-set `UPDATE ... WHERE status = 'awaiting_payment'` | contract test "stampede" (100 parallel) |
| Paystack sends the same webhook 5 times, or out of order | fulfilled once | unique `(provider, event_id)` plus compare-and-set payment state; re-verified with Paystack; amount must match | `ops.test.ts`, adapters tests |
| Two workers send the same email | sent once | `FOR UPDATE SKIP LOCKED` lease on outbox rows; unique dedupe key | contract test "notifications" |
| 20 messages sent in the same instant | all stored, unread count exact | transactional increment in the same statement | contract test "messaging" |
| Same person submits checkout twice | two separate orders, each valid (no silent merging) | each submission is its own order with its own hold; unpaid duplicates expire and return stock | services tests |
| Someone hammers sign-in, orders or guest links | blocked after a small number of attempts | Better Auth's limiter; `RateLimiter` per action; Cloudflare rules (see `infra/cloudflare`) | `ops.test.ts` |

Serialisation cost: contention is per row, so 100 buyers of *one* hot ticket type queue behind one lock (each transaction is a few milliseconds), while buyers of different events do not block each other.

## 2. Will 100 / 500 / 1,000 concurrent users crash it?
"Concurrent users" are people with the site open, not simultaneous requests. A browsing person sends roughly one request every 5 to 10 seconds, so:

| Concurrent users | Requests per second (estimate) | Database queries per second (3 to 6 per page) |
|---|---|---|
| 100 | 10 to 20 | 30 to 120 |
| 500 | 50 to 100 | 150 to 600 |
| 1,000 | 100 to 200 | 300 to 1,200 |

**Expected behaviour (to be confirmed by measurement):**
- **100:** one small instance and the Supabase **Pro** database handle this comfortably. On the free tier the risks are auto-pause after inactivity, 500 MB, and connection limits, not CPU.
- **500:** server-rendered pages become the first limit (CPU on a single small instance). Run 2 to 3 instances behind Cloudflare and cache the public JSON endpoints (already `s-maxage=30`). Database load is still moderate.
- **1,000:** needs several instances, Cloudflare caching of public pages, and a rate limiter shared between instances. The database should still cope if queries stay indexed; watch connection count.
- **Spike (a big event goes on sale):** the sale itself is safe (section 1). The risk is the sheer number of page requests, absorbed by instances and the CDN.

## 3. Bottlenecks in the order you will hit them
1. **Supabase free tier** (pauses when idle, 500 MB, connection limits). Move to Pro before real payments.
2. **Server-rendered public pages.** The root layout reads the session, which makes every page dynamic and uncacheable by the CDN. Fix when traffic demands it: move the nav's sign-in state into a small client component so `/`, `/b/*`, `/e/*` can use `revalidate`.
3. **Database connections.** Each app instance holds up to 10. Total = instances x 10, which must stay under the pooler limit; use the transaction pooler string at runtime. Long transactions are avoided: no external HTTP call is made while a transaction is open.
4. **Rate limiter is per instance.** With N instances an attacker gets N times the allowance. Put the same limits in Cloudflare, and move the limiter to Redis when you run more than one instance.
5. **Email.** Gmail's cap (about 500 a day) is a hard ceiling; the outbox protects critical mail and defers the rest. Move to Resend before you approach it.
6. **Paystack latency** adds a few hundred milliseconds to checkout only; no connection is held meanwhile.
7. **Notification flush** runs after each response; if the database is slow, mail is delayed, never lost (the outbox is durable and retried).

## 4. Behaviour under overload
Requests queue for a database connection for up to 10 seconds, then fail with an error page; nothing corrupts (every write is transactional). The health endpoint reports 503 when the database is unreachable so a load balancer can pull the instance. Cloudflare's rules shed abusive traffic first.

## 5. Scaling stages
| Stage | Setup |
|---|---|
| Launch, up to about 100 concurrent | 1 app instance, Supabase Pro, Cloudflare in front, cron every 5 min |
| About 500 | 2 to 3 instances, CDN caching of public pages (item 2 above), uptime and error alerts, rate rules in Cloudflare |
| About 1,000 and beyond | add Redis (rate limits, cache), move notification/maintenance to a worker, read replica for public reads, then dedicated database host per `docs/migration/` |

## 6. How to measure (do this before launch)
1. Seed a copy of production-sized data on a staging stack that matches production sizes.
2. `node tests/load/loadtest.mjs --base https://staging... --users 100 --seconds 60 --paths /,/api/v1/businesses,/b/<slug>`; repeat with 500 and 1000.
3. Record p50/p95/p99, error rate, CPU, memory, database connections and slow queries (`pg_stat_statements`).
4. The run **passes** at under 1% errors and p95 under 1.5 s. Replace the estimates above with the measured numbers and keep the results in `docs/operations/load-testing.md`.
5. Run the contention suite against real PostgreSQL: `TEST_DATABASE_URL=... npm test`.
