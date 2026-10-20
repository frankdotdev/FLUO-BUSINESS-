import { notFound } from "next/navigation";
import { hashToken, tokenMatches } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { rateLimited } from "@/server/rate.ts";
import { syncOrderPayment } from "@/server/paystack-sync.ts";
import { OrderPanel } from "@/components/order-panel.tsx";

export const dynamic = "force-dynamic";
// A private link: never indexed, and the address is not sent to other sites as a referrer.
export const metadata = { title: "Your order", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

export default async function GuestPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; reference?: string; trxref?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  if (await rateLimited("guest_lookup")) return <p className="alert" role="alert">Too many attempts. Please wait a minute and try again.</p>;   // stops link guessing
  const rec = await deps().store.findGuestToken(hashToken(token));
  if (!rec || !tokenMatches(token, hashToken(token), rec.expiresAtMs, Date.now(), rec.revoked)) notFound();

  // If returning from Paystack checkout redirect
  const ref = sp.reference || sp.trxref;
  if (ref) {
    await syncOrderPayment(rec.businessId, rec.orderId, ref);
  }

  return <OrderPanel businessId={rec.businessId} subjectId={rec.orderId} proof={{ kind: "guest", token }} token={token} backPath={`/g/${token}`} {...((e) => (e ? { error: e } : {}))(sp.error)} />;
}
