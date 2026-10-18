"use client";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client.ts";
import { IconArrowRight } from "@/components/icons.tsx";

export function AuthForm({ mode, next, google }: { mode: "sign-in" | "sign-up"; next: string; google: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const signUp = mode === "sign-up";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "");
    const password = String(f.get("password") ?? "");
    const name = String(f.get("name") ?? "");

    try {
      const res = signUp
        ? await authClient.signUp.email({ email, password, name, callbackURL: next })
        : await authClient.signIn.email({ email, password, callbackURL: next });
      setBusy(false);
      if (res.error) {
        setError(res.error.message ?? "Something went wrong. Please check your credentials and try again.");
        return;
      }
      if (signUp) setSent(true);
      else window.location.assign(next);
    } catch (err: any) {
      setBusy(false);
      setError(err?.message ?? "An unexpected error occurred. Please try again.");
    }
  }

  if (sent) {
    return (
      <div style={{ maxWidth: 440, margin: "60px auto", padding: "0 16px" }}>
        <div style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: 24,
          padding: "36px 28px",
          textAlign: "center",
          boxShadow: "var(--shadow)",
        }}>
          <div style={{
            width: 54,
            height: 54,
            borderRadius: 16,
            background: "var(--coral-soft)",
            color: "var(--coral-dark)",
            display: "grid",
            placeItems: "center",
            fontSize: 24,
            margin: "0 auto 16px",
          }}>
            ✉
          </div>
          <span className="section-kicker">VERIFICATION LINK SENT</span>
          <h1 style={{ fontFamily: "Manrope, sans-serif", fontSize: 24, fontWeight: 800, margin: "6px 0 10px" }}>
            Check your email
          </h1>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 20px" }}>
            We sent a secure confirmation link to finish setting up your Fluo account. Tap the link in your inbox to proceed.
          </p>
          <Link href="/sign-in" className="secondary-button" style={{ width: "100%", justifyContent: "center" }}>
            Return to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 460, margin: "40px auto 80px", padding: "0 16px" }}>
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 24,
        padding: "clamp(24px, 5vw, 36px)",
        boxShadow: "var(--shadow)",
      }}>
        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Link href="/" className="brand" style={{ display: "inline-flex", marginBottom: 12 }}>
            <span className="brand-mark">f</span>
            <span>fluo</span>
            <i></i>
          </Link>
          <div>
            <span className="section-kicker">
              {signUp ? "ONE ACCOUNT. MORE POSSIBILITIES." : "WELCOME BACK TO FLUO"}
            </span>
            <h1 style={{
              fontFamily: "Manrope, sans-serif",
              fontSize: "clamp(22px, 3.5vw, 28px)",
              fontWeight: 800,
              letterSpacing: "-0.8px",
              margin: "6px 0 8px",
              color: "var(--ink)",
            }}>
              {signUp ? "Make everyday work better." : "Log in to your account"}
            </h1>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
              {signUp
                ? "Join your community on Fluo — or bring your business online."
                : "Pick up right where you left off across your orders and workspaces."}
            </p>
          </div>
        </div>

        {error && (
          <div style={{
            padding: "12px 14px",
            background: "var(--coral-soft)",
            border: "1px solid var(--coral)",
            borderRadius: 12,
            color: "var(--coral-dark)",
            marginBottom: 20,
            fontSize: 13,
            fontWeight: 600,
          }} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
          {signUp && (
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
              Full name
              <input
                id="name"
                name="name"
                autoComplete="name"
                required
                minLength={2}
                placeholder="e.g. Frank Oge"
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </label>
          )}

          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
            Email address
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid var(--line)",
                fontSize: 14,
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
            Password
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={signUp ? "new-password" : "current-password"}
              required
              minLength={10}
              placeholder={signUp ? "At least 10 characters" : "Enter your password"}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid var(--line)",
                fontSize: 14,
                outline: "none",
              }}
            />
          </label>

          {signUp && (
            <p style={{ fontSize: 11, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
              By creating an account, you agree to Fluo’s Terms of Service and Privacy Policy.
            </p>
          )}

          <button
            className="primary-button"
            disabled={busy}
            type="submit"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "13px 20px",
              fontSize: 14,
              marginTop: 4,
            }}
          >
            {busy ? "Please wait..." : signUp ? "Create account" : "Sign in"} <IconArrowRight size={14} />
          </button>
        </form>

        {google && (
          <div style={{ marginTop: 16 }}>
            <button
              className="secondary-button"
              type="button"
              style={{ width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 13 }}
              onClick={() => authClient.signIn.social({ provider: "google", callbackURL: next })}
            >
              Continue with Google
            </button>
          </div>
        )}

        <div style={{
          marginTop: 24,
          paddingTop: 18,
          borderTop: "1px solid var(--line)",
          textAlign: "center",
          fontSize: 13,
          color: "var(--muted)",
        }}>
          {signUp ? (
            <>
              Already have an account?{" "}
              <Link href={`/sign-in?next=${encodeURIComponent(next)}`} style={{ color: "var(--coral-dark)", fontWeight: 700, textDecoration: "none" }}>
                Log in ↗
              </Link>
            </>
          ) : (
            <>
              New to Fluo?{" "}
              <Link href={`/sign-up?next=${encodeURIComponent(next)}`} style={{ color: "var(--coral-dark)", fontWeight: 700, textDecoration: "none" }}>
                Create an account ↗
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
