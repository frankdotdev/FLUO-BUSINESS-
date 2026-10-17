import nodemailer from "nodemailer";
import { randomUUID } from "node:crypto";
import { createEmailProvider, createExpoPushProvider, createPaystackProvider, createR2Storage, ProviderRegistry } from "@fluo/adapters";
import { sharpProcessor } from "./images.ts";
import { createPool, PgStore, type PoolLike } from "@fluo/db";
import type { Deps, EmailProvider, PushProvider } from "@fluo/core";
import { env } from "./env.ts";

export interface Container { pool: PoolLike; deps: Deps; providers: ProviderRegistry; email: EmailProvider; push: PushProvider }

// One container per server process (kept on globalThis so dev hot-reload does not open new pools).
const g = globalThis as unknown as { __fluo?: Container };

export function container(): Container {
  if (g.__fluo) return g.__fluo;
  const e = env();
  const pool = createPool({ url: e.DATABASE_URL, max: 10 });
  const email = createEmailProvider(e.email, (user, pass) => nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } }));
  g.__fluo = {
    pool, email,
    push: createExpoPushProvider(e.expoAccessToken ? { accessToken: e.expoAccessToken } : {}),
    providers: new ProviderRegistry([createPaystackProvider({ secretKey: e.PAYSTACK_SECRET_KEY })]),
    deps: { store: new PgStore(pool), now: () => Date.now(), uuid: () => randomUUID(), ticketSecret: e.TICKET_HMAC_SECRET, appUrl: e.APP_URL, keys: e.keys, keyId: e.keyId, ...(e.r2 ? { storage: createR2Storage({ accountId: e.r2.accountId, accessKeyId: e.r2.accessKeyId, secretAccessKey: e.r2.secretAccessKey, bucket: e.r2.bucket }), images: sharpProcessor, publicMediaBase: e.r2.publicBase } : {}) },
  };
  return g.__fluo;
}
export const deps = (): Deps => container().deps;
