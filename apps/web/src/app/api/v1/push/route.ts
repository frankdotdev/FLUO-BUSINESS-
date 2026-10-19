import { getAuth } from "@/server/auth.ts";
import { deps } from "@/server/container.ts";

/** The mobile app registers its Expo push token for the signed-in user. */
export async function POST(req: Request): Promise<Response> {
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { token?: unknown; platform?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const platform = body?.platform === "ios" || body?.platform === "android" || body?.platform === "web" ? body.platform : null;
  const isExpo = /^Expo(nent)?PushToken\[[^\]]+\]$/.test(token);
  const isWebPush = platform === "web" && token.length > 10;
  if ((!isExpo && !isWebPush) || !platform) return Response.json({ error: "invalid_token" }, { status: 400 });
  await deps().store.savePushToken({ userId: session.user.id, token, platform });
  return Response.json({ ok: true });
}
