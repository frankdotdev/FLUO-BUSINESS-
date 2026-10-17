# Fluo — Vision, Positioning and MVP

**Status:** in progress (draft)

## Vision
One place to discover, buy, book and attend, with every business receiving a workspace tailored to what it does. One account can be a customer, an owner of several businesses and staff at others.

## Positioning
Universal brand, campus-first launch. Tagline candidate: *Discover. Buy. Book. Attend.* Campus line: *Your campus, all in one place.* Avoid campus-only naming so expansion is not blocked.

## Problem (from founder research)
Vendors post on WhatsApp groups and statuses that buyers rarely see. Buyers hunt for numbers, scroll hundreds of messages, and commercial chat mixes with family and classmates. Discoverability, not supply, is the gap.

## Transaction primitives
BUY (products) · BOOK (time-based services) · REGISTER (events) · REQUEST (quotes/custom work, incl. made-to-order such as cakes with lead time).

## Money model
Businesses pay Fluo, not customers. Free tier + paid tiers (limits on scale, not core function). Event tickets carry a platform fee. Plan names, prices, fees and quotas are **configuration, not code**. Pricing in the founder notes (3k/5k/10k vs 3k/7.5k/15k, NGN/month) is undecided.

## MVP scope (proposed)
Customer: guest-first discovery, search, business/product/service/event pages, cart, orders, bookings, event registration, payment, saved items, basic account, in-app chat.
Business: create workspace via capability-based onboarding, profile + shareable link, products, services, orders, bookings, customers, payments, basic analytics, staff.
Events: free/paid tickets, checkout, QR ticket, check-in, dashboard.

**Initial verticals:** retail, food/restaurant, made-to-order food, barber/salon/beauty, repair, events, general business.
**Deferred:** full social feed, AI features beyond a minimal helper, delivery fleet, payroll/accounting, loyalty, custom websites, native iOS polish.

## Launch readiness (measurable, draft)
- Cross-tenant negative tests pass in CI.
- Paid flows confirmed only via verified Paystack webhook/server verification.
- Load test results recorded at 100/500/1,000 simulated users on the real deployment.
- Backup restore drill completed once.
- 20–50 pilot businesses onboarded at one campus.
