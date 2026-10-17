# User flows (web and mobile)

**Status:** describes what is built. Gaps are marked.

## Web: what comes first
The first screen is the **landing page `/`**: tagline, a button to open a business, upcoming events, and live businesses. A person arriving from a shared link never sees it: links open the exact resource.

| Link | Opens |
|---|---|
| `/b/{business}` | storefront: items, refund policy, payment options, Message button |
| `/p/{name}-{id}` | an item with its order form |
| `/r/{name}-{id}` | a bookable thing (room, court, appointment) with day and time picker |
| `/e/{name}-{id}` | an event with ticket choices |
| `/g/{secret}` | a guest's own order or booking |
| `/t/{signed}` | a ticket with its QR code |
| `/invite/{secret}` | a staff invitation |

### Customer buying (no account needed)
Landing -> storefront -> item -> choose quantity and (if made to order) date -> name and email -> pick **Pay now** (Paystack, money goes straight to the business) or **Transfer** -> order page `/g/...`.
- Transfer: the page shows the bank, the account number in bold, the exact amount and a reference. After sending, the customer taps **I have transferred**; the business is alerted, confirms from its dashboard, and the customer gets "payment confirmed".
- After buying, the customer can sign up to keep orders in one place.

### Customer booking
Booking page -> pick dates (rooms) or day, length, then an available time (appointments, courts) -> details -> pay or transfer (held 15 minutes or 2 hours) -> confirmation email, then reminders 24 hours and 2 hours before, to both sides. Cancellation follows the business's refund policy shown before paying.

### Customer tickets
Event page -> ticket and holder details (up to 4) -> free: ticket with QR immediately; paid: Paystack, then the ticket by email within seconds. At the gate, staff scan the QR with the camera (or type the code); a ticket admits once.

### Chat
Storefront -> Message (sign-in required) -> `/account/messages`. The business replies in its Messages tab; each side is alerted by email or push.

### Business owner
`/sign-up` -> confirm email -> `/app` (your workspaces) -> **Open a business** (pick a type, name, refund policy) -> **Payments** (choose automatic, manual or both; verify payout account and/or add the account number customers will see) -> add items / bookables / events -> **Publish** (starts the free month with Business-plan features) -> share the page link. A banner and reminders (7, 3, 1 days, end, and a week after) lead to choosing a plan. Cancelling a plan is one tap; nothing is deleted when a plan ends (extras are paused).

### Staff
Owner or admin invites by email -> `/invite/...` -> sign in with that address -> accept -> sees only the tabs their role allows (cashier: orders and payments; staff: orders, bookings, check-in, messages; manager: also items, events, refunds; admin: everything except billing and payout; owner: all).

### Each business sees its own tools
Tabs come from the business type's capabilities, named in its own words (hotel: **Reservations**, salon: **Appointments**, restaurant: **Menu**, retail: **Products**, event organiser: **Events**, general: **Enquiries**). See the generated `business-type-support.md` for every type. Only the 21 types whose tools exist can be opened today.

## Mobile (Expo)
First screen: **Explore** (live businesses) with tabs **Explore**, **Events**, **Account**. Tap a business -> items -> **Order** opens the same web checkout in an in-app browser (same rules, payments and security). **Account**: sign in or create an account, My orders and bookings, Messages, Manage my business (web dashboard), turn on push notifications. Tapping a notification opens the matching page. Native checkout, a tickets wallet and native workspace screens are not built; they need write endpoints under `/api/v1` first (see `api-contract.md`).

## Who is told what, and when
| Event | Customer | Business |
|---|---|---|
| Transfer order placed | email: how to pay | none until they say they paid |
| "I have transferred" | none | push and email now, nudges at 1 h, 6 h, 24 h until confirmed |
| Payment confirmed (any method) | email and push: confirmed | new order alert |
| Booking confirmed | email and push, reminders 24 h and 2 h before | new booking alert, reminder 2 h before |
| Booking cancelled | email and push with refund note | cancellation and, if due, a refund request |
| Ticket issued | email with the ticket link | none |
| Refund recorded | email and push | none |
| New chat message | email and push (max one per 10 min per thread) | same |
| Trial ending, ended, plan renewal | none | email and push: 7, 3, 1 days, on the day, +7 days |
Critical mail (confirmations, tickets, refunds) is sent first when the email budget is tight.
