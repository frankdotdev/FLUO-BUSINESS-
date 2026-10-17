# Fluo — Complete Operations Runbook, Environment Guide & International Architecture

This document is the definitive technical runbook for configuring, deploying, operating, and expanding Fluo in production.

---

## 1. System Requirements & Running Everything

### Prerequisites:
- **Node.js**: Version `>= 22.18.0` (Node 24 LTS recommended).
- **Package Manager**: `npm` (v10+) or `pnpm` (v9+).
- **Database**: PostgreSQL 16+ (or Supabase Postgres instance).

### Step-by-Step Installation & Run Guide:

```bash
# 1. Clone repository
git clone <your-repo-url>
cd fluo

# 2. Install workspace dependencies
npm install

# 3. Create your local environment configuration
cp .env.example .env
# Fill in your .env values (see detailed guide below)

# 4. Run idempotent database migrations
npm run db:migrate

# 5. Run the complete automated test suite
npm test

# 6. Start the Web application in development mode
npm run dev:web
# Web app will be running at http://localhost:3000

# 7. Start the Mobile application (React Native / Expo)
npm run dev:mobile
# Metro bundler will start for iOS/Android

# 8. Build Web application for production deployment
npm run build
```

---

## 2. Exhaustive Environment Variables & API Keys Guide

Below is every required and optional environment variable in Fluo, how to obtain it, and exact URL formats.

### A. Core Application & Secrets
| Variable | Description | How to Obtain / Configure |
| :--- | :--- | :--- |
| `APP_URL` | Public base URL of your web app | In local dev: `http://localhost:3000`. In production: `https://fluo.ng` or `https://yourdomain.com` (no trailing slash). |
| `NODE_ENV` | Environment mode | `development` or `production`. |
| `PORT` | Web server listening port | Defaults to `3000`. |
| `BETTER_AUTH_SECRET` | 32-byte secret for session cookies | Generate via command: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `TICKET_HMAC_SECRET` | 32-byte cryptographic key for Escrow PINs and QR tickets | Generate a dedicated random 32-byte hex string. **Never change this key in production**, as it validates issued tickets and escrow PINs. |
| `COOKIE_SECRET` | Secret key for signing secure auth cookies | Random 32-byte hex string. |

---

### B. Paystack Configuration (Payments & Webhooks)
Fluo uses Paystack for automatic card payments, Apple Pay, USSD, and split merchant sub-accounts.

| Variable | Description | Exact Details |
| :--- | :--- | :--- |
| `PAYSTACK_SECRET_KEY` | Paystack API Secret Key | Starts with `sk_test_...` in test mode or `sk_live_...` in production. |
| `PAYSTACK_PUBLIC_KEY` | Paystack API Public Key | Starts with `pk_test_...` in test mode or `pk_live_...` in production. |

#### How to Obtain Paystack Keys:
1. Log in to your [Paystack Dashboard](https://dashboard.paystack.com).
2. Go to **Settings** &rarr; **API Keys & Webhooks**.
3. Copy **Secret Key** and **Public Key**.

#### Exact Webhook Configuration:
In the Paystack Dashboard under **API Keys & Webhooks**:
- **Webhook URL**:
  ```text
  https://yourdomain.com/api/webhooks/paystack
  ```
  *(In local development, use an ngrok or Cloudflare Tunnel URL, e.g., `https://random-subdomain.ngrok-free.app/api/webhooks/paystack`)*.
- **Webhook Events to Enable**:
  - `charge.success` (triggers order payment confirmation, ticket issuance, escrow hold, and group cart updates).

#### Exact Callback URL Logic:
You do **not** need to hardcode a static callback URL in Paystack settings because Fluo dynamically passes the exact context-aware callback URL on every checkout initialization:
- Standard Orders: `${APP_URL}/account/orders/${orderId}?b=${businessId}`
- Guest Orders: `${APP_URL}/g/${guestToken}`
- Group Cart Split Payment: `${APP_URL}/cart/${shortCode}?paid=${contributionId}`
- Event Tickets: `${APP_URL}/t/${ticketToken}`
- Subscription Upgrades: `${APP_URL}/app/${businessId}?tab=billing`

---

### C. Cloudflare R2 / S3 Object Storage (Media & Logos)
Used for direct-from-browser photo uploads, product images, and event posters.

| Variable | Description | How to Obtain / Configure |
| :--- | :--- | :--- |
| `R2_ACCOUNT_ID` | Cloudflare Account ID | In Cloudflare dashboard, go to **R2** &rarr; copy **Account ID** from right sidebar. |
| `R2_ACCESS_KEY_ID` | S3 Access Key ID | In Cloudflare R2, click **Manage R2 API Tokens** &rarr; **Create Token** with *Object Read & Write* permissions. |
| `R2_SECRET_ACCESS_KEY` | S3 Secret Access Key | Revealed once upon creating the R2 API Token. |
| `R2_BUCKET_NAME` | R2 Bucket name | E.g. `fluo-media-production`. Create via **R2 &rarr; Create Bucket**. |
| `R2_PUBLIC_URL` | Public CDN URL for images | In bucket settings, connect your custom domain (e.g. `https://media.fluo.ng`) or enable R2.dev subdomain. |

---

### D. PostgreSQL Database (Supabase or Self-Hosted)
| Variable | Description | Exact Format |
| :--- | :--- | :--- |
| `DATABASE_URL` | Primary PostgreSQL connection string | `postgresql://postgres:[password]@db.[project-id].supabase.co:6543/postgres?pgbouncer=true` (Port 6543 for Supabase Transaction Pooler, or port 5432 for dedicated VPS PostgreSQL). |
| `DIRECT_URL` | Direct connection string for DDL migrations | `postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres` (Always uses direct port 5432 without connection pooler for schema migrations). |

---

### E. Email Outbox & Push Notifications
| Variable | Description | How to Obtain / Configure |
| :--- | :--- | :--- |
| `SMTP_HOST` | Outgoing SMTP mail server | E.g. `smtp.resend.com` or `smtp.postmarkapp.com`. |
| `SMTP_PORT` | SMTP port | `587` (TLS) or `465` (SSL). |
| `SMTP_USER` | SMTP username | Provided by Resend (`resend`) or Postmark API Token. |
| `SMTP_PASS` | SMTP password | API Key from your email provider. |
| `SMTP_FROM` | Sender address | E.g. `Fluo <notifications@fluo.ng>`. Must be a verified domain. |
| `EXPO_ACCESS_TOKEN` | Expo Push Token | From [Expo.dev](https://expo.dev) account settings &rarr; Access Tokens. |

---

## 3. Serving International Users Without Stripe

### Can International Users Pay on Fluo Today?
**YES.** Here is exactly how international commerce works on Fluo before adding a dedicated Stripe account:

#### 1. Paystack International Card Processing:
- Paystack natively processes international cards across 150+ countries.
- In your Paystack Dashboard, go to **Settings &rarr; Preferences** and ensure **"Accept International Cards"** is enabled.
- International buyers in the USA, UK, Canada, Europe, or Asia can checkout on any Fluo store using:
  - Any **Visa, Mastercard, or American Express** card issued worldwide.
  - **Apple Pay** directly on their iPhone or Mac browser.
- **Currency Conversion**: The buyer is charged in their local currency (e.g. USD, GBP, EUR) based on their card issuer's interbank exchange rate, while the Nigerian merchant receives the agreed Naira sum in their account.

#### 2. Multi-Currency Accounts (Paystack & Flutterwave):
- If your registered entity is in Nigeria, Ghana, Kenya, or South Africa, Paystack can settle into a local currency account or a USD Domiciliary bank account.
- **Flutterwave Advantage**: Flutterwave supports direct native billing in USD, GBP, EUR, and 30+ African currencies (GHS, KES, ZAR, RWF, XOF). Because Fluo's payment architecture uses an abstract `PaymentProvider` adapter (`packages/core/src/services/ports.ts`), a Flutterwave adapter can run side-by-side with Paystack.

#### 3. Seamless Future Stripe Integration:
Fluo was engineered with strict **Hexagonal Architecture (Ports and Adapters)**. Core commerce logic (`orders.ts`, `escrow.ts`, `group-cart.ts`) does not know whether Paystack, Stripe, or Flutterwave processed the card.
When you are ready to expand to the US/UK/EU with Stripe:
1. Create `packages/adapters/src/stripe.ts` implementing `PaymentProvider`.
2. Map `charge.succeeded` webhooks to Fluo's `handlePaymentSuccess()`.
3. Zero database schema changes are required.

---

## 4. POS Kiosk Mode — Complete Retailer Breakdown

### Is POS Kiosk Available for Retailers?
**YES.** Every merchant on Fluo has direct access to the built-in POS Kiosk mode from Day 1.

### Where to Find It:
Every workspace dashboard features a prominent **"POS Kiosk"** button in the header, or direct route:
```text
https://fluo.ng/app/[businessId]/kiosk
```

### How Does It Work in Practice? (Cashier Walkthrough):
1. **Hardware Setup**:
   - The shopkeeper or cashier mounts a tablet, iPad, touchscreen laptop, or smartphone at the checkout counter.
   - (Optional) Connect any standard USB/Bluetooth handheld barcode scanner and any standard 58mm or 80mm wireless thermal receipt printer.
2. **Adding Items to Cart**:
   - Tap any item on the left screen catalog grid (large touch-friendly cards with prices in green).
   - Or scan the barcode on the physical item with the scanner (instantly adds to ticket).
   - Cashier can adjust quantity with single taps (`+` or `-`).
3. **Calculating Cash & Change**:
   - Total updates instantly on the right.
   - When the customer hands over cash (e.g., a ₦5,000 note for a ₦3,400 bill), cashier taps **`+5000`**.
   - Fluo displays in bold green: **"Change to return: ₦1,600"**.
   - Cashier never has to do mental math or write on paper.
4. **Instant Receipt Printing**:
   - Cashier taps **"Cash Paid"**.
   - The ticket records to the database and displays **"Receipt Ready"**.
   - Cashier taps **"Print Receipt"**: The connected thermal printer rolls out a clean, professional receipt with the store's name, itemized products, total, cashier name, and `"Powered by Fluo"`.
5. **Card / Bank Transfer Option**:
   - If the customer prefers to transfer or pay online, cashier taps **"Transfer / QR"** to display the store's verified account number or instant QR scan code.
6. **End-of-Day Balancing**:
   - At closing time, the owner views the Orders tab to see exact cash collected vs. transfers confirmed, reconciling stock and revenue in seconds.
