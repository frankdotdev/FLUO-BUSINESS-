import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { fmtLocal, verifyTicketToken } from "@fluo/core";
import { deps } from "@/server/container.ts";
import { env } from "@/server/env.ts";
import { rateLimited } from "@/server/rate.ts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your ticket", robots: { index: false, follow: false }, referrer: "no-referrer" as const };

/** The signed token IS the credential: a forged or altered token never reaches the database. */
export default async function TicketPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (await rateLimited("guest_lookup")) return <p className="alert">Too many attempts. Please wait a minute.</p>;
  const claim = verifyTicketToken(env().TICKET_HMAC_SECRET, token);
  if (!claim) notFound();
  const d = deps();
  const ticket = await d.store.findTicketById(claim.ticketId);
  if (!ticket || ticket.eventId !== claim.eventId) notFound();
  const [biz, event] = await Promise.all([d.store.getBusiness(ticket.businessId), d.store.getEvent(ticket.businessId, ticket.eventId)]);
  if (!biz || !event) notFound();
  const valid = ticket.status === "valid";
  const svg = valid ? await QRCode.toString(token, { type: "svg", margin: 1, width: 300, errorCorrectionLevel: "M" }) : null;
  return (
    <div style={{ maxWidth: 420 }}>
      <h1>{event.name}</h1>
      <p className="muted">{biz.name}{event.venue ? `, ${event.venue}` : ""}<br />{fmtLocal(event.startsAtMs, biz.timezone)}</p>
      <p><strong>{ticket.holderName}</strong></p>
      {valid && svg ? (<div className="card" role="img" aria-label="Ticket QR code" dangerouslySetInnerHTML={{ __html: svg }} />) : <p className="alert">{ticket.status === "used" ? "This ticket has already been used." : ticket.status === "held" ? "Waiting for payment to be confirmed." : "This ticket is no longer valid."}</p>}
      {valid && <p className="small muted">Show this code at the gate. Anyone with this page can use the ticket, so don't share it.</p>}
    </div>
  );
}
