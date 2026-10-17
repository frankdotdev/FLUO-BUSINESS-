import { timingSafeEqual } from "node:crypto";
import { drainOutbox, runMaintenance } from "@fluo/core";
import { container } from "@/server/container.ts";
import { env } from "@/server/env.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Called every ~5 minutes by an external scheduler (cron-job.org, Cloudflare Cron Trigger, VPS cron...):
 *    curl -X POST -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron
 *  Releases expired holds, cancels stale transfer orders, and sends due emails and push notifications. Safe to call repeatedly. */
export async function POST(req: Request): Promise<Response> {
  const given = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer /, ""));
  const want = Buffer.from(env().CRON_SECRET);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return new Response("unauthorized", { status: 401 });
  const { deps, email, push } = container();
  const maintenance = await runMaintenance(deps);
  const outbox = await drainOutbox(deps, { email, push }, 100);
  return Response.json({ maintenance, outbox });
}
