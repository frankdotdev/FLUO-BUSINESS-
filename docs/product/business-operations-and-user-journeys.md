# Fluo — Business Operations & User Journeys Playbook

This document details how every supported business type operates on Fluo, how customers interact with them, how business owners and their staff manage day-to-day operations, and the exact features activated for each vertical.

---

## 1. Retail Stores, Mini-Marts, Supermarkets & Boutiques

### What It Is & How It Operates:
Physical or hybrid retail stores selling packaged goods, campus groceries, electronics, fashion, thrift wears, cosmetics, and books. Operates both walk-in counter sales and delivery orders across campus or town.

### How the Customer Uses It:
1. **Discovery**: Customer visits `fluo.ng` or scans a QR poster at the shop entrance. They can also open direct links like `fluo.ng/b/campus-minimart`.
2. **Product Browsing**: Customer views categorized items with live stock counts, pricing in Naira, high-resolution photos, and product specs.
3. **Checkout Options**:
   - Customer adds items to cart.
   - Selects delivery address or in-store pickup.
   - Selects payment: Instant online payment (cards, Apple Pay, USSD) or verified manual bank transfer.
   - **Escrow Option**: Buyer can check *"Protect with Fluo Escrow"* to ensure payment is held until goods arrive.
4. **Order Tracking & Receipt**: Receives an instant private order link (`fluo.ng/account/orders/...` or `fluo.ng/g/...`) with live preparation status and a branded printable receipt.

### How the Business Operates It:
1. **Catalog & Stock**: Owner lists products, sets prices, barcodes, and defines stock alerts (e.g., alert when stock is under 5 items).
2. **Counter POS Kiosk**: Staff opens `/app/[businessId]/kiosk` on a tablet or desktop at the cash register.
   - Tap items or scan barcodes.
   - Enter cash tendered (e.g. ₦5,000 note) to see exact change to return.
   - Print thermal receipts (58mm or 80mm) with the business name and "Powered by Fluo".
3. **Dispatch & Delivery**: When an online order arrives, staff packages it, checks the delivery PIN when the rider or buyer picks it up, releasing escrow funds automatically.

---

## 2. Food Vendors, Restaurants, Bukkas & Campus Cafeterias

### What It Is & How It Operates:
Food joints, campus canteens, fast-food outlets, shawarma spots, bakeries, and cloud kitchens serving cooked meals, breakfast packs, and drinks. Often deals with made-to-order prep times and group lunch orders.

### How the Customer Uses It:
1. **Menu Browsing**: Customer views today's available meals, sides, drinks, and portion options.
2. **Made-to-Order Timing**: For bulk catering or pre-orders, the customer specifies the exact delivery time needed (e.g., *"Needed by 1:30 PM"*).
3. **Group Cart / Bill Splitting**:
   - One friend taps **"Group Cart"** on the restaurant page and shares the link on WhatsApp.
   - Friends join the link, pick their own meals (Ada picks Jollof + Chicken, Tunde picks Fried Rice + Beef).
   - Each friend pays their own individual share via Paystack.
   - Once all friends have paid, the single unified order is placed to the kitchen.
4. **Delivery Hand-Off**: When the food arrives at the hostel or office, the customer inspects the meal and gives their 4-digit PIN to the delivery rider to release the escrow.

### How the Business Operates It:
1. **Kitchen Order Feed**: Kitchen staff sees incoming orders with customized customer notes (e.g. *"Extra pepper on the stew"*, *"No onions"*).
2. **Walk-in Fast Counter**: Cashier uses POS Kiosk mode to process 50+ meal orders per hour during peak lunch hours.
3. **Stock & Portion Limits**: When a soup or protein runs out, staff taps "Sold Out", instantly disabling it from the public menu so customers don't order out-of-stock food.

---

## 3. Hair Salons, Barbershops & Beauty Spas

### What It Is & How It Operates:
Service-based personal care businesses offering haircuts, braids, lash extensions, manicures, pedicures, and skincare treatments with individual stylist stations or chairs.

### How the Customer Uses It:
1. **Service Selection**: Customer views service menu (e.g. Fade + Beard Sculpting ₦3,500, Knotless Braids ₦12,000).
2. **Slot Booking**: Selects a preferred date and available 30-minute or 1-hour time slot based on live stylist availability.
3. **Deposit or Full Payment**: Pays online or transfers to reserve the appointment slot.
4. **Reminders**: Customer receives automated SMS/email reminders 24 hours and 2 hours before the appointment.

### How the Business Operates It:
1. **Stylist & Chair Setup**: Owner adds resources (e.g. "Chair 1 - Emeka", "Chair 2 - Tobi", "VIP Braiding Room").
2. **Automated Conflict Prevention**: Fluo blocks overlapping bookings automatically and enforces turnaround cleaning buffers between clients.
3. **Check-In & Walk-Ins**: Staff checks in scheduled clients with a tap or adds walk-in clients on the fly through the workspace calendar.

---

## 4. Hotels, Shortlet Apartments & Student Hostels

### What It Is & How It Operates:
Overnight accommodations ranging from luxury shortlets, boutique guest lodges, and campus semester hostels with private rooms or shared beds.

### How the Customer Uses It:
1. **Room & Apartment Selection**: Customer selects check-in and check-out dates (with fixed check-in at 2:00 PM and check-out at 11:00 AM).
2. **Transparent Nightly Pricing**: System automatically computes total price based on number of nights, local currency, and refundable caution deposits.
3. **Reservation Hold**: Choosing bank transfer holds the room for 2 hours, giving the traveler time to complete their mobile banking transfer.
4. **Digital Check-In**: Customer receives reservation confirmation with address directions, host contact, and check-in instructions.

### How the Business Operates It:
1. **Room & Unit Inventory**: Manage individual room numbers (e.g. Room 101, Room 102, Penthouse Suite).
2. **Postgres Exclusion Constraints**: Ensures zero double-bookings across all platforms.
3. **Housekeeping Buffer**: Fluo automatically schedules turnaround buffers between checkout and the next guest's check-in.
4. **Caution Deposit Refunds**: Process partial or full damage deposit refunds directly from the dashboard after room inspection.

---

## 5. Campus Mobility, Keke Marwa, Bike Riders & Couriers

### What It Is & How It Operates:
Tricycle (keke) drivers, motorcycle (okada) riders, car taxis, shuttle vans, and motorcycle dispatch couriers operating on campus routes or inter-city deliveries.

### How the Customer Uses It:
1. **Request a Ride or Courier**: Passenger enters current location and destination.
2. **Passenger Fare Bidding**: Passenger proposes an opening fare offer in Naira (e.g. ₦1,000 for a trip across campus).
3. **Driver Negotiation**: Passenger receives driver acceptance or counter-offers (e.g. Driver offers ₦1,200). Passenger taps to accept the best deal.
4. **Live Arrival**: Passenger sees driver's vehicle info, plate number, and phone number.
5. **Favorite Driver**: After a great trip, passenger taps **"Save Favorite Driver"** to easily re-book them for future campus commutes.

### How the Driver Operates It:
1. **Driver App / Operator Status**: Driver toggles status between `available`, `on_trip`, and `offline`.
2. **Trip Requests Feed**: Driver receives nearby ride or parcel delivery requests within their operating radius.
3. **Counter-Offer Submission**: Driver can accept the customer's price or propose a counter-offer based on traffic or rain.
4. **Delivery Hand-Off**: Couriers ask for the customer's delivery PIN to confirm delivery and trigger immediate wallet payout.

---

## 6. Event Organizers, Club Parties & Conferences

### What It Is & How It Operates:
Organizers hosting campus music concerts, alumni reunions, student union parties, tech conferences, seminars, and networking mixers.

### How the Customer Uses It:
1. **Event Page Discovery**: Attendees visit `fluo.ng/e/campus-rave-2026` with venue, date, and DJ lineup.
2. **Tier Selection**: Attendees choose ticket tiers (e.g. Early Bird ₦2,000, Regular ₦5,000, VIP Table ₦50,000).
3. **Instant QR Ticket Issuance**: Upon payment, attendees receive a cryptographically signed QR ticket pass directly on their screen, with copy sent to their email.
4. **Apple Wallet / Offline Access**: Passes work 100% offline at the venue gate even if network coverage is jammed.

### How the Event Organizer Operates It:
1. **Capacity Caps**: Set strict ticket limits per tier; sales automatically halt when capacity is reached.
2. **Gate Staff Scanner**: Security guards at the gate open Fluo's camera gate scanner on their mobile browsers:
   - Scans attendee QR code.
   - Confirms validity in <100ms.
   - Atomically marks pass as `used`, making screenshot duplication impossible.
   - Flags fake or transferred passes immediately.

---

## 7. Services, Freelancers & Local Artisans

### What It Is & How It Operates:
Tailors, graphic designers, photographers, plumbers, electricians, makeup artists, and tutors offering custom skill-based work.

### How the Customer Uses It:
1. **Portfolio Viewing**: Customer inspects photo galleries of previous work (e.g. bespoke agbada outfits, photo shoots).
2. **Milestone Quotes**: Customer discusses requirements via Fluo's in-app seller messaging.
3. **Escrow Protection**: Customer pays for custom milestones through Fluo Escrow. Funds are released only after final deliverable inspection.

### How the Artisan Operates It:
1. **Lead Time Setup**: Define made-to-order notice periods (e.g., bespoke tailoring requires 72 hours).
2. **Deposit & Balance Invoicing**: Collect 50% deposit upfront and 50% upon final delivery handoff.
3. **Branded Invoicing**: Send professional branded receipts for corporate clients.

---

## 8. Campus Tuck Shops & Kiosks

### What It Is & How It Operates:
Small corner booths, stationery stalls, snack stands, and photocopying centers located inside campus halls of residence, faculties, and library complexes.

### How the Customer Uses It:
1. **Walk-Up Quick Purchase**: Student walks up to the stall for drinks, snacks, or exam pens.
2. **Cash or Transfer**: Student pays with cash or does a quick bank transfer to the stall's Fluo account.
3. **Receipt via SMS/WhatsApp**: Student gets an instant paperless receipt link for bookkeeping or reimbursement.

### How the Stall Owner Operates It:
1. **POS Kiosk Mode**: Stall owner keeps phone or small tablet on the kiosk desk with the POS Register running.
2. **Fast Tap Interface**: Large buttons for 20 top-selling campus items (soda, biscuits, notebooks, phone airtime, printing).
3. **Daily Sales Reconciliation**: At the end of the day, view total cash collected, bank transfers confirmed, and total profit with zero paper discrepancy.
