import test from "node:test";
import assert from "node:assert/strict";
import { createR2Storage } from "./r2.ts";
import { awsEncode, presign, sha256Hex } from "./sigv4.ts";
import type { Fetch } from "./http.ts";

test("SigV4 matches Amazon's published example (GET presigned URL)", () => {
  // From the AWS S3 documentation, "Authenticating Requests: Using Query Parameters". If this fails, signing is wrong.
  const url = presign({ accessKeyId: "AKIAIOSFODNN7EXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY", region: "us-east-1" },
    { method: "GET", host: "examplebucket.s3.amazonaws.com", path: "/test.txt", expiresSec: 86400, now: new Date("2013-05-24T00:00:00Z") });
  assert.match(url, /X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404$/);
  assert.equal(awsEncode("a b!*'()/é"), "a%20b%21%2A%27%28%29%2F%C3%A9");
  assert.equal(sha256Hex(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});

const cfg = { accountId: "acc123", accessKeyId: "AKIAEXAMPLE", secretAccessKey: "secret", bucket: "fluo-public", now: () => new Date("2026-10-10T08:00:00Z") };
test("R2 presigned upload pins content type and size, expires, and never contains the secret", async () => {
  const s = createR2Storage(cfg);
  const r = await s.presignPut({ key: "incoming/b1/a1", contentType: "image/jpeg", contentLength: 123456, expiresSec: 300 });
  const u = new URL(r.url);
  assert.equal(u.host, "acc123.r2.cloudflarestorage.com");
  assert.equal(u.pathname, "/fluo-public/incoming/b1/a1");
  assert.equal(u.searchParams.get("X-Amz-Expires"), "300");
  assert.equal(u.searchParams.get("X-Amz-SignedHeaders"), "content-length;content-type;host");
  assert.match(u.searchParams.get("X-Amz-Credential")!, /^AKIAEXAMPLE\/20261010\/auto\/s3\/aws4_request$/);
  assert.ok(!r.url.includes("secret"));
  assert.deepEqual(r.headers, { "content-type": "image/jpeg" });
  const other = await s.presignPut({ key: "incoming/b1/a1", contentType: "image/jpeg", contentLength: 999, expiresSec: 300 });
  assert.notEqual(new URL(other.url).searchParams.get("X-Amz-Signature"), u.searchParams.get("X-Amz-Signature"), "a different size produces a different signature, so the storage rejects a swapped file");
});
test("R2 server-side get, put and delete are signed and bounded", async () => {
  const seen: { url: string; method?: string; headers: Record<string, string> }[] = [];
  const body = new Uint8Array([1, 2, 3, 4]);
  const f: Fetch = async (url, init) => { seen.push({ url, method: init?.method, headers: init?.headers as Record<string, string> }); return init?.method === "GET" ? new Response(body, { status: url.includes("missing") ? 404 : 200 }) : new Response("", { status: 200 }); };
  const s = createR2Storage({ ...cfg, fetch: f });
  assert.deepEqual([...(await s.get("incoming/b1/a1", 10))!], [1, 2, 3, 4]);
  assert.equal(await s.get("incoming/b1/a1", 3), null, "larger than the allowed size is refused");
  assert.equal(await s.get("incoming/missing", 10), null);
  await s.put("public/b1/a1/card.webp", body, "image/webp", "public, max-age=31536000, immutable");
  await s.delete("incoming/b1/a1");
  const put = seen.find((x) => x.method === "PUT")!;
  assert.equal(put.url, "https://acc123.r2.cloudflarestorage.com/fluo-public/public/b1/a1/card.webp");
  assert.match(put.headers["authorization"]!, /^AWS4-HMAC-SHA256 Credential=AKIAEXAMPLE\/20261010\/auto\/s3\/aws4_request, SignedHeaders=cache-control;content-type;host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/);
  assert.equal(put.headers["x-amz-content-sha256"], sha256Hex(body));
  assert.ok(!("host" in put.headers) && !JSON.stringify(put.headers).includes("secret"));
});
