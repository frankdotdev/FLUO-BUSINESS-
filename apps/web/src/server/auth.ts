import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { expo } from "@better-auth/expo";
import { container } from "./container.ts";
import { env } from "./env.ts";

async function mail(c: ReturnType<typeof container>, to: string, subject: string, text: string, url: string): Promise<void> {
  const html = `<div style="font-family:Inter,Arial,sans-serif"><p>${text}</p><p><a href="${url}" style="background:#0B0B0B;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px">Continue</a></p><p style="color:#5C5C5C;font-size:12px">If you did not request this, ignore this email.</p></div>`;
  try {
    await c.email.send({ to, subject, text: `${text}\n\n${url}`, html });
  } catch (err) {
    console.warn("Mail transport skipped or unconfigured:", err);
  }
}

function create() {
  const e = env(), c = container();
  const allowedOrigins = [
    e.APP_URL,
    "https://fluo-business.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "fluo://",
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_PROJECT_PRODUCTION_URL ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`] : []),
  ];

  return betterAuth({
    database: c.pool as never,
    baseURL: e.APP_URL,
    secret: e.BETTER_AUTH_SECRET,
    trustedOrigins: allowedOrigins,
    user: { modelName: "users", fields: { emailVerified: "email_verified", createdAt: "created_at", updatedAt: "updated_at" } },
    session: { modelName: "sessions", expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24, fields: { userId: "user_id", expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at", ipAddress: "ip_address", userAgent: "user_agent" } },
    account: { modelName: "accounts", fields: { accountId: "account_id", providerId: "provider_id", userId: "user_id", accessToken: "access_token", refreshToken: "refresh_token", idToken: "id_token", accessTokenExpiresAt: "access_token_expires_at", refreshTokenExpiresAt: "refresh_token_expires_at", createdAt: "created_at", updatedAt: "updated_at" } },
    verification: { modelName: "verifications", fields: { expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at" } },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      sendResetPassword: async ({ user, url }) => {
        await mail(c, user.email, "Reset your Fluo password", "Use this link to choose a new password.", url);
      },
    },
    emailVerification: {
      sendOnSignUp: false,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await mail(c, user.email, "Confirm your email for Fluo", "Confirm your email address to finish creating your Fluo account.", url);
      },
    },
    ...(e.google ? { socialProviders: { google: e.google } } : {}),
    plugins: [expo(), nextCookies()],
  });
}

type Auth = ReturnType<typeof create>;
const g = globalThis as unknown as { __fluoAuth?: Auth };
export const getAuth = (): Auth => (g.__fluoAuth ??= create());
