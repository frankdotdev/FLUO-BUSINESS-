import { readConversation } from "@fluo/core";
import { notFound } from "next/navigation";
import { deps } from "@/server/container.ts";
import { requireUser } from "@/server/session.ts";
import { friendly } from "@/server/messages.ts";
import { Thread } from "@/components/thread.tsx";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conversation", robots: { index: false, follow: false } };

export default async function ChatPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ b?: string; error?: string }> }) {
  const { id } = await params, sp = await searchParams;
  const user = await requireUser(`/account/messages/${id}?b=${sp.b ?? ""}`);
  const d = deps();
  const biz = await d.store.getBusiness(sp.b ?? "");
  let data; try { data = await readConversation(d, { kind: "customer", userId: user.id }, sp.b ?? "", id); } catch { notFound(); }
  if (!biz || !data) notFound();
  const msg = friendly(sp.error);
  return (<><h1>{biz.name}</h1>{msg && <p className="alert" role="alert">{msg}</p>}<Thread messages={data.messages} viewer="customer" businessId={biz.id} conversationId={id} tz={biz.timezone} names={{ customer: "You", business: biz.name }} /></>);
}
