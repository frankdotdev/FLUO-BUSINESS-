import Link from "next/link";
import { notFound } from "next/navigation";
import { PLAN_ENTITLEMENTS, PRICE_BOOK, authorize, resourcePath, readConversation, workspaceModules, type ModuleId, describePolicy, effectivePlanKey, fmtLocal, fmtMoney, getBusinessType, paidPlanKey, resolveEntitlements, trialState, type Permission } from "@fluo/core";
import { listPaystackBanks } from "@fluo/adapters";
import { Scanner } from "@/components/scanner.tsx";
import { Thread } from "@/components/thread.tsx";
import { ImageUpload } from "@/components/image-upload.tsx";
import { photo } from "@/server/media.ts";
import { deps } from "@/server/container.ts";
import { env } from "@/server/env.ts";
import { requireUser } from "@/server/session.ts";
import { friendly } from "@/server/messages.ts";
import * as A from "@/app/actions.ts";
import { IconZap, IconReceipt, IconShield, IconCheck, IconAlertTriangle } from "@/components/icons.tsx";

export const dynamic = "force-dynamic";
const H = (id: string) => (<><input type="hidden" name="businessId" value={id} /></>);

export default async function Dashboard({ params, searchParams }: { params: Promise<{ businessId: string }>; searchParams: Promise<{ tab?: string; error?: string; welcome?: string; payout?: string; checkin?: string; c?: string; invited?: string }> }) {
  const { businessId } = await params, sp = await searchParams;
  const user = await requireUser(`/app/${businessId}`);
  const d = deps();
  const mine = await d.store.membershipsForUser(user.id);
  const can = (p: Permission): boolean => authorize(mine, user.id, businessId, p).allowed;
  const biz = can("orders.read") || can("bookings.manage") || can("catalogue.write") ? await d.store.getBusiness(businessId) : null;
  if (!biz) notFound();                                                         // not a member: same response as a business that doesn't exist
  const msg = friendly(sp.error);
  const type = getBusinessType(biz.typeId);
  const { planKey } = await resolveEntitlements(d, businessId, PLAN_ENTITLEMENTS);
  const caps = await d.store.capabilitiesOf(businessId);
  const modules = workspaceModules(biz.typeId, caps);                      // each business sees only the tools it has, in its own words
  const tab: ModuleId = modules.some((m) => m.id === sp.tab) ? (sp.tab as ModuleId) : "overview";
  const myRole = mine.find((m) => m.businessId === businessId && m.status === "active")?.role;

  return (
    <>
      <div className="row between">
        <div>
          <h1 style={{ margin: "16px 0 0" }}>{biz.name}</h1>
          <p className="muted small">{type.label} &middot; plan: {planKey} &middot; <span className={`badge ${biz.status === "active" ? "ok" : "warn"}`}>{biz.status === "active" ? "Live" : "Draft"}</span></p>
        </div>
        <div className="row">
          <Link className="btn btn-accent" style={{ display: "inline-flex", alignItems: "center", gap: 6 }} href={`/app/${businessId}/kiosk`}>
            <IconZap size={15} /> POS Kiosk
          </Link>
          {biz.status === "active" && <Link className="btn" href={`/b/${biz.slug}`}>View public page</Link>}
        </div>
      </div>
      <nav className="tabs" aria-label="Business sections">{modules.map((m) => <Link key={m.id} href={`/app/${businessId}?tab=${m.id}`} aria-current={m.id === tab ? "page" : undefined}>{m.label}</Link>)}</nav>
      {msg && <p className="alert" role="alert">{msg}</p>}
      {sp.welcome && <p className="notice">Your business is created. Set up how you'll get paid, add your first item, then publish.</p>}

      {tab === "overview" && <Overview biz={biz} canManage={can("business.manage")} />}
      {tab === "orders" && <Orders businessId={businessId} canWrite={can("orders.write")} canRefund={can("refunds.manage")} />}
      {tab === "bookings" && <Bookings currency={biz.currency} businessId={businessId} tz={biz.timezone} canManage={can("bookings.manage")} enabled={caps.includes("bookings") || caps.includes("resource_booking")} />}
      {tab === "events" && <Events businessId={businessId} tz={biz.timezone} canManage={can("events.manage")} canCheckIn={can("events.checkin")} enabled={caps.includes("events_ticketing")} checkin={sp.checkin} />}
      {tab === "messages" && <Messages businessId={businessId} tz={biz.timezone} bizName={biz.name} selected={sp.c} error={sp.error} />}
      {tab === "team" && <Team businessId={businessId} isOwner={myRole === "owner"} canManage={can("members.manage")} invited={sp.invited} />}
      {tab === "products" && <Products businessId={businessId} canWrite={can("catalogue.write")} enabled={caps.includes("catalogue")} currency={biz.currency} />}
      {tab === "payments" && <Payments biz={biz} canManage={can("business.manage")} canBilling={can("billing.manage")} payout={sp.payout} />}
      {tab === "billing" && <Billing biz={biz} canBilling={can("billing.manage")} />}
    </>
  );
}

function Overview({ biz, canManage }: { biz: { id: string; status: string; acceptsAutomatic: boolean; allowsTransfer: boolean; refundPolicy: Parameters<typeof describePolicy>[0] }; canManage: boolean }) {
  return (
    <>
      <h2>Getting live</h2>
      <ol>
        <li>Choose how customers pay (Payments tab): {biz.acceptsAutomatic || biz.allowsTransfer ? "done" : "to do"}</li>
        <li>Add your first item or service (Products tab)</li>
        <li>Publish your page</li>
      </ol>
      <p className="small">Refund policy customers see: {describePolicy(biz.refundPolicy)}</p>
      {canManage && <p><ImageUpload businessId={biz.id} target={{ kind: "business" }} label="Upload your logo" /></p>}
      {biz.status === "draft" && canManage && <form action={A.publishAction}>{H(biz.id)}<button className="btn btn-primary" type="submit">Publish my business</button><p className="small muted">Publishing starts your free month with every feature in the Business plan.</p></form>}
    </>
  );
}

async function Orders({ businessId, canWrite, canRefund }: { businessId: string; canWrite: boolean; canRefund: boolean }) {
  const d = deps();
  const orders = await d.store.listOrders(businessId, 30, 0);
  const refunds = await d.store.listRefundRequests(businessId, "requested");
  const rows = await Promise.all(orders.map(async (o) => ({
    o,
    p: await d.store.getPaymentForOrder(businessId, o.id),
    escrow: await d.store.getEscrowRecord(o.id),
  })));
  return (
    <>
      {refunds.length > 0 && (<><h2>Refunds waiting for you</h2>{refunds.map((r) => (
        <div className="card" key={r.id}><p><strong>{fmtMoney(r.amountMinor, r.currency)}</strong> is due to a customer under your refund policy. Pay it back yourself, then record it here.</p>
          {canRefund && <div className="row"><form action={A.resolveRefundAction}>{H(businessId)}<input type="hidden" name="refundId" value={r.id} /><input type="hidden" name="outcome" value="refunded" /><button className="btn btn-primary" type="submit">I have refunded this</button></form>
          <form action={A.resolveRefundAction} className="row">{H(businessId)}<input type="hidden" name="refundId" value={r.id} /><input type="hidden" name="outcome" value="declined" /><input name="reason" placeholder="Reason (the customer sees it)" required minLength={5} /><button className="btn btn-danger" type="submit">Decline</button></form></div>}
        </div>))}</>)}
      <h2>Orders</h2>
      {rows.length === 0 ? <p className="notice">No orders yet. Share your page link on WhatsApp to get the first one.</p> : (
        <div className="overflow"><table><thead><tr><th>Customer</th><th>Total</th><th>Status</th><th>Payment &amp; Escrow</th><th>Actions</th></tr></thead><tbody>{rows.map(({ o, p, escrow }) => (
          <tr key={o.id}>
            <td>
              {o.guest?.name ?? "Account customer"}
              {o.note && <div className="muted small">{o.note}</div>}
              <div>
                <Link href={`/receipt/${o.id}?b=${businessId}`} className="small" style={{ display: "inline-flex", alignItems: "center", gap: 4 }} target="_blank">
                  <IconReceipt size={12} /> View Receipt
                </Link>
              </div>
            </td>
            <td>{fmtMoney(o.totalMinor, o.currency)}</td>
            <td><span className="badge">{o.status.replace("_", " ")}</span></td>
            <td>
              <div>{p?.method === "bank_transfer" ? `Transfer ${p.reference ?? ""} (${p.status.replace("_", " ")})` : `Online (${p?.status ?? "none"})`}</div>
              {escrow && (
                <div style={{ marginTop: 4 }}>
                  {escrow.status === "held" ? (
                    <span className="badge warn" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                      <IconShield size={11} /> Escrow Held
                    </span>
                  ) : escrow.status === "released" ? (
                    <span className="badge ok" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                      <IconCheck size={11} /> Escrow Released
                    </span>
                  ) : (
                    <span className="badge bad" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                      <IconAlertTriangle size={11} /> {escrow.status}
                    </span>
                  )}
                </div>
              )}
            </td>
            <td>
              {canWrite && p?.method === "bank_transfer" && (p.status === "awaiting_confirmation" || p.status === "created") && o.status === "awaiting_payment" && (
                <form action={A.confirmOrderTransferAction} style={{ marginBottom: 4 }}>{H(businessId)}<input type="hidden" name="orderId" value={o.id} /><button className={`btn ${p.status === "awaiting_confirmation" ? "btn-primary" : ""}`} type="submit">I received it</button></form>
              )}
              {canWrite && escrow && escrow.status === "held" && (
                <form action={A.releaseEscrowWithPinAction} className="row" style={{ gap: 4 }}>
                  <input type="hidden" name="orderId" value={o.id} />
                  <input type="hidden" name="back" value={`/app/${businessId}?tab=orders`} />
                  <input name="pin" maxLength={4} pattern="[0-9]{4}" placeholder="PIN" style={{ width: 60, minHeight: 0, padding: "4px 6px", fontSize: 12 }} required />
                  <button className="btn btn-primary" style={{ minHeight: 0, padding: "4px 8px", fontSize: 12 }} type="submit">Release</button>
                </form>
              )}
            </td>
          </tr>))}</tbody></table></div>)}
      <p className="small muted">Only confirm a transfer after you see the money in your own bank app. Escrow releases require the customer's 4-digit PIN upon delivery.</p>
    </>
  );
}

async function Bookings({ businessId, tz, canManage, enabled, currency }: { businessId: string; tz: string; canManage: boolean; enabled: boolean; currency: string }) {
  if (!enabled) return <p className="notice">Bookings aren't switched on for this business.</p>;
  const d = deps(); const now = Date.now();
  const list = await d.store.listBookings(businessId, now - 86_400_000, now + 60 * 86_400_000);
  const rows = await Promise.all(list.map(async (b) => ({ b, p: await d.store.getPaymentForOrder(businessId, b.id), g: await d.store.getResourceGroup(businessId, b.groupId) })));
  const groups = await d.store.listResourceGroups(businessId);
  return (
    <>
      <h2>What customers can book</h2>
      {groups.map((g) => (<p key={g.id} className="row"><strong>{g.name}</strong> <span className="muted small">{fmtMoney(g.priceMinor, g.currency)}</span> {g.shortId && <Link href={resourcePath("r", g.name, g.shortId)}>Booking page</Link>}</p>))}
      {canManage && (
        <form action={A.createResourceGroupAction} className="card" style={{ maxWidth: 520 }}>{H(businessId)}
          <label htmlFor="gname">Name (e.g. Deluxe room, Football pitch, Haircut)</label><input id="gname" name="name" required minLength={2} maxLength={80} />
          <label htmlFor="kind">How is it booked?</label>
          <select id="kind" name="kind" defaultValue="time_block"><option value="nights">By the night (rooms, apartments)</option><option value="time_block">By the hour (pitches, appointments, meeting rooms)</option><option value="rental_period">By rental period (cars, equipment)</option><option value="bed">By bed per night (hostels)</option></select>
          <label htmlFor="gprice">Price ({currency}) per night, hour, day or booking</label><input id="gprice" name="price" inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,2})?" required />
          <label htmlFor="units">Rooms, courts, people or items (one per line)</label><textarea id="units" name="units" rows={3} required />
          <p><button className="btn btn-primary" type="submit">Add</button></p>
          <p className="small muted">Starting rules (booking length, cleaning time between bookings, notice) are set for you and double-booking is blocked automatically.</p></form>)}
      <h2>Upcoming bookings</h2>
      {rows.length === 0 ? <p className="notice">No bookings in the next 60 days.</p> : (
        <div className="overflow"><table><thead><tr><th>When</th><th>What</th><th>Customer</th><th>Status</th><th /></tr></thead><tbody>{rows.map(({ b, p, g }) => (
          <tr key={b.id}><td>{fmtLocal(b.startMs, tz)}</td><td>{g?.name}</td><td>{b.guest?.name ?? "Account customer"}</td><td><span className="badge">{b.status}</span></td>
            <td className="row">{canManage && b.status === "held" && p?.method === "bank_transfer" && <form action={A.confirmBookingTransferAction}>{H(businessId)}<input type="hidden" name="bookingId" value={b.id} /><button className="btn btn-primary" type="submit">I received it</button></form>}
              {canManage && (b.status === "held" || b.status === "confirmed") && <form action={A.cancelBookingAsBusinessAction}>{H(businessId)}<input type="hidden" name="bookingId" value={b.id} /><button className="btn btn-danger" type="submit">Cancel</button></form>}</td></tr>))}</tbody></table></div>)}
    </>
  );
}

async function Products({ businessId, canWrite, enabled, currency }: { businessId: string; canWrite: boolean; enabled: boolean; currency: string }) {
  if (!enabled) return <p className="notice">Product listings aren't switched on for this business.</p>;
  const d = deps();
  const list = await d.store.listProducts(businessId, ["draft", "active", "paused"], 100, 0);
  const { entitlements } = await resolveEntitlements(d, businessId, PLAN_ENTITLEMENTS);
  const used = await d.store.countProducts(businessId, ["active"]);
  const limit = entitlements["listings"];
  return (
    <>
      <h2>Items</h2>
      <p className="muted small">{used} live{typeof limit === "number" ? ` of ${limit} on your plan` : ""}. Items over your plan's limit are paused, never deleted.</p>
      {canWrite && (
        <form action={A.createProductAction} className="card" style={{ maxWidth: 480 }}>{H(businessId)}
          <label htmlFor="pname">Name</label><input id="pname" name="name" required minLength={2} maxLength={120} />
          <label htmlFor="price">Price ({currency})</label><input id="price" name="price" inputMode="decimal" pattern="[0-9]+(\.[0-9]{1,2})?" required />
          <label htmlFor="fulfilment">Type</label><select id="fulfilment" name="fulfilment"><option value="stock">Ready to sell</option><option value="made_to_order">Made to order</option></select>
          <label htmlFor="lead">Notice needed for made-to-order (hours)</label><input id="lead" name="leadTimeHours" type="number" min={0} defaultValue={0} />
          <label htmlFor="stock">How many do you have? (leave empty if you don't count stock)</label><input id="stock" name="stock" type="number" min={0} />
          <label htmlFor="desc">Description (optional)</label><textarea id="desc" name="description" maxLength={2000} rows={2} />
          <label style={{ fontWeight: 400 }}><input type="checkbox" name="publish" defaultChecked style={{ width: "auto", minHeight: 0 }} /> Make it visible to customers</label>
          <p><button className="btn btn-primary" type="submit">Add item</button></p>
        </form>)}
      {list.length > 0 && (<div className="overflow"><table><thead><tr><th>Item</th><th>Price</th><th>Stock</th><th>Status</th><th /></tr></thead><tbody>{list.map((p) => (
        <tr key={p.id}><td>{photo(businessId, p.imageAssetId, "thumb") && <img src={photo(businessId, p.imageAssetId, "thumb")!} alt="" width={64} height={48} style={{ borderRadius: 6, objectFit: "cover", display: "block", marginBottom: 6 }} />}{p.name}{canWrite && <div style={{ marginTop: 6 }}><ImageUpload businessId={businessId} target={{ kind: "product", id: p.id }} label={p.imageAssetId ? "Change photo" : "Add photo"} /></div>}</td><td>{fmtMoney(p.priceMinor, p.currency)}</td><td>{p.stockQuantity == null ? <span className="muted small">not counted</span> : p.stockQuantity === 0 ? <span className="badge bad">sold out</span> : p.stockQuantity <= 3 ? <span className="badge warn">{p.stockQuantity} left</span> : p.stockQuantity}</td><td><span className="badge">{p.status}</span></td>
          <td>{canWrite && <form action={A.setProductStatusAction}>{H(businessId)}<input type="hidden" name="productId" value={p.id} /><input type="hidden" name="status" value={p.status === "active" ? "paused" : "active"} /><button className="btn" type="submit">{p.status === "active" ? "Pause" : "Make live"}</button></form>}</td></tr>))}</tbody></table></div>)}
    </>
  );
}

async function Payments({ biz, canManage, canBilling, payout }: { biz: { id: string; acceptsAutomatic: boolean; allowsTransfer: boolean }; canManage: boolean; canBilling: boolean; payout: string | undefined }) {
  const d = deps();
  const [po, ta] = await Promise.all([d.store.getPayoutAccount(biz.id), d.store.getTransferAccount(biz.id)]);
  let banks: { name: string; code: string }[] = [];
  try { banks = await listPaystackBanks({ secretKey: env().PAYSTACK_SECRET_KEY }); } catch { banks = []; }
  return (
    <>
      <h2>How customers can pay you</h2>
      <p className="muted small">You choose. Fluo never holds your customers' money.</p>
      {canManage && <form action={A.setModesAction} className="card" style={{ maxWidth: 520 }}>{H(biz.id)}
        <label style={{ fontWeight: 400 }}><input type="checkbox" name="automatic" defaultChecked={biz.acceptsAutomatic} style={{ width: "auto", minHeight: 0 }} /> <strong>Automatic:</strong> customers pay on Fluo and the money goes straight to your bank account.</label>
        <label style={{ fontWeight: 400 }}><input type="checkbox" name="manual" defaultChecked={biz.allowsTransfer} style={{ width: "auto", minHeight: 0 }} /> <strong>Manual:</strong> customers see your account number, transfer, tap "I have transferred", and you confirm.</label>
        <p><button className="btn btn-primary" type="submit">Save</button></p></form>}

      <h2>Automatic payments: payout account</h2>
      {po ? <p>{po.accountName} &middot; ****{po.accountLast4} {po.verified ? <span className="badge ok">Verified</span> : <span className="badge warn">Waiting for review</span>}</p> : <p className="muted small">Not set up.</p>}
      {payout === "review" && <p className="notice">The account name doesn't match your name or business name, so we need to review it before automatic payments turn on. Manual transfers still work.</p>}
      {canBilling ? (
        <form action={A.savePayoutAction} className="card" style={{ maxWidth: 520 }}>{H(biz.id)}
          <label htmlFor="bankCode">Bank</label>
          {banks.length > 0 ? <select id="bankCode" name="bankCode" required defaultValue="">{[<option key="" value="" disabled>Choose your bank</option>, ...banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)]}</select> : <input id="bankCode" name="bankCode" placeholder="Bank code" required />}
          <label htmlFor="pnum">Account number (10 digits)</label><input id="pnum" name="accountNumber" inputMode="numeric" pattern="[0-9]{10}" required />
          <label htmlFor="owner">Account holder name</label><input id="owner" name="ownerName" required />
          <p><button className="btn btn-primary" type="submit">Verify and save</button></p>
          <p className="small muted">We check the name with your bank. Only the owner can change where money is paid.</p></form>
      ) : <p className="small muted">Only the owner can change the payout account.</p>}

      <h2>Manual payments: your account number</h2>
      {ta ? <p>{ta.bankName} &middot; {ta.accountName} &middot; ****{ta.accountLast4}</p> : <p className="muted small">Not set up.</p>}
      {canManage && <form action={A.saveTransferAccountAction} className="card" style={{ maxWidth: 520 }}>{H(biz.id)}
        <label htmlFor="bankName">Bank name</label><input id="bankName" name="bankName" required />
        <label htmlFor="accountName">Account name</label><input id="accountName" name="accountName" required />
        <label htmlFor="tnum">Account number (10 digits)</label><input id="tnum" name="accountNumber" inputMode="numeric" pattern="[0-9]{10}" required />
        <p><button className="btn btn-primary" type="submit">Save account</button></p>
        <p className="small muted">Customers see this number in bold at checkout. It is stored encrypted and never shown on public pages.</p></form>}
    </>
  );
}

async function Billing({ biz, canBilling }: { biz: { id: string; currency: string; countryCode: string }; canBilling: boolean }) {
  const d = deps(); const now = Date.now();
  const [sub, trial] = await Promise.all([d.store.getSubscription(biz.id), d.store.trialForBusiness(biz.id)]);
  const state = trialState(trial, now);
  const plan = effectivePlanKey(paidPlanKey(sub, now), trial, now);
  const plans = [...new Set(PRICE_BOOK.filter((p) => p.currency === biz.currency).map((p) => p.planKey))];
  return (
    <>
      <h2>Your plan</h2>
      <p>Right now: <strong>{plan}</strong>.
        {state.status === "active" && <> Your free month has {state.daysLeft} days left, with every feature in the Business plan.</>}
        {sub && sub.paidUntilMs > now && <> Paid until {fmtLocal(sub.paidUntilMs, "Africa/Lagos")}{sub.cancelAtPeriodEnd ? " (cancelled: access ends then, nothing is deleted)" : ""}.</>}</p>
      {canBilling && sub && sub.paidUntilMs > now && <form action={A.cancelSubscriptionAction}>{H(biz.id)}{sub.cancelAtPeriodEnd && <input type="hidden" name="resume" value="1" />}<button className="btn" type="submit">{sub.cancelAtPeriodEnd ? "Keep my plan" : "Cancel my plan"}</button><p className="small muted">Cancel any time. You keep access to the end of the period you paid for.</p></form>}
      <h2>Plans</h2>
      <div className="grid">{plans.map((pk) => {
        const price = PRICE_BOOK.find((p) => p.planKey === pk && p.currency === biz.currency && p.interval === "month" && !p.country);
        return price ? (<div className="card" key={pk}><h3 style={{ textTransform: "capitalize" }}>{pk}</h3><p><strong>{fmtMoney(price.amountMinor, biz.currency)}</strong> / month</p>
          {canBilling && <form action={A.startSubscriptionAction}>{H(biz.id)}<input type="hidden" name="planKey" value={pk} /><input type="hidden" name="interval" value="month" /><button className="btn btn-primary" type="submit">{sub && sub.planKey === pk && sub.paidUntilMs > now ? "Extend one month" : "Choose"}</button></form>}</div>) : null;
      })}</div>
      <p className="small muted">Free plan: 10 listings, 20 orders a month. Nothing is ever deleted when a plan ends; extra items are paused until you upgrade.</p>
    </>
  );
}

async function Events({ businessId, tz, canManage, canCheckIn, enabled, checkin }: { businessId: string; tz: string; canManage: boolean; canCheckIn: boolean; enabled: boolean; checkin: string | undefined }) {
  if (!enabled) return <p className="notice">Events and tickets aren't switched on for this business.</p>;
  const d = deps();
  const events = await d.store.listEvents(businessId, 50);
  const rows = await Promise.all(events.map(async (e) => {
    const types = await d.store.listTicketTypes(businessId, e.id);
    return { e, types: await Promise.all(types.map(async (t) => ({ t, sold: await d.store.countLiveTickets(businessId, t.id, Date.now()) }))) };
  }));
  const RESULT: Record<string, string> = { admitted: "Admitted. Let them in.", already_used: "Already used. Do not admit.", wrong_event: "This ticket is for a different event.", invalid: "Invalid ticket.", refunded: "This ticket was refunded.", cancelled: "This ticket was cancelled.", not_paid: "This ticket isn't paid for yet." };
  return (
    <>
      {checkin && <p className={checkin === "admitted" ? "notice" : "alert"} role="status"><strong>{RESULT[checkin] ?? checkin}</strong></p>}
      {canManage && (
        <form action={A.createEventAction} className="card" style={{ maxWidth: 520 }}>{H(businessId)}
          <h3>New event</h3>
          <label htmlFor="en">Name</label><input id="en" name="name" required minLength={2} maxLength={120} />
          <label htmlFor="ev">Venue</label><input id="ev" name="venue" maxLength={200} />
          <label htmlFor="es">Starts</label><input id="es" name="start" type="datetime-local" required />
          <label htmlFor="ee">Ends (optional)</label><input id="ee" name="end" type="datetime-local" />
          <label htmlFor="ed">Description</label><textarea id="ed" name="description" rows={2} maxLength={5000} />
          <p><button className="btn btn-primary" type="submit">Create event</button></p></form>)}
      {rows.length === 0 && <p className="notice">No events yet.</p>}
      {rows.map(({ e, types }) => (
        <div className="card" key={e.id} style={{ marginTop: 12 }}>
          <div className="row between"><div><h3>{e.name}</h3><p className="muted small">{fmtLocal(e.startsAtMs, tz)} &middot; <span className="badge">{e.status}</span></p></div>
            {e.status === "published" && <Link className="btn" href={resourcePath("e", e.name, e.shortId)}>Public page</Link>}</div>
          {canManage && <p><ImageUpload businessId={businessId} target={{ kind: "event", id: e.id }} label={e.coverAssetId ? "Change cover photo" : "Add cover photo"} /></p>}
          {types.length > 0 && <div className="overflow"><table><tbody>{types.map(({ t, sold }) => (<tr key={t.id}><td>{t.name}</td><td>{t.priceMinor === 0n ? "Free" : fmtMoney(t.priceMinor, t.currency)}</td><td>{sold} / {t.capacity} sold</td></tr>))}</tbody></table></div>}
          {canManage && (e.status === "draft" || e.status === "published") && (<>
            <form action={A.addTicketTypeAction} className="row">{H(businessId)}<input type="hidden" name="eventId" value={e.id} />
              <input name="name" placeholder="Ticket name" required className="grow" /><input name="price" placeholder="Price (0 = free)" inputMode="decimal" required style={{ maxWidth: 140 }} /><input name="capacity" type="number" min={1} placeholder="How many" required style={{ maxWidth: 120 }} /><button className="btn" type="submit">Add ticket</button></form>
            <div className="row" style={{ marginTop: 12 }}>
              {e.status === "draft" && <form action={A.setEventStatusAction}>{H(businessId)}<input type="hidden" name="eventId" value={e.id} /><input type="hidden" name="status" value="published" /><button className="btn btn-primary" type="submit">Publish</button></form>}
              <form action={A.setEventStatusAction}>{H(businessId)}<input type="hidden" name="eventId" value={e.id} /><input type="hidden" name="status" value="cancelled" /><button className="btn btn-danger" type="submit">Cancel event</button></form></div>
            {e.status === "draft" && <p className="small muted">Paid tickets need online payments switched on (Payments tab). Cancelling does not refund anyone automatically: refund buyers yourself.</p>}</>)}
          {canCheckIn && e.status === "published" && (
            <form action={A.checkInAction} style={{ marginTop: 12 }}>{H(businessId)}<input type="hidden" name="eventId" value={e.id} />
              <h3>Check-in</h3><Scanner inputId={`code-${e.id}`} />
              <label htmlFor={`code-${e.id}`}>Ticket code</label><input id={`code-${e.id}`} name="token" autoComplete="off" required /><p><button className="btn btn-primary" type="submit">Check in</button></p></form>)}
        </div>))}
    </>
  );
}

async function Messages({ businessId, tz, bizName, selected, error }: { businessId: string; tz: string; bizName: string; selected: string | undefined; error: string | undefined }) {
  const d = deps();
  const user = await requireUser(`/app/${businessId}?tab=messages`);
  const rows = await d.store.listConversationsForBusiness(businessId, 50);
  const names = new Map<string, string>();
  for (const c of rows) names.set(c.customerUserId, (await d.store.getUserContact(c.customerUserId))?.name ?? "Customer");
  let thread: { messages: Awaited<ReturnType<typeof readConversation>>["messages"]; customer: string } | null = null;
  const sel = rows.find((c) => c.id === selected);
  if (sel) { try { thread = { messages: (await readConversation(d, { kind: "business", userId: user.id }, businessId, sel.id)).messages, customer: names.get(sel.customerUserId) ?? "Customer" }; } catch { thread = null; } }
  return (
    <>
      <h2>Messages</h2>
      {rows.length === 0 ? <p className="notice">No messages yet. Customers can message you from your public page. They can still use WhatsApp too.</p> : (
        <div className="grid">{rows.map((c) => (<Link key={c.id} className="card" href={`/app/${businessId}?tab=messages&c=${c.id}`}><h3>{names.get(c.customerUserId)}</h3><p className="muted small">{fmtLocal(c.lastMessageAtMs, tz)}</p>{c.businessUnread > 0 && <span className="badge ok">{c.businessUnread} new</span>}</Link>))}</div>)}
      {error && <p className="alert" role="alert">{friendly(error)}</p>}
      {sel && thread && (<><h2>{thread.customer}</h2><Thread messages={thread.messages} viewer="business" businessId={businessId} conversationId={sel.id} tz={tz} names={{ customer: thread.customer, business: bizName }} /></>)}
    </>
  );
}

async function Team({ businessId, isOwner, canManage, invited }: { businessId: string; isOwner: boolean; canManage: boolean; invited: string | undefined }) {
  const d = deps();
  const members = (await d.store.membershipsForBusiness(businessId)).filter((m) => m.status === "active");
  const people = await Promise.all(members.map(async (m) => ({ m, c: await d.store.getUserContact(m.userId) })));
  const { entitlements } = await resolveEntitlements(d, businessId, PLAN_ENTITLEMENTS);
  const seats = entitlements["staff_seats"];
  return (
    <>
      <h2>Your team</h2>
      <p className="muted small">{members.length}{typeof seats === "number" ? ` of ${seats}` : ""} seats used on your plan.</p>
      {invited && <p className="notice">Invitation sent to {invited}. It works once and expires in 7 days.</p>}
      <div className="overflow"><table><thead><tr><th>Person</th><th>Role</th><th /></tr></thead><tbody>{people.map(({ m, c }) => (
        <tr key={m.userId}><td>{c?.name ?? "Team member"}<div className="muted small">{c?.email}</div></td><td><span className="badge">{m.role}</span></td>
          <td>{canManage && m.role !== "owner" && (isOwner || m.role !== "admin") && <form action={A.removeMemberAction}>{H(businessId)}<input type="hidden" name="userId" value={m.userId} /><button className="btn btn-danger" type="submit">Remove</button></form>}</td></tr>))}</tbody></table></div>
      {canManage && (
        <form action={A.inviteMemberAction} className="card" style={{ maxWidth: 480, marginTop: 12 }}>{H(businessId)}
          <h3>Invite someone</h3>
          <label htmlFor="iemail">Their email</label><input id="iemail" name="email" type="email" required />
          <label htmlFor="irole">What can they do?</label>
          <select id="irole" name="role" defaultValue="staff"><option value="cashier">Cashier: take payments, see orders</option><option value="staff">Staff: orders, bookings, check-in, messages</option><option value="manager">Manager: also items, events, refunds</option>{isOwner && <option value="admin">Admin: everything except billing and payout</option>}</select>
          <p><button className="btn btn-primary" type="submit">Send invitation</button></p>
          <p className="small muted">They sign in with that email address and accept. You can remove access at any time.</p>
        </form>)}
    </>
  );
}
