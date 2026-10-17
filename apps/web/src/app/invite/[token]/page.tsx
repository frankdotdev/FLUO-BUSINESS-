import { notFound } from "next/navigation";
import { hashToken } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { requireUser } from "@/server/session.ts";
import { friendly } from "@/server/messages.ts";
import { acceptInviteAction } from "@/app/actions.ts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Join a business", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function InvitePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const user = await requireUser(`/invite/${token}`);
  const d = deps();
  const inv = await d.store.findInvite(hashToken(token));
  if (!inv || inv.usedAtMs !== null || Date.now() >= inv.expiresAtMs) notFound();
  // The business name is only revealed to the person the invitation was sent to.
  if (!user.emailVerified || user.email.toLowerCase() !== inv.email) return (<div style={{ maxWidth: 480 }}><h1>This invitation isn't for this account</h1><p>Sign in with the email address the invitation was sent to, and make sure that address is verified.</p></div>);
  const biz = await d.store.getBusiness(inv.businessId);
  const msg = friendly((await searchParams).error);
  return (<div style={{ maxWidth: 480 }}><h1>Join {biz?.name}</h1><p>You've been invited to help run {biz?.name} as <strong>{inv.role}</strong>.</p>{msg && <p className="alert" role="alert">{msg}</p>}
    <form action={acceptInviteAction}><input type="hidden" name="token" value={token} /><button className="btn btn-primary" type="submit">Accept invitation</button></form></div>);
}
