import { createHmac, timingSafeEqual } from "node:crypto";

// ---- Capacity -------------------------------------------------------------------------------
export interface TicketType { readonly capacity: number; readonly salesStartMs: number | null; readonly salesEndMs: number | null }
export function canSell(t: TicketType, alreadySold: number, qty: number, nowMs: number, maxPerOrder = 10): { ok: true } | { ok: false; reason: string } {
  if (!Number.isInteger(qty) || qty < 1 || qty > maxPerOrder) return { ok: false, reason: "invalid_quantity" };
  if (t.salesStartMs !== null && nowMs < t.salesStartMs) return { ok: false, reason: "sales_not_started" };
  if (t.salesEndMs !== null && nowMs >= t.salesEndMs) return { ok: false, reason: "sales_ended" };
  if (alreadySold + qty > t.capacity) return { ok: false, reason: "sold_out" };
  return { ok: true };   // DB must still lock the ticket_type row in the transaction that inserts tickets
}

// ---- Signed QR token ------------------------------------------------------------------------
// Token = base64url(ticketId.eventId) + "." + base64url(HMAC-SHA256). The QR carries no personal data.
const b64 = (b: Buffer): string => b.toString("base64url");
const mac = (secret: string, body: string): Buffer => createHmac("sha256", secret).update(body).digest();

export function signTicket(secret: string, ticketId: string, eventId: string): string {
  const body = b64(Buffer.from(`${ticketId}.${eventId}`, "utf8"));
  return `${body}.${b64(mac(secret, body))}`;
}
export function verifyTicketToken(secret: string, token: string): { ticketId: string; eventId: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts as [string, string];
  const expected = mac(secret, body);
  let given: Buffer;
  try { given = Buffer.from(sig, "base64url"); } catch { return null; }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const [ticketId, eventId, ...rest] = Buffer.from(body, "base64url").toString("utf8").split(".");
  return ticketId && eventId && rest.length === 0 ? { ticketId, eventId } : null;
}

// ---- Check-in --------------------------------------------------------------------------------
export type TicketStatus = "valid" | "used" | "refunded" | "cancelled";
export type ScanResult =
  | { result: "admitted"; next: "used" }
  | { result: "already_used"; next: "used"; usedAtMs: number }
  | { result: "wrong_event" | "refunded" | "cancelled" | "invalid"; next: TicketStatus };

/** Pure decision; the caller must apply it with an atomic "update ... where status = 'valid'" so two scanners can't both admit. */
export function scanTicket(secret: string, token: string, scanningEventId: string, ticket: { id: string; eventId: string; status: TicketStatus; usedAtMs: number | null } | null): ScanResult {
  const p = verifyTicketToken(secret, token);
  if (!p || !ticket || ticket.id !== p.ticketId) return { result: "invalid", next: ticket?.status ?? "cancelled" };
  if (p.eventId !== scanningEventId || ticket.eventId !== scanningEventId) return { result: "wrong_event", next: ticket.status };
  if (ticket.status === "refunded") return { result: "refunded", next: "refunded" };
  if (ticket.status === "cancelled") return { result: "cancelled", next: "cancelled" };
  if (ticket.status === "used") return { result: "already_used", next: "used", usedAtMs: ticket.usedAtMs ?? 0 };
  return { result: "admitted", next: "used" };
}
