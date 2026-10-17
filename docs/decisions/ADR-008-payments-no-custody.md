# ADR-008: Payments: Fluo never holds customer money

**Status:** Accepted, implemented

## Decision
Automatic payments settle straight to the business's own payout sub-account; manual transfers go to the business's account and the business confirms. Fluo takes 2% only on paid tickets and never bears the provider's fee. Businesses define their refund policy and perform refunds.

## Consequences
Simple compliance posture and no escrow. Limits: only Paystack markets for automatic payments; paid tickets need online payment; Fluo cannot verify manual transfers.
