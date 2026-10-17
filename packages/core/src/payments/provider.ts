import type { Money } from "../money.ts";

// Every payment gateway sits behind this interface. Adding Stripe, Flutterwave, etc. means:
// one adapter + one routing rule + one enabled flag. No business-module changes.
export interface ProviderCapabilities {
  readonly id: string;
  readonly countries: readonly string[] | "*";   // ISO 3166-1 alpha-2 of the BUSINESS (settling account) country, not the payer; the payer's card origin is the provider's concern
  readonly currencies: readonly string[] | "*";  // ISO 4217
  /** Optional exact "COUNTRY:CURRENCY" pairs. When present they take precedence over countries/currencies. */
  readonly pairs?: readonly string[];
}

export interface NormalizedEvent {
  readonly provider: string;
  readonly eventId: string;            // provider's unique event id, or a derived stable key
  readonly type: "payment.succeeded" | "payment.failed" | "refund.processed" | "other";
  readonly providerReference: string;
  readonly amount?: Money;
}

export interface PaymentProvider extends ProviderCapabilities {
  initialize(input: { reference: string; amount: Money; customerEmail: string; callbackUrl: string; split?: { subaccount: string; platformFee: Money } }): Promise<{ checkoutUrl: string }>;
  /** Bank-account name lookup (used to verify a business's payout account). */
  resolveAccount?(input: { bankCode: string; accountNumber: string }): Promise<{ accountName: string }>;
  /** Creates the provider-side sub-account that receives the business's share directly. */
  createSubaccount?(input: { businessName: string; bankCode: string; accountNumber: string }): Promise<{ ref: string; accountName: string }>;
  /** Authoritative server-to-provider check. A browser redirect is never proof of payment. */
  verify(providerReference: string): Promise<{ status: PaymentStatus; amount: Money }>;
  /** Returns null if the signature is invalid. Must use the RAW request body. */
  parseWebhook(rawBody: string, headers: Readonly<Record<string, string | undefined>>): NormalizedEvent | null;
  refund?(input: { providerReference: string; amount: Money }): Promise<{ refundReference: string }>;
}

export type PaymentStatus =
  | "created" | "pending" | "awaiting_confirmation" | "succeeded" | "failed" | "expired" | "partially_refunded" | "refunded";

const TRANSITIONS: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  created: ["pending", "awaiting_confirmation", "failed", "expired"],
  awaiting_confirmation: ["succeeded", "failed", "expired"],   // manual bank transfer: the BUSINESS confirms receipt
  pending: ["succeeded", "failed", "expired"],
  succeeded: ["partially_refunded", "refunded"],
  partially_refunded: ["partially_refunded", "refunded"],
  failed: [], expired: [], refunded: [],
};

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
