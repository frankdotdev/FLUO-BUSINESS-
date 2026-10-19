"use client";

import { useState } from "react";
import { IconChevronRight } from "@/components/icons.tsx";

interface ProductGalleryProps {
  photos: string[];
  productName: string;
  promoBadge?: string | null;
  soldOut?: boolean;
  stockLeft?: number | null;
  fulfilment?: "stock" | "made_to_order";
}

export function ProductGallery({
  photos,
  productName,
  promoBadge,
  soldOut,
  stockLeft,
  fulfilment,
}: ProductGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);

  const hasPhotos = photos.length > 0;
  const currentPhoto = hasPhotos ? photos[activeIdx] ?? photos[0] : null;

  const nextPhoto = () => {
    if (photos.length > 1) {
      setActiveIdx((prev) => (prev + 1) % photos.length);
    }
  };

  const prevPhoto = () => {
    if (photos.length > 1) {
      setActiveIdx((prev) => (prev - 1 + photos.length) % photos.length);
    }
  };

  return (
    <div>
      {/* Main Large Visual Card */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid var(--line)",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow: "var(--shadow)",
          position: "relative",
          aspectRatio: "4 / 3",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {currentPhoto ? (
          <img
            src={currentPhoto}
            alt={`${productName} view ${activeIdx + 1}`}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              height: 320,
              width: "100%",
              display: "grid",
              placeItems: "center",
              background: "var(--canvas)",
              color: "var(--muted)",
              fontFamily: "Manrope, sans-serif",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            {productName}
          </div>
        )}

        {/* Status & Promo Badges */}
        <div style={{ position: "absolute", top: 16, left: 16, display: "flex", gap: 6, flexWrap: "wrap", zIndex: 2 }}>
          {promoBadge && (
            <span
              style={{
                background: "var(--coral)",
                color: "#ffffff",
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 0.5,
              }}
            >
              {promoBadge}
            </span>
          )}
          {soldOut ? (
            <span
              style={{
                background: "#dc2626",
                color: "#ffffff",
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Sold out
            </span>
          ) : stockLeft != null && stockLeft > 0 && stockLeft <= 5 ? (
            <span
              style={{
                background: "#d97706",
                color: "#ffffff",
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Only {stockLeft} left
            </span>
          ) : fulfilment === "made_to_order" ? (
            <span
              style={{
                background: "var(--ink)",
                color: "#ffffff",
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Made to order
            </span>
          ) : null}
        </div>

        {/* Multi-Photo Counter and Navigation Arrows */}
        {photos.length > 1 && (
          <>
            <span
              style={{
                position: "absolute",
                bottom: 16,
                right: 16,
                background: "rgba(15, 23, 42, 0.75)",
                color: "#ffffff",
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 12,
                zIndex: 2,
              }}
            >
              {activeIdx + 1} / {photos.length}
            </span>

            <button
              type="button"
              onClick={prevPhoto}
              aria-label="Previous photo"
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.9)",
                border: "1px solid var(--line)",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                zIndex: 2,
              }}
            >
              <span style={{ transform: "rotate(180deg)", display: "inline-block" }}>
                <IconChevronRight size={16} />
              </span>
            </button>

            <button
              type="button"
              onClick={nextPhoto}
              aria-label="Next photo"
              style={{
                position: "absolute",
                right: 14,
                top: "50%",
                transform: "translateY(-50%)",
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.9)",
                border: "1px solid var(--line)",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                zIndex: 2,
              }}
            >
              <IconChevronRight size={16} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails Strip */}
      {photos.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 12,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {photos.map((url, idx) => {
            const isSelected = idx === activeIdx;
            return (
              <button
                key={url}
                type="button"
                onClick={() => setActiveIdx(idx)}
                style={{
                  border: isSelected ? "2px solid var(--coral)" : "1px solid var(--line)",
                  borderRadius: 12,
                  padding: 0,
                  overflow: "hidden",
                  width: 64,
                  height: 64,
                  flexShrink: 0,
                  background: "#ffffff",
                  cursor: "pointer",
                  opacity: isSelected ? 1 : 0.65,
                }}
              >
                <img
                  src={url}
                  alt={`${productName} thumbnail ${idx + 1}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
