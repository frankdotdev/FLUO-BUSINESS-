import sharp from "sharp";
import type { ImageProcessor } from "@fluo/core";

/** Turns an uploaded photo into web-sized WebP variants. `rotate()` applies the camera's orientation and, because metadata is not copied,
 *  EXIF data (including GPS location) is stripped. Absurdly large images are refused before decoding (decompression-bomb guard). */
export const sharpProcessor: ImageProcessor = {
  async makeVariants(bytes, specs) {
    const out = [];
    for (const s of specs) {
      const { data, info } = await sharp(bytes, { limitInputPixels: 40_000_000 }).rotate().resize({ width: s.maxWidth, withoutEnlargement: true }).webp({ quality: s.quality }).toBuffer({ resolveWithObject: true });
      out.push({ name: s.name, bytes: new Uint8Array(data), width: info.width, height: info.height });
    }
    return out;
  },
};
