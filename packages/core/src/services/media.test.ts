import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MemoryStore } from "./memory-store.ts";
import { createBusiness } from "./business-service.ts";
import { attachMedia, completeUpload, mediaUrl, requestUpload } from "./media-service.ts";
import { type Deps, type ImageProcessor, type ObjectStorage, ServiceError } from "./ports.ts";
import { IMAGE_POLICY } from "../media/image-policy.ts";

const code = async (p: Promise<unknown>) => { try { await p; return "no_error"; } catch (e) { return e instanceof ServiceError ? e.code : `unexpected:${(e as Error).message}`; } };
const JPEG = (n: number) => { const b = new Uint8Array(n); b.set([0xff, 0xd8, 0xff, 0xe0]); return b; };
const PNG = (n: number) => { const b = new Uint8Array(n); b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); return b; };

// In-memory object storage that behaves like a bucket: the "browser" writes with an issued URL, the server reads, writes and deletes.
function bucket() {
  const objects = new Map<string, { bytes: Uint8Array; type: string }>(); const issued: { key: string; contentType: string; contentLength: number; expiresSec: number }[] = [];
  const storage: ObjectStorage = {
    presignPut: async (a) => { issued.push(a); return { url: `https://r2.test/${a.key}`, headers: { "content-type": a.contentType } }; },
    get: async (key, max) => { const o = objects.get(key); return o && o.bytes.length <= max ? o.bytes : null; },
    put: async (key, bytes, type) => { objects.set(key, { bytes, type }); },
    delete: async (key) => { objects.delete(key); },
  };
  const browserUploads = (key: string, bytes: Uint8Array, type = "image/jpeg") => objects.set(key, { bytes, type });
  return { storage, objects, issued, browserUploads };
}
const images: ImageProcessor = {
  makeVariants: async (bytes, specs) => { if (bytes[bytes.length - 1] === 0xee) throw new Error("corrupt"); return specs.map((s) => ({ name: s.name, bytes: new Uint8Array([1, 2, 3]), width: s.maxWidth, height: Math.round(s.maxWidth * 0.75) })); },
};
async function setup() {
  const store = new MemoryStore(); const b = bucket();
  const d: Deps = { store, now: () => 1_000_000, uuid: () => randomUUID(), storage: b.storage, images, publicMediaBase: "https://media.fluo.test" };
  const biz = await createBusiness(d, "frank", { name: "Frank Shop", typeId: "retail", countryCode: "NG", currency: "NGN", timezone: "Africa/Lagos" });
  store.members.push({ userId: "cash", businessId: biz.id, role: "cashier", status: "active" });
  await store.insertProduct({ id: "p1", businessId: biz.id, shortId: "abcd2345", slug: "p", name: "Phone case", description: null, priceMinor: 1000n, currency: "NGN", fulfilment: "stock", leadTimeHours: 0, maxPerOrder: 5, status: "active", createdAtMs: 0 });
  return { store, d, b, biz };
}
const key = (biz: string, asset: string) => `incoming/${biz}/${asset}`;

test("upload intent: who may upload, what, and how big; the signed URL pins type and size", async () => {
  const { d, b, biz } = await setup();
  assert.equal(await code(requestUpload(d, "cash", biz.id, { purpose: "product", contentType: "image/jpeg", bytes: 1000 })), "forbidden");
  assert.equal(await code(requestUpload(d, "mallory", biz.id, { purpose: "product", contentType: "image/jpeg", bytes: 1000 })), "forbidden");
  assert.equal(await code(requestUpload(d, "frank", biz.id, { purpose: "product", contentType: "image/svg+xml", bytes: 1000 })), "unsupported_type");
  assert.equal(await code(requestUpload(d, "frank", biz.id, { purpose: "product", contentType: "text/html", bytes: 1000 })), "unsupported_type");
  assert.equal(await code(requestUpload(d, "frank", biz.id, { purpose: "product", contentType: "image/jpeg", bytes: IMAGE_POLICY.product.maxUploadBytes + 1 })), "too_large");
  assert.equal(await code(requestUpload(d, "frank", biz.id, { purpose: "product", contentType: "image/jpeg", bytes: 0 })), "invalid_size");
  assert.equal(await code(requestUpload(d, "frank", biz.id, { purpose: "proof_of_payment", contentType: "image/jpeg", bytes: 10 })), "purpose_not_supported");
  assert.equal(await code(requestUpload({ ...d, storage: undefined as never }, "frank", biz.id, { purpose: "product", contentType: "image/jpeg", bytes: 10 })), "media_not_configured");
  const r = await requestUpload(d, "frank", biz.id, { purpose: "product", contentType: "image/jpeg", bytes: 5000 });
  assert.deepEqual(b.issued[0], { key: key(biz.id, r.assetId), contentType: "image/jpeg", contentLength: 5000, expiresSec: 300 });
});

test("a real photo becomes web-sized variants; the original is deleted; it attaches to a product", async () => {
  const { store, d, b, biz } = await setup();
  const r = await requestUpload(d, "frank", biz.id, { purpose: "product", contentType: "image/jpeg", bytes: 2048 });
  b.browserUploads(key(biz.id, r.assetId), JPEG(2048));
  const done = await completeUpload(d, "frank", biz.id, r.assetId);
  assert.deepEqual(done.variants, ["thumb", "card", "detail"]);
  assert.ok(b.objects.has(`public/${biz.id}/${r.assetId}/card.webp`) && b.objects.get(`public/${biz.id}/${r.assetId}/card.webp`)!.type === "image/webp");
  assert.equal(b.objects.has(key(biz.id, r.assetId)), false, "the original upload is gone");
  assert.equal((await store.getMediaAsset(biz.id, r.assetId))!.status, "ready");
  await attachMedia(d, "frank", biz.id, r.assetId, { kind: "product", id: "p1" });
  assert.equal((await store.getProduct(biz.id, "p1"))!.imageAssetId, r.assetId);
  assert.equal(mediaUrl("https://media.fluo.test/", biz.id, r.assetId, "card"), `https://media.fluo.test/public/${biz.id}/${r.assetId}/card.webp`);
  assert.equal(await code(completeUpload(d, "frank", biz.id, r.assetId)), "invalid_state", "cannot process the same upload twice");
});

test("attacks: disguised files, swapped files, corrupt images and missing uploads are rejected and cleaned up", async () => {
  const { store, d, b, biz } = await setup();
  const fail = async (declared: string, bytes: Uint8Array | null, declaredBytes: number, expected: string) => {
    const r = await requestUpload(d, "frank", biz.id, { purpose: "product", contentType: declared, bytes: declaredBytes });
    if (bytes) b.browserUploads(key(biz.id, r.assetId), bytes);
    assert.equal(await code(completeUpload(d, "frank", biz.id, r.assetId)), expected);
    assert.equal((await store.getMediaAsset(biz.id, r.assetId))!.status, "failed");
    assert.equal(b.objects.has(key(biz.id, r.assetId)), false, "rejected files are deleted");
    assert.equal([...b.objects.keys()].some((k) => k.startsWith("public/") && k.includes(r.assetId)), false, "nothing was published");
  };
  await fail("image/jpeg", new TextEncoder().encode("<svg onload=alert(1)></svg>".padEnd(300, " ")), 300, "unsupported_type");   // script posing as a photo
  await fail("image/jpeg", new TextEncoder().encode("<html><script>x</script></html>".padEnd(400, " ")), 400, "unsupported_type");
  await fail("image/jpeg", PNG(500), 500, "type_mismatch");                      // a PNG claiming to be a JPEG
  await fail("image/jpeg", JPEG(900), 1000, "size_mismatch");                    // a different file than the one declared
  await fail("image/jpeg", (() => { const x = JPEG(600); x[599] = 0xee; return x; })(), 600, "unreadable_image");
  await fail("image/jpeg", null, 700, "upload_missing");
});

test("media security: other people's and other businesses' uploads cannot be completed or attached", async () => {
  const { store, d, b, biz } = await setup();
  const other = await createBusiness(d, "mike", { name: "Mike Shop", typeId: "retail", countryCode: "NG", currency: "NGN", timezone: "Africa/Lagos" });
  await store.insertProduct({ id: "p2", businessId: other.id, shortId: "efgh2345", slug: "p", name: "X", description: null, priceMinor: 1000n, currency: "NGN", fulfilment: "stock", leadTimeHours: 0, maxPerOrder: 5, status: "active", createdAtMs: 0 });
  const r = await requestUpload(d, "frank", biz.id, { purpose: "product", contentType: "image/jpeg", bytes: 1500 });
  b.browserUploads(key(biz.id, r.assetId), JPEG(1500));
  assert.equal(await code(completeUpload(d, "mike", biz.id, r.assetId)), "forbidden");                // not a member
  assert.equal(await code(completeUpload(d, "mike", other.id, r.assetId)), "not_found");              // another business's asset id
  store.members.push({ userId: "mgr", businessId: biz.id, role: "manager", status: "active" });
  assert.equal(await code(completeUpload(d, "mgr", biz.id, r.assetId)), "not_found", "only the uploader finishes an upload");
  await completeUpload(d, "frank", biz.id, r.assetId);
  assert.equal(await code(attachMedia(d, "mike", other.id, r.assetId, { kind: "product", id: "p2" })), "not_found", "cannot use another business's image");
  assert.equal(await code(attachMedia(d, "frank", biz.id, r.assetId, { kind: "event", id: "x" })), "wrong_image_kind");
  assert.equal(await code(attachMedia(d, "frank", biz.id, r.assetId, { kind: "product", id: "p2" })), "not_found", "cannot attach to another business's product");
  const pending = await requestUpload(d, "frank", biz.id, { purpose: "product", contentType: "image/jpeg", bytes: 10 });
  assert.equal(await code(attachMedia(d, "frank", biz.id, pending.assetId, { kind: "product", id: "p1" })), "not_found", "an unfinished upload cannot be attached");
});
