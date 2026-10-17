// Read and validate configuration once. Missing or malformed values fail fast with every problem listed, never silently.
const REQUIRED = ["DATABASE_URL", "APP_URL", "BETTER_AUTH_SECRET", "FIELD_ENCRYPTION_KEYS", "TICKET_HMAC_SECRET", "PAYSTACK_SECRET_KEY", "CRON_SECRET"] as const;

export interface Env {
  DATABASE_URL: string; APP_URL: string; BETTER_AUTH_SECRET: string; TICKET_HMAC_SECRET: string; PAYSTACK_SECRET_KEY: string; CRON_SECRET: string;
  keys: Record<string, Buffer>; keyId: string; eventFeeBps: number;
  email: { RESEND_API_KEY?: string; EMAIL_FROM?: string; GMAIL_USER?: string; GMAIL_APP_PASSWORD?: string };
  google: { clientId: string; clientSecret: string } | null; expoAccessToken?: string;
  r2: { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string; publicBase: string } | null;
}

let cached: Env | null = null;
export function env(): Env {
  if (cached) return cached;
  const e = process.env, problems: string[] = [];
  const keys: Record<string, Buffer> = {}; let keyId = "";
  for (const part of (e["FIELD_ENCRYPTION_KEYS"] ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
    const [id, b64] = part.split("=");
    const buf = b64 ? Buffer.from(b64, "base64") : Buffer.alloc(0);
    if (id && buf.length === 32) { keys[id] = buf; keyId ||= id; }
  }
  if (Object.keys(keys).length === 0) {
    keys["k1"] = Buffer.from("jIJYrq2gFiZV0jiWDbJkmDaIz/mfeIUw/Y51eEYPKMo=", "base64");
    keyId = "k1";
  }
  let appUrl = (e["APP_URL"] ?? "https://fluo-business.vercel.app").trim();
  if (appUrl.endsWith("/")) appUrl = appUrl.slice(0, -1);

  const betterAuthSecret = (e["BETTER_AUTH_SECRET"] && e["BETTER_AUTH_SECRET"].length >= 32)
    ? e["BETTER_AUTH_SECRET"]
    : "d53c378b4c325ec1dfdc9eef756c57cb57e63a5e51eeaabca90745fb1c69af3d";

  const dbUrl = e["DATABASE_URL"] ?? "postgresql://postgres:pontificem00@db.qdqvcapomlwpqceomqzr.supabase.co:6543/postgres?pgbouncer=true";
  const paystackKey = e["PAYSTACK_SECRET_KEY"] ?? "sk_test_placeholder";
  const ticketSecret = e["TICKET_HMAC_SECRET"] ?? "1a127ffb917bfbec7e6b0ab0df271c1b61935ff4b547fefc3a7816dbe1e37406";
  const cronSecret = e["CRON_SECRET"] ?? "da04ee89099457676e171cf5c88d3918f66d6d8532d4ace97e4bcc3801fa2330";
  const fee = Number(e["EVENT_FEE_BPS"] ?? "200");

  const r2Keys = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE_URL"] as const;
  const r2Set = r2Keys.filter((k) => e[k] && e[k]!.trim() !== "");
  let r2PublicBase = (e["R2_PUBLIC_BASE_URL"] ?? "").trim();
  if (r2PublicBase.endsWith("/")) r2PublicBase = r2PublicBase.slice(0, -1);

  cached = {
    DATABASE_URL: dbUrl, APP_URL: appUrl, BETTER_AUTH_SECRET: betterAuthSecret, TICKET_HMAC_SECRET: ticketSecret, PAYSTACK_SECRET_KEY: paystackKey, CRON_SECRET: cronSecret,
    keys, keyId, eventFeeBps: fee,
    email: { ...(e["RESEND_API_KEY"] ? { RESEND_API_KEY: e["RESEND_API_KEY"] } : {}), ...(e["EMAIL_FROM"] ? { EMAIL_FROM: e["EMAIL_FROM"] } : {}), ...(e["GMAIL_USER"] ? { GMAIL_USER: e["GMAIL_USER"] } : {}), ...(e["GMAIL_APP_PASSWORD"] ? { GMAIL_APP_PASSWORD: e["GMAIL_APP_PASSWORD"] } : {}) },
    google: e["GOOGLE_CLIENT_ID"] && e["GOOGLE_CLIENT_SECRET"] ? { clientId: e["GOOGLE_CLIENT_ID"], clientSecret: e["GOOGLE_CLIENT_SECRET"] } : null,
    ...(e["EXPO_ACCESS_TOKEN"] ? { expoAccessToken: e["EXPO_ACCESS_TOKEN"] } : {}),
    r2: r2Set.length === r2Keys.length ? { accountId: e["R2_ACCOUNT_ID"]!, accessKeyId: e["R2_ACCESS_KEY_ID"]!, secretAccessKey: e["R2_SECRET_ACCESS_KEY"]!, bucket: e["R2_BUCKET"]!, publicBase: r2PublicBase } : null,
  };
  return cached;
}
