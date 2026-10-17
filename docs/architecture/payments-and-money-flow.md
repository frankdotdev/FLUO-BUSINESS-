# Payments and Money Flow

**Status:** design + tested pure logic (fees, routing). No live Paystack integration yet. Facts about providers were read on 2026-10-09; re-verify before launch.

## Principle: Fluo does not hold customer money
Customer pays through the provider; the provider settles the business's share straight to that business's own bank account, and Fluo's fee to Fluo.

## Flow A: customer pays a business (orders, bookings, tickets)
1. Business adds a payout bank account in its workspace. Fluo creates a Paystack **subaccount** for it (account number is held by Paystack; Fluo stores only last 4 digits, bank and resolved name).
2. At checkout, Fluo initializes the transaction with `subaccount`, and for events `transaction_charge` = 2% (flat, minor units) and `bearer`.
3. Paystack settles to the subaccount's bank account. Fluo confirms the payment server-side and by signed webhook, never from the browser redirect.
- **Fee bearer matters.** Paystack's default is that the main account (Fluo) bears Paystack's processing fee. On a small ticket a 2% platform fee can be less than that fee, so Fluo would lose money. Default policy: `bearer = subaccount` (the business bears the provider fee). `planEventSplit` refuses a platform-bearer plan unless 2% covers an estimated provider fee (tested).
- Free tickets: no payment, no fee.
- Fee percentage and plan prices are configuration (`EVENT_FEE_BPS = 200`; NGN plans 3k/7k/15k; USD $5/$10/$15).
- **Decided: the business always bears the provider's fee; Fluo never does.** Only paid event tickets carry a Fluo fee (2%).

## Flow B: manual bank transfer
Customer sends money directly to the business's account; **Fluo cannot verify it**. Status `awaiting_confirmation`, and the business marks it received (optionally with a proof-of-payment upload). It is never treated as provider-verified. **Decided:** transfers are allowed for orders and bookings where the business enables them; paid event tickets and subscriptions are provider-only (enforced and tested in `methods.ts`).

## Flow C: businesses pay Fluo (subscriptions)
Separate from Flow A. Nigerian-market businesses pay via Paystack in NGN. Businesses outside Paystack's markets pay in USD via a Merchant of Record (planned: Polar; Lemon Squeezy and Dodo are alternatives).

## Can Paystack serve international users?
- **International customers paying a Nigerian business: yes**, with international payments enabled on the Paystack account (Visa/Mastercard/Verve; Amex for NG/KE/ZA businesses). Nigerian accounts can accept USD; USD payouts need a Zenith USD domiciliary account, otherwise it settles in naira. USD card fees are higher than local (about 3.9% per Paystack's page).
- **International businesses receiving payouts: no.** Paystack operates in Nigeria, Ghana, Kenya and South Africa (plus USD in NG/KE). A subaccount needs a settlement bank account in a Paystack market. A business in the UK or US can't be paid out through Paystack.
- A single Paystack account handles one base currency (plus USD for NG/KE). Other currencies need separate Paystack accounts.
- The Paystack account must approve international payments (compliance review); it isn't automatic.

## Choosing a second provider
- **Stripe:** Fluo is Nigerian, so Stripe Connect isn't open to it as a platform. (You observed this; I did not re-verify Stripe's current list.)
- **Merchant-of-Record providers (Polar, Lemon Squeezy, Dodo):** they are the legal seller and are built for software/digital products. They suit **Fluo's own subscription revenue from international businesses**. They do **not** fit customer-to-business marketplace payments with direct payout, and their terms for physical goods/services need checking.
  - Polar's docs list Nigeria among payout countries (checked). Lemon Squeezy's docs list Nigeria for bank payouts (page is old, re-check). Dodo's docs list Nigeria only as "grandfathered", meaning new Nigerian merchants likely can't onboard. **Recommendation: start with Polar for international subscription billing; re-verify its terms and your account approval first.**
- **Flutterwave (planned second marketplace provider):** its docs describe split payments with subaccounts, and say the marketplace owner is responsible for vetting merchants. Third-party sources describe much wider country coverage than Paystack; coverage and fees are not verified, so the capability stub in `defaults.ts` is disabled and its country list is a placeholder. It also gives redundancy inside Nigeria.
- **Businesses outside both providers' markets:** manual bank transfer for orders and bookings (works anywhere, keeps Fluo out of the money flow). Paid event tickets stay unavailable to them until a supported provider exists.
- **Settlement currency (decided):** settle in NGN until a USD account or another provider is in place.

## Compliance flag (not legal advice)
Routing third-party funds through your provider account, even with instant split settlement, can carry regulatory implications (payment licensing, provider terms for marketplaces, KYC of sub-merchants). Confirm with Paystack in writing that your use of subaccounts is permitted, and get advice from a Nigerian fintech lawyer before launch.
