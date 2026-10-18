import Link from "next/link";
import { readConversation } from "@fluo/core";
import { notFound } from "next/navigation";
import { deps } from "@/server/container.ts";
import { requireUser } from "@/server/session.ts";
import { friendly } from "@/server/messages.ts";
import { Thread } from "@/components/thread.tsx";
import { IconStore } from "@/components/icons.tsx";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conversation — Fluo", robots: { index: false, follow: false } };

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ b?: string; error?: string }>;
}) {
  const { id } = await params, sp = await searchParams;
  const user = await requireUser(`/account/messages/${id}?b=${sp.b ?? ""}`);
  const d = deps();
  const biz = await d.store.getBusiness(sp.b ?? "");
  let data;
  try {
    data = await readConversation(d, { kind: "customer", userId: user.id }, sp.b ?? "", id);
  } catch {
    notFound();
  }
  if (!biz || !data) notFound();
  const msg = friendly(sp.error);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px 80px" }}>
      {/* Header with link back to Storefront */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <nav style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
            <Link href="/account/messages" style={{ color: "inherit", textDecoration: "none" }}>Messages</Link>
            <span>/</span>
            <span style={{ color: "var(--ink)", fontWeight: 600 }}>{biz.name}</span>
          </nav>
          <h1 style={{
            margin: 0,
            fontFamily: "Manrope, sans-serif",
            fontSize: "clamp(20px, 3vw, 26px)",
            fontWeight: 800,
            letterSpacing: "-0.8px",
          }}>
            {biz.name}
          </h1>
        </div>
        <Link
          href={`/b/${biz.slug}`}
          className="secondary-button"
          style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
        >
          <IconStore size={13} />
          View Store ↗
        </Link>
      </div>

      {msg && (
        <div style={{
          padding: "10px 14px",
          background: "var(--coral-soft)",
          border: "1px solid var(--coral)",
          borderRadius: 12,
          color: "var(--coral-dark)",
          marginBottom: 16,
          fontSize: 13,
          fontWeight: 600,
        }} role="alert">
          {msg}
        </div>
      )}

      <Thread
        messages={data.messages}
        viewer="customer"
        businessId={biz.id}
        conversationId={id}
        tz={biz.timezone}
        names={{ customer: "You", business: biz.name }}
      />
    </div>
  );
}
