import path from "node:path";
import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),   // include the workspace packages in the standalone output                                        // small self-contained server build: easy to run on a VPS later
  transpilePackages: ["@fluo/core", "@fluo/adapters", "@fluo/db"],
  serverExternalPackages: ["pg", "nodemailer", "sharp"],
  poweredByHeader: false,
  // Links inside emails and push notifications point at these paths; send them to the right dashboard tab.
  async redirects() {
    return [
      { source: "/app/:id/orders/:oid", destination: "/app/:id?tab=orders", permanent: false },
      { source: "/app/:id/bookings/:bid", destination: "/app/:id?tab=bookings", permanent: false },
      { source: "/app/:id/refunds/:rid", destination: "/app/:id?tab=orders", permanent: false },
      { source: "/app/:id/billing", destination: "/app/:id?tab=billing", permanent: false },
    ];
  },
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
      { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' https://api.paystack.co; frame-ancestors 'none'; form-action 'self' https://checkout.paystack.com;" },
    ] }];
  },
};
export default config;
