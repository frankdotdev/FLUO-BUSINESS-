// Sliding-window rate limiter with an injectable clock. In production the window store lives in a shared place
// (Cloudflare rules for coarse limits, plus a Postgres/Redis-backed store here for per-account limits).
export interface Policy { readonly max: number; readonly windowMs: number }
export const POLICIES = {
  signin:       { max: 5,  windowMs: 60_000 },        // per IP + email
  signup:       { max: 5,  windowMs: 3_600_000 },     // per IP
  order_create: { max: 10, windowMs: 60_000 },        // per IP
  guest_lookup: { max: 20, windowMs: 60_000 },        // per IP: stops guessing guest links
  ticket_scan:  { max: 120, windowMs: 60_000 },       // per staff user
  upload:       { max: 20, windowMs: 3_600_000 },     // per user
  chat_message: { max: 30, windowMs: 60_000 },        // per user
  invite:       { max: 20, windowMs: 3_600_000 },     // per business
  search:       { max: 60, windowMs: 60_000 },        // per IP
} as const satisfies Record<string, Policy>;
export type PolicyName = keyof typeof POLICIES;

export class RateLimiter {
  private hits = new Map<string, number[]>();
  private readonly now: () => number;
  constructor(now: () => number) { this.now = now; }

  check(policy: PolicyName, ...keyParts: string[]): { allowed: true } | { allowed: false; retryAfterMs: number } {
    const { max, windowMs } = POLICIES[policy];
    const key = `${policy}:${keyParts.map((p) => p.toLowerCase().trim()).join("|")}`;
    const t = this.now();
    const recent = (this.hits.get(key) ?? []).filter((x) => x > t - windowMs);
    if (recent.length >= max) { this.hits.set(key, recent); return { allowed: false, retryAfterMs: recent[0]! + windowMs - t }; }
    recent.push(t); this.hits.set(key, recent);
    return { allowed: true };
  }
}
