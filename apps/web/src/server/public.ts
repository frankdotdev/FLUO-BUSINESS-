import { fmtMoney, mediaUrl, type BusinessRecord, type ProductRecord } from "@fluo/core";

// What the public (and the mobile app) may see. Anything not listed here is never sent to a browser.
export const publicBusiness = (b: BusinessRecord) => ({ slug: b.slug, name: b.name, typeId: b.typeId, countryCode: b.countryCode, currency: b.currency, acceptsAutomatic: b.acceptsAutomatic, acceptsTransfer: b.allowsTransfer, refundPolicy: b.refundPolicy });
export const publicProduct = (p: ProductRecord, mediaBase?: string) => ({ imageUrl: mediaBase && p.imageAssetId ? mediaUrl(mediaBase, p.businessId, p.imageAssetId, "card") : null, soldOut: p.stockQuantity === 0, id: p.id, shortId: p.shortId, slug: p.slug, name: p.name, description: p.description, priceMinor: p.priceMinor.toString(), price: fmtMoney(p.priceMinor, p.currency), currency: p.currency, fulfilment: p.fulfilment, leadTimeHours: p.leadTimeHours, maxPerOrder: p.maxPerOrder });
