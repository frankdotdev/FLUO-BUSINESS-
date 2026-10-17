# Business Verification

**Status:** design; schema in migration 0002. No verification code or provider integration yet.

## How you get verifications
1. **Automatic bank-account check (all businesses that accept payments).** When a business adds its payout account, resolve the account name through the payment provider, and compare it to the owner's or business name. Paystack settlement needs a valid bank account anyway.
2. **Identity checks (ID-based).** Nigerian KYC providers such as Dojah expose NIN and BVN lookups; their docs describe government-ID lookup and CAC business lookup for Nigeria, with Ghana, Kenya, Uganda and South Africa ID lookups also listed. Dojah uses prepaid credits per call, so verify only when a tier requires it. Prembly and Smile ID are alternatives I did not research. Compare prices and NDPR handling before choosing.
3. **Business registration (CAC).** For registered companies, look up the RC number (name, status, type, address; directors on the advanced tier).
4. **Manual review queue** for what APIs can't judge: professional licences, photos of premises, addresses. Needs a Fluo admin role, audit logging and a documented decision rule.
5. **Other countries:** coverage is provider-specific; plan a per-market verification config just like payment routing.

## Tiers (proposed; limits to be decided)
| Level | Evidence | Unlocks |
|---|---|---|
| 0 Contact | Verified email/phone | Public profile, listings (low limits), enquiries |
| 1 Payout | Resolved bank account, name matches | Take Paystack payments, paid plans |
| 2 Identity | NIN/BVN (or ID + selfie) | Higher limits, paid events, staff |
| 3 Registered | CAC RC lookup | "Registered business" badge, B2B/wholesale |
| 4 Licensed | Manual review of licence with the relevant regulator | Pharmacy, clinic, lab, dental/optical, veterinary, legal/accounting capabilities |

Rules: regulated types (see registry) cannot activate their regulated capabilities until level 4 is verified; never show clinical notes, results or prescription workflows publicly. Regulator names per profession (e.g. pharmacy, medical, veterinary, legal, accounting councils) must be confirmed per country before launch. A "verified" badge must only appear when a `business_verifications` row is verified and unexpired.

## Decided approach (free-first, scale with revenue)
1. **Now (free):** verified email, plus Paystack's account-name resolve (free in Nigeria and Ghana) compared with the owner's or business name. Manual review for anything else, using public registry lookups and uploaded photos.
2. **Later (paid, only where needed):** per-call identity and CAC lookups (e.g. Dojah) for tier 2 and above, paid events beyond a threshold, and sensitive businesses. Compare per-call prices first. Verification fees can be passed to the business if needed.
3. **Licensed businesses (pharmacy, clinic, lab, dental/optical, veterinary, legal/accounting):** manual review by a Fluo admin with a checklist: licence document, regulator's public register check where one exists, name match with the business owner, premises photo. Licences carry an expiry date; verification lapses when it does and the regulated capability turns off. Every decision is audit-logged with the reviewer's id. Regulator names and register URLs per country must be confirmed before launch.
