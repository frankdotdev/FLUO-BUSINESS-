// Dynamic Open Graph Social Share Image Generator for Fluo
// Generates 1200x630 branded preview cards for WhatsApp, Twitter, Telegram, and Facebook shares.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") || "Fluo Marketplace").slice(0, 60);
  const subtitle = (searchParams.get("subtitle") || "Campus Commerce, Services & Rides").slice(0, 80);
  const price = searchParams.get("price") || "";
  const badge = searchParams.get("badge") || "Verified on Fluo";

  const escapeXml = (s: string) =>
    s.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case "<": return "&lt;";
        case ">": return "&gt;";
        case "&": return "&amp;";
        case "'": return "&apos;";
        case '"': return "&quot;";
        default: return c;
      }
    });

  const safeTitle = escapeXml(title);
  const safeSubtitle = escapeXml(subtitle);
  const safePrice = escapeXml(price);
  const safeBadge = escapeXml(badge);

  const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0b0b" />
      <stop offset="100%" stop-color="#171717" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#22c55e" />
      <stop offset="100%" stop-color="#86efac" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)" />

  <!-- Accent glow orb -->
  <circle cx="1100" cy="100" r="300" fill="#22c55e" opacity="0.12" filter="blur(60px)" />
  <circle cx="100" cy="550" r="250" fill="#10b981" opacity="0.08" filter="blur(60px)" />

  <!-- Container Box -->
  <rect x="60" y="60" width="1080" height="510" rx="24" fill="#141414" stroke="#262626" stroke-width="2" />

  <!-- Brand Pill -->
  <rect x="100" y="100" width="130" height="42" rx="21" fill="#22c55e" />
  <text x="165" y="127" font-family="-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="800" fill="#0b0b0b" text-anchor="middle">FLUO</text>

  <!-- Badge Pill -->
  <rect x="246" y="100" width="190" height="42" rx="21" fill="#262626" />
  <text x="341" y="127" font-family="-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="600" fill="#a3a3a3" text-anchor="middle">✓ ${safeBadge}</text>

  <!-- Title -->
  <text x="100" y="240" font-family="-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="800" fill="#ffffff" letter-spacing="-0.03em">
    ${safeTitle}
  </text>

  <!-- Subtitle -->
  <text x="100" y="300" font-family="-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="500" fill="#a3a3a3">
    ${safeSubtitle}
  </text>

  ${
    safePrice
      ? `
  <!-- Price Highlight -->
  <rect x="100" y="360" width="240" height="68" rx="14" fill="#1e293b" stroke="#334155" stroke-width="2" />
  <text x="220" y="406" font-family="-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="800" fill="#4ade80" text-anchor="middle">
    ${safePrice}
  </text>`
      : ""
  }

  <!-- Footer Link & CTA -->
  <line x1="100" y1="480" x2="1100" y2="480" stroke="#262626" stroke-width="1.5" />
  <text x="100" y="525" font-family="-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="600" fill="#737373">
    Order, book, or ride on <tspan fill="#ffffff" font-weight="700">fluo.ng</tspan>
  </text>

  <rect x="940" y="496" width="160" height="42" rx="10" fill="#ffffff" />
  <text x="1020" y="524" font-family="-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#0b0b0b" text-anchor="middle">View on Fluo →</text>
</svg>
  `.trim();

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    },
  });
}
