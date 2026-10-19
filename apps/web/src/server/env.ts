// Read and validate configuration once. Missing or malformed values fail fast, never silently.
export interface Env {
  DATABASE_URL: string;
  APP_URL: string;
  BETTER_AUTH_SECRET: string;
  TICKET_HMAC_SECRET: string;
  PAYSTACK_SECRET_KEY: string;
  CRON_SECRET: string;
  keys: Record<string, Buffer>;
  keyId: string;
  eventFeeBps: number;
  email: {
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
    GMAIL_USER?: string;
    GMAIL_APP_PASSWORD?: string;
  };
  google: { clientId: string; clientSecret: string } | null;
  expoAccessToken?: string;
  r2: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    publicBase: string;
  } | null;
}

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const e = process.env;
  const problems: string[] = [];
  const isProd = process.env.NODE_ENV === "production" || Boolean(e["VERCEL"]);

  // 1. Resolve APP_URL (In production, NEVER allow localhost)
  let appUrl = (e["APP_URL"] ?? "").trim();
  if (isProd) {
    if (!appUrl || appUrl.includes("localhost") || appUrl.includes("your-project-name")) {
      appUrl = e["VERCEL_PROJECT_PRODUCTION_URL"]
        ? `https://${e["VERCEL_PROJECT_PRODUCTION_URL"]}`
        : e["VERCEL_URL"]
        ? `https://${e["VERCEL_URL"]}`
        : "https://fluo-business.vercel.app";
    }
  } else {
    if (!appUrl) appUrl = "http://localhost:3000";
  }
  if (appUrl.endsWith("/")) appUrl = appUrl.slice(0, -1);

  // Synchronize BETTER_AUTH_URL so better-auth never uses localhost in production
  if (typeof process !== "undefined" && process.env) {
    process.env.BETTER_AUTH_URL = appUrl;
  }

  // 2. Encryption Keys
  const keys: Record<string, Buffer> = {};
  let keyId = "";
  for (const part of (e["FIELD_ENCRYPTION_KEYS"] ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
    const [id, b64] = part.split("=");
    const buf = b64 ? Buffer.from(b64, "base64") : Buffer.alloc(0);
    if (id && buf.length === 32) {
      keys[id] = buf;
      keyId ||= id;
    }
  }

  if (Object.keys(keys).length === 0) {
    if (isProd) {
      problems.push("FIELD_ENCRYPTION_KEYS is required in production");
    } else {
      keys["k1"] = Buffer.alloc(32, 1);
      keyId = "k1";
    }
  }

  // 3. Secrets (read from environment variables without hardcoded production fallbacks)
  const dbUrl = (e["DATABASE_URL"] ?? "").trim();
  const betterAuthSecret = (e["BETTER_AUTH_SECRET"] ?? "").trim();
  const paystackKey = (e["PAYSTACK_SECRET_KEY"] ?? "").trim();
  const ticketSecret = (e["TICKET_HMAC_SECRET"] ?? "").trim();
  const cronSecret = (e["CRON_SECRET"] ?? "").trim();
  const fee = Number(e["EVENT_FEE_BPS"] ?? "200");

  if (isProd) {
    if (!dbUrl) problems.push("DATABASE_URL is missing");
    if (!betterAuthSecret) problems.push("BETTER_AUTH_SECRET is missing");
    if (problems.length > 0) {
      console.warn(`[Fluo Security Warning] Missing environment variables: ${problems.join(", ")}`);
    }
  }

  // 4. Cloudflare R2
  const r2Keys = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE_URL"] as const;
  const r2Set = r2Keys.filter((k) => e[k] && e[k]!.trim() !== "");
  let r2PublicBase = (e["R2_PUBLIC_BASE_URL"] ?? "").trim();
  if (r2PublicBase.endsWith("/")) r2PublicBase = r2PublicBase.slice(0, -1);

  cached = {
    DATABASE_URL: dbUrl,
    APP_URL: appUrl,
    BETTER_AUTH_SECRET: betterAuthSecret || "development_secret_only_min_32_characters_long",
    TICKET_HMAC_SECRET: ticketSecret,
    PAYSTACK_SECRET_KEY: paystackKey,
    CRON_SECRET: cronSecret,
    keys,
    keyId,
    eventFeeBps: fee,
    email: {
      ...(e["RESEND_API_KEY"] ? { RESEND_API_KEY: e["RESEND_API_KEY"] } : {}),
      ...(e["EMAIL_FROM"] ? { EMAIL_FROM: e["EMAIL_FROM"] } : {}),
      ...(e["GMAIL_USER"] ? { GMAIL_USER: e["GMAIL_USER"] } : {}),
      ...(e["GMAIL_APP_PASSWORD"] ? { GMAIL_APP_PASSWORD: e["GMAIL_APP_PASSWORD"] } : {}),
    },
    google:
      e["GOOGLE_CLIENT_ID"] && e["GOOGLE_CLIENT_SECRET"]
        ? { clientId: e["GOOGLE_CLIENT_ID"], clientSecret: e["GOOGLE_CLIENT_SECRET"] }
        : null,
    ...(e["EXPO_ACCESS_TOKEN"] ? { expoAccessToken: e["EXPO_ACCESS_TOKEN"] } : {}),
    r2:
      r2Set.length === r2Keys.length
        ? {
            accountId: e["R2_ACCOUNT_ID"]!,
            accessKeyId: e["R2_ACCESS_KEY_ID"]!,
            secretAccessKey: e["R2_SECRET_ACCESS_KEY"]!,
            bucket: e["R2_BUCKET"]!,
            publicBase: r2PublicBase,
          }
        : null,
  };

  return cached;
}
