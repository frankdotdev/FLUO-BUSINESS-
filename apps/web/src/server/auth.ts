import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { expo } from "@better-auth/expo";
import { container } from "./container.ts";
import { env } from "./env.ts";

// Better Auth owns users/sessions/accounts/verifications in OUR Postgres (tables from database/migrations/0001_baseline.sql).
// Column and table names are mapped to our snake_case schema below. Verify with:  npx @better-auth/cli generate
// and compare its proposed schema with the baseline migration (see docs/operations/better-auth-setup.md).
async function mail(c: ReturnType<typeof container>, to: string, subject: string, text: string, url: string): Promise<void> {
  const html = `<div style="font-family:Inter,Arial,sans-serif"><p>${text}</p><p><a href="${url}" style="background:#0B0B0B;color:#fff;padding:12px 18px;text-decoration:none;border-radius:6px">Continue</a></p><p style="color:#5C5C5C;font-size:12px">If you did not request this, ignore this email.</p></div>`;
  await c.email.send({ to, subject, text: `${text}\n\n${url}`, html });
}

function create() {
  const e = env(), c = container();
  return betterAuth({
  database: c.pool as never,                                   // a pg Pool: Better Auth talks to Postgres directly
  baseURL: e.APP_URL,
  secret: e.BETTER_AUTH_SECRET,
  trustedOrigins: [e.APP_URL, "fluo://"],                      // the mobile app's URL scheme
  user: { modelName: "users", fields: { emailVerified: "email_verified", createdAt: "created_at", updatedAt: "updated_at" } },
  session: { modelName: "sessions", expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24, fields: { userId: "user_id", expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at", ipAddress: "ip_address", userAgent: "user_agent" } },
  account: { modelName: "accounts", fields: { accountId: "account_id", providerId: "provider_id", userId: "user_id", accessToken: "access_token", refreshToken: "refresh_token", idToken: "id_token", accessTokenExpiresAt: "access_token_expires_at", refreshTokenExpiresAt: "refresh_token_expires_at", createdAt: "created_at", updatedAt: "updated_at" } },
  verification: { modelName: "verifications", fields: { expiresAt: "expires_at", createdAt: "created_at", updatedAt: "updated_at" } },
  emailAndPassword: {
    enabled: true, requireEmailVerification: true, minPasswordLength: 10,
    sendResetPassword: async ({ user, url }) => { await mail(c, user.email, "Reset your Fluo password", "Use this link to choose a new password.", url); },
  },
  emailVerification: {
    sendOnSignUp: true, autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => { await mail(c, user.email, "Confirm your email for Fluo", "Confirm your email address to finish creating your Fluo account.", url); },
  },
  ...(e.google ? { socialProviders: { google: e.google } } : {}),
  plugins: [expo(), nextCookies()],                            // nextCookies must stay last
  });
}

type Auth = ReturnType<typeof create>;
const g = globalThis as unknown as { __fluoAuth?: Auth };
/** Created on first use (not at import), so builds and tooling do not need production secrets. */
export const getAuth = (): Auth => (g.__fluoAuth ??= create());
