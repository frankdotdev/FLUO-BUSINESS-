import { authorize } from "../platform/authz.ts";
import { namesLikelyMatch } from "../platform/name-match.ts";
import { encryptField, decryptField } from "../platform/crypto-fields.ts";
import type { PaymentProvider } from "../payments/provider.ts";
import { guestTokenOk } from "./guest-check.ts";
import { type Deps, fail } from "./ports.ts";

async function requirePerm(d: Deps, actor: string, businessId: string, perm: "billing.manage" | "business.manage") {
  const mine = await d.store.membershipsForUser(actor);
  if (!authorize(mine, actor, businessId, perm).allowed) return fail("forbidden");
}

/** Automatic payments: verify the bank account name, then create the provider sub-account that receives the business's money
 *  directly. Fluo stores only the last 4 digits. A name mismatch is NOT activated; it waits for manual review. */
export async function setPayoutAccount(d: Deps, provider: PaymentProvider, actor: string, businessId: string, input: { bankCode: string; accountNumber: string; ownerName: string }): Promise<{ verified: boolean; accountName: string }> {
  await requirePerm(d, actor, businessId, "billing.manage");                                // owner only
  const biz = await d.store.getBusiness(businessId); if (!biz) return fail("not_found");
  if (!/^\d{10}$/.test(input.accountNumber)) return fail("invalid_account_number");
  if (!/^[0-9A-Za-z-]{2,10}$/.test(input.bankCode)) return fail("invalid_bank");
  if (!provider.resolveAccount || !provider.createSubaccount) return fail("provider_unsupported");
  const { accountName } = await provider.resolveAccount({ bankCode: input.bankCode, accountNumber: input.accountNumber });
  const matches = namesLikelyMatch(accountName, input.ownerName) || namesLikelyMatch(accountName, biz.name);
  let ref = "";
  if (matches) ref = (await provider.createSubaccount({ businessName: biz.name, bankCode: input.bankCode, accountNumber: input.accountNumber })).ref;
  await d.store.savePayoutAccount({ businessId, provider: provider.id, providerRef: ref, bankCode: input.bankCode, accountLast4: input.accountNumber.slice(-4), accountName, verified: matches });
  if (matches) await d.store.patchBusiness(businessId, { acceptsAutomatic: true });
  await d.store.appendAudit({ businessId, actorUserId: actor, action: matches ? "payout.verified" : "payout.pending_review", targetId: null, atMs: d.now() });
  return { verified: matches, accountName };
}

/** Manual payments: where customers send money. The number is encrypted at rest and only shown to the order's own customer. */
export async function setTransferAccount(d: Deps, actor: string, businessId: string, input: { bankName: string; accountName: string; accountNumber: string }): Promise<void> {
  await requirePerm(d, actor, businessId, "business.manage");
  if (!d.keys || !d.keyId) return fail("server_misconfigured");
  if (!/^\d{10}$/.test(input.accountNumber)) return fail("invalid_account_number");
  if (input.bankName.trim().length < 2 || input.accountName.trim().length < 2) return fail("invalid_account");
  await d.store.saveTransferAccount({ businessId, bankName: input.bankName.trim(), accountName: input.accountName.trim(), accountNumberEncrypted: encryptField(d.keys, d.keyId, input.accountNumber), accountLast4: input.accountNumber.slice(-4) });
  await d.store.appendAudit({ businessId, actorUserId: actor, action: "transfer_account.saved", targetId: null, atMs: d.now() });
}

/** The business chooses how customers may pay: automatic, manual, or both. */
export async function setPaymentModes(d: Deps, actor: string, businessId: string, modes: { automatic: boolean; manual: boolean }): Promise<void> {
  await requirePerm(d, actor, businessId, "business.manage");
  if (!modes.automatic && !modes.manual) return fail("at_least_one_mode_required");
  if (modes.automatic && !(await d.store.getPayoutAccount(businessId))?.verified) return fail("payout_not_verified");
  if (modes.manual && !(await d.store.getTransferAccount(businessId))) return fail("transfer_account_required");
  await d.store.patchBusiness(businessId, { acceptsAutomatic: modes.automatic, allowsTransfer: modes.manual });
  await d.store.appendAudit({ businessId, actorUserId: actor, action: "payment_modes.changed", targetId: null, atMs: d.now() });
}

export type CustomerProof = { kind: "user"; userId: string } | { kind: "guest"; token: string };
export async function isCustomerOf(d: Deps, subject: { id: string; userId: string | null }, as: CustomerProof): Promise<boolean> {
  return as.kind === "user" ? subject.userId === as.userId : guestTokenOk(d, as.token, subject.id);
}

/** What the customer needs to pay manually: shown boldly on their order page. Only the order's own customer can see it. */
export async function getTransferInstructions(d: Deps, args: { businessId: string; orderId: string; kind: "order" | "booking"; as: CustomerProof }) {
  const subject = args.kind === "order" ? await d.store.getOrder(args.businessId, args.orderId) : await d.store.getBooking(args.businessId, args.orderId);
  const payment = subject ? await d.store.getPaymentForOrder(args.businessId, args.orderId) : null;
  if (!subject || !payment || !(await isCustomerOf(d, subject, args.as))) return fail("not_found");
  if (payment.method !== "bank_transfer" || (payment.status !== "created" && payment.status !== "awaiting_confirmation")) return fail("not_found");
  const acct = await d.store.getTransferAccount(args.businessId);
  if (!acct || !d.keys) return fail("transfer_account_missing");
  return { bankName: acct.bankName, accountName: acct.accountName, accountNumber: decryptField(d.keys, acct.accountNumberEncrypted), amountMinor: payment.amountMinor, currency: payment.currency, reference: payment.reference!, status: payment.status, expiresAtMs: payment.expiresAtMs };
}
