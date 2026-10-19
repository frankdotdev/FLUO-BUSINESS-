import Link from "next/link";
import { BUSINESS_TYPES, isTypeReady } from "@fluo/core";
import { requireUser } from "@/server/session.ts";
import { friendly } from "@/server/messages.ts";
import { createBusinessAction } from "@/app/actions.ts";
import { IconCheck, IconShield, IconSparkles, IconArrowRight } from "@/components/icons.tsx";

export const metadata = { title: "Start Your Business — Fluo" };

export default async function NewBusiness({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser("/app/new");
  const msg = friendly((await searchParams).error);
  const types = BUSINESS_TYPES.filter((t) => t.tier !== "later" && isTypeReady(t)).sort((a, b) =>
    a.label.localeCompare(b.label),
  );

  return (
    <div style={{ maxWidth: 620, margin: "32px auto 80px", padding: "0 16px" }}>
      {/* 30-Day Free Trial Highlight */}
      <div style={{
        background: "var(--coral-soft)",
        border: "1.5px solid #fcdcd7",
        borderRadius: 24,
        padding: "24px 28px",
        marginBottom: 28,
        boxShadow: "0 4px 20px rgba(240, 120, 102, 0.08)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <span style={{
            background: "var(--coral)",
            color: "#ffffff",
            padding: "4px 10px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.5,
          }}>
            30-DAY FREE TRIAL
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--coral-dark)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <IconSparkles size={14} /> 100% Free Upfront
          </span>
        </div>
        <h2 style={{
          fontFamily: "Manrope, sans-serif",
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: "-0.5px",
          margin: "0 0 6px",
          color: "var(--ink)",
        }}>
          Launch with zero risk &amp; start taking orders
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.55 }}>
          Test all tools free for your first 30 days. No debit card required to begin. Accept online orders, run your counter POS, manage appointments, and receive instant payouts.
        </p>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "var(--ink)", fontWeight: 500 }}>
            <span style={{ color: "var(--coral-dark)", display: "grid", placeItems: "center" }}><IconCheck size={16} /></span>
            <span>Full adaptive workspace for your specific business trade</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "var(--ink)", fontWeight: 500 }}>
            <span style={{ color: "var(--coral-dark)", display: "grid", placeItems: "center" }}><IconCheck size={16} /></span>
            <span>Storefront QR code, physical POS counter &amp; ticket management</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "var(--ink)", fontWeight: 500 }}>
            <span style={{ color: "var(--coral-dark)", display: "grid", placeItems: "center" }}><IconCheck size={16} /></span>
            <span>Direct settlements to any Nigerian bank account via Paystack &amp; Fluo Escrow</span>
          </div>
        </div>
      </div>

      {/* Workspace Creation Form Card */}
      <div style={{
        background: "#ffffff",
        border: "1px solid var(--line)",
        borderRadius: 24,
        padding: "clamp(24px, 5vw, 36px)",
        boxShadow: "var(--shadow)",
      }}>
        {/* Step Track */}
        <div className="step-track" style={{ marginBottom: 20 }}>
          <i className="done"></i>
          <i className="done"></i>
          <i></i>
        </div>

        <span className="section-kicker">YOUR BUSINESS PROFILE</span>
        <h1 style={{
          fontFamily: "Manrope, sans-serif",
          fontSize: "clamp(22px, 3.5vw, 28px)",
          fontWeight: 800,
          letterSpacing: "-0.8px",
          margin: "4px 0 8px",
          color: "var(--ink)",
        }}>
          Let’s make it official.
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 24px" }}>
          Start with the essentials. You can configure catalogue items, team access, and bank details from your workspace.
        </p>

        {msg && (
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
            {msg}
          </div>
        )}

        <form action={createBusinessAction} style={{ display: "grid", gap: 18 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
            Business Name
            <input
              id="name"
              name="name"
              required
              minLength={2}
              maxLength={80}
              placeholder="e.g. Mama Chichi Bites, Corner Market, The Studio"
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
            What kind of business do you run?
            <select
              id="typeId"
              name="typeId"
              required
              defaultValue=""
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid var(--line)",
                fontSize: 14,
                background: "#ffffff",
                outline: "none",
              }}
            >
              <option value="" disabled>
                Choose your business vertical
              </option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400, marginTop: 2 }}>
              Fluo customizes your workspace layout and tools to fit your operations automatically.
            </span>
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
            Customer Refund Policy
            <select
              id="refundKind"
              name="refundKind"
              defaultValue="none"
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid var(--line)",
                fontSize: 14,
                background: "#ffffff",
                outline: "none",
              }}
            >
              <option value="none">No refunds (all sales final)</option>
              <option value="full_until">Full refund if cancelled before cutoff window</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
            Cancellation Notice Cutoff (Hours before appointment / order)
            <input
              id="refundHours"
              name="refundHours"
              type="number"
              min={0}
              max={720}
              defaultValue={24}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid var(--line)",
                fontSize: 14,
                outline: "none",
              }}
            />
          </label>

          <button
            className="primary-button"
            type="submit"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "14px 20px",
              fontSize: 15,
              marginTop: 10,
            }}
          >
            Create my workspace &amp; start free trial <span>↗</span>
          </button>
        </form>
      </div>
    </div>
  );
}
