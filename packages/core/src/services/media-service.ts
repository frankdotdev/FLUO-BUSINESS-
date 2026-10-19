import { authorize, type Permission } from "../platform/authz.ts";
import { IMAGE_POLICY, mediaKey, validateUpload, type ImagePurpose } from "../media/image-policy.ts";
import { type Deps, type MediaAssetRecord, fail } from "./ports.ts";

// Public image purposes only. Private files (payment proofs, documents) need a separate private bucket and signed reads: not built yet.
const PUBLIC_PURPOSES: readonly ImagePurpose[] = ["avatar", "logo", "product", "gallery", "event_cover", "banner"];
const PERMISSION: Partial<Record<ImagePurpose, Permission>> = { product: "catalogue.write", gallery: "catalogue.write", event_cover: "events.manage", logo: "business.manage", banner: "business.manage" };
const TYPES: Readonly<Record<string, "jpeg" | "png" | "webp">> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
export const MEDIA_QUOTA_PER_BUSINESS = 500;
const UPLOAD_URL_SECONDS = 300;
const incomingKey = (businessId: string, assetId: string): string => `incoming/${businessId}/${assetId}`;

export const mediaUrl = (publicBase: string, businessId: string, assetId: string, variant: string): string => `${publicBase.replace(/\/$/, "")}/public/${businessId}/${assetId}/${variant}.webp`;

async function guard(d: Deps, actor: string, businessId: string, purpose: ImagePurpose): Promise<void> {
  if (!PUBLIC_PURPOSES.includes(purpose)) return fail("purpose_not_supported");
  const perm = PERMISSION[purpose];
  if (!perm || !authorize(await d.store.membershipsForUser(actor), actor, businessId, perm).allowed) return fail("forbidden");
}

/** Step 1: the browser asks to upload. We check who, what and how big, then hand back a short-lived signed URL that only accepts
 *  exactly that content type and size. Nothing is trusted yet: the real bytes are inspected in step 2. */
export async function requestUpload(d: Deps, actor: string, businessId: string, a: { purpose: ImagePurpose; contentType: string; bytes: number }): Promise<{ assetId: string; url: string; headers: Record<string, string> }> {
  if (!d.storage) return fail("media_not_configured");
  await guard(d, actor, businessId, a.purpose);
  const type = TYPES[a.contentType];
  if (!type) return fail("unsupported_type");
  if (!Number.isInteger(a.bytes) || a.bytes <= 0) return fail("invalid_size");
  if (a.bytes > IMAGE_POLICY[a.purpose].maxUploadBytes) return fail("too_large");
  if ((await d.store.countMediaAssets(businessId)) >= MEDIA_QUOTA_PER_BUSINESS) return fail("media_quota_reached");
  const id = d.uuid();
  await d.store.insertMediaAsset({ id, businessId, ownerUserId: actor, purpose: a.purpose, status: "pending_upload", declaredType: type, declaredBytes: a.bytes, detectedType: null, width: null, height: null, variants: [], createdAtMs: d.now() });
  const signed = await d.storage.presignPut({ key: incomingKey(businessId, id), contentType: a.contentType, contentLength: a.bytes, expiresSec: UPLOAD_URL_SECONDS });
  return { assetId: id, url: signed.url, headers: signed.headers };
}

/** Step 2: after the browser finished uploading, inspect the REAL file, make web-sized WebP variants (metadata such as GPS is stripped),
 *  publish them under versioned keys, and delete the original. A bad file is rejected and removed. */
export async function completeUpload(d: Deps, actor: string, businessId: string, assetId: string): Promise<{ variants: string[] }> {
  if (!d.storage || !d.images) return fail("media_not_configured");
  const asset = await d.store.getMediaAsset(businessId, assetId);
  if (!asset) return fail("not_found");
  await guard(d, actor, businessId, asset.purpose as ImagePurpose);
  if (asset.ownerUserId !== actor) return fail("not_found");
  if (!(await d.store.setMediaStatus(businessId, assetId, "pending_upload", "processing"))) return fail("invalid_state");   // one request processes an upload
  const policy = IMAGE_POLICY[asset.purpose as ImagePurpose];
  const original = incomingKey(businessId, assetId);
  const reject = async (code: string): Promise<never> => { await d.store.setMediaStatus(businessId, assetId, "processing", "failed"); await d.storage!.delete(original).catch(() => undefined); return fail(code); };
  try {
    const bytes = await d.storage.get(original, policy.maxUploadBytes);
    if (!bytes) return await reject("upload_missing");
    if (bytes.length !== asset.declaredBytes) return await reject("size_mismatch");
    const checked = validateUpload(asset.purpose as ImagePurpose, bytes);
    if (!checked.ok) return await reject(checked.reason === "too_large" ? "too_large" : "unsupported_type");
    if (checked.type !== asset.declaredType) return await reject("type_mismatch");        // the bytes disagree with what the browser said
    let variants; try { variants = await d.images.makeVariants(bytes, policy.variants); } catch { return await reject("unreadable_image"); }
    for (const v of variants) await d.storage.put(mediaKey(asset.purpose as ImagePurpose, businessId, assetId, v.name, "webp"), v.bytes, "image/webp", "public, max-age=31536000, immutable");
    await d.storage.delete(original).catch(() => undefined);
    const biggest = variants.reduce((a, b) => (b.width > a.width ? b : a));
    await d.store.finishMediaAsset(businessId, assetId, { detectedType: checked.type, width: biggest.width, height: biggest.height, variants: variants.map((v) => v.name) });
    return { variants: variants.map((v) => v.name) };
  } catch (e) {
    if (e instanceof Error && e.name === "ServiceError") throw e;
    await d.store.setMediaStatus(businessId, assetId, "processing", "failed");
    await d.storage.delete(original).catch(() => undefined);
    throw e;
  }
}

export type MediaTarget = { kind: "product"; id: string } | { kind: "event"; id: string } | { kind: "business" };
const TARGET_PURPOSE = { product: "product", event: "event_cover", business: "logo" } as const;

/** Step 3: use a finished image as a product photo, an event cover or the business logo. Only this business's ready images qualify. */
export async function attachMedia(d: Deps, actor: string, businessId: string, assetId: string, target: MediaTarget): Promise<void> {
  const asset = await d.store.getMediaAsset(businessId, assetId);
  if (!asset || asset.status !== "ready") return fail("not_found");
  if (asset.purpose !== TARGET_PURPOSE[target.kind]) return fail("wrong_image_kind");
  await guard(d, actor, businessId, asset.purpose as ImagePurpose);
  let ok = false;
  if (target.kind === "product") {
    const prod = await d.store.getProduct(businessId, target.id);
    if (!prod) return fail("not_found");
    const existing = prod.galleryAssetIds ?? [];
    const galleryAssetIds = existing.includes(assetId) ? existing : [...existing, assetId];
    ok = await d.store.patchProduct(businessId, target.id, {
      imageAssetId: prod.imageAssetId ?? assetId,
      galleryAssetIds,
    });
  } else if (target.kind === "event") {
    ok = await d.store.patchEvent(businessId, target.id, { coverAssetId: assetId });
  } else {
    await d.store.patchBusiness(businessId, { logoAssetId: assetId });
    ok = true;
  }
  if (!ok) return fail("not_found");
  await d.store.appendAudit({ businessId, actorUserId: actor, action: "media.attached", targetId: assetId, atMs: d.now() });
}
