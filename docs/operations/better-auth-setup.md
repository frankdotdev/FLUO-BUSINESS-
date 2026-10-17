# Better Auth Setup (Next.js + Postgres + Google)

**Status:** instructions only; not yet executed in this repo (no network in the build sandbox). Steps follow Better Auth's documented flow as found on 2026-10-09; check https://www.better-auth.com/docs/installation for current syntax.

1. **Install:** `npm i better-auth drizzle-orm pg` and `npm i -D drizzle-kit`.
2. **Environment (`.env.local`, never committed):** `BETTER_AUTH_SECRET` (long random, e.g. `openssl rand -base64 32`), `BETTER_AUTH_URL` (e.g. `http://localhost:3000`), `DATABASE_URL` (Supabase *pooled* connection string), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, Gmail SMTP variables.
3. **Auth instance (`src/server/auth.ts`):** `betterAuth({ database: drizzleAdapter(db, { provider: "pg" }), emailAndPassword: { enabled: true, requireEmailVerification: true, sendResetPassword }, emailVerification: { sendVerificationEmail }, socialProviders: { google: { clientId, clientSecret } }, plugins: [nextCookies()] })`. `nextCookies()` is needed so sessions work in Server Components and Actions. Send the emails through our `EmailProvider` interface (Gmail SMTP now, Resend later).
4. **Generate tables:** `npx @better-auth/cli@latest generate` produces the Drizzle schema (user, session, account, verification). Then `npx drizzle-kit generate` and `npx drizzle-kit migrate`.
5. **Reconcile with Fluo's schema:** migration 0001 defines `users` and `auth_identities`. Either map Better Auth onto them (its `modelName` options) or drop those two tables and let the generated ones be the source of truth. Domain tables must reference the user's primary key. **Check:** Better Auth's default IDs are strings; confirm the current option for UUIDs, or make the foreign keys `text`.
6. **Route handler:** `app/api/auth/[...all]/route.ts` with `export const { GET, POST } = toNextJsHandler(auth)`.
7. **Client:** `createAuthClient()` from `better-auth/react`; use `signIn.social({ provider: "google", callbackURL })`, `signIn.email`, `useSession()`.
8. **Google Cloud Console:** create an OAuth client (Web application). The authorised redirect URI must match exactly: `http://localhost:3000/api/auth/callback/google` locally and `https://YOUR_DOMAIN/api/auth/callback/google` in production. A mismatched URI is the most common failure.
9. **Route protection:** Next.js 16 uses `proxy.ts` instead of `middleware.ts`. The proxy is only a fast redirect; real authorisation happens in server code (next step).
10. **Business authorisation:** Better Auth answers "who is this user". It does not answer "what may they do in business X". Always load the user's memberships server-side and call `authorize()` from packages/core. Never trust a role or business ID from the client.
11. **Mobile (Expo):** Better Auth has an Expo integration; check current docs when the app starts.
12. **Test:** sign up, verify email, sign in with Google, reset password, revoke a session, and run the cross-tenant tests.
