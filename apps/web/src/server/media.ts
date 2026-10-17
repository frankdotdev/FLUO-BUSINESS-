import { mediaUrl } from "@fluo/core";
import { env } from "./env.ts";

/** Public URL of an image variant, or null when there is no image or media storage is not configured. */
export const photo = (businessId: string, assetId: string | null | undefined, variant: "thumb" | "card" | "detail"): string | null => {
  const r2 = env().r2;
  return r2 && assetId ? mediaUrl(r2.publicBase, businessId, assetId, variant) : null;
};
