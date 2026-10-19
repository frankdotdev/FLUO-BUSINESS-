import { authorize } from "../platform/authz.ts";
import { makeSlug, newShortId } from "../platform/routes.ts";
import { checkLimit, type Entitlements } from "../billing/pricing.ts";
import { type Deps, type ProductRecord, type ProductStatus, fail } from "./ports.ts";

export interface ProductInput {
  readonly name: string; readonly description?: string; readonly priceMinor: bigint;
  readonly fulfilment?: "stock" | "made_to_order"; readonly leadTimeHours?: number; readonly maxPerOrder?: number;
  readonly publish?: boolean; readonly stockQuantity?: number | null;
  readonly compareAtPriceMinor?: bigint | null; readonly promoBadge?: string | null; readonly galleryAssetIds?: readonly string[];
}

async function guard(d: Deps, actor: string, businessId: string) {
  const mine = await d.store.membershipsForUser(actor);
  if (!authorize(mine, actor, businessId, "catalogue.write").allowed) return fail("forbidden");
  const biz = await d.store.getBusiness(businessId);
  if (!biz) return fail("not_found");
  if (!(await d.store.capabilitiesOf(businessId)).includes("catalogue")) return fail("capability_not_enabled");
  return biz;
}
function validate(i: ProductInput): void {
  if (i.name.trim().length < 2 || i.name.length > 120) fail("invalid_name");
  if (typeof i.priceMinor !== "bigint" || i.priceMinor < 0n || i.priceMinor > 1_000_000_000_000n) fail("invalid_price");
  if (i.compareAtPriceMinor != null && (typeof i.compareAtPriceMinor !== "bigint" || i.compareAtPriceMinor < 0n)) fail("invalid_price");
  if (i.fulfilment !== undefined && i.fulfilment !== "stock" && i.fulfilment !== "made_to_order") fail("invalid_fulfilment");
  if (i.leadTimeHours !== undefined && (!Number.isInteger(i.leadTimeHours) || i.leadTimeHours < 0 || i.leadTimeHours > 24 * 90)) fail("invalid_lead_time");
  if (i.maxPerOrder !== undefined && (!Number.isInteger(i.maxPerOrder) || i.maxPerOrder < 1 || i.maxPerOrder > 100)) fail("invalid_max_per_order");
  if (i.description !== undefined && i.description.length > 2000) fail("invalid_description");
  if (i.promoBadge !== undefined && i.promoBadge !== null && i.promoBadge.length > 50) fail("invalid_promo_badge");
  if (i.stockQuantity != null && (!Number.isInteger(i.stockQuantity) || i.stockQuantity < 0 || i.stockQuantity > 1_000_000)) fail("invalid_stock");
}
async function limitOk(d: Deps, businessId: string, ent: Entitlements): Promise<boolean> {
  return checkLimit(ent, "listings", await d.store.countProducts(businessId, ["active"])).allowed;
}

export async function createProduct(d: Deps, actor: string, businessId: string, input: ProductInput, entitlements: Entitlements): Promise<ProductRecord> {
  const biz = await guard(d, actor, businessId);
  validate(input);
  const status: ProductStatus = input.publish ? "active" : "draft";
  if (status === "active" && !(await limitOk(d, businessId, entitlements))) return fail("listing_limit_reached");
  for (let attempt = 0; attempt < 3; attempt++) {
    const rec: ProductRecord = {
      id: d.uuid(), businessId, shortId: newShortId(), slug: makeSlug(input.name), name: input.name.trim(), description: input.description?.trim() || null,
      priceMinor: input.priceMinor, currency: biz.currency, fulfilment: input.fulfilment ?? "stock", leadTimeHours: input.leadTimeHours ?? 0,
      maxPerOrder: input.maxPerOrder ?? 10, status, createdAtMs: d.now(), stockQuantity: input.stockQuantity ?? null,
      compareAtPriceMinor: input.compareAtPriceMinor ?? null, promoBadge: input.promoBadge?.trim() || null,
      galleryAssetIds: input.galleryAssetIds ?? [],
    };
    if (await d.store.insertProduct(rec)) return rec;               // false only when the random short id collided
  }
  return fail("could_not_allocate_id");
}

export async function updateProduct(d: Deps, actor: string, businessId: string, productId: string, patch: Partial<ProductInput>): Promise<void> {
  await guard(d, actor, businessId);
  const cur = await d.store.getProduct(businessId, productId);
  if (!cur) return fail("not_found");
  const merged: ProductInput = {
    name: patch.name ?? cur.name, priceMinor: patch.priceMinor ?? cur.priceMinor, fulfilment: patch.fulfilment ?? cur.fulfilment,
    leadTimeHours: patch.leadTimeHours ?? cur.leadTimeHours, maxPerOrder: patch.maxPerOrder ?? cur.maxPerOrder,
    stockQuantity: patch.stockQuantity !== undefined ? patch.stockQuantity : (cur.stockQuantity ?? null),
    description: patch.description ?? cur.description ?? undefined,
    compareAtPriceMinor: patch.compareAtPriceMinor !== undefined ? patch.compareAtPriceMinor : (cur.compareAtPriceMinor ?? null),
    promoBadge: patch.promoBadge !== undefined ? patch.promoBadge : (cur.promoBadge ?? null),
    galleryAssetIds: patch.galleryAssetIds ?? cur.galleryAssetIds ?? [],
  };
  validate(merged);
  await d.store.patchProduct(businessId, productId, {
    name: merged.name.trim(), slug: makeSlug(merged.name), priceMinor: merged.priceMinor,
    fulfilment: merged.fulfilment!, leadTimeHours: merged.leadTimeHours!, maxPerOrder: merged.maxPerOrder!,
    stockQuantity: merged.stockQuantity ?? null, description: merged.description?.trim() || null,
    compareAtPriceMinor: merged.compareAtPriceMinor ?? null, promoBadge: merged.promoBadge?.trim() || null,
    galleryAssetIds: merged.galleryAssetIds ?? [],
  });
}

export async function setProductStatus(d: Deps, actor: string, businessId: string, productId: string, status: ProductStatus, entitlements: Entitlements): Promise<void> {
  await guard(d, actor, businessId);
  const cur = await d.store.getProduct(businessId, productId);
  if (!cur) return fail("not_found");
  if (status === "active" && cur.status !== "active" && !(await limitOk(d, businessId, entitlements))) return fail("listing_limit_reached");
  await d.store.patchProduct(businessId, productId, { status });
}

/** After a trial or paid plan ends: items over the limit are paused (hidden from customers, still the owner's). Idempotent. */
export async function enforceListingLimit(d: Deps, businessId: string, entitlements: Entitlements): Promise<number> {
  const lim = entitlements["listings"];
  if (typeof lim !== "number") return 0;
  const n = await d.store.pauseNewestActiveProducts(businessId, lim);
  if (n > 0) await d.store.appendAudit({ businessId, actorUserId: null, action: "listings.paused_over_limit", targetId: String(n), atMs: d.now() });
  return n;
}
