import { headers } from "next/headers";
import { RateLimiter, type PolicyName } from "@fluo/core";

// Per-instance limiter for abuse that targets one action (guessing links, flooding orders). Put Cloudflare in front for global
// limits. The client address comes from Cloudflare's header when present; without a trusted proxy, forwarded headers can be spoofed.
const g = globalThis as unknown as { __fluoRate?: RateLimiter };
const limiter = (): RateLimiter => (g.__fluoRate ??= new RateLimiter(() => Date.now()));

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim();
}
/** True when the caller is over the limit for this action. */
export async function rateLimited(policy: PolicyName, ...keys: string[]): Promise<boolean> {
  return !limiter().check(policy, await clientIp(), ...keys).allowed;
}
