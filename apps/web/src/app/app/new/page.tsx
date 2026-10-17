import { BUSINESS_TYPES, isTypeReady } from "@fluo/core";
import { requireUser } from "@/server/session.ts";
import { friendly } from "@/server/messages.ts";
import { createBusinessAction } from "@/app/actions.ts";

export const metadata = { title: "Open a business" };

export default async function NewBusiness({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser("/app/new");
  const msg = friendly((await searchParams).error);
  const types = BUSINESS_TYPES.filter((t) => t.tier !== "later" && isTypeReady(t)).sort((a, b) => a.label.localeCompare(b.label));
  return (
    <div style={{ maxWidth: 560 }}>
      <h1>Open your business</h1>
      <p className="muted">Pick what you do. Fluo gives you the tools that fit it: orders, bookings, tickets and more.</p>
      {msg && <p className="alert" role="alert">{msg}</p>}
      <form action={createBusinessAction}>
        <label htmlFor="name">Business name</label><input id="name" name="name" required minLength={2} maxLength={80} />
        <label htmlFor="typeId">What do you do?</label>
        <select id="typeId" name="typeId" required defaultValue="">
          <option value="" disabled>Choose one</option>
          {types.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <p className="small muted">Don't see yours? Choose "General business"; you can switch features on later. Other kinds of business open as their tools are finished (quotes and job cards for repairs, delivery, memberships and more), and licensed professions need a verification step first.</p>
        <label htmlFor="refundKind">Your refund policy (customers see this before they pay)</label>
        <select id="refundKind" name="refundKind" defaultValue="none"><option value="none">No refunds</option><option value="full_until">Full refund if cancelled early enough</option></select>
        <label htmlFor="refundHours">Hours before the booking or event (if you refund)</label><input id="refundHours" name="refundHours" type="number" min={0} max={720} defaultValue={24} />
        <p><button className="btn btn-primary btn-block" type="submit">Create my business</button></p>
      </form>
    </div>
  );
}
