import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { allowedMethods, describePolicy, fmtLocal, fmtMoney, freeSlots, localMidnight, needsRedirect, parseResourcePath, resourcePath } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { getSession } from "@/server/session.ts";
import { friendly } from "@/server/messages.ts";
import { holdBookingAction } from "@/app/actions.ts";

export const dynamic = "force-dynamic";
const UNIT: Record<string, string> = { per_night: "per night", per_hour: "per hour", per_day: "per day", per_bed_night: "per bed per night", flat: "" };

export default async function BookPage({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ error?: string; day?: string; mins?: string }> }) {
  const { handle } = await params, sp = await searchParams;
  const parsed = parseResourcePath(`/r/${handle}`);
  if (!parsed) notFound();
  const d = deps();
  const found = await d.store.getPublicResourceGroupByShortId(parsed.shortId);
  if (!found) notFound();
  const { group: g, business: b } = found;
  if (needsRedirect(parsed.slug, g.name)) redirect(resourcePath("r", g.name, g.shortId ?? parsed.shortId));
  const session = await getSession();
  const nightly = g.policy.kind === "nights" || g.policy.kind === "bed";
  const methods = allowedMethods("booking", g.priceMinor === 0n ? 1n : g.priceMinor, { provider: b.acceptsAutomatic, transfer: b.allowsTransfer });
  const minMins = Math.round(g.policy.minDurationMs / 60_000), step = Math.round(g.policy.granularityMs / 60_000);
  const mins = Math.max(minMins, Number(sp.mins) || minMins);
  let slots: number[] = [];
  if (!nightly && sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day)) slots = await freeSlots(d, { businessId: b.id, groupId: g.id, dayStartMs: localMidnight(sp.day, g.timezone), durationMs: mins * 60_000 });
  const back = `/r/${handle}`;
  const msg = friendly(sp.error);
  const guestFields = !session && (<><label htmlFor="name">Your name</label><input id="name" name="name" autoComplete="name" required minLength={2} /><label htmlFor="email">Email (confirmation and reminders)</label><input id="email" name="email" type="email" autoComplete="email" required /></>);
  const payFields = (
    <fieldset style={{ border: 0, padding: 0, margin: "12px 0 0" }}><legend className="small"><strong>How would you like to pay?</strong></legend>
      {methods.includes("provider") && <label style={{ fontWeight: 400 }}><input type="radio" name="method" value="provider" defaultChecked style={{ width: "auto", minHeight: 0 }} /> Pay now with card or bank (instant)</label>}
      {methods.includes("bank_transfer") && <label style={{ fontWeight: 400 }}><input type="radio" name="method" value="bank_transfer" defaultChecked={!methods.includes("provider")} style={{ width: "auto", minHeight: 0 }} /> Transfer to the business's account (held {nightly ? "2 hours" : "2 hours"} while you pay)</label>}
    </fieldset>);
  return (
    <>
      <p className="small"><Link href={`/b/${b.slug}`}>{b.name}</Link></p>
      <h1>{g.name}</h1>
      <p><strong>{fmtMoney(g.priceMinor, g.currency)}</strong> <span className="muted">{UNIT[g.priceUnit]}</span></p>
      <p className="small">{describePolicy(b.refundPolicy)}</p>
      {msg && <p className="alert" role="alert">{msg}</p>}
      {methods.length === 0 && g.priceMinor > 0n ? <p className="notice">This business isn't taking bookings yet.</p> : nightly ? (
        <form action={holdBookingAction} className="card" style={{ maxWidth: 440 }}>
          <input type="hidden" name="businessId" value={b.id} /><input type="hidden" name="groupId" value={g.id} /><input type="hidden" name="back" value={back} />
          <label htmlFor="checkInDate">Check-in date</label><input id="checkInDate" name="checkInDate" type="date" required />
          <label htmlFor="checkInTime">Check-in time</label><input id="checkInTime" name="checkInTime" type="time" defaultValue="14:00" required />
          <label htmlFor="checkOutDate">Check-out date</label><input id="checkOutDate" name="checkOutDate" type="date" required />
          <label htmlFor="checkOutTime">Check-out time</label><input id="checkOutTime" name="checkOutTime" type="time" defaultValue="11:00" required />
          {guestFields}{payFields}<p><button className="btn btn-primary btn-block" type="submit">Reserve</button></p>
        </form>
      ) : (
        <>
          <form method="get" className="card" style={{ maxWidth: 440 }}>
            <label htmlFor="day">Pick a day</label><input id="day" name="day" type="date" defaultValue={sp.day} required />
            <label htmlFor="mins">How long (minutes)</label><input id="mins" name="mins" type="number" min={minMins} step={step} defaultValue={mins} required />
            <p><button className="btn" type="submit">See available times</button></p>
          </form>
          {sp.day && (slots.length === 0 ? <p className="notice">Nothing is free that day. Try another day.</p> : (
            <form action={holdBookingAction} className="card" style={{ maxWidth: 440 }}>
              <input type="hidden" name="businessId" value={b.id} /><input type="hidden" name="groupId" value={g.id} /><input type="hidden" name="back" value={back} /><input type="hidden" name="date" value={sp.day} /><input type="hidden" name="durationMinutes" value={mins} />
              <fieldset style={{ border: 0, padding: 0 }}><legend className="small"><strong>Available times on {sp.day}</strong></legend>
                <div className="row">{slots.map((s, i) => { const t = fmtLocal(s, g.timezone).split(", ").pop() ?? ""; return (<label key={s} style={{ fontWeight: 400 }}><input type="radio" name="startTime" value={t} required={i === 0} style={{ width: "auto", minHeight: 0 }} /> {t}</label>); })}</div></fieldset>
              {guestFields}{payFields}<p><button className="btn btn-primary btn-block" type="submit">Book</button></p>
            </form>))}
        </>
      )}
    </>
  );
}
