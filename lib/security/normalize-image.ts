import sharp from "sharp";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PIXELS = 20_000_000;

/** Decodes supported raster content and strips its original metadata. */
export async function normalizeImage(input: Buffer): Promise<Buffer> {
  if (input.length === 0 || input.length > MAX_IMAGE_BYTES) throw new Error("Invalid image size");
  const decoder = sharp(input, { failOn: "error", limitInputPixels: MAX_PIXELS });
  const metadata = await decoder.metadata();
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > MAX_PIXELS ||
      !["jpeg", "png", "webp"].includes(metadata.format)) {
    throw new Error("Unsupported image format");
  }
  const output = await decoder.rotate().webp({ quality: 85 }).toBuffer();
  if (output.length > MAX_IMAGE_BYTES) throw new Error("Output too large");
  return output;
}
