import { type Money, add, money } from "../money.ts";

// Prices ALWAYS come from the server-side catalogue. Whatever price the client sends is ignored.
export interface CatalogueEntry { readonly price: Money; readonly active: boolean; readonly maxPerOrder: number; readonly stock?: number | null }
export interface CartLine { readonly productId: string; readonly quantity: number }
export interface PricedLine { readonly productId: string; readonly quantity: number; readonly unitPrice: Money; readonly lineTotal: Money }

export function priceCart(catalogue: ReadonlyMap<string, CatalogueEntry>, cart: readonly CartLine[], currency: string): { lines: PricedLine[]; total: Money } {
  if (cart.length === 0) throw new Error("empty_cart");
  const seen = new Set<string>();
  let total = money(0, currency);
  const lines: PricedLine[] = [];
  for (const l of cart) {
    if (seen.has(l.productId)) throw new Error("duplicate_line");
    seen.add(l.productId);
    const e = catalogue.get(l.productId);
    if (!e || !e.active) throw new Error("unavailable_product");
    if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > e.maxPerOrder) throw new Error("invalid_quantity");
    if (e.stock != null && l.quantity > e.stock) throw new Error("out_of_stock");        // advisory; the store reserves stock atomically
    if (e.price.currency !== currency) throw new Error("currency_mismatch");
    const lineTotal = money(e.price.amountMinor * BigInt(l.quantity), currency);
    lines.push({ productId: l.productId, quantity: l.quantity, unitPrice: e.price, lineTotal });
    total = add(total, lineTotal);
  }
  return { lines, total };
}

// Order status is separate from payment status. Made-to-order adds an in-production step.
export type OrderKind = "standard" | "made_to_order";
export type OrderStatus = "awaiting_payment" | "paid" | "accepted" | "in_production" | "ready" | "completed" | "cancelled" | "refunded";

const BASE: Record<OrderStatus, readonly OrderStatus[]> = {
  awaiting_payment: ["paid", "cancelled"],
  paid: ["accepted", "cancelled", "refunded"],
  accepted: ["ready", "cancelled", "refunded"],
  in_production: ["ready", "cancelled", "refunded"],
  ready: ["completed", "refunded"],
  completed: ["refunded"],
  cancelled: [], refunded: [],
};

export function canTransitionOrder(kind: OrderKind, from: OrderStatus, to: OrderStatus): boolean {
  if (kind === "made_to_order") {
    if (from === "accepted" && to === "ready") return false;          // must pass through production
    if (from === "accepted" && to === "in_production") return true;
  } else if (to === "in_production" || from === "in_production") return false;
  return BASE[from].includes(to);
}

/** Made-to-order: the requested date must respect the product's lead time. */
export function meetsLeadTime(nowMs: number, requiredByMs: number, leadTimeHours: number): boolean {
  return requiredByMs - nowMs >= leadTimeHours * 3600_000;
}
