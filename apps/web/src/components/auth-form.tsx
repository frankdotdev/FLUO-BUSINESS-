"use client";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client.ts";

export function AuthForm({ mode, next, google }: { mode: "sign-in" | "sign-up"; next: string; google: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const signUp = mode === "sign-up";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null); setBusy(true);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? ""), password = String(f.get("password") ?? ""), name = String(f.get("name") ?? "");
    const res = signUp ? await authClient.signUp.email({ email, password, name, callbackURL: next }) : await authClient.signIn.email({ email, password, callbackURL: next });
    setBusy(false);
    if (res.error) { setError(res.error.message ?? "Something went wrong. Please try again."); return; }
    if (signUp) setSent(true); else window.location.assign(next);
  }

  if (sent) return (<div style={{ maxWidth: 420 }}><h1>Check your email</h1><p>We sent a confirmation link. Open it to finish creating your account.</p></div>);
  return (
    <div style={{ maxWidth: 420 }}>
      <h1>{signUp ? "Create your account" : "Welcome back"}</h1>
      <p className="muted">One account for buying, booking and running your business.</p>
      {error && <p className="alert" role="alert">{error}</p>}
      <form onSubmit={submit}>
        {signUp && (<><label htmlFor="name">Your name</label><input id="name" name="name" autoComplete="name" required minLength={2} /></>)}
        <label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={signUp ? "new-password" : "current-password"} required minLength={10} />
        {signUp && <p className="muted small">At least 10 characters.</p>}
        <p><button className="btn btn-primary btn-block" disabled={busy} type="submit">{busy ? "Please wait..." : signUp ? "Create account" : "Sign in"}</button></p>
      </form>
      {google && <p><button className="btn btn-block" type="button" onClick={() => authClient.signIn.social({ provider: "google", callbackURL: next })}>Continue with Google</button></p>}
      <p className="small">{signUp ? <>Already have an account? <Link href="/sign-in">Sign in</Link></> : <>New to Fluo? <Link href="/sign-up">Create an account</Link></>}</p>
    </div>
  );
}
