import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth.ts";

export async function getSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch (err) {
    console.warn("Session check failed (database connecting or tables pending migration):", err);
    return null;
  }
}

/** Server-side gate for pages and actions. Authentication only; what the user may do in a business is decided by the services. */
export async function requireUser(next = "/app") {
  const s = await getSession();
  if (!s) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return s.user;
}

/** Server-side gate for the Platform Founder / Super Admin Dashboard. */
export async function requirePlatformAdmin(next = "/admin") {
  const user = await requireUser(next);
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length > 0) {
    if (!adminEmails.includes(user.email.toLowerCase())) {
      redirect("/?error=admin_unauthorized");
    }
  }
  return user;
}
