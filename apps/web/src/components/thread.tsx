"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { fmtLocal, type MessageRecord } from "@fluo/core";
import { sendMessageAction } from "@/app/actions.ts";
import { IconArrowRight, IconMessageSquare } from "@/components/icons.tsx";

/** A live real-time chat thread with auto-polling every 3.5s and auto-scrolling */
export function Thread({
  messages,
  viewer,
  businessId,
  conversationId,
  tz,
  names,
}: {
  messages: MessageRecord[];
  viewer: "customer" | "business";
  businessId: string;
  conversationId: string;
  tz: string;
  names: { customer: string; business: string };
}) {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Background auto-refresh polling every 3.5 seconds so messages appear automatically without page reload
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 3500);
    return () => clearInterval(interval);
  }, [router]);

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const body = (formData.get("body") as string || "").trim();
    if (!body) return;

    try {
      setIsSending(true);
      await sendMessageAction(formData);
      form.reset();
      router.refresh();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section aria-label="Conversation" style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 20,
        padding: "clamp(16px, 3vw, 24px)",
        boxShadow: "var(--shadow)",
        minHeight: 380,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}>
        {/* Messages Stream */}
        <div style={{ display: "grid", gap: 14, alignContent: "start", marginBottom: 20, maxHeight: 480, overflowY: "auto", paddingRight: 4 }}>
          {messages.length === 0 ? (
            <div className="empty-dashboard" style={{ padding: "40px 10px" }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}><IconMessageSquare size={24} /></span>
              <b>Start the conversation</b>
              <p>Ask about custom orders, availability, reservations, or delivery timing.</p>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.senderKind === viewer;
              return (
                <div
                  key={m.id}
                  style={{
                    justifySelf: mine ? "end" : "start",
                    maxWidth: "80%",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      background: mine ? "var(--coral)" : "var(--canvas)",
                      color: mine ? "#ffffff" : "var(--ink)",
                      padding: "12px 16px",
                      borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      fontSize: 14,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      boxShadow: mine ? "0 4px 12px rgba(240, 120, 102, 0.25)" : "none",
                    }}
                  >
                    {m.body}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--muted)",
                      textAlign: mine ? "right" : "left",
                      padding: "0 4px",
                    }}
                  >
                    {m.senderKind === "customer" ? names.customer : names.business} • {fmtLocal(m.createdAtMs, tz)}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Reply Box */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          style={{
            borderTop: "1px solid var(--line)",
            paddingTop: 16,
            display: "grid",
            gap: 10,
          }}
        >
          <input type="hidden" name="businessId" value={businessId} />
          <input type="hidden" name="conversationId" value={conversationId} />
          <input type="hidden" name="as" value={viewer} />
          <textarea
            id="body"
            name="body"
            rows={2}
            maxLength={2000}
            required
            placeholder="Type your message here..."
            disabled={isSending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid var(--line)",
              fontSize: 14,
              fontFamily: "inherit",
              outline: "none",
              resize: "none",
              background: "var(--canvas)",
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block" }} /> Live Chat Active
            </span>
            <button
              className="primary-button"
              type="submit"
              disabled={isSending}
              style={{ padding: "10px 20px", fontSize: 13 }}
            >
              {isSending ? "Sending..." : "Send message"} <IconArrowRight size={14} />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
