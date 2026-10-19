import { fmtMoney, mediaUrl, type BusinessRecord, type ProductRecord } from "@fluo/core";

// What the public (and the mobile app) may see. Anything not listed here is never sent to a browser.
export const publicBusiness = (b: BusinessRecord) => ({ slug: b.slug, name: b.name, typeId: b.typeId, countryCode: b.countryCode, currency: b.currency, acceptsAutomatic: b.acceptsAutomatic, acceptsTransfer: b.allowsTransfer, refundPolicy: b.refundPolicy });
export const publicProduct = (p: ProductRecord, mediaBase?: string) => {
  const images = (p.galleryAssetIds && p.galleryAssetIds.length > 0) ? p.galleryAssetIds : (p.imageAssetId ? [p.imageAssetId] : []);
  const galleryUrls = mediaBase ? images.map((id) => mediaUrl(mediaBase, p.businessId, id, "detail")) : [];
  return {
    imageUrl: mediaBase && p.imageAssetId ? mediaUrl(mediaBase, p.businessId, p.imageAssetId, "card") : null,
    galleryUrls,
    soldOut: p.stockQuantity === 0,
    id: p.id,
    shortId: p.shortId,
    slug: p.slug,
    name: p.name,
    description: p.description,
    priceMinor: p.priceMinor.toString(),
    price: fmtMoney(p.priceMinor, p.currency),
    compareAtPrice: p.compareAtPriceMinor ? fmtMoney(p.compareAtPriceMinor, p.currency) : null,
    compareAtPriceMinor: p.compareAtPriceMinor ? p.compareAtPriceMinor.toString() : null,
    promoBadge: p.promoBadge ?? null,
    currency: p.currency,
    fulfilment: p.fulfilment,
    leadTimeHours: p.leadTimeHours,
    maxPerOrder: p.maxPerOrder,
  };
};
