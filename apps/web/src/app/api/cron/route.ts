import { timingSafeEqual } from "node:crypto";
import { drainOutbox, runMaintenance } from "@fluo/core";
import { container } from "@/server/container.ts";
import { env } from "@/server/env.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleCron(req: Request): Promise<Response> {
  const authHeader = req.headers.get("authorization") ?? "";
  const given = Buffer.from(authHeader.replace(/^Bearer /, ""));
  const cronSecret = env().CRON_SECRET || "";
  const want = Buffer.from(cronSecret);

  // Authenticate via Bearer CRON_SECRET or Vercel Cron header
  const isVercelCron = Boolean(req.headers.get("x-vercel-cron"));
  const isAuthorized = (want.length > 0 && given.length === want.length && timingSafeEqual(given, want)) || isVercelCron;

  if (!isAuthorized) {
    return new Response("unauthorized", { status: 401 });
  }

  const { deps, email, push } = container();
  const maintenance = await runMaintenance(deps);
  const outbox = await drainOutbox(deps, { email, push }, 100);
  return Response.json({ ok: true, maintenance, outbox });
}

export async function GET(req: Request): Promise<Response> {
  return handleCron(req);
}

export async function POST(req: Request): Promise<Response> {
  return handleCron(req);
}
