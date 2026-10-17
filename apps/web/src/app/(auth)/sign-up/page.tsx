import { redirect } from "next/navigation";
import { getSession } from "@/server/session.ts";
import { env } from "@/server/env.ts";
import { AuthForm } from "@/components/auth-form.tsx";

export const metadata = { title: "Create your account" };
export default async function SignUp({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const n = (await searchParams).next;
  const next = n && n.startsWith("/") && !n.startsWith("//") ? n : "/app";
  if (await getSession()) redirect(next);
  return <AuthForm mode="sign-up" next={next} google={env().google !== null} />;
}
