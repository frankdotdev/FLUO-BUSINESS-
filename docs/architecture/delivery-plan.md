# Delivery Plan: Web First, Mobile After

Shared code is built once and used by both. Repository layout:
- `packages/core` (done): money, capabilities, business types, authz, payments logic, pricing, routes, availability.
- `packages/ui-tokens` (next): design tokens exported for web and React Native.
- `apps/web` (next): Next.js PWA, strict TypeScript.
- `apps/mobile` (after web is stable): Expo app using the same API contract and `core` package.

## Order
1. Web foundation: Better Auth, users, workspaces, memberships, `authorize()` on every request, cross-tenant tests against a real database.
2. Public pages from the route scheme (storefront, product, service, event) with guest-first access.
3. Business onboarding driven by the business-type registry; tailored dashboards by capability.
4. Orders and Paystack split payments with verified webhooks.
5. Bookings (availability engine) and events/tickets with QR check-in.
6. Chat, notifications, verification flows, admin review queue.
7. Mobile app on the same contracts.

## Constraints on this build environment
The sandbox has no network, so I can write code and run pure-logic tests but cannot install Next.js, Better Auth or Drizzle, or run Postgres. Those steps run on your machine; each phase lists commands to verify.

## Status of the shared core (all unit-tested, none wired to a database or UI yet)
Money, capabilities, 71 business types, authorisation, payment routing/fees/methods/webhooks, pricing and entitlements, routes, availability, cart pricing, order lifecycle, ticket sales/QR/check-in, guest links, image policy.
