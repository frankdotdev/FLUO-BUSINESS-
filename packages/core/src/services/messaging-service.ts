import { authorize } from "../platform/authz.ts";
import { notifyBusiness, notifyRecipient } from "../notifications/notify.ts";
import { type ConversationRecord, type Deps, type MessageRecord, fail } from "./ports.ts";

export type Side = { kind: "customer"; userId: string } | { kind: "business"; userId: string };
const MAX_BODY = 2000;

/** Opens (or returns) the customer's thread with a business. Signed-in customers only, which keeps spam and impersonation out. */
export async function startConversation(d: Deps, customerUserId: string, businessId: string, topic?: string): Promise<ConversationRecord> {
  const biz = await d.store.getBusiness(businessId);
  if (!biz || biz.status !== "active") return fail("business_unavailable");
  const mine = await d.store.membershipsForUser(customerUserId);
  if (mine.some((m) => m.businessId === businessId && m.status === "active")) return fail("cannot_message_own_business");
  const now = d.now();
  return d.store.getOrCreateConversation({ id: d.uuid(), businessId, customerUserId, topic: topic?.trim().slice(0, 120) || null, createdAtMs: now, lastMessageAtMs: now, businessUnread: 0, customerUnread: 0 });
}

async function authorizeSide(d: Deps, side: Side, businessId: string, conversationId: string): Promise<ConversationRecord> {
  const c = await d.store.getConversation(businessId, conversationId);               // scoped by business: other tenants' threads are "not found"
  if (!c) return fail("not_found");
  if (side.kind === "customer") { if (c.customerUserId !== side.userId) return fail("not_found"); }
  else if (!authorize(await d.store.membershipsForUser(side.userId), side.userId, businessId, "orders.read").allowed) return fail("not_found");
  return c;
}

export async function sendMessage(d: Deps, side: Side, businessId: string, conversationId: string, body: string): Promise<void> {
  const c = await authorizeSide(d, side, businessId, conversationId);
  const text = body.replace(/\r\n/g, "\n").trim();
  if (text.length === 0) return fail("empty_message");
  if (text.length > MAX_BODY) return fail("message_too_long");
  const now = d.now();
  await d.store.insertMessage({ id: d.uuid(), conversationId: c.id, businessId, senderKind: side.kind, senderUserId: side.userId, body: text, createdAtMs: now });
  const bucket = `${c.id}:${side.kind}:${Math.floor(now / 600_000)}`;                 // at most one alert per side per 10 minutes, however many messages
  const preview = text.length > 120 ? `${text.slice(0, 117)}...` : text;
  const biz = await d.store.getBusiness(businessId);
  if (side.kind === "customer") {
    const who = (await d.store.getUserContact(side.userId))?.name ?? "A customer";
    await notifyBusiness(d, businessId, "orders.read", "new_message", { fromName: who, preview, path: `/app/${businessId}?tab=messages&c=${c.id}` }, bucket);
  } else {
    await notifyRecipient(d, { kind: "user", userId: c.customerUserId }, "new_message", { fromName: biz?.name ?? "A business", preview, path: `/account/messages/${c.id}?b=${businessId}` }, bucket);
  }
}

/** Returns the thread (most recent 200 messages) and marks it read for the side that opened it. */
export async function readConversation(d: Deps, side: Side, businessId: string, conversationId: string): Promise<{ conversation: ConversationRecord; messages: MessageRecord[] }> {
  const c = await authorizeSide(d, side, businessId, conversationId);
  const messages = await d.store.listMessages(businessId, conversationId, 200);
  await d.store.markConversationRead(businessId, conversationId, side.kind);
  return { conversation: c, messages };
}

export async function listConversations(d: Deps, side: Side, businessId?: string): Promise<ConversationRecord[]> {
  if (side.kind === "customer") return d.store.listConversationsForCustomer(side.userId, 50);
  if (!businessId || !authorize(await d.store.membershipsForUser(side.userId), side.userId, businessId, "orders.read").allowed) return fail("forbidden");
  return d.store.listConversationsForBusiness(businessId, 50);
}
