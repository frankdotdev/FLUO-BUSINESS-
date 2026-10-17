import type { EmailProvider } from "@fluo/core";
import { jsonRequest, ProviderError, type Fetch } from "./http.ts";

export function createResendProvider(cfg: { apiKey: string; from: string; fetch?: Fetch }): EmailProvider {
  const f: Fetch = cfg.fetch ?? ((u, i) => fetch(u, i));
  return {
    async send(m) {
      const r = await jsonRequest(f, "https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${cfg.apiKey}` }, body: { from: cfg.from, to: [m.to], subject: m.subject, html: m.html, text: m.text } });
      if (!r?.id) throw new ProviderError("resend did not accept the message", 502);
    },
  };
}

/** The fallback used until a Resend key exists. `transport` is a nodemailer transporter (created by the app). */
export interface MailTransport { sendMail(msg: { from: string; to: string; subject: string; html: string; text: string }): Promise<unknown> }
export function createSmtpProvider(cfg: { from: string; transport: MailTransport }): EmailProvider {
  return { async send(m) { await cfg.transport.sendMail({ from: cfg.from, to: m.to, subject: m.subject, html: m.html, text: m.text }); } };
}

export interface EmailEnv { RESEND_API_KEY?: string; EMAIL_FROM?: string; GMAIL_USER?: string; GMAIL_APP_PASSWORD?: string }
/** Resend when its API key is present; otherwise Gmail SMTP; otherwise a loud error (mail is never silently dropped). */
export function createEmailProvider(env: EmailEnv, makeSmtpTransport: (user: string, pass: string) => MailTransport, f?: Fetch): EmailProvider {
  if (env.RESEND_API_KEY) {
    if (!env.EMAIL_FROM) throw new Error("EMAIL_FROM is required with RESEND_API_KEY");
    return createResendProvider({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM, ...(f ? { fetch: f } : {}) });
  }
  if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) {
    return createSmtpProvider({ from: env.EMAIL_FROM ?? `Fluo <${env.GMAIL_USER}>`, transport: makeSmtpTransport(env.GMAIL_USER, env.GMAIL_APP_PASSWORD) });
  }
  throw new Error("No email provider configured: set RESEND_API_KEY, or GMAIL_USER and GMAIL_APP_PASSWORD");
}
