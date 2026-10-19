"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client.ts";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    try {
      await authClient.signOut();
      router.push("/");
      router.refresh();
    } catch (e) {
      console.error("Sign out failed:", e);
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={busy}
      className="btn"
      style={{
        padding: "8px 14px",
        fontSize: 12,
        fontWeight: 600,
        color: "var(--muted)",
        border: "1px solid var(--border)",
        background: "transparent",
        borderRadius: 10,
        cursor: busy ? "not-allowed" : "pointer",
      }}
    >
      {busy ? "Signing out..." : "Sign out"}
    </button>
  );
}
