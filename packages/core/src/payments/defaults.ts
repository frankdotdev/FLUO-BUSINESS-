import type { ProviderCapabilities } from "./provider.ts";
import type { RoutingRule } from "./router.ts";

// Capability data below comes from Paystack/Polar public docs read on 2026-10-09. RE-VERIFY before go-live.

/** Marketplace payments (customer -> business). Paystack currencies: NGN, GHS, ZAR, KES, USD (USD only NG & KE).
 *  USD for a Nigerian account also needs international payments enabled by Paystack, and a Zenith USD
 *  domiciliary account if you want USD payouts. */
export const PAYSTACK: ProviderCapabilities = {
  id: "paystack", countries: ["NG", "GH", "KE", "ZA"], currencies: ["NGN", "GHS", "KES", "ZAR", "USD"],
  pairs: ["NG:NGN", "NG:USD", "GH:GHS", "KE:KES", "KE:USD", "ZA:ZAR"],
};

/** Planned: subscription billing for businesses OUTSIDE Paystack markets, via a Merchant of Record.
 *  A MoR is the legal seller, so it fits Fluo's own plans, NOT customer->business marketplace payments. */
export const POLAR_BILLING: ProviderCapabilities = { id: "polar", countries: "*", currencies: ["USD"] };

export const MARKETPLACE_RULES: readonly RoutingRule[] = [{ providers: ["paystack"] }];
export const BILLING_RULES: readonly RoutingRule[] = [
  { countries: ["NG", "GH", "KE", "ZA"], providers: ["paystack"] },
  { currencies: ["USD"], providers: ["polar"] },
];

/** Planned second MARKETPLACE provider: has split payments/subaccounts and much wider African coverage.
 *  Country list is a PLACEHOLDER; fill it from Flutterwave's current docs before enabling. Disabled by default. */
export const FLUTTERWAVE: ProviderCapabilities = { id: "flutterwave", countries: ["NG", "GH", "KE", "ZA", "UG", "TZ", "RW"], currencies: ["NGN", "GHS", "KES", "ZAR", "UGX", "TZS", "RWF", "USD"] };
