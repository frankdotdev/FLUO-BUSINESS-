import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") || "Fluo Marketplace").slice(0, 55);
  const subtitle = (searchParams.get("subtitle") || "Commerce, Connected • Escrow Protected").slice(0, 75);
  const price = searchParams.get("price") || "";
  const badge = (searchParams.get("badge") || "Verified on Fluo").slice(0, 30);
  const category = (searchParams.get("category") || "Product").slice(0, 25);
  const imageUrl = searchParams.get("image") || "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#12181b",
          padding: "32px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#172126",
            border: "2.5px solid #27343a",
            borderRadius: "28px",
            padding: "40px",
            position: "relative",
          }}
        >
          {/* Top Header Pill Strip */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  backgroundColor: "#f07866",
                }}
              />
              <span style={{ fontSize: "28px", fontWeight: 900, color: "#ffffff", letterSpacing: "-0.5px" }}>
                FLUO
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#1b2f27",
                  border: "2px solid #2d5243",
                  padding: "8px 18px",
                  borderRadius: "20px",
                  color: "#4ade80",
                  fontSize: "16px",
                  fontWeight: 800,
                }}
              >
                🛡️ Fluo Escrow Protected
              </div>
              {badge ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: "#212d33",
                    border: "2px solid #2e3d45",
                    padding: "8px 18px",
                    borderRadius: "20px",
                    color: "#b0c0c7",
                    fontSize: "15px",
                    fontWeight: 700,
                  }}
                >
                  ✓ {badge}
                </div>
              ) : null}
            </div>
          </div>

          {/* Middle Body Block */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "32px" }}>
            {/* Left Content */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
              {category ? (
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: 900,
                    color: "#f07866",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    marginBottom: "12px",
                  }}
                >
                  {category}
                </span>
              ) : null}

              <h1
                style={{
                  fontSize: "52px",
                  fontWeight: 900,
                  color: "#ffffff",
                  lineHeight: 1.15,
                  margin: "0 0 16px 0",
                  letterSpacing: "-1px",
                  wordBreak: "break-word",
                }}
              >
                {title}
              </h1>

              <p
                style={{
                  fontSize: "24px",
                  fontWeight: 600,
                  color: "#9db0b7",
                  margin: "0 0 24px 0",
                  lineHeight: 1.3,
                }}
              >
                {subtitle}
              </p>

              {price ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: "#261b1a",
                    border: "2px solid #7a372d",
                    padding: "10px 24px",
                    borderRadius: "18px",
                    width: "fit-content",
                  }}
                >
                  <span
                    style={{
                      fontSize: "36px",
                      fontWeight: 900,
                      color: "#f07866",
                    }}
                  >
                    {price}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Right Photo or Monogram Emblem */}
            <div
              style={{
                width: "360px",
                height: "360px",
                borderRadius: "26px",
                overflow: "hidden",
                border: "2.5px solid #2e3d45",
                backgroundColor: "#1b2428",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={title}
                  width="360"
                  height="360"
                  style={{
                    objectFit: "cover",
                    width: "100%",
                    height: "100%",
                  }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: "56px", fontWeight: 900, color: "#f07866" }}>FLUO</span>
                  <span style={{ fontSize: "16px", fontWeight: 700, color: "#8d9ea5", marginTop: "8px" }}>
                    Nigeria's Commerce Network
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Footer Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1.5px solid #25343a",
              paddingTop: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "19px", color: "#8899a0" }}>
              <span>100% Escrow delivery &amp; verified orders on</span>
              <strong style={{ color: "#ffffff", fontWeight: 800 }}>fluo-business.vercel.app</strong>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#f07866",
                color: "#ffffff",
                padding: "10px 22px",
                borderRadius: "14px",
                fontSize: "16px",
                fontWeight: 800,
              }}
            >
              Open on Fluo →
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
