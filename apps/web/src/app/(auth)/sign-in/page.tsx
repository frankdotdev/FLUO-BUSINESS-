import { redirect } from "next/navigation";
import { getSession } from "@/server/session.ts";
import { env } from "@/server/env.ts";
import { AuthForm } from "@/components/auth-form.tsx";

export const metadata = { title: "Sign in" };
export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getSession()) redirect(next);
  return <AuthForm mode="sign-in" next={next} google={env().google !== null} />;
}
export const safeNext = (n: string | undefined): string => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/app");   // never redirect off-site
