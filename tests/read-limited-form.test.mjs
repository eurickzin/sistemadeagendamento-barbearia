import test from "node:test";
import assert from "node:assert/strict";
import { readLimitedForm } from "../lib/security/read-limited-form.ts";

test("multipart within the body limit parses normally", async () => {
  const form = new FormData();
  form.set("purpose", "avatar");
  const request = new Request("https://example.test/upload", { method: "POST", body: form });
  const parsed = await readLimitedForm(request, 1024);
  assert.equal(parsed.get("purpose"), "avatar");
});

test("multipart without Content-Length is rejected as it crosses the body limit", async () => {
  const form = new FormData();
  form.set("file", new File([new Uint8Array(2048)], "large.png", { type: "image/png" }));
  const request = new Request("https://example.test/upload", { method: "POST", body: form });
  request.headers.delete("content-length");
  await assert.rejects(readLimitedForm(request, 1024), /too large/);
});
