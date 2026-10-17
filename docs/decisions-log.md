# Decisions Log

Owner answers to the numbered open questions, and what was done. Status: recorded 2026-10-09.

| # | Question | Decision | Implemented |
|---|---|---|---|
| 1 | Non-NGN plan prices | USD $5 / $10 / $15 per month (starter / business / pro); NGN 3k / 7k / 15k | seed + tests |
| 2 | Paystack split permitted? | Owner reports it is permitted. Keep the written confirmation on file | recorded |
| 3 | Verify vendor limits | Done, see operations/vendor-limits.md | doc |
| 4 | Auth library | Better Auth (best fit for security, portability, no vendor lock-in) | setup guide |
| 5 | "Blackbase" | Backblaze B2 | backup plan |
| 6 | First campus / pilots | Owner unsure; plan in product/pilot-campus-plan.md | doc |
| 7 | Legal (NDPR, payments) | Owner to obtain legal advice | open |
| 8 | Route scheme | Decided, see ux/routes.md | code + tests |
| 9 | Mobile timing | Web (PWA) first; shared packages built so mobile reuses them | architecture/delivery-plan.md |
| 10 | Currency | Settle in NGN until a USD account or other provider exists | recorded |
| 11 | International billing provider | Polar (tentative; terms and approval to be checked) | routing config |
| 12 | Resource-booking policies | Four policies on one engine | code + tests + migration 0003 |
| 13 | Licensed-business verification | Manual review with regulator check and expiry | product/verification.md |
| 14 | Transfers for event tickets | Paystack only | code + tests |
| 15 | Who bears provider fees | Never Fluo; the business always does | code + tests |
| 16 | Marketplace provider outside Paystack markets | Not needed yet; Flutterwave later, manual transfer meanwhile | doc |
| 17 | KYC provider | Free-first (Paystack account-name check is free), paid API only where required | product/verification.md |
| 18 | Flutterwave | Planned second marketplace provider (split/subaccounts, wider coverage) | capability stub, disabled |

## Round 2 decisions (2026-10-10)
| Topic | Decision |
|---|---|
| Timezones | Always the business's own IANA timezone, converted to UTC instants (implemented, including daylight-saving edge cases) |
| Email | Gmail SMTP (~500/day) accepted for launch; send-budget guard protects critical mail; move to Resend before reaching the cap |
| Supabase | Upgrade to Pro as soon as revenue arrives; owner will keep the free project from pausing meanwhile |
| Manual transfer | Treated as a first-class method (most owners prefer it): reference code, 24h hold, business confirms, encrypted account details |
| Free trial | One 30-day trial per owner, starting at publish, Business-tier features; then pause (not delete) down to Free |
| Campus and plans | Owner has chosen them; record the campus name here when shared |

## Round 3 (2026-10-10)
| Topic | Decision |
|---|---|
| Supabase Pro | A runway to migrate, not a destination. Migration runbook written; boundary test guards portability |
| Ideas | Backlog kept in product/ideas-backlog.md; owner welcomes more |

## Round 4 (2026-10-10): building the apps
| Topic | Decision |
|---|---|
| Campus name | Not needed. Start from any available campus |
| Legal | Owner handles it; engineering focus is the build |
| Payment modes | The business chooses automatic, manual or both. Automatic: money settles straight to the business's account. Manual: customer sees the account number boldly, taps "I have transferred", the business confirms |
| Refunds | The business sets and states its own policy, shown to customers before they pay; a snapshot is kept per order/booking. The business refunds and records it. Fluo never moves refund money |
| Cancelling a plan | One tap; access continues to the end of the paid period; reminders stop; nothing is deleted |
| Plans | Prepaid periods (no card-on-file surprises); paying extends access; lapsing drops to Free with extra items paused |
| Email | Resend when its API key exists; Gmail SMTP otherwise; a loud startup error if neither |
| Push | Expo push for mobile. Web push for the PWA is not built yet |
| Providers | Adding Polar, Flutterwave or any other is one adapter + one routing rule (registry + contract check) |
| Environment | Secrets and provider details live in environment variables, validated at startup |
| Auth tables | Better Auth uses our `users`/`sessions`/`accounts`/`verifications` tables (text ids) |
| Backup retention | 90 days of daily backups (owner's suggestion), plus a monthly snapshot for 12 months (recommended) |
| Web before mobile | Done in that order; both share one backend, one rule set |

## Round 5: blueprint reconciliation
| Topic | Decision |
|---|---|
| Blueprint adoption | Adopt the boundaries, not the folder names; layout aligned where cheap; mapping in architecture/module-boundaries.md |
| Honesty rule | Only business types whose tools exist can be opened; docs list the rest (generated from code) |
| Chat | Signed-in customers only (spam control); one thread per customer per business |
| Inventory | Stock reserved at order time, returned when an unpaid order is cancelled or expires |
| Notifications | Sent right after actions (and by the scheduler as a safety net) |
| Next build order | See product/feature-status.md (run it first, then media, cart/search, quotes) |
