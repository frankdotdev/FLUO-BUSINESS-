// Which payment methods a purchase may use. The BUSINESS chooses what it accepts:
//   provider  = "automatic": the customer pays on Fluo and the provider settles straight to the business's account
//   transfer  = "manual": the customer sees the business's account number, pays, taps "I have transferred",
//               and the business confirms from its dashboard.
// Paid event tickets and subscriptions are provider-only (Fluo cannot collect its fee on, or verify, a transfer).
export type PaymentPurpose = "order" | "booking" | "ticket" | "subscription";
export type PaymentMethod = "provider" | "bank_transfer";
export interface AcceptedModes { readonly provider: boolean; readonly transfer: boolean }

export function allowedMethods(purpose: PaymentPurpose, amountMinor: bigint, modes: AcceptedModes): PaymentMethod[] {
  if (amountMinor <= 0n) return [];                                  // free: no payment at all
  const out: PaymentMethod[] = [];
  if (modes.provider) out.push("provider");
  if (modes.transfer && purpose !== "ticket" && purpose !== "subscription") out.push("bank_transfer");
  return out;
}
