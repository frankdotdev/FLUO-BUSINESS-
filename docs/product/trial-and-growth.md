# Free Trial and Growth Psychology

**Status:** policy + tested logic (`billing/trial.ts`, `email-budget.ts`). Reminder emails, paywall screens and the nightly job are not built yet.

## Decision: one 30-day trial, starting at first publish
- **One month is right for campus vendors.** Two weeks is too short for the habit to form: a vendor needs to see a few weeks of orders, repeat customers and shared links before the value is obvious. One month also covers a campus event cycle. Cost to Fluo is small.
- **Start the clock when the business publishes, not at sign-up**, so no days are lost while still setting up.
- **Trial plan = the Business tier (7k)**, not Pro. Most vendors will land on Starter or Business, so they shouldn't get used to Pro-only features (custom domain, 50 seats) and then hit a 15k wall. Configurable in `TRIAL_PLAN`.
- **One trial per owner**, not per business, so making new businesses can't restart it. Consider later also keying on the payout account.
- **After the trial: reduce to Free, never delete.** Listings and staff over the free limit are *paused* (hidden from customers, kept for the owner, restored instantly on upgrade). Existing paid orders, bookings and sold tickets are always honoured.

## Your idea (feel the full product, then feel the loss) is sound
It uses real, well-documented effects (endowment effect, loss aversion). It works best when it is honest and visibly tied to the business's own results.

## Techniques to use (all honest)
1. **Show their own numbers at the end:** "In 30 days: 41 orders, 14 repeat customers, 212 link views. On Free you keep 10 listings and 20 orders a month." Real data only.
2. **Reminders at 7 days, 3 days, 1 day, end day, and +7 days** (built into the schedule). Say exactly what will pause. Include a one-tap pay-by-transfer or Paystack link.
3. **Progress and first-win onboarding:** a checklist (add first listing, share your link, get first order) with a progress bar. People finish what they've started, and the first order is the real hook.
4. **Make the share link do the marketing:** "Your Fluo page is live" with WhatsApp and Instagram share buttons straight after onboarding.
5. **Anchoring and a highlighted middle plan:** show all tiers, with Business marked "most popular" only if it genuinely is by data.
6. **Annual discount in naira terms:** "pay 10 months, get 12" and weekly or monthly options for cash-flow-tight vendors.
7. **Founding-member offer, genuinely limited:** the first 100 businesses on a campus lock today's price while they stay subscribed, with a badge. Only use scarcity if the limit is real and enforced.
8. **Referral that rewards both sides (reciprocity):** refer a business and both get extra free weeks, paid in time, not cash.
9. **Social proof that is true:** "37 businesses at your campus are on Fluo", shown only with real counts. Campus ambassadors per hostel or faculty.
10. **Status:** a "Verified" badge and a campus leaderboard of top-rated vendors (opt-in).
11. **Customer side:** saved vendors, order-again, event reminders. Retention on the customer side makes vendors stay.

## Rules we hold ourselves to
No fake countdowns, fake scarcity, fake "X people are viewing", hidden cancellation, or deleting data to force payment. Pause, don't punish. Free must stay genuinely usable, otherwise vendors leave instead of upgrading.

## Free-tier limits proposal (data, easy to change)
Free: 10 listings, 20 orders/month, 1 staff seat. These are placeholders to tune from pilot data.
