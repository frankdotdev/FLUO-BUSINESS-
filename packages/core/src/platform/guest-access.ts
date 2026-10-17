import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// Guests get a random secret link to see their own order/booking/ticket. We store only its SHA-256 hash,
// so a database leak does not expose working links. The link is the only credential: treat it as a password.
export function newGuestToken(): { token: string; hash: Buffer } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}
export const hashToken = (token: string): Buffer => createHash("sha256").update(token, "utf8").digest();

export function tokenMatches(token: string, storedHash: Buffer, expiresAtMs: number, nowMs: number, revoked: boolean): boolean {
  if (revoked || nowMs >= expiresAtMs) return false;
  const h = hashToken(token);
  return h.length === storedHash.length && timingSafeEqual(h, storedHash);
}

/** Linking guest purchases to a new account requires a VERIFIED email that matches; no other claim path. */
export function canClaimGuestActivity(guestEmail: string, account: { email: string; emailVerified: boolean }): boolean {
  return account.emailVerified && guestEmail.trim().toLowerCase() === account.email.trim().toLowerCase();
}
