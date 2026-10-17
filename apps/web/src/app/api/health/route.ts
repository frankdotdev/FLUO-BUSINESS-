import { container } from "@/server/container.ts";

export const dynamic = "force-dynamic";

/** For load balancers and uptime monitors. Reveals nothing but up/down. */
export async function GET(): Promise<Response> {
  try {
    await Promise.race([container().pool.query("select 1"), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))]);
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
