import { requireUser } from "@/server/session.ts";
import { OrderPanel } from "@/components/order-panel.tsx";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your order", robots: { index: false, follow: false } };

export default async function MyOrder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ b?: string; error?: string }> }) {
  const { id } = await params, sp = await searchParams;
  const user = await requireUser(`/account/orders/${id}?b=${sp.b ?? ""}`);
  return <OrderPanel businessId={sp.b ?? ""} subjectId={id} proof={{ kind: "user", userId: user.id }} backPath={`/account/orders/${id}?b=${sp.b ?? ""}`} {...(sp.error ? { error: sp.error } : {})} />;
}
