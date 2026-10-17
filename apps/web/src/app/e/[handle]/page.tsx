import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { describePolicy, fmtLocal, fmtMoney, needsRedirect, parseResourcePath, resourcePath } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { friendly } from "@/server/messages.ts";
import { photo } from "@/server/media.ts";
import { purchaseTicketsAction } from "@/app/actions.ts";

export const dynamic = "force-dynamic";

export default async function EventPage({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ error?: string; paid?: string }> }) {
  const { handle } = await params, sp = await searchParams;
  const parsed = parseResourcePath(`/e/${handle}`);
  if (!parsed) notFound();
  const d = deps();
  const found = await d.store.getPublicEventByShortId(parsed.shortId);
  if (!found) notFound();
  const { event: ev, business: b, ticketTypes } = found;
  if (needsRedirect(parsed.slug, ev.name)) redirect(resourcePath("e", ev.name, ev.shortId));
  const now = Date.now();
  const rows = await Promise.all(ticketTypes.map(async (t) => ({ t, left: t.capacity - (await d.store.countLiveTickets(b.id, t.id, now)) })));
  const msg = friendly(sp.error);
  const back = `/e/${handle}`;
  const open = rows.filter(({ t, left }) => left > 0 && (t.salesStartMs === null || now >= t.salesStartMs) && (t.salesEndMs === null || now < t.salesEndMs));
  return (
    <>
      <p className="small"><Link href={`/b/${b.slug}`}>{b.name}</Link></p>
      {photo(b.id, ev.coverAssetId, "detail") && <img className="photo" src={photo(b.id, ev.coverAssetId, "detail")!} alt="" width={1600} height={1200} style={{ maxWidth: 640 }} />}
      <h1>{ev.name}</h1>
      <p className="muted">{fmtLocal(ev.startsAtMs, b.timezone)}{ev.venue ? `, ${ev.venue}` : ""}</p>
      {ev.description && <p>{ev.description}</p>}
      {sp.paid && <p className="notice">Thank you. Once your payment is confirmed, your tickets arrive by email within a minute.</p>}
      {msg && <p className="alert" role="alert">{msg}</p>}
      <h2>Tickets</h2>
      {open.length === 0 ? <p className="notice">Tickets aren't on sale right now.</p> : (
        <form action={purchaseTicketsAction} className="card" style={{ maxWidth: 480 }}>
          <input type="hidden" name="businessId" value={b.id} /><input type="hidden" name="back" value={back} />
          <fieldset style={{ border: 0, padding: 0 }}><legend className="small"><strong>Choose a ticket</strong></legend>
            {open.map(({ t, left }, i) => (<label key={t.id} style={{ fontWeight: 400 }}><input type="radio" name="ticketTypeId" value={t.id} defaultChecked={i === 0} required style={{ width: "auto", minHeight: 0 }} /> {t.name}: <strong>{t.priceMinor === 0n ? "Free" : fmtMoney(t.priceMinor, t.currency)}</strong> <span className="muted small">({left} left)</span></label>))}
          </fieldset>
          <p className="small muted">One ticket per person. Add the name and email for each ticket (up to 4); we email each ticket.</p>
          {[1, 2, 3, 4].map((n) => (<div key={n}><label htmlFor={`hn${n}`}>Ticket {n}{n === 1 ? "" : " (optional)"}: name</label><input id={`hn${n}`} name={`holderName${n}`} required={n === 1} maxLength={80} autoComplete={n === 1 ? "name" : "off"} />
            <label htmlFor={`he${n}`}>Email</label><input id={`he${n}`} name={`holderEmail${n}`} type="email" required={n === 1} autoComplete={n === 1 ? "email" : "off"} /></div>))}
          <p><button className="btn btn-primary btn-block" type="submit">Get tickets</button></p>
        </form>
      )}
      <p className="small">{describePolicy(b.refundPolicy)}</p>
    </>
  );
}
