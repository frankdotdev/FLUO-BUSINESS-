"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  loadingText = "Saving...",
  className = "primary-button",
  style,
}: {
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={className}
      type="submit"
      disabled={pending}
      style={{
        ...style,
        cursor: pending ? "not-allowed" : "pointer",
        opacity: pending ? 0.7 : 1,
      }}
    >
      {pending ? loadingText : children}
    </button>
  );
}
