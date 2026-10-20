import { after } from "next/server";
import { headers, cookies } from "next/headers";
import { createHash, randomUUID } from "node:crypto";
import { container } from "./container.ts";

function detectDevice(ua: string): "mobile" | "tablet" | "desktop" {
  const lower = ua.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(lower)) return "tablet";
  if (/mobile|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(lower)) return "mobile";
  return "desktop";
}

/** Non-blocking platform pageview & visit tracker. */
export async function trackVisit(path: string, businessId?: string | null, userId?: string | null) {
  try {
    const h = await headers();
    const c = await cookies();

    const country = h.get("x-vercel-ip-country") || "NG";
    const region = h.get("x-vercel-ip-country-region") || "";
    const city = h.get("x-vercel-ip-city") || "";
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "127.0.0.1";
    const ua = h.get("user-agent") || "";
    const referer = h.get("referer") || "";
    const campus = c.get("fluo_user_location")?.value || "";
    const deviceType = detectDevice(ua);

    // Pseudonymized daily visitor hash (prevents storing raw IP while allowing unique daily visitor count)
    const today = new Date().toISOString().slice(0, 10);
    const visitorId = createHash("sha256").update(`${ip}:${ua}:${today}`).digest("hex").slice(0, 16);

    const logDb = async () => {
      try {
        const pool = container().pool;
        if (!pool) return;
        await pool.query(
          `INSERT INTO platform_pageviews (id, path, business_id, visitor_id, user_id, country, region, city, campus, referer, device_type, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())`,
          [randomUUID(), path, businessId || null, visitorId, userId || null, country, region, city, campus || null, referer.slice(0, 300), deviceType]
        );
      } catch (err) {
        // Non-blocking: table might still be migrating or pool busy
      }
    };

    try {
      after(logDb);
    } catch {
      logDb().catch(() => {});
    }
  } catch {
    // Silently continue
  }
}
