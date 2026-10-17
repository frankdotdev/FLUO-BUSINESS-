import test from "node:test";
import assert from "node:assert/strict";
import { RESERVED_SLUGS, SHORT_ID_LENGTH, businessPath, makeSlug, needsRedirect, newShortId, parseResourcePath, resourcePath, uniqueBusinessSlug } from "./routes.ts";

test("slugs are lowercase ascii, hyphenated, bounded", () => {
  assert.equal(makeSlug("Frank's Tech Hub!!"), "frank-s-tech-hub");
  assert.equal(makeSlug("Café Ìbàdàn"), "cafe-ibadan");
  assert.equal(makeSlug("   "), "item");
  assert.ok(makeSlug("a".repeat(200)).length <= 48);
});
test("business slugs avoid reserved words and collisions", () => {
  const taken = new Set(["franks-tech", "franks-tech-2"]);
  assert.equal(uniqueBusinessSlug("Franks Tech", (s) => taken.has(s)), "franks-tech-3");
  assert.notEqual(uniqueBusinessSlug("Admin", () => false), "admin");
  assert.ok(RESERVED_SLUGS.has("api") && RESERVED_SLUGS.has("e"));
  assert.equal(businessPath("franks-tech"), "/b/franks-tech");
});
test("resource paths round-trip and survive renames", () => {
  const id = newShortId();
  assert.equal(id.length, SHORT_ID_LENGTH);
  const path = resourcePath("e", "Campus Night 2026", id);
  assert.deepEqual(parseResourcePath(path), { type: "e", slug: "campus-night-2026", shortId: id });
  assert.equal(needsRedirect("campus-night-2026", "Campus Night 2026"), false);
  assert.equal(needsRedirect("campus-night-2026", "Campus Night 2027"), true);   // renamed: old link redirects
});
test("malformed or hostile paths are rejected", () => {
  for (const p of ["/e/", "/x/abc-12345678", "/p/short", "/p/ok-name-ILLEGAL1", "/p/../etc", "/p/a b-12345678", "/p/name-1234567u"]) {
    assert.equal(parseResourcePath(p), null, p);
  }
  assert.notEqual(parseResourcePath("/p/name-12345678"), null);
});
