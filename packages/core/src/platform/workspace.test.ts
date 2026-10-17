import test from "node:test";
import assert from "node:assert/strict";
import { BUSINESS_TYPES, getBusinessType, resolveCapabilities } from "./business-types.ts";
import { BUILT_CAPABILITIES, isTypeReady, missingCapabilities, workspaceModules } from "./workspace.ts";

const labels = (typeId: string, extra: Parameters<typeof resolveCapabilities>[1] = []) => Object.fromEntries(workspaceModules(typeId, resolveCapabilities(typeId, extra)).map((m) => [m.id, m.label]));

test("each business gets its own management system, named in its own words", () => {
  assert.equal(labels("hotel")["bookings"], "Reservations");
  assert.equal(labels("salon_barber")["bookings"], "Appointments");
  assert.equal(labels("restaurant")["products"], "Menu");
  assert.equal(labels("retail")["products"], "Products");
  assert.equal(labels("general")["messages"], "Enquiries");
  assert.equal(labels("retail")["messages"], "Messages");
  const events = labels("event_organiser");
  assert.ok(events["events"] && !events["products"] && !events["orders"] && !events["bookings"], "an event organiser sees no shop or booking tools");
  const barber = labels("salon_barber");
  assert.ok(barber["bookings"] && !barber["orders"] && !barber["products"] && !barber["events"], "a barber sees appointments, not stock or tickets");
});
test("every workspace has the essentials, in a stable order, and enabling more features adds tabs", () => {
  for (const t of BUSINESS_TYPES) {
    const ids = workspaceModules(t.id, resolveCapabilities(t.id)).map((m) => m.id);
    for (const must of ["overview", "team", "payments", "billing"]) assert.ok(ids.includes(must as never), `${t.id} lacks ${must}`);
    assert.equal(ids[0], "overview"); assert.equal(ids.at(-1), "billing");
  }
  assert.ok(!Object.keys(labels("general")).includes("products"));
  assert.ok(Object.keys(labels("general", ["catalogue", "orders"])).includes("products"), "a general business that switches on selling gets the selling tools");
});
test("readiness is honest: types whose starting tools are not built are not offered", () => {
  assert.equal(isTypeReady(getBusinessType("retail")), true, "retail starts with inventory, which is built");
  assert.equal(isTypeReady(getBusinessType("technician")), false, "repairs need job cards and quotes, which are not built yet");
  assert.equal(isTypeReady(getBusinessType("salon_barber")), true);
  assert.equal(isTypeReady(getBusinessType("restaurant")), true);
  assert.equal(isTypeReady(getBusinessType("event_organiser")), true);
  assert.equal(isTypeReady(getBusinessType("general")), true);
  assert.deepEqual(missingCapabilities(getBusinessType("pharmacy")).sort(), ["batch_expiry"]);
  for (const t of BUSINESS_TYPES.filter(isTypeReady)) for (const c of t.defaults) assert.ok(BUILT_CAPABILITIES.has(c), `${t.id}: ${c}`);
});
