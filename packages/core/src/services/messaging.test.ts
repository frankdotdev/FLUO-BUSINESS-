import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MemoryStore } from "./memory-store.ts";
import { createBusiness, publishBusiness } from "./business-service.ts";
import { listConversations, readConversation, sendMessage, startConversation } from "./messaging-service.ts";
import { type Deps, ServiceError } from "./ports.ts";

const NOW = Date.UTC(2026, 9, 10, 7, 0), M = 60_000;
const code = async (p: Promise<unknown>) => { try { await p; return "no_error"; } catch (e) { return e instanceof ServiceError ? e.code : `unexpected:${(e as Error).message}`; } };
async function setup() {
  const store = new MemoryStore(); let t = NOW;
  const d: Deps & { advance(ms: number): void } = { store, now: () => t, uuid: () => randomUUID(), appUrl: "https://fluo.test", advance: (ms) => { t += ms; } };
  const b = await createBusiness(d, "frank", { name: "Frank Shop", typeId: "general", countryCode: "NG", currency: "NGN", timezone: "Africa/Lagos" });
  await publishBusiness(d, "frank", b.id);
  store.members.push({ userId: "cash", businessId: b.id, role: "cashier", status: "active" });
  store.contacts.set("ada", { email: "ada@x.com", name: "Ada Obi" });
  return { store, d, b };
}

test("chat: a customer opens one thread, both sides exchange messages, unread counts and alerts work", async () => {
  const { store, d, b } = await setup();
  const c1 = await startConversation(d, "ada", b.id, "Question about delivery");
  const c2 = await startConversation(d, "ada", b.id);
  assert.equal(c1.id, c2.id, "one thread per customer per business");
  await sendMessage(d, { kind: "customer", userId: "ada" }, b.id, c1.id, "  Do you deliver to Hostel B?  ");
  await sendMessage(d, { kind: "customer", userId: "ada" }, b.id, c1.id, "Hello?");
  assert.equal((await store.getConversation(b.id, c1.id))!.businessUnread, 2);
  const alerts = [...store.outbox.values()].filter((n) => n.kind === "new_message");
  assert.equal(alerts.length, 2, "owner and cashier are alerted once each, not once per message");
  const seen = await readConversation(d, { kind: "business", userId: "cash" }, b.id, c1.id);
  assert.deepEqual(seen.messages.map((m) => m.body), ["Do you deliver to Hostel B?", "Hello?"]);
  assert.equal((await store.getConversation(b.id, c1.id))!.businessUnread, 0);
  d.advance(11 * M);
  await sendMessage(d, { kind: "business", userId: "frank" }, b.id, c1.id, "Yes, for N500.");
  assert.equal((await store.getConversation(b.id, c1.id))!.customerUnread, 1);
  assert.ok([...store.outbox.values()].some((n) => n.kind === "new_message" && n.userId === "ada"));
  assert.equal((await readConversation(d, { kind: "customer", userId: "ada" }, b.id, c1.id)).messages.length, 3);
  assert.equal((await listConversations(d, { kind: "business", userId: "frank" }, b.id)).length, 1);
  assert.equal((await listConversations(d, { kind: "customer", userId: "ada" })).length, 1);
});

test("chat security: strangers, other customers, other businesses and outsiders see nothing", async () => {
  const { store, d, b } = await setup();
  const mike = await createBusiness(d, "mike", { name: "Mike Shop", typeId: "general", countryCode: "NG", currency: "NGN", timezone: "Africa/Lagos" });
  await publishBusiness(d, "mike", mike.id);
  const c = await startConversation(d, "ada", b.id);
  await sendMessage(d, { kind: "customer", userId: "ada" }, b.id, c.id, "private question");
  assert.equal(await code(readConversation(d, { kind: "customer", userId: "eve" }, b.id, c.id)), "not_found");
  assert.equal(await code(sendMessage(d, { kind: "customer", userId: "eve" }, b.id, c.id, "hi")), "not_found");
  assert.equal(await code(readConversation(d, { kind: "business", userId: "mike" }, b.id, c.id)), "not_found");           // another business's owner
  assert.equal(await code(readConversation(d, { kind: "business", userId: "mike" }, mike.id, c.id)), "not_found");         // own business id, someone else's thread
  assert.equal(await code(readConversation(d, { kind: "business", userId: "mallory" }, b.id, c.id)), "not_found");
  assert.equal(await code(listConversations(d, { kind: "business", userId: "mallory" }, b.id)), "forbidden");
  assert.equal(await code(startConversation(d, "frank", b.id)), "cannot_message_own_business");
  assert.equal(await code(startConversation(d, "ada", randomUUID())), "business_unavailable");
  assert.equal(await code(sendMessage(d, { kind: "customer", userId: "ada" }, b.id, c.id, "   ")), "empty_message");
  assert.equal(await code(sendMessage(d, { kind: "customer", userId: "ada" }, b.id, c.id, "x".repeat(2001))), "message_too_long");
  assert.equal(store.messages.length, 1);
});
