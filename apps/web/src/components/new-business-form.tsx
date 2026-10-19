"use client";

import { useState } from "react";
import { IconArrowRight } from "@/components/icons.tsx";

interface NewBusinessFormProps {
  types: { id: string; label: string }[];
  action: (formData: FormData) => Promise<void>;
}

export function NewBusinessForm({ types, action }: NewBusinessFormProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    if (submitting) {
      e.preventDefault();
      return;
    }
    setSubmitting(true);
  };

  return (
    <form action={action} onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
      <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
        Business Name
        <input
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={80}
          placeholder="e.g. Hacker's Shop, Mama Chichi Bites, The Studio"
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
        disabled={submitting}
        style={{
          width: "100%",
          justifyContent: "center",
          padding: "14px 20px",
          fontSize: 15,
          marginTop: 10,
          opacity: submitting ? 0.7 : 1,
          cursor: submitting ? "not-allowed" : "pointer",
        }}
      >
        <span>{submitting ? "Launching workspace & storefront..." : "Create my workspace & start free trial"}</span>
        {!submitting && <span>↗</span>}
      </button>
    </form>
  );
}
