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
  for (const k of REQUIRED) if (!e[k] || e[k]!.trim() === "") problems.push(`${k} is missing`);
  const keys: Record<string, Buffer> = {}; let keyId = "";
  for (const part of (e["FIELD_ENCRYPTION_KEYS"] ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
    const [id, b64] = part.split("=");
    const buf = b64 ? Buffer.from(b64, "base64") : Buffer.alloc(0);
    if (!id || buf.length !== 32) problems.push(`FIELD_ENCRYPTION_KEYS entry "${id ?? ""}" must be base64 of exactly 32 bytes`); else { keys[id] = buf; keyId ||= id; }
  }
  if (e["APP_URL"]?.endsWith("/")) problems.push("APP_URL must not end with a slash");
  if (e["BETTER_AUTH_SECRET"] && e["BETTER_AUTH_SECRET"].length < 32) problems.push("BETTER_AUTH_SECRET must be at least 32 characters");
  const fee = Number(e["EVENT_FEE_BPS"] ?? "200");
  if (!Number.isInteger(fee) || fee < 0 || fee > 5000) problems.push("EVENT_FEE_BPS must be an integer from 0 to 5000");
  if (!e["RESEND_API_KEY"] && !(e["GMAIL_USER"] && e["GMAIL_APP_PASSWORD"])) problems.push("set RESEND_API_KEY, or GMAIL_USER and GMAIL_APP_PASSWORD");
  const r2Keys = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_PUBLIC_BASE_URL"] as const;
  const r2Set = r2Keys.filter((k) => e[k] && e[k]!.trim() !== "");
  if (r2Set.length > 0 && r2Set.length < r2Keys.length) problems.push(`R2 is partly configured; also set: ${r2Keys.filter((k) => !r2Set.includes(k)).join(", ")}`);
  if (e["R2_PUBLIC_BASE_URL"]?.endsWith("/")) problems.push("R2_PUBLIC_BASE_URL must not end with a slash");
  if (problems.length > 0) throw new Error(`Invalid environment:\n - ${problems.join("\n - ")}`);
  cached = {
    DATABASE_URL: e["DATABASE_URL"]!, APP_URL: e["APP_URL"]!, BETTER_AUTH_SECRET: e["BETTER_AUTH_SECRET"]!, TICKET_HMAC_SECRET: e["TICKET_HMAC_SECRET"]!, PAYSTACK_SECRET_KEY: e["PAYSTACK_SECRET_KEY"]!, CRON_SECRET: e["CRON_SECRET"]!,
    keys, keyId, eventFeeBps: fee,
    email: { ...(e["RESEND_API_KEY"] ? { RESEND_API_KEY: e["RESEND_API_KEY"] } : {}), ...(e["EMAIL_FROM"] ? { EMAIL_FROM: e["EMAIL_FROM"] } : {}), ...(e["GMAIL_USER"] ? { GMAIL_USER: e["GMAIL_USER"] } : {}), ...(e["GMAIL_APP_PASSWORD"] ? { GMAIL_APP_PASSWORD: e["GMAIL_APP_PASSWORD"] } : {}) },
    google: e["GOOGLE_CLIENT_ID"] && e["GOOGLE_CLIENT_SECRET"] ? { clientId: e["GOOGLE_CLIENT_ID"], clientSecret: e["GOOGLE_CLIENT_SECRET"] } : null,
    ...(e["EXPO_ACCESS_TOKEN"] ? { expoAccessToken: e["EXPO_ACCESS_TOKEN"] } : {}),
    r2: r2Set.length === r2Keys.length ? { accountId: e["R2_ACCOUNT_ID"]!, accessKeyId: e["R2_ACCESS_KEY_ID"]!, secretAccessKey: e["R2_SECRET_ACCESS_KEY"]!, bucket: e["R2_BUCKET"]!, publicBase: e["R2_PUBLIC_BASE_URL"]! } : null,
  };
  return cached;
}
