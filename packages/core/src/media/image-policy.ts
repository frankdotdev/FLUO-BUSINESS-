// Upload rules and variant sizes. Sizes are per PURPOSE, not one blanket "compress to N KB".
export type ImagePurpose = "avatar" | "logo" | "product" | "gallery" | "event_cover" | "banner" | "proof_of_payment";

export interface VariantSpec { readonly name: string; readonly maxWidth: number; readonly quality: number }
export interface PurposePolicy { readonly maxUploadBytes: number; readonly variants: readonly VariantSpec[]; readonly isPrivate: boolean }

const MB = 1024 * 1024;
export const IMAGE_POLICY: Readonly<Record<ImagePurpose, PurposePolicy>> = {
  avatar:      { maxUploadBytes: 5 * MB,  isPrivate: false, variants: [{ name: "thumb", maxWidth: 96, quality: 80 }, { name: "card", maxWidth: 320, quality: 80 }] },
  logo:        { maxUploadBytes: 5 * MB,  isPrivate: false, variants: [{ name: "thumb", maxWidth: 96, quality: 85 }, { name: "card", maxWidth: 400, quality: 85 }] },
  product:     { maxUploadBytes: 10 * MB, isPrivate: false, variants: [{ name: "thumb", maxWidth: 160, quality: 75 }, { name: "card", maxWidth: 480, quality: 75 }, { name: "detail", maxWidth: 1200, quality: 80 }] },
  gallery:     { maxUploadBytes: 10 * MB, isPrivate: false, variants: [{ name: "thumb", maxWidth: 200, quality: 75 }, { name: "detail", maxWidth: 1600, quality: 80 }] },
  event_cover: { maxUploadBytes: 10 * MB, isPrivate: false, variants: [{ name: "card", maxWidth: 640, quality: 78 }, { name: "detail", maxWidth: 1600, quality: 80 }] },
  banner:      { maxUploadBytes: 10 * MB, isPrivate: false, variants: [{ name: "card", maxWidth: 800, quality: 78 }, { name: "detail", maxWidth: 1920, quality: 80 }] },
  proof_of_payment: { maxUploadBytes: 8 * MB, isPrivate: true, variants: [{ name: "detail", maxWidth: 1600, quality: 80 }] },
};

export type DetectedType = "jpeg" | "png" | "webp" | null;

/** Detect from the file's own bytes; the browser-declared MIME type is not trusted. */
export function sniffImageType(bytes: Uint8Array): DetectedType {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "png";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp";
  return null;     // SVG, GIF, HTML, scripts and everything else are rejected (SVG can carry script)
}

export function validateUpload(purpose: ImagePurpose, bytes: Uint8Array): { ok: true; type: "jpeg" | "png" | "webp" } | { ok: false; reason: "empty" | "too_large" | "unsupported_type" } {
  if (bytes.length === 0) return { ok: false, reason: "empty" };
  if (bytes.length > IMAGE_POLICY[purpose].maxUploadBytes) return { ok: false, reason: "too_large" };
  const type = sniffImageType(bytes);
  return type ? { ok: true, type } : { ok: false, reason: "unsupported_type" };
}

/** Object keys never contain user-supplied filenames. Private files live under a separate prefix/bucket. */
export function mediaKey(purpose: ImagePurpose, businessId: string, assetId: string, variant: string, ext: "webp" | "jpg"): string {
  for (const part of [businessId, assetId, variant]) if (!/^[a-z0-9-]+$/i.test(part)) throw new Error("unsafe_key_part");
  const prefix = IMAGE_POLICY[purpose].isPrivate ? "private" : "public";
  return `${prefix}/${businessId}/${assetId}/${variant}.${ext}`;
}
