import type { ProviderCapabilities } from "./provider.ts";

// Routing is DATA. First matching rules contribute providers in priority order,
// then any other enabled provider that supports the payment is appended as a fallback.
export interface RoutingRule {
  readonly countries?: readonly string[];
  readonly currencies?: readonly string[];
  readonly providers: readonly string[];
}

export class NoProviderError extends Error {}

const supports = (p: ProviderCapabilities, country: string, currency: string): boolean =>
  p.pairs ? p.pairs.includes(`${country}:${currency}`) :
  (p.countries === "*" || p.countries.includes(country)) && (p.currencies === "*" || p.currencies.includes(currency));

export function selectProviders(args: {
  country: string; currency: string;
  providers: readonly ProviderCapabilities[];
  enabled: ReadonlySet<string>;
  rules: readonly RoutingRule[];
}): string[] {
  const { country, currency, providers, enabled, rules } = args;
  const usable = new Map(providers.filter((p) => enabled.has(p.id) && supports(p, country, currency)).map((p) => [p.id, p]));
  const ordered: string[] = [];
  const push = (id: string): void => { if (usable.has(id) && !ordered.includes(id)) ordered.push(id); };
  for (const r of rules) {
    if (r.countries && !r.countries.includes(country)) continue;
    if (r.currencies && !r.currencies.includes(currency)) continue;
    r.providers.forEach(push);
  }
  [...usable.keys()].sort().forEach(push);
  if (ordered.length === 0) throw new NoProviderError(`No enabled payment provider supports ${country}/${currency}`);
  return ordered;
}
