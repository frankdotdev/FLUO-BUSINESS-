import test from "node:test";
import assert from "node:assert/strict";
import { BUSINESS_TYPES, getBusinessType, resolveCapabilities } from "./business-types.ts";
import { CAPABILITIES, isCapability, withDependencies } from "./capabilities.ts";
import { assertSameTenant, authorize, type Membership } from "./authz.ts";

test("every business type is internally consistent", () => {
  const ids = new Set<string>();
  for (const b of BUSINESS_TYPES) {
    assert.ok(!ids.has(b.id), `duplicate id ${b.id}`); ids.add(b.id);
    for (const c of [...b.defaults, ...b.optional]) assert.ok(isCapability(c), `${b.id}: ${c}`);
    for (const c of b.defaults) for (const d of CAPABILITIES[c]) assert.ok(b.defaults.includes(d), `${b.id}: ${c} missing dep ${d}`);
  }
  assert.ok(BUSINESS_TYPES.length >= 70);
});
test("regulated or sensitive types require verification and never ship in the MVP tier", () => {
  for (const b of BUSINESS_TYPES.filter((x) => x.regulation !== "none")) {
    assert.equal(b.requiresVerification, true, b.id);
    assert.notEqual(b.tier, "mvp", b.id);
  }
  for (const id of ["pharmacy", "clinic", "lab", "legal_accounting", "veterinary"]) {
    assert.equal(getBusinessType(id).regulation, "licensed");
  }
});
test("capability resolution adds dependencies and rejects unavailable ones", () => {
  assert.deepEqual(withDependencies(["custom_orders"]).sort(), ["catalogue", "custom_orders", "orders"]);
  assert.ok(resolveCapabilities("retail", ["delivery"]).includes("orders"));
  assert.throws(() => resolveCapabilities("salon_barber", ["inventory"]));
  assert.throws(() => withDependencies(["nope"]));
});
test("a phone-repair-plus-retail business can enable retail on top of repair", () => {
  const caps = resolveCapabilities("technician", ["catalogue", "inventory"]);
  assert.ok(caps.includes("job_cards") && caps.includes("inventory"));
});

const ms: Membership[] = [
  { userId: "frank", businessId: "techhub", role: "owner", status: "active" },
  { userId: "frank", businessId: "barber", role: "staff", status: "active" },
  { userId: "jane", businessId: "techhub", role: "cashier", status: "active" },
  { userId: "mike", businessId: "techhub", role: "manager", status: "removed" },
];
test("roles are evaluated per business", () => {
  assert.equal(authorize(ms, "frank", "techhub", "billing.manage").allowed, true);
  assert.equal(authorize(ms, "frank", "barber", "billing.manage").allowed, false);   // staff there
});
test("negative: another user's business, unknown business, removed member, missing permission", () => {
  assert.equal(authorize(ms, "jane", "barber", "orders.read").reason, "no_membership");   // cross-tenant
  assert.equal(authorize(ms, "jane", "techhub", "catalogue.write").reason, "permission_denied");
  assert.equal(authorize(ms, "mike", "techhub", "orders.read").reason, "membership_removed");
  assert.equal(authorize(ms, "frank", "ghost", "orders.read").allowed, false);
});
test("negative: fetching a resource by ID from another tenant is refused", () => {
  assert.throws(() => assertSameTenant("barber", "techhub"), /cross_tenant/);
  assert.doesNotThrow(() => assertSameTenant("techhub", "techhub"));
});
