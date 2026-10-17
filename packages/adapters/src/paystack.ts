import { money, verifyHmacSha512, type NormalizedEvent, type PaymentProvider, type PaymentStatus } from "@fluo/core";
import { jsonRequest, ProviderError, type Fetch } from "./http.ts";

export interface PaystackConfig { readonly secretKey: string; readonly baseUrl?: string; readonly fetch?: Fetch }

/** Paystack adapter. Endpoints and fields follow Paystack's public API reference; re-check against the current docs before go-live.
 *  Only the server holds the secret key. */
export function createPaystackProvider(cfg: PaystackConfig): PaymentProvider {
  if (!cfg.secretKey) throw new Error("PAYSTACK_SECRET_KEY is required");
  const base = cfg.baseUrl ?? "https://api.paystack.co";
  const f: Fetch = cfg.fetch ?? ((u, i) => fetch(u, i));
  const auth = { authorization: `Bearer ${cfg.secretKey}` };

  return {
    id: "paystack",
    countries: ["NG", "GH", "KE", "ZA"], currencies: ["NGN", "GHS", "KES", "ZAR", "USD"],
    pairs: ["NG:NGN", "NG:USD", "GH:GHS", "KE:KES", "KE:USD", "ZA:ZAR"],

    async initialize(i) {
      const body: Record<string, unknown> = { email: i.customerEmail, amount: Number(i.amount.amountMinor), currency: i.amount.currency, reference: i.reference, callback_url: i.callbackUrl };
      if (i.split) {                       // the business's share settles straight to its own sub-account; the business bears Paystack's fee
        body.subaccount = i.split.subaccount;
        body.transaction_charge = Number(i.split.platformFee.amountMinor);
        body.bearer = "subaccount";
      }
      const r = await jsonRequest(f, `${base}/transaction/initialize`, { method: "POST", headers: auth, body });
      if (!r?.status || !r?.data?.authorization_url) throw new ProviderError("paystack initialize failed", 502);
      return { checkoutUrl: String(r.data.authorization_url) };
    },

    /** Server-to-server check. A browser redirect is never proof of payment. */
    async verify(reference) {
      const r = await jsonRequest(f, `${base}/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET", headers: auth });
      const d = r?.data;
      if (!r?.status || !d) throw new ProviderError("paystack verify failed", 502);
      const status: PaymentStatus = d.status === "success" ? "succeeded" : d.status === "failed" ? "failed" : "pending";
      return { status, amount: money(BigInt(d.amount), String(d.currency)) };
    },

    parseWebhook(rawBody, headers): NormalizedEvent | null {
      if (!verifyHmacSha512(rawBody, headers["x-paystack-signature"], cfg.secretKey)) return null;
      let e: any; try { e = JSON.parse(rawBody); } catch { return null; }
      const d = e?.data; const ref = d?.reference;
      if (typeof e?.event !== "string" || typeof ref !== "string") return null;
      const eventId = `${e.event}:${d.id ?? ref}`;                // Paystack sends no event id: event type + transaction id is stable across retries
      if (e.event === "charge.success") return { provider: "paystack", eventId, type: "payment.succeeded", providerReference: ref, amount: money(BigInt(d.amount), String(d.currency)) };
      if (e.event === "charge.failed") return { provider: "paystack", eventId, type: "payment.failed", providerReference: ref };
      return { provider: "paystack", eventId, type: "other", providerReference: ref };
    },

    async resolveAccount({ bankCode, accountNumber }) {
      const q = new URLSearchParams({ account_number: accountNumber, bank_code: bankCode });
      const r = await jsonRequest(f, `${base}/bank/resolve?${q}`, { method: "GET", headers: auth });
      if (!r?.status || !r?.data?.account_name) throw new ProviderError("account could not be resolved", 422);
      return { accountName: String(r.data.account_name) };
    },

    /** percentage_charge is required by Paystack when creating a sub-account; 0 because Fluo's fee is passed per transaction. */
    async createSubaccount({ businessName, bankCode, accountNumber }) {
      const r = await jsonRequest(f, `${base}/subaccount`, { method: "POST", headers: auth, body: { business_name: businessName, settlement_bank: bankCode, account_number: accountNumber, percentage_charge: 0 } });
      if (!r?.status || !r?.data?.subaccount_code) throw new ProviderError("paystack subaccount failed", 502);
      return { ref: String(r.data.subaccount_code), accountName: String(r.data.account_name ?? "") };
    },
  };
}

/** Banks for the payout-account form. Public reference data from Paystack's bank list endpoint. */
export async function listPaystackBanks(cfg: { secretKey: string; country?: string; baseUrl?: string; fetch?: Fetch }): Promise<{ name: string; code: string }[]> {
  const f: Fetch = cfg.fetch ?? ((u, i) => fetch(u, i));
  const q = new URLSearchParams({ country: cfg.country ?? "nigeria", perPage: "100", use_cursor: "false" });
  const r = await jsonRequest(f, `${cfg.baseUrl ?? "https://api.paystack.co"}/bank?${q}`, { method: "GET", headers: { authorization: `Bearer ${cfg.secretKey}` } });
  return (r?.data ?? []).filter((b: any) => b?.active !== false).map((b: any) => ({ name: String(b.name), code: String(b.code) })).sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));
}
