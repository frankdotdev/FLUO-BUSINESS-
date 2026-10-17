# Fluo Platform — Comprehensive Features & Architecture Guide

Fluo is a full-stack multi-tenant commerce and operations operating system built specifically for emerging markets, university campuses, and distributed retail networks. It bridges physical street commerce and online convenience through zero-latency order routing, cryptographic escrow protection, multi-tenant POS cash registers, shared group payment carts, on-demand mobility dispatch, and gate-level QR ticketing.

---

## 1. Multi-Tenant Workspace & Module Engine
Every business on Fluo is an isolated workspace governed by role-based access control (RBAC), tenant database scoping, and dynamic capability activation.

### How It Works:
- **Role Isolation**: Supports three distinct team tiers: `owner` (full business control, banking payout modification, ownership transfer), `admin` (catalog, orders, discounts, staff invitation), and `staff` (POS register, cashier duties, order fulfillment, delivery verification).
- **Dynamic Module Tabs**: When a merchant creates a business, Fluo inspects the vertical type (e.g. `retail`, `restaurant`, `beauty`, `hotel`, `mobility`, `events`) and selectively enables relevant modules:
  - `catalogue`: Product catalog, inventory control, and made-to-order preparation times.
  - `orders`: Online delivery and pickup order dispatch with live status transitions.
  - `kiosk`: High-speed touch POS cash register for physical counters.
  - `bookings`: Resource reservations and appointment scheduling.
  - `events_ticketing`: Venue events, tier capacities, and offline-verifiable QR gate passes.
  - `mobility`: Keke, bike, van, and courier ride hailing with real-time bidding.
  - `messages`: Tenant-isolated buyer-to-seller live messaging with unread tracking.
  - `payments`: Bank transfer configuration, Paystack sub-account linking, and payout accounts.
  - `team`: Staff seat invitations, role management, and cryptographic email tokens.
  - `billing`: Subscription tier management, order usage limits, and overage tracking.

---

## 2. Escrow Delivery Hand-Off & Dispute Engine
Physical deliveries in emerging markets often suffer from mutual distrust: buyers fear paying upfront and never receiving goods, while sellers and riders fear dispatching goods and getting scammed by fake bank transfer screenshots.

Fluo solves this with a **Zero-Custody Cryptographic Escrow Engine** (`packages/core/src/commerce/escrow.ts`):
- **Deterministic Key Derivation**: When a buyer chooses Escrow Protection during checkout, Fluo uses HMAC-SHA256 (`env.TICKET_HMAC_SECRET` + `orderId`) to derive:
  1. A **4-digit numeric Delivery PIN** (e.g. `4819`).
  2. A **tamper-proof signed QR delivery token**.
- **Zero Plaintext Storage**: The database stores only one-way cryptographic hashes (`release_pin_hash` and `qr_secret_hash`). Even if the database is exposed, delivery PINs cannot be extracted or forged.
- **Delivery Inspection**:
  - The buyer inspects the package when the courier arrives.
  - If satisfied, the buyer reveals the 4-digit PIN or displays the QR code on their phone screen.
  - The rider or merchant enters the PIN into Fluo or scans the QR code.
  - Fluo validates the token in constant-time (`timingSafeEqual`) and transitions the order from `held` to `released`, releasing payment to the merchant.
- **Dispute Resolution**: If goods arrive broken, incomplete, or wrong, the buyer clicks **"Report an issue / dispute delivery"** directly on their tracking page. The order immediately transitions to `disputed`, freezing funds while customer support reviews photo evidence and initiates a full or partial refund.

---

## 3. Group Cart & Split Payment Engine
Group orders (friends splitting food deliveries, student roommates buying groceries, coworkers ordering lunch) frequently fail because one person is forced to foot the entire bill and chase friends for bank transfers.

Fluo's **Group Cart Engine** (`packages/core/src/commerce/group-cart.ts` & `apps/web/src/app/cart/[shortCode]/page.tsx`):
- **One-Click Cart Creation**: Anyone can start a group cart for any business with a single tap, generating a short shareable link (e.g. `fluo.ng/cart/K9X2B4`).
- **Menu Item Pooling**: Any friend who opens the link can browse the store's menu, select items, specify quantity, and enter their name. The cart displays live who added what (e.g., *"Ada added 2x Jollof Rice"*, *"Tunde added Shawarma & Chapman"*).
- **Split Modes**:
  - **Itemized Split**: Each friend pays exactly for the items they added.
  - **Equal Share Split**: Fluo calculates `total / memberCount`, rounding up pennies to avoid underfunding.
- **Live Progress Meter**: A visual progress bar updates in real time showing funded progress (e.g., *₦8,500 / ₦12,500 — 68% funded*).
- **Independent Paystack Checkouts**: Each friend pays their own share using their card, Apple Pay, or bank transfer via Paystack. Fluo records each contribution as `paid` upon webhook confirmation.
- **Auto-Dispatch at 100%**: The instant the target sum is reached, the group cart marks as `funded`, automatically placing the unified order with the merchant as a single consolidated ticket.

---

## 4. Multi-Tenant POS Kiosk Mode
Designed for physical retail stores, tuck shops, campus cafeterias, and boutique counters (`apps/web/src/components/pos-register.tsx`):
- **Full Touch Register Interface**: Works seamlessly on tablets (iPad, Android), laptops, or touch POS terminals.
- **Instant Product Search & Barcode Support**: Cashiers can type product names or scan barcodes with a USB/Bluetooth scanner for instant item lookup.
- **One-Tap Quantity Modifiers**: Real-time addition, subtraction, and line total calculations.
- **Rapid Cash Tender Calculator**: Includes quick cash buttons (`+₦1,000`, `+₦2,000`, `+₦5,000`, exact amount) with automatic change computation (e.g., Bill: ₦3,400, Tendered: ₦5,000, **Change to return: ₦1,600** in bold green).
- **Integrated Hardware Printing**:
  - **Browser Print**: Automatically formatted with print CSS for 58mm and 80mm thermal receipt rolls.
  - **Plain Text ESC/POS Drawer**: Displays raw monospace ESC/POS stream for Bluetooth portable belt printers used by mobile couriers and pop-up vendors.
- **Full Offline Tolerance**: If internet cuts out temporarily, the POS register keeps operating locally, accumulating sales for sync.

---

## 5. Mobility, Dispatch & Counter-Offer Bidding Engine
Campus and local community transportation suffers from fixed unfair pricing and lack of safety:
- **Vehicle Types**: Supports `keke` (tricycle), `bike` (motorcycle okada), `car` (taxi/cab), `van` (cargo moving), `courier` (dispatch delivery), and `private_driver`.
- **Passenger Ride Requests**: Passengers choose pickup and destination, calculate route distance, and state their own initial price offer in Naira.
- **Counter-Offer Negotiation Protocol**:
  - Nearby drivers receive the request and can either accept the passenger's offer or submit a counter-offer (e.g. Passenger offered ₦1,500; Driver counters with ₦1,800).
  - Passenger can accept the counter-offer or wait for another driver.
- **Delivery Integration**: Merchants dispatching orders can link a `delivery_order_id` to a ride request, tracking the dispatch rider from restaurant kitchen to customer doorstep.
- **Driver Verification**: Vetted licenses, number plates, and safety ratings.

---

## 6. Bookings, Stays & Appointment Calendar
For salons, barbers, shortlet apartments, boutique hotels, and rental gear:
- **Multiple Policy Kinds**:
  - `nights`: Hotel rooms and shortlets priced per night with fixed check-in (14:00) and check-out (11:00) times.
  - `time_block`: Salons, football pitches, conference rooms booked in 30-min, 60-min, or custom increments.
  - `bed`: Student hostels and shared dormitories booked per bed per semester/night.
  - `rental_period`: Car rentals and photography gear.
- **Postgres Exclusion Constraints**: Guarantee 100% zero double-booking even under concurrent simultaneous booking spikes.
- **Lapsed Hold Cleanup**: Reservations held during bank transfer checkout are reserved for 2 hours; if payment is not marked, Fluo automatically frees the slot for other customers.

---

## 7. Event Ticketing & Gate QR Check-In
For campus parties, trade fairs, concerts, seminars, and club events:
- **Tiered Capacities**: Unlimited ticket tiers (Early Bird, Regular, VIP, Table for 5) with strict atomic capacity decrementing in the database.
- **Signed HMAC Offline-Verifiable Passes**: Each ticket is encoded with an HMAC-SHA256 signature containing `ticketId` and `eventId`.
- **Gate Scanner Web App**: Security bouncers and gate staff open `/app/[businessId]?tab=events&checkin=true` to scan attendee QR codes using their phone camera:
  - Validates pass in milliseconds.
  - Prevents screenshot duplication (marks ticket as `used` with atomic compare-and-set).
  - Flags invalid, expired, or counterfeit tickets immediately with clear red alerts.

---

## 8. Branded Receipts Engine
Every customer and merchant receipt is a professional brand asset (`packages/core/src/commerce/receipts.ts` & `apps/web/src/app/receipt/[id]/page.tsx`):
- Prominently showcases the merchant's business name and official URL (`fluo.ng/b/business-slug`).
- Includes customer name, itemized products/services, unit prices, subtotal, and total paid.
- Shows payment method (Provider / Bank Transfer), Paystack reference, and Escrow status badge.
- Branded footer: `Powered by Fluo` with lightning icon indicator.
- Dual-format output: Responsive web HTML receipt + ESC/POS monospace thermal receipt for standard 58mm/80mm POS receipt printers.

---

## 9. Customer Social Hub & "Regulars"
To foster high customer retention across local businesses:
- **"I'm a Regular" Toggle**: Customers can save their favorite stores and food spots with one tap.
- **Personalized Home Feed**: Logged-in users see **"Your Regular Spots"** at the top of their discovery feed with quick-order buttons.
- **Live Operating Hours**: Displays real-time `Open` / `Closed` badges calculated against each merchant's configured weekly schedule and timezone (`Africa/Lagos`).
- **Dynamic Open Graph Social Sharing**: Sharing any store or product on WhatsApp, Twitter, or Instagram renders high-converting 1200x630 branded SVG cards generated on-the-fly (`/api/og`).

---

## 10. Tiered Pricing & Usage Overages
Fluo operates a hybrid subscription + volume monetization model:
- **Free Plan (₦0/mo)**: 1 workspace, 1 owner, up to 10 products, basic orders and customer records.
- **Starter Plan (₦3,000/mo)**: Up to 100 products, 2 staff accounts, custom branding, larger monthly transaction allowance.
- **Growth Plan (₦10,000/mo)**: Unlimited products, 5 staff accounts, advanced inventory alerts, lower overage fees, priority support.
- **Business Plan (₦25,000/mo)**: Multi-branch operations, custom roles, deep POS integrations, lowest transaction fees.
- **Auditable Usage Ledger (`order_usage_ledger`)**: Tracks completed sales per billing cycle with transparent calculation of platform usage fees.
