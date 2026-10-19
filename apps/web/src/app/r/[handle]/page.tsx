import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { allowedMethods, describePolicy, fmtLocal, fmtMoney, freeSlots, localMidnight, needsRedirect, parseResourcePath, resourcePath } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { getSession } from "@/server/session.ts";
import { friendly } from "@/server/messages.ts";
import { holdBookingAction } from "@/app/actions.ts";
import { ShareModal } from "@/components/share-modal.tsx";

export const dynamic = "force-dynamic";
const UNIT: Record<string, string> = { per_night: "per night", per_hour: "per hour", per_day: "per day", per_bed_night: "per bed per night", flat: "" };

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const parsed = parseResourcePath(`/r/${handle}`);
  if (!parsed) return { title: "Booking not found" };
  const found = await deps().store.getPublicResourceGroupByShortId(parsed.shortId);
  if (!found) return { title: "Booking not found" };
  const { group: g, business: b } = found;
  const priceFormatted = fmtMoney(g.priceMinor, g.currency);
  const ogUrl = `/api/og?title=${encodeURIComponent(g.name)}&subtitle=${encodeURIComponent(`Book at ${b.name} • ${priceFormatted} ${UNIT[g.priceUnit]}`)}&price=${encodeURIComponent(priceFormatted)}&badge=Instant+Reservation&category=BOOKING`;
  return {
    title: `${g.name} — ${b.name} on Fluo`,
    description: `Book ${g.name} for ${priceFormatted} at ${b.name} on Fluo.`,
    openGraph: {
      title: `${g.name} | ${b.name}`,
      description: `Book ${g.name} at ${b.name} on Fluo.`,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: g.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: g.name,
      description: `Book ${g.name} at ${b.name} on Fluo`,
      images: [ogUrl],
    },
  };
}

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
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 16px 80px" }}>
      <p className="small" style={{ marginBottom: 12 }}><Link href={`/b/${b.slug}`} style={{ color: "var(--coral-dark)", fontWeight: 600 }}>← {b.name}</Link></p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, margin: "10px 0" }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontFamily: "Manrope, sans-serif", fontSize: "clamp(24px, 3.2vw, 36px)", fontWeight: 800 }}>{g.name}</h1>
          <p style={{ margin: 0, fontSize: 16 }}><strong>{fmtMoney(g.priceMinor, g.currency)}</strong> <span className="muted">{UNIT[g.priceUnit]}</span></p>
        </div>
        <ShareModal
          title={g.name}
          subtitle={`Book at ${b.name} • ${fmtMoney(g.priceMinor, g.currency)} ${UNIT[g.priceUnit]}`}
          price={fmtMoney(g.priceMinor, g.currency)}
          businessName={b.name}
          category="Booking"
          type="booking"
          path={back}
          badge="Escrow Protected"
          label="Share Booking"
        />
      </div>
      <p className="small muted" style={{ margin: "14px 0" }}>{describePolicy(b.refundPolicy)}</p>
      {msg && <p className="alert" role="alert">{msg}</p>}
      {methods.length === 0 && g.priceMinor > 0n ? <p className="notice">This business isn't taking bookings yet.</p> : nightly ? (
        <form action={holdBookingAction} className="card" style={{ maxWidth: 480, padding: "clamp(16px, 4vw, 24px)", borderRadius: 20 }}>
          <input type="hidden" name="businessId" value={b.id} /><input type="hidden" name="groupId" value={g.id} /><input type="hidden" name="back" value={back} />
          <label htmlFor="checkInDate">Check-in date</label><input id="checkInDate" name="checkInDate" type="date" required />
          <label htmlFor="checkInTime">Check-in time</label><input id="checkInTime" name="checkInTime" type="time" defaultValue="14:00" required />
          <label htmlFor="checkOutDate">Check-out date</label><input id="checkOutDate" name="checkOutDate" type="date" required />
          <label htmlFor="checkOutTime">Check-out time</label><input id="checkOutTime" name="checkOutTime" type="time" defaultValue="11:00" required />
          {guestFields}{payFields}<p style={{ marginTop: 16 }}><button className="btn btn-primary btn-block" type="submit" style={{ padding: "12px", fontSize: 14, fontWeight: 700 }}>Reserve Now ↗</button></p>
        </form>
      ) : (
        <>
          <form method="get" className="card" style={{ maxWidth: 480, padding: "clamp(16px, 4vw, 24px)", borderRadius: 20, marginBottom: 20 }}>
            <label htmlFor="day">Pick a day</label><input id="day" name="day" type="date" defaultValue={sp.day} required />
            <label htmlFor="mins">How long (minutes)</label><input id="mins" name="mins" type="number" min={minMins} step={step} defaultValue={mins} required />
            <p style={{ marginTop: 14 }}><button className="btn" type="submit" style={{ padding: "10px 18px", fontWeight: 600 }}>See available times</button></p>
          </form>
          {sp.day && (slots.length === 0 ? <p className="notice">Nothing is free that day. Try another day.</p> : (
            <form action={holdBookingAction} className="card" style={{ maxWidth: 480, padding: "clamp(16px, 4vw, 24px)", borderRadius: 20 }}>
              <input type="hidden" name="businessId" value={b.id} /><input type="hidden" name="groupId" value={g.id} /><input type="hidden" name="back" value={back} /><input type="hidden" name="date" value={sp.day} /><input type="hidden" name="durationMinutes" value={mins} />
              <fieldset style={{ border: 0, padding: 0 }}><legend className="small" style={{ marginBottom: 10 }}><strong>Available times on {sp.day}</strong></legend>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>{slots.map((s, i) => { const t = fmtLocal(s, g.timezone).split(", ").pop() ?? ""; return (<label key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 10, cursor: "pointer" }}><input type="radio" name="startTime" value={t} required={i === 0} style={{ width: "auto", minHeight: 0 }} /> {t}</label>); })}</div></fieldset>
              {guestFields}{payFields}<p style={{ marginTop: 16 }}><button className="btn btn-primary btn-block" type="submit" style={{ padding: "12px", fontSize: 14, fontWeight: 700 }}>Book Appointment ↗</button></p>
            </form>))}
        </>
      )}
    </div>
  );
}
