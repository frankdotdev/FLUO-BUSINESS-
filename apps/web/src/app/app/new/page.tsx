import { BUSINESS_TYPES, isTypeReady } from "@fluo/core";
import { requireUser } from "@/server/session.ts";
import { friendly } from "@/server/messages.ts";
import { createBusinessAction } from "@/app/actions.ts";
import { IconCheckCircle, IconSparkles, IconShield } from "@/components/icons.tsx";

export const metadata = { title: "Open a business" };

export default async function NewBusiness({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireUser("/app/new");
  const msg = friendly((await searchParams).error);
  const types = BUSINESS_TYPES.filter((t) => t.tier !== "later" && isTypeReady(t)).sort((a, b) =>
    a.label.localeCompare(b.label),
  );

  return (
    <div style={{ maxWidth: 580, margin: "16px auto" }}>
      {/* 30-Day Free Trial Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #FFF5F4 0%, #FEE8E5 100%)",
          border: "1.5px solid #FCD4CF",
          borderRadius: "var(--radius-xl)",
          padding: "18px 20px",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span className="badge coral" style={{ fontWeight: 800, fontSize: 11 }}>
            30-DAY FREE TRIAL
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--coral)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <IconSparkles size={14} /> 100% Free Upfront
          </span>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px", color: "var(--ink)" }}>
          Launch with zero risk
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.45 }}>
          Test all tools free for your first month. No debit card required to begin. Sell on campus, take online orders, run your counter POS, and accept bank transfers.
        </p>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink)" }}>
            <IconCheckCircle size={15} style={{ color: "var(--coral)", flexShrink: 0 }} />
            <span>Full merchant dashboard &amp; mobile management</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink)" }}>
            <IconCheckCircle size={15} style={{ color: "var(--coral)", flexShrink: 0 }} />
            <span>Storefront QR code, physical POS counter &amp; kitchen ticket printing</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink)" }}>
            <IconCheckCircle size={15} style={{ color: "var(--coral)", flexShrink: 0 }} />
            <span>Direct payouts to your bank account with complete audit logs</span>
          </div>
        </div>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Set up your workspace</h1>
      <p className="muted" style={{ fontSize: 14, margin: "0 0 20px" }}>
        Pick your business model. Fluo tailors the dashboard to your operations automatically.
      </p>

      {msg && (
        <p className="alert" role="alert" style={{ marginBottom: 16 }}>
          {msg}
        </p>
      )}

      <form action={createBusinessAction} style={{ display: "grid", gap: 16 }}>
        <div>
          <label htmlFor="name" style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
            Business Name
          </label>
          <input
            id="name"
            name="name"
            required
            minLength={2}
            maxLength={80}
            placeholder="e.g. Mama Chichi Bites, Campus Express, Elite Barber"
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <label htmlFor="typeId" style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
            What kind of business is this?
          </label>
          <select id="typeId" name="typeId" required defaultValue="" style={{ width: "100%" }}>
            <option value="" disabled>
              Select your business model
            </option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="small muted" style={{ marginTop: 6, lineHeight: 1.4 }}>
            Don't see your exact trade? Choose <strong>General business</strong>; you can activate or deactivate specialized modules (booking, tickets, delivery, tabs) at any time.
          </p>
        </div>

        <div>
          <label htmlFor="refundKind" style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
            Customer Refund Policy
          </label>
          <select id="refundKind" name="refundKind" defaultValue="none" style={{ width: "100%" }}>
            <option value="none">No refunds (all sales final)</option>
            <option value="full_until">Full refund if cancelled before cutoff window</option>
          </select>
          <p className="small muted" style={{ marginTop: 4 }}>
            Clearly displayed to buyers at checkout to avoid misunderstandings.
          </p>
        </div>

        <div>
          <label htmlFor="refundHours" style={{ display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
            Cancellation Cutoff Window (Hours before booking/event)
          </label>
          <input
            id="refundHours"
            name="refundHours"
            type="number"
            min={0}
            max={720}
            defaultValue={24}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btn btn-primary btn-block" type="submit" style={{ minHeight: 46, fontSize: 15 }}>
            Activate 30-Day Free Workspace
          </button>
        </div>
      </form>
    </div>
  );
}
