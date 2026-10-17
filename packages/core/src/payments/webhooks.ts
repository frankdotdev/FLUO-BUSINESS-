import { createHmac, timingSafeEqual } from "node:crypto";
import type { NormalizedEvent, PaymentProvider } from "./provider.ts";

/** Paystack signs the raw body with HMAC-SHA512 using the secret key (x-paystack-signature).
 *  VERIFY against current Paystack docs before production. */
export function verifyHmacSha512(rawBody: string, signature: string | undefined, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface WebhookStore {
  /** Atomically records (provider, eventId). Returns false if it already existed (unique constraint). */
  insertIfNew(provider: string, eventId: string): Promise<boolean>;
}

export type WebhookResult =
  | { kind: "rejected" }
  | { kind: "duplicate"; event: NormalizedEvent }
  | { kind: "accepted"; event: NormalizedEvent };

export async function receiveWebhook(
  provider: Pick<PaymentProvider, "parseWebhook">, store: WebhookStore,
  rawBody: string, headers: Readonly<Record<string, string | undefined>>,
): Promise<WebhookResult> {
  const event = provider.parseWebhook(rawBody, headers);   // signature verified here, before anything else
  if (!event) return { kind: "rejected" };
  const isNew = await store.insertIfNew(event.provider, event.eventId);
  return isNew ? { kind: "accepted", event } : { kind: "duplicate", event };
}
