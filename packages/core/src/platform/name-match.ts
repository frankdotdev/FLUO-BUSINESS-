// Compares a bank-account holder name with the owner's or business name. A match auto-verifies the payout
// account; a mismatch goes to manual review. Deliberately conservative.
const NOISE = new Set(["ltd", "limited", "enterprises", "enterprise", "ventures", "nigeria", "nig", "and", "the", "co", "company", "plc", "services", "global", "stores", "store", "shop"]);
const tokens = (s: string): Set<string> =>
  new Set(s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 1 && !NOISE.has(t)));

export function namesLikelyMatch(a: string, b: string): boolean {
  const A = tokens(a), B = tokens(b);
  if (A.size === 0 || B.size === 0) return false;
  const [small, large] = A.size <= B.size ? [A, B] : [B, A];
  let shared = 0; for (const t of small) if (large.has(t)) shared++;
  return small.size >= 2 ? shared / small.size >= 0.67 : shared === 1 && large.size <= 2;   // a lone token must be nearly the whole name
}
