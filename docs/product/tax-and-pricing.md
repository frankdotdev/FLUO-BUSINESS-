# Tax and Pricing Presentation

**Status:** logic implemented (`billing/tax.ts`, tested); not yet applied to receipts or invoices. The owner is handling legal and tax advice; this records the product approach.

- Fluo's revenue is subscriptions and the 2% event fee. Fluo never holds customer money, so a business's sales and their tax are the business's own responsibility.
- **Recommended presentation:** show plan prices VAT-inclusive ("N3,000 a month"), and itemise net, tax and total on the receipt. A business then sees one simple number.
- Tax rates are data per country (a `tax_rates` table is still to be added), never hard-coded, so a new market is a data change.
- `breakdown(amount, rateBps, mode)` splits an inclusive price or adds tax to an exclusive one with exact rounding.
- Not built: receipt/invoice generation and numbering.
