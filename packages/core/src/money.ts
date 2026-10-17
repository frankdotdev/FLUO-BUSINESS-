// Money is integer minor units (bigint) + ISO 4217 currency. No floats in arithmetic.
const EXPONENTS: Readonly<Record<string, number>> = {
  NGN: 2, GHS: 2, KES: 2, ZAR: 2, EGP: 2, USD: 2, GBP: 2, EUR: 2, CAD: 2, AED: 2, INR: 2,
  UGX: 0, RWF: 0, XOF: 0, XAF: 0, JPY: 0,
  KWD: 3,
};

export interface Money { readonly amountMinor: bigint; readonly currency: string }

export function exponentOf(currency: string): number {
  const e = EXPONENTS[currency];
  if (e === undefined) throw new Error(`Unsupported currency: ${currency}`);
  return e;
}

export function money(amountMinor: bigint | number, currency: string): Money {
  exponentOf(currency);
  if (typeof amountMinor === "number" && !Number.isSafeInteger(amountMinor)) {
    throw new Error("Amount must be a safe integer of minor units");
  }
  return { amountMinor: BigInt(amountMinor), currency };
}

/** Parse a decimal string like "3000.50" without going through floating point. */
export function parseMajor(text: string, currency: string): Money {
  const exp = exponentOf(currency);
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(text.trim());
  if (!m) throw new Error(`Invalid amount: ${text}`);
  const [, sign, whole, frac = ""] = m;
  if (frac.length > exp) throw new Error(`Too many decimal places for ${currency}`);
  const minor = BigInt(whole! + frac.padEnd(exp, "0"));
  return money(sign === "-" ? -minor : minor, currency);
}

function same(a: Money, b: Money): void {
  if (a.currency !== b.currency) throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
}
export const add = (a: Money, b: Money): Money => (same(a, b), money(a.amountMinor + b.amountMinor, a.currency));
export const sub = (a: Money, b: Money): Money => (same(a, b), money(a.amountMinor - b.amountMinor, a.currency));

/** Percentage in basis points (250 = 2.5%), rounded half away from zero. */
export function percentBps(m: Money, bps: number): Money {
  if (!Number.isInteger(bps) || bps < 0) throw new Error("bps must be a non-negative integer");
  const n = m.amountMinor * BigInt(bps);
  const neg = n < 0n;
  const r = ((neg ? -n : n) + 5000n) / 10000n;
  return money(neg ? -r : r, m.currency);
}

/** Split an amount by integer weights; parts always sum exactly to the total. */
export function allocate(m: Money, weights: readonly number[]): Money[] {
  if (weights.length === 0 || weights.some((w) => !Number.isInteger(w) || w < 0)) throw new Error("Invalid weights");
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) throw new Error("Weights sum to zero");
  const parts = weights.map((w) => (m.amountMinor * BigInt(w)) / BigInt(total));
  let rest = m.amountMinor - parts.reduce((a, b) => a + b, 0n);
  for (let i = 0; rest > 0n; i = (i + 1) % parts.length) {
    if (weights[i]! > 0) { parts[i] = parts[i]! + 1n; rest -= 1n; }
  }
  return parts.map((p) => money(p, m.currency));
}

/** Display only. Never feed the result back into calculations. */
export function format(m: Money, locale: string): string {
  const exp = exponentOf(m.currency);
  return new Intl.NumberFormat(locale, { style: "currency", currency: m.currency })
    .format(Number(m.amountMinor) / 10 ** exp);
}
