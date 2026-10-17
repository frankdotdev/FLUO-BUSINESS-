import { fmtLocal, type MessageRecord } from "@fluo/core";
import { sendMessageAction } from "@/app/actions.ts";

/** A chat thread with a reply box. `viewer` decides which side the viewer is; bubbles for the viewer sit on the right. */
export function Thread({ messages, viewer, businessId, conversationId, tz, names }: { messages: MessageRecord[]; viewer: "customer" | "business"; businessId: string; conversationId: string; tz: string; names: { customer: string; business: string } }) {
  return (
    <section aria-label="Conversation">
      <div style={{ display: "grid", gap: 8, margin: "12px 0" }}>
        {messages.length === 0 && <p className="muted">No messages yet. Say hello.</p>}
        {messages.map((m) => { const mine = m.senderKind === viewer; return (
          <div key={m.id} style={{ justifySelf: mine ? "end" : "start", maxWidth: "85%" }}>
            <div className="card" style={{ background: mine ? "var(--accent)" : "var(--surface)", color: mine ? "#0B0B0B" : "var(--ink)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</div>
            <div className="muted small" style={{ textAlign: mine ? "right" : "left" }}>{m.senderKind === "customer" ? names.customer : names.business} &middot; {fmtLocal(m.createdAtMs, tz)}</div>
          </div>); })}
      </div>
      <form action={sendMessageAction}>
        <input type="hidden" name="businessId" value={businessId} /><input type="hidden" name="conversationId" value={conversationId} /><input type="hidden" name="as" value={viewer} />
        <label htmlFor="body">Your message</label><textarea id="body" name="body" rows={3} maxLength={2000} required />
        <p><button className="btn btn-primary" type="submit">Send</button></p>
      </form>
    </section>
  );
}
