import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { describePolicy, fmtLocal, fmtMoney, needsRedirect, parseResourcePath, resourcePath } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { friendly } from "@/server/messages.ts";
import { photo } from "@/server/media.ts";
import { purchaseTicketsAction } from "@/app/actions.ts";
import { ShareModal } from "@/components/share-modal.tsx";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const parsed = parseResourcePath(`/e/${handle}`);
  if (!parsed) return { title: "Event not found" };
  const found = await deps().store.getPublicEventByShortId(parsed.shortId);
  if (!found) return { title: "Event not found" };
  const { event: ev, business: b } = found;
  const coverUrl = ev.coverAssetId ? photo(b.id, ev.coverAssetId, "card") : null;
  const ogUrl = `/api/og?title=${encodeURIComponent(ev.name)}&subtitle=${encodeURIComponent(`Hosted by ${b.name}${ev.venue ? ` • ${ev.venue}` : ""}`)}&badge=Tickets+Available&category=EVENT${coverUrl ? `&image=${encodeURIComponent(coverUrl)}` : ""}`;
  return {
    title: `${ev.name} — ${b.name} on Fluo`,
    description: ev.description || `Get tickets for ${ev.name} on Fluo.`,
    openGraph: {
      title: `${ev.name} | ${b.name}`,
      description: ev.description || `Get tickets for ${ev.name} on Fluo.`,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: ev.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: ev.name,
      description: `Get tickets for ${ev.name} on Fluo`,
      images: [ogUrl],
    },
  };
}

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
  const coverUrl = photo(b.id, ev.coverAssetId, "detail");

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 16px 80px" }}>
      <p className="small" style={{ marginBottom: 12 }}>
        <Link href={`/b/${b.slug}`} style={{ color: "var(--coral-dark)", fontWeight: 600 }}>← {b.name}</Link>
      </p>
      {coverUrl && (
        <img
          className="photo"
          src={coverUrl}
          alt={ev.name}
          width={1600}
          height={1200}
          style={{ width: "100%", maxHeight: 380, objectFit: "cover", borderRadius: 20, marginBottom: 20 }}
        />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, margin: "10px 0" }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontFamily: "Manrope, sans-serif", fontSize: "clamp(24px, 3.2vw, 36px)", fontWeight: 800 }}>{ev.name}</h1>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>{fmtLocal(ev.startsAtMs, b.timezone)}{ev.venue ? `, ${ev.venue}` : ""}</p>
        </div>
        <ShareModal
          title={ev.name}
          subtitle={`Event by ${b.name}${ev.venue ? ` • ${ev.venue}` : ""}`}
          businessName={b.name}
          category="Event"
          type="event"
          path={back}
          imageUrl={photo(b.id, ev.coverAssetId, "card") || undefined}
          badge="Live Event"
          label="Share Event"
        />
      </div>
      {ev.description && <p style={{ fontSize: 15, lineHeight: 1.6, color: "#374151", margin: "16px 0 24px" }}>{ev.description}</p>}
      {sp.paid && <p className="notice">Thank you. Once your payment is confirmed, your tickets arrive by email within a minute.</p>}
      {msg && <p className="alert" role="alert">{msg}</p>}

      <h2 style={{ fontFamily: "Manrope, sans-serif", fontSize: 20, fontWeight: 800, margin: "24px 0 12px" }}>Tickets</h2>
      {open.length === 0 ? <p className="notice">Tickets aren't on sale right now.</p> : (
        <form action={purchaseTicketsAction} className="card" style={{ maxWidth: 520, padding: "clamp(16px, 4vw, 24px)", borderRadius: 20 }}>
          <input type="hidden" name="businessId" value={b.id} /><input type="hidden" name="back" value={back} />
          <fieldset style={{ border: 0, padding: 0 }}><legend className="small" style={{ marginBottom: 10 }}><strong>Choose a ticket</strong></legend>
            {open.map(({ t, left }, i) => (<label key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", border: "1px solid var(--line)", borderRadius: 12, marginBottom: 8, cursor: "pointer" }}><input type="radio" name="ticketTypeId" value={t.id} defaultChecked={i === 0} required style={{ width: "auto", minHeight: 0 }} /> <span style={{ flex: 1 }}>{t.name}: <strong>{t.priceMinor === 0n ? "Free" : fmtMoney(t.priceMinor, t.currency)}</strong></span> <span className="muted small">({left} left)</span></label>))}
          </fieldset>
          <p className="small muted" style={{ margin: "12px 0" }}>One ticket per person. Add the name and email for each ticket (up to 4); we email each ticket.</p>
          {[1, 2, 3, 4].map((n) => (
            <div key={n} style={{ display: "grid", gap: 6, marginBottom: 10 }}>
              <label htmlFor={`hn${n}`} style={{ fontSize: 12, fontWeight: 600 }}>Ticket {n}{n === 1 ? "" : " (optional)"}: Name</label>
              <input id={`hn${n}`} name={`holderName${n}`} required={n === 1} maxLength={80} autoComplete={n === 1 ? "name" : "off"} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)" }} />
              <label htmlFor={`he${n}`} style={{ fontSize: 12, fontWeight: 600 }}>Email</label>
              <input id={`he${n}`} name={`holderEmail${n}`} type="email" required={n === 1} autoComplete={n === 1 ? "email" : "off"} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--line)" }} />
            </div>
          ))}
          <p style={{ margin: "16px 0 0" }}><button className="btn btn-primary btn-block" type="submit" style={{ padding: "12px", fontSize: 14, fontWeight: 700 }}>Get tickets ↗</button></p>
        </form>
      )}
      <p className="small muted" style={{ marginTop: 24 }}>{describePolicy(b.refundPolicy)}</p>
    </div>
  );
}
