# International, Payments and Pricing Architecture

**Status:** foundations implemented and unit-tested (money, routing, pricing, webhook dedupe). Real provider adapters: planned.

## Principle
Nothing country-, currency- or provider-specific lives in business logic. It is data (markets, price points, routing rules) plus adapters.

## Implemented (see tests)
- **Money:** bigint minor units + ISO currency, per-currency exponents (0/2/3 decimals), exact allocation, no float arithmetic, mixing currencies throws.
- **Provider interface** (`payments/provider.ts`): initialize, server-side verify, signed-webhook parse, optional refund. Capability metadata: countries + currencies.
- **Routing** (`payments/router.ts`): rule list is data; first-matching rules set priority, any other enabled provider that supports the payment is a fallback; no supporting provider → explicit error.
- **Webhooks:** HMAC verification helper and a store-backed dedupe so duplicate deliveries are ignored.
- **Payment state machine:** illegal and out-of-order transitions (e.g. late "failed" after "succeeded") are rejected for reconciliation.
- **Pricing:** price points per (plan, currency, interval, optional country). Country-specific prices allow purchasing-power pricing. A missing price is an error; **no silent FX conversion**.
- **Schema:** `markets`, per-currency `plan_prices`, `businesses.country_code/currency`, `payments.provider` (migration 0001, unexecuted).

## Adding a new market (target workflow, no core changes)
1. Insert a `markets` row (currency, locale, timezone). 2. Add price points. 3. Register an adapter if the existing providers don't cover it and add a routing rule. 4. Enable it. 5. Review local tax, data-protection and payments/KYC obligations.

## Not yet designed / needs decisions
- Which currency a customer pays in vs the business settles in; cross-border settlement; FX handling and disclosure.
- Platform commission and provider fees per provider; whether any provider supports split payments or holding funds in a given country.
- Tax/VAT, invoicing and receipts by country. Data-residency and privacy law per market (e.g. NDPR in Nigeria; GDPR if serving the EU).
- Language/RTL localisation beyond number/currency/date formatting (formatting uses `Intl`).
- Provider country/currency coverage in `tests` is illustrative, **not verified** against each provider's current supported-country lists.
