import { applyProviderEvent } from "@fluo/core";
import { container } from "@/server/container.ts";
import { scheduleFlush } from "@/server/flush.ts";

export const runtime = "nodejs";

/** Paystack calls this. The signature is checked on the RAW body before anything else; fulfilment needs a server-to-server
 *  re-check and a matching amount (see applyProviderEvent). Returning 5xx on failure makes Paystack retry. */
export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();
  if (raw.length > 100_000) return new Response("too large", { status: 413 });
  const { deps, providers } = container();
  const paystack = providers.get("paystack");
  const event = paystack.parseWebhook(raw, Object.fromEntries(req.headers));
  if (!event) return new Response("invalid signature", { status: 401 });
  try {
    await applyProviderEvent(deps, event, async (ref) => { const v = await paystack.verify(ref); return { status: v.status, amountMinor: v.amount.amountMinor, currency: v.amount.currency }; });
    scheduleFlush();
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("paystack webhook failed", (e as Error).message);
    return new Response("retry", { status: 500 });
  }
}
