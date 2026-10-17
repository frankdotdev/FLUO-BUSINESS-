import type { PaymentProvider } from "@fluo/core";

/** Adding a payment provider (Flutterwave, Polar, ...) means: write one adapter implementing PaymentProvider, pass it here,
 *  add a routing rule and enable it. Nothing else in the product changes. `assertProviderContract` is the gate every adapter must pass. */
export function assertProviderContract(p: PaymentProvider): void {
  if (!p.id || typeof p.id !== "string") throw new Error("provider needs an id");
  for (const m of ["initialize", "verify", "parseWebhook"] as const) if (typeof p[m] !== "function") throw new Error(`provider ${p.id} must implement ${m}`);
  if (p.countries !== "*" && p.countries.length === 0) throw new Error(`provider ${p.id} declares no countries`);
  if (p.currencies !== "*" && p.currencies.length === 0) throw new Error(`provider ${p.id} declares no currencies`);
}

export class ProviderRegistry {
  private readonly byId = new Map<string, PaymentProvider>();
  constructor(providers: readonly PaymentProvider[]) {
    for (const p of providers) { assertProviderContract(p); if (this.byId.has(p.id)) throw new Error(`duplicate provider ${p.id}`); this.byId.set(p.id, p); }
  }
  get(id: string): PaymentProvider { const p = this.byId.get(id); if (!p) throw new Error(`payment provider not configured: ${id}`); return p; }
  list(): PaymentProvider[] { return [...this.byId.values()]; }
  ids(): ReadonlySet<string> { return new Set(this.byId.keys()); }
}
