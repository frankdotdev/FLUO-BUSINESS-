# Vendor Limits and What They Mean (checked 2026-10-09)

Sources disagree on some numbers; treat figures as approximate and re-check before launch.

## Supabase (Postgres)
- Free: 500 MB database, 2 active projects, egress about 5 GB per month (one source says 2 GB), 200 concurrent realtime connections, **projects auto-pause after one week idle**. Pro is $25 per month, 8 GB database, no pausing.
- Connections on the small compute size: about 60 direct, 200 through the pooler. **Use the pooled connection string from the app.**
- Implications: free is fine for building and a small pilot with daily traffic, but a paused database means downtime. Before real payments, move to Pro. Keep images out of the database (they go to R2), keep API responses small, cache public pages (egress), and don't depend on realtime for core flows (chat should fall back to polling).

## Cloudflare R2
- Free each month: 10 GB storage, 1 million write-type operations, 10 million read-type operations. **No egress fees.** Beyond that: $0.015 per GB-month.
- Estimate (mine): with three compressed variants per photo at about 150 KB total, 10 GB holds roughly 65,000 photos. Image processing must keep sizes disciplined.
- Image Transformations and other Cloudflare products have their own plans; not assumed free.

## Gmail SMTP (unverified, from memory)
- Free Gmail allows a few hundred sends per day and needs an app password (2-step verification). It is a launch-only stopgap, not suited to bulk. Verify the current cap. The `EmailProvider` interface lets us switch to Resend.

## Paystack
- International cards: 3.9% (+ flat fee) for USD cards on Nigerian accounts per Paystack's page; local cards about 1.5% + N100 (capped) per third-party pages. Account-name resolve API: free (Nigeria, Ghana). Re-check all fees.

## Backblaze B2, Flutterwave, Polar
- Not researched in detail yet; see decisions-log items 16-18 and payments-and-money-flow.md.

## Capacity statement
No concurrency target (100/500/1,000 users) is claimed until load-tested on the real deployment.
