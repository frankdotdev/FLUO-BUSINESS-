import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MemoryStore } from "./memory-store.ts";
import { createBusiness, publishBusiness } from "./business-service.ts";
import { categories, normaliseQuery, searchMarketplace, typeIdsInGroup } from "./search-service.ts";
import type { Deps } from "./ports.ts";

const NOW = Date.UTC(2026, 9, 10, 7, 0), D = 86_400_000;
const lagos = { countryCode: "NG", currency: "NGN", timezone: "Africa/Lagos" };
async function setup() {
  const store = new MemoryStore(); const d: Deps = { store, now: () => NOW, uuid: () => randomUUID() };
  const phones = await createBusiness(d, "frank", { name: "Frank Phones", typeId: "retail", ...lagos }); await publishBusiness(d, "frank", phones.id);
  const cuts = await createBusiness(d, "pat", { name: "Sharp Cuts", typeId: "salon_barber", ...lagos }); await publishBusiness(d, "pat", cuts.id);
  const draft = await createBusiness(d, "dan", { name: "Draft Phones", typeId: "retail", ...lagos });
  const p = (b: string, name: string, status: "active" | "draft", description: string | null = null) => ({ id: randomUUID(), businessId: b, shortId: randomUUID().replaceAll("-", "").slice(0, 8), slug: "x", name, description, priceMinor: 1000n, currency: "NGN", fulfilment: "stock" as const, leadTimeHours: 0, maxPerOrder: 5, status, createdAtMs: NOW });
  await store.insertProduct(p(phones.id, "iPhone charger", "active", "fast charging cable")); await store.insertProduct(p(phones.id, "Secret iPhone prototype", "draft")); await store.insertProduct(p(draft.id, "iPhone case", "active"));
  await store.insertEvent({ id: randomUUID(), businessId: phones.id, shortId: "evnt2345", slug: "e", name: "Phone Fair", description: null, venue: null, startsAtMs: NOW + 5 * D, endsAtMs: null, status: "published" });
  return { d, phones, cuts };
}

test("search finds live businesses, items (by name or description) and events; hides drafts and unpublished businesses", async () => {
  const { d, phones } = await setup();
  const r = await searchMarketplace(d, "  IPHONE ");
  assert.deepEqual(r.products.map((x) => x.product.name), ["iPhone charger"], "no draft item, and nothing from a business that is not live");
  assert.equal(r.products[0]!.business.id, phones.id);
  assert.deepEqual((await searchMarketplace(d, "charging")).products.map((x) => x.product.name), ["iPhone charger"], "description matches");
  assert.deepEqual((await searchMarketplace(d, "phone fair")).events.map((e) => e.event.name), ["Phone Fair"]);
  assert.deepEqual((await searchMarketplace(d, "phones")).businesses.map((b) => b.name), ["Frank Phones"], "the unpublished business never appears");
});
test("search also matches business TYPES, so 'barber' finds salons whatever they are called", async () => {
  const { d, cuts } = await setup();
  assert.deepEqual((await searchMarketplace(d, "barber")).businesses.map((b) => b.id), [cuts.id]);
});
test("search input is cleaned and bounded: too short is empty, whitespace collapsed, length capped", async () => {
  const { d } = await setup();
  assert.equal((await searchMarketplace(d, "a")).businesses.length, 0);
  assert.equal((await searchMarketplace(d, "   ")).query, "");
  assert.equal(normaliseQuery("  a   b\n\tc "), "a b c");
  assert.equal(normaliseQuery("x".repeat(500)).length, 60);
  assert.equal((await searchMarketplace(d, "%%")).businesses.length, 0);
});
test("categories only list groups that have an openable business type", () => {
  const groups = categories();
  assert.ok(groups.some((g) => g.group === "food") && groups.some((g) => g.group === "beauty"));
  for (const g of groups) assert.ok(typeIdsInGroup(g.group).length > 0, g.group);
  assert.equal(groups.some((g) => g.group === "property"), false, "no openable property type yet");
});
