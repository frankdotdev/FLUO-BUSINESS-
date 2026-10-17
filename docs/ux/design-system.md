# Fluo Master Design System & UI/UX Specification

## 1. Visual Language & Core Philosophy
Fluo is an adaptive multi-tenant commerce, marketplace, and operational platform designed for emerging markets, university campuses, and distributed retail. Its aesthetic is minimal, high-utility, modern, and trustworthy.

- **Primary Canvas:** Clean white (`#FFFFFF`) with subtle neutral backgrounds (`#F7F8FA`) and gentle dark mode alternatives (`#0E1013` / `#181B20`).
- **Typography:** High-contrast charcoal text (`#171A1F`), muted secondary labels (`#69717D`), tabular numerals for monetary values (`font-variant-numeric: tabular-nums`).
- **Accents:** Restrained energetic coral (`#F16F61` / `#E05A4C`) used strictly for primary callouts, floating action controls, active indicators, and brand marks.
- **Borders & Dividers:** Crisp hairline light gray borders (`#E5E7EB` / `#F0F2F5`).
- **Icons:** Thin-stroke outlined SVG icons exclusively from **Lucide** (zero emojis anywhere across the user interface).
- **Surfaces:** Clean rounded cards (`14px` - `16px` border-radius), restrained elevations (`box-shadow: 0 1px 3px rgba(0,0,0,0.04)`), no gimmicky glassmorphism or distracting gradients.

---

## 2. Dropify Reference Hierarchy & Mobile Navigation

### A. Minimalist Launch Screen
- Centered brand wordmark: **Fluo** with coral dot accent (`#F16F61`).
- Minimalist 3-dot pulse animation below the wordmark.
- Auto-fades smoothly after initial bundle hydration.

### B. Mobile & Desktop Top Bar (`Header`)
- **Left:** Bold Fluo wordmark + coral dot.
- **Location Selector Pill:** Interactive location indicator with Lucide pin icon (`IconMapPin`) and chevron (`Campus / Lagos ▾`).
- **Right Controls:**
  - Workspace Switcher badge (`IconStore`) when user manages businesses.
  - Notification Bell (`IconBell`) with unread badge counter (`notif-count`).
  - Personal Account circular avatar or Sign In button.

### C. Home Discovery Screen Layout
1. **Hero Greeting:** Personalized greeting (`Welcome back, [Name]`) or Dropify default (`Your next find is just a search away`).
2. **Prominent Search Bar:** Wide container with leading `IconSearch`, input placeholder, and trailing filter button (`IconSliders`) directing to `/search`.
3. **6-Tile Compact Category Grid:**
   - **Food** (`IconUtensils` -> `/search?group=food`)
   - **Mart** (`IconShoppingBag` -> `/search?group=retail`)
   - **Salons** (`IconScissors` -> `/search?group=beauty`)
   - **Rides** (`IconCar` -> `/search?q=keke`)
   - **Events** (`IconTicket` -> `/search?group=events`)
   - **Stays** (`IconBuilding` -> `/search?q=stay`)
4. **Editorial Horizontal Carousel ("What's new on Fluo"):**
   - High-contrast card carousels showcasing campus food spots, logistics/errands, and merchant signups.
5. **Popular Near You:**
   - Displays live businesses or rich campus fallback cards with rating (`4.9 ★` via `IconStar`), distance indicator, open/closed status, and price tier.
6. **Your Regular Spots:**
   - Saved favorites list for fast 1-tap reordering.
7. **Escrow Trust Banner:**
   - Highlighting Fluo Escrow Protection (`IconShield`) for guest and authenticated orders.

### D. Mobile Bottom Navigation Bar (`BottomNav`)
- Fixed at the bottom of the viewport (`height: 64px`, `z-index: 50`) with `safe-area-inset-bottom` padding.
- 5 Destinations:
  1. **Home:** `IconHome` (`/`)
  2. **Regulars:** `IconHeart` (`/search?filter=favorites`)
  3. **Floating Action Button:** Coral pill/circle with `IconPlus` (`#F16F61`) opening the Quick Action Bottom Sheet:
     - *Start a Group Cart* (split bills and order together)
     - *Request a Ride / Dispatch* (negotiate fare with riders)
     - *Open a Business on Fluo* (30-day Free Trial)
  4. **Chats:** `IconMessageSquare` (`/account/messages`)
  5. **Profile:** `IconUser` (`/account`)

---

## 3. Non-Negotiable Business & Domain Rules

1. **Guest Checkout:** Guests CAN complete purchases without mandatory account sign-up. Guest orders generate secure, 30-day cryptographically verifiable order links.
2. **30-Day Free Trial:** New businesses receive an automatic 30-day free trial on all plans. No credit card or upfront deposit required.
3. **Single Account & Multi-Context Switching:** A single user identity can shop as a customer, join group carts, and switch between multiple merchant workspaces (owner, admin, staff) without logging out.
4. **Escrow Protection:** Customer funds are held safely in escrow on custom delivery orders and bookings until delivery inspection or service completion is acknowledged.
