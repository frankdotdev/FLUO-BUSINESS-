"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client.ts";
import { IconArrowRight } from "@/components/icons.tsx";

export function AuthForm({ mode, next, google }: { mode: "sign-in" | "sign-up"; next: string; google: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const signUp = mode === "sign-up";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");
    const name = String(f.get("name") ?? "").trim();

    try {
      const res = signUp
        ? await authClient.signUp.email({ email, password, name, callbackURL: next })
        : await authClient.signIn.email({ email, password, callbackURL: next });
      setBusy(false);
      if (res.error) {
        setError(res.error.message ?? "Authentication failed. Please check your details and try again.");
        return;
      }
      // Successfully authenticated
      window.location.assign(next);
    } catch (err: any) {
      setBusy(false);
      setError(err?.message ?? "An unexpected network error occurred. Please check your connection.");
    }
  }

  return (
    <div style={{ maxWidth: 460, margin: "40px auto 80px", padding: "0 16px" }}>
      <div
        style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: 24,
          padding: "clamp(24px, 5vw, 36px)",
          boxShadow: "var(--shadow)",
        }}
      >
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
            <h1
              style={{
                fontFamily: "Manrope, sans-serif",
                fontSize: "clamp(22px, 3.5vw, 28px)",
                fontWeight: 800,
                letterSpacing: "-0.8px",
                margin: "6px 0 8px",
                color: "var(--ink)",
              }}
            >
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
          <div
            style={{
              padding: "12px 14px",
              background: "var(--coral-soft)",
              border: "1px solid var(--coral)",
              borderRadius: 12,
              color: "var(--coral-dark)",
              marginBottom: 20,
              fontSize: 13,
              fontWeight: 600,
            }}
            role="alert"
          >
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
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={signUp ? "new-password" : "current-password"}
                required
                minLength={8}
                placeholder={signUp ? "At least 8 characters" : "Enter your password"}
                style={{
                  width: "100%",
                  padding: "12px 42px 12px 14px",
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                  fontSize: 14,
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: 12,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: 4,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          {signUp && (
            <p style={{ fontSize: 11, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
              At least 8 characters. By continuing, you agree to Fluo’s Terms of Service and Privacy Policy.
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

        {/* Google OAuth Option */}
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "14px 0" }}>
            <span style={{ flex: 1, height: 1, background: "var(--line)" }}></span>
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>OR</span>
            <span style={{ flex: 1, height: 1, background: "var(--line)" }}></span>
          </div>

          <button
            className="secondary-button"
            type="button"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "12px 20px",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#ffffff",
            }}
            onClick={() => {
              const callback = typeof window !== "undefined"
                ? `${window.location.origin}${next.startsWith("/") ? next : `/${next}`}`
                : next;
              authClient.signIn.social({ provider: "google", callbackURL: callback });
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>
        </div>

        <div
          style={{
            marginTop: 24,
            paddingTop: 18,
            borderTop: "1px solid var(--line)",
            textAlign: "center",
            fontSize: 13,
            color: "var(--muted)",
          }}
        >
          {signUp ? (
            <>
              Already have an account?{" "}
              <Link
                href={`/sign-in?next=${encodeURIComponent(next)}`}
                style={{ color: "var(--coral-dark)", fontWeight: 700, textDecoration: "none" }}
              >
                Log in ↗
              </Link>
            </>
          ) : (
            <>
              New to Fluo?{" "}
              <Link
                href={`/sign-up?next=${encodeURIComponent(next)}`}
                style={{ color: "var(--coral-dark)", fontWeight: 700, textDecoration: "none" }}
              >
                Create an account ↗
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
