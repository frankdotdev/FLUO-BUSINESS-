import { hashToken, tokenMatches } from "../platform/guest-access.ts";
import type { Deps } from "./ports.ts";

export async function guestTokenOk(d: Deps, token: string, orderId: string): Promise<boolean> {
  const rec = await d.store.findGuestToken(hashToken(token));
  if (!rec || rec.orderId !== orderId) return false;
  return tokenMatches(token, hashToken(token), rec.expiresAtMs, d.now(), rec.revoked);
}
