import { requireUser } from "@/server/session.ts";
import { syncOrderPayment } from "@/server/paystack-sync.ts";
import { OrderPanel } from "@/components/order-panel.tsx";
import { container, deps } from "@/server/container.ts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your order", robots: { index: false, follow: false } };

export default async function MyOrder({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ b?: string; error?: string; reference?: string; trxref?: string }>;
}) {
  const { id } = await params, sp = await searchParams;
  const user = await requireUser(`/account/orders/${id}?b=${sp.b ?? ""}`);
  const d = deps();
  let bId = sp.b ?? "";
  const ref = sp.reference || sp.trxref;

  if (!bId && ref) {
    const payment = await d.store.findPaymentByProviderRef("paystack", ref);
    if (payment) bId = payment.businessId;
  }
  if (!bId) {
    const c = container();
    if (c.pool) {
      const row = await c.pool.query("SELECT business_id FROM orders WHERE id = $1 LIMIT 1", [id]).catch(() => null);
      if (row?.rows?.[0]?.business_id) {
        bId = row.rows[0].business_id;
      }
    }
  }

  if (ref && bId) {
    await syncOrderPayment(bId, id, ref);
  }
  return <OrderPanel businessId={bId} subjectId={id} proof={{ kind: "user", userId: user.id }} backPath={`/account/orders/${id}?b=${bId}`} {...(sp.error ? { error: sp.error } : {})} />;
}
