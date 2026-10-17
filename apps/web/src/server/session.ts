import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth.ts";

export async function getSession() { return getAuth().api.getSession({ headers: await headers() }); }

/** Server-side gate for pages and actions. Authentication only; what the user may do in a business is decided by the services. */
export async function requireUser(next = "/app") {
  const s = await getSession();
  if (!s) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return s.user;
}
