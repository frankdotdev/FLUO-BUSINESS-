"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  IconShare,
  IconCopy,
  IconDownload,
  IconWhatsApp,
  IconTwitterX,
  IconSend,
  IconShield,
  IconCheck,
  IconExternalLink,
} from "./icons.tsx";

export interface ShareModalProps {
  title: string;
  subtitle?: string;
  description?: string;
  path?: string;
  url?: string;
  imageUrl?: string;
  price?: string;
  badge?: string;
  businessName?: string;
  category?: string;
  type?: "business" | "product" | "service" | "event" | "booking";
  variant?: "button" | "icon" | "compact";
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function ShareModal({
  title,
  subtitle,
  description,
  path,
  url,
  imageUrl,
  price,
  badge = "Verified on Fluo",
  businessName,
  category,
  type = "product",
  variant = "button",
  label = "Share",
  className,
  style,
}: ShareModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [fullUrl, setFullUrl] = useState(url || "");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const calculated = url || (path ? `${window.location.origin}${path}` : window.location.href);
      setFullUrl(calculated);
      if (typeof navigator !== "undefined" && typeof navigator.canShare === "function") {
        try {
          const testFile = new File([""], "test.png", { type: "image/png" });
          setCanShareFiles(navigator.canShare({ files: [testFile] }));
        } catch {
          setCanShareFiles(false);
        }
      }
    }
  }, [url, path]);

  const shareText = `Check out ${title}${price ? ` (${price})` : ""}${businessName ? ` from ${businessName}` : ""} on Fluo! 🛡️ 100% Escrow Protected:`;

  const copyToClipboard = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const input = document.createElement("input");
        input.value = fullUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: fullUrl,
        });
      } catch (err: unknown) {
        // User cancelled or aborted
        if ((err as Error)?.name !== "AbortError") {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  // Generate high-resolution branded PNG on client-side canvas
  const generateCardBlob = async (): Promise<Blob | null> => {
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Background
    ctx.fillStyle = "#12181b";
    ctx.fillRect(0, 0, 1200, 630);

    // Decorative gradient circles
    ctx.fillStyle = "rgba(240, 120, 102, 0.12)";
    ctx.beginPath();
    ctx.arc(1100, 100, 260, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(33, 134, 106, 0.09)";
    ctx.beginPath();
    ctx.arc(100, 540, 240, 0, Math.PI * 2);
    ctx.fill();

    // Container card
    ctx.fillStyle = "#172126";
    ctx.strokeStyle = "#27343a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(40, 40, 1120, 550, 28);
    ctx.fill();
    ctx.stroke();

    // Fluo Brand Logo Header
    ctx.fillStyle = "#f07866";
    ctx.beginPath();
    ctx.arc(92, 98, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("FLUO", 112, 106);

    // Escrow Protection Badge
    ctx.fillStyle = "#1b2f27";
    ctx.strokeStyle = "#2d5243";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(220, 78, 230, 40, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#4ade80";
    ctx.font = "700 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("🛡️ Fluo Escrow Protected", 244, 103);

    // Verified / Category Pill
    if (badge) {
      ctx.fillStyle = "#222e34";
      ctx.strokeStyle = "#2e3f47";
      ctx.beginPath();
      ctx.roundRect(464, 78, 190, 40, 20);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#9db0b7";
      ctx.font = "600 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(`✓ ${badge.slice(0, 20)}`, 484, 103);
    }

    // Category Kicker
    const catText = category || (type === "product" ? "PRODUCT" : type === "service" ? "SERVICE" : type === "event" ? "EVENT" : "LOCAL BUSINESS");
    ctx.fillStyle = "#f07866";
    ctx.font = "800 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(catText.toUpperCase(), 80, 190);

    // Title text (wrapping if long)
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 42px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const words = title.split(" ");
    let line = "";
    let y = 240;
    const maxTextWidth = imageUrl ? 620 : 960;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTextWidth && i > 0) {
        ctx.fillText(line.trim(), 80, y);
        line = words[i] + " ";
        y += 50;
        if (y > 300) {
          line += "...";
          break;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), 80, y);

    // Subtitle / Business Name
    ctx.fillStyle = "#8d9ca2";
    ctx.font = "500 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const sub = subtitle || (businessName ? `Available from ${businessName}` : description || "Discover and order securely on Fluo");
    ctx.fillText(sub.slice(0, 65), 80, y + 42);

    // Price Card (if applicable)
    if (price) {
      const priceY = y + 70;
      ctx.fillStyle = "#251b1a";
      ctx.strokeStyle = "#68342c";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(80, priceY, 260, 64, 18);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f07866";
      ctx.font = "800 30px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(price, 110, priceY + 44);
    }

    // Right Photo or Fluo Emblem
    if (imageUrl) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageUrl;
        });

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(740, 115, 370, 370, 24);
        ctx.clip();
        ctx.drawImage(img, 740, 115, 370, 370);
        ctx.restore();

        // Photo border
        ctx.strokeStyle = "#2d3c43";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(740, 115, 370, 370, 24);
        ctx.stroke();
      } catch {
        // Fallback emblem if CORS prevents loading
        drawEmblem(ctx);
      }
    } else {
      drawEmblem(ctx);
    }

    // Bottom Footer Bar
    ctx.strokeStyle = "#25333a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(80, 510);
    ctx.lineTo(1120, 510);
    ctx.stroke();

    ctx.fillStyle = "#7c8c93";
    ctx.font = "500 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("Order securely with escrow protection on", 80, 550);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("fluo-business.vercel.app", 400, 550);

    // CTA Button Pill
    ctx.fillStyle = "#f07866";
    ctx.beginPath();
    ctx.roundRect(940, 524, 170, 42, 12);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("View on Fluo ↗", 970, 551);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  };

  const drawEmblem = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#1b2428";
    ctx.strokeStyle = "#28353b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(740, 115, 370, 370, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(240, 120, 102, 0.15)";
    ctx.beginPath();
    ctx.arc(925, 275, 75, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(240, 120, 102, 0.35)";
    ctx.beginPath();
    ctx.arc(925, 275, 45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f07866";
    ctx.font = "900 36px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FLUO", 925, 288);

    ctx.fillStyle = "#809096";
    ctx.font = "600 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("Nigeria's Commerce Network", 925, 375);
    ctx.textAlign = "left";
  };

  const handleDownloadImage = async () => {
    try {
      setGenerating(true);
      const blob = await generateCardBlob();
      if (!blob) return;
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const cleanSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
      link.download = `fluo-${cleanSlug}-card.png`;
      link.href = downloadUrl;
      link.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      console.error("Error exporting image", e);
    } finally {
      setGenerating(false);
    }
  };

  const handleShareImageFile = async () => {
    try {
      setGenerating(true);
      const blob = await generateCardBlob();
      if (!blob) return;
      const cleanSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
      const file = new File([blob], `fluo-${cleanSlug}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text: shareText,
        });
      } else {
        handleDownloadImage();
      }
    } catch {
      handleDownloadImage();
    } finally {
      setGenerating(false);
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${fullUrl}`)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(fullUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(shareText)}`;

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          className={`icon-btn ${className || ""}`}
          aria-label={label}
          title={label}
          style={{
            display: "inline-grid",
            placeItems: "center",
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--canvas)",
            border: "1px solid var(--line)",
            color: "var(--ink)",
            cursor: "pointer",
            ...style,
          }}
        >
          <IconShare size={16} />
        </button>
      ) : variant === "compact" ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          className={`btn btn-subtle ${className || ""}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            padding: "6px 12px",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
            ...style,
          }}
        >
          <IconShare size={14} /> {label}
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(true);
          }}
          className={`secondary-button ${className || ""}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            background: "#ffffff",
            ...style,
          }}
        >
          <IconShare size={15} /> {label}
        </button>
      )}

      {/* Hidden canvas for client-side card rendering */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Modal Backdrop & Dialog */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(18, 24, 27, 0.72)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: "16px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 24,
              border: "1px solid var(--line)",
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.2)",
              width: "100%",
              maxWidth: 580,
              padding: "clamp(20px, 4vw, 28px)",
              position: "relative",
              display: "grid",
              gap: 20,
              maxHeight: "92vh",
              overflowY: "auto",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div>
                <span className="section-kicker" style={{ margin: 0 }}>SOCIAL &amp; MESSAGING</span>
                <h2 id="share-title" style={{ fontFamily: "Manrope, sans-serif", fontSize: 20, fontWeight: 800, margin: "2px 0 0", color: "var(--ink)" }}>
                  Share {type === "business" ? "Business" : type === "event" ? "Event" : "Product or Service"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                style={{
                  border: 0,
                  background: "var(--canvas)",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: 16,
                  color: "var(--ink)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            {/* Live Branded Social Preview Card */}
            <div
              style={{
                background: "#12181b",
                borderRadius: 20,
                padding: "20px",
                border: "1px solid #263339",
                color: "#ffffff",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
                display: "grid",
                gap: 16,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Card Header Strip */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--coral)" }} />
                  <strong style={{ fontSize: 13, letterSpacing: "-0.02em", color: "#ffffff" }}>FLUO</strong>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#4ade80",
                      background: "#1b2f27",
                      border: "1px solid #2d5243",
                      padding: "3px 8px",
                      borderRadius: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <IconShield size={11} /> Escrow Protected
                  </span>
                  {badge && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#a4b3b9",
                        background: "#212d33",
                        border: "1px solid #2e3d45",
                        padding: "3px 8px",
                        borderRadius: 12,
                      }}
                    >
                      ✓ {badge}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={title}
                    style={{
                      width: 86,
                      height: 86,
                      borderRadius: 16,
                      objectFit: "cover",
                      border: "1px solid #2e3d45",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 86,
                      height: 86,
                      borderRadius: 16,
                      background: "#1e282d",
                      border: "1px solid #2a3940",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--coral)",
                      fontSize: 28,
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {title.charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  {category && (
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: "var(--coral)", letterSpacing: "1px", textTransform: "uppercase" }}>
                      {category}
                    </span>
                  )}
                  <h3 style={{ margin: "2px 0 4px", fontSize: 16, fontWeight: 800, color: "#ffffff", lineHeight: 1.3 }}>
                    {title}
                  </h3>
                  {subtitle && (
                    <p style={{ margin: 0, fontSize: 11, color: "#95a5ac", lineHeight: 1.4 }}>
                      {subtitle}
                    </p>
                  )}
                  {price && (
                    <div style={{ marginTop: 8 }}>
                      <span style={{
                        display: "inline-block",
                        fontFamily: "Manrope, sans-serif",
                        fontSize: 17,
                        fontWeight: 800,
                        color: "var(--coral)",
                        background: "#281c1a",
                        border: "1px solid #6b352c",
                        padding: "3px 9px",
                        borderRadius: 8,
                      }}>
                        {price}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 10,
                borderTop: "1px solid #222e34",
                fontSize: 10,
                color: "#75868e",
              }}>
                <span>fluo-business.vercel.app</span>
                <span style={{ color: "#ffffff", fontWeight: 600 }}>Tap or scan to view ↗</span>
              </div>
            </div>

            {/* Quick Share Platforms Row */}
            <div>
              <span className="section-kicker" style={{ margin: "0 0 10px", display: "block" }}>
                SHARE DIRECTLY TO SOCIAL MEDIA
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
                {/* WhatsApp */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    background: "#edfaf0",
                    color: "#166534",
                    borderColor: "#bbf7d0",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "10px",
                    justifyContent: "center",
                    textDecoration: "none",
                  }}
                >
                  <IconWhatsApp size={16} style={{ color: "#22c55e" }} /> WhatsApp
                </a>

                {/* Twitter / X */}
                <a
                  href={twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    background: "#f4f5f5",
                    color: "#111827",
                    borderColor: "#e5e7eb",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "10px",
                    justifyContent: "center",
                    textDecoration: "none",
                  }}
                >
                  <IconTwitterX size={15} /> X / Twitter
                </a>

                {/* Telegram */}
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    background: "#f0f7fe",
                    color: "#1e40af",
                    borderColor: "#bfdbfe",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "10px",
                    justifyContent: "center",
                    textDecoration: "none",
                  }}
                >
                  <IconSend size={15} style={{ color: "#3b82f6" }} /> Telegram
                </a>

                {/* Facebook */}
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    background: "#f0f5ff",
                    color: "#1d4ed8",
                    borderColor: "#c7d2fe",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "10px",
                    justifyContent: "center",
                    textDecoration: "none",
                  }}
                >
                  <IconExternalLink size={15} style={{ color: "#2563eb" }} /> Facebook
                </a>
              </div>
            </div>

            {/* Branded Image Content Creation Actions */}
            <div style={{ background: "var(--canvas)", padding: "14px 16px", borderRadius: 16, border: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                <strong style={{ fontSize: 13, color: "var(--ink)" }}>Story &amp; Status Image Content</strong>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>1200×630 High-Resolution PNG</span>
              </div>
              <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
                Save this full branded preview card to post directly on Instagram Stories, WhatsApp Status, or Facebook as a visual graphic.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={generating}
                  className="secondary-button"
                  style={{
                    flex: "1 1 180px",
                    justifyContent: "center",
                    fontSize: 12.5,
                    padding: "10px 14px",
                    fontWeight: 700,
                  }}
                >
                  <IconDownload size={15} /> {generating ? "Generating..." : "Download Social Card Image"}
                </button>

                {canShareFiles && (
                  <button
                    type="button"
                    onClick={handleShareImageFile}
                    disabled={generating}
                    className="primary-button"
                    style={{
                      flex: "1 1 180px",
                      justifyContent: "center",
                      fontSize: 12.5,
                      padding: "10px 14px",
                    }}
                  >
                    <IconShare size={15} /> Share Image to Story / App
                  </button>
                )}
              </div>
            </div>

            {/* Direct Link Copy & Native Share */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flex: 1,
                  minWidth: 220,
                  background: "var(--canvas)",
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  padding: "4px 8px 4px 14px",
                }}
              >
                <input
                  type="text"
                  readOnly
                  value={fullUrl}
                  style={{
                    border: 0,
                    background: "transparent",
                    padding: "6px 0",
                    fontSize: 12,
                    color: "var(--ink)",
                    outline: "none",
                    width: "100%",
                  }}
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="primary-button"
                  style={{
                    padding: "8px 14px",
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    gap: 5,
                  }}
                >
                  {copied ? (
                    <>
                      <IconCheck size={14} /> Copied!
                    </>
                  ) : (
                    <>
                      <IconCopy size={14} /> Copy Link
                    </>
                  )}
                </button>
              </div>

              {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="secondary-button"
                  style={{
                    padding: "10px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  More Apps...
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
