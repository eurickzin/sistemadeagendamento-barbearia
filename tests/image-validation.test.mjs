import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { MAX_IMAGE_BYTES, normalizeImage } from "../lib/security/normalize-image.ts";
import { getProfileImageStoragePath } from "../lib/profile-images.ts";

test("real PNG is decoded and normalized to WebP", async () => {
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } }).png().toBuffer();
  const output = await normalizeImage(png);
  assert.equal((await sharp(output).metadata()).format, "webp");
});

test("HTML or SVG renamed as an image is rejected by content", async () => {
  await assert.rejects(normalizeImage(Buffer.from("<script>alert(1)</script>")));
  await assert.rejects(normalizeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')));
});

test("oversized input is rejected before decode", async () => {
  await assert.rejects(normalizeImage(Buffer.alloc(MAX_IMAGE_BYTES + 1)));
});

test("only this Neon Object Storage origin yields a removable storage path", () => {
  process.env.AWS_ENDPOINT_URL_S3 = "https://storage.example.neon.tech";
  assert.equal(
    getProfileImageStoragePath("https://storage.example.neon.tech/profile-images/u/avatar-x.webp"),
    "u/avatar-x.webp",
  );
  assert.equal(getProfileImageStoragePath("https://evil.example/profile-images/u/avatar-x.webp"), null);
  assert.equal(getProfileImageStoragePath("https://storage.example.neon.tech/profile-images/u/%2e%2e%2fother.webp"), null);
  assert.equal(getProfileImageStoragePath("https://storage.example.neon.tech/profile-images/u/nested/file.webp"), null);
});
