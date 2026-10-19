import path from "node:path";
import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
  transpilePackages: ["@fluo/core", "@fluo/adapters", "@fluo/db"],
  serverExternalPackages: ["pg", "nodemailer", "sharp"],
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/app/:id/orders/:oid", destination: "/app/:id?tab=orders", permanent: false },
      { source: "/app/:id/bookings/:bid", destination: "/app/:id?tab=bookings", permanent: false },
      { source: "/app/:id/refunds/:rid", destination: "/app/:id?tab=orders", permanent: false },
      { source: "/app/:id/billing", destination: "/app/:id?tab=billing", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://api.paystack.co https://nominatim.openstreetmap.org https://*.supabase.co https://*.r2.cloudflarestorage.com; frame-ancestors 'none'; form-action 'self' https://checkout.paystack.com;",
          },
        ],
      },
    ];
  },
};
export default config;
