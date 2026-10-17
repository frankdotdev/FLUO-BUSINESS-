# Business Vertical Catalogue (expanded)

**Status:** planned. Implemented so far: a registry of 71 business types as versioned configuration in
`packages/core/src/platform/business-types.ts`, with unit-tested capability dependency and regulation rules.
No dashboards, storefronts or workflows exist yet.

## How the ~100 requested businesses map to a few engines
Specialised systems are built progressively; discovery supports all of them from day one.

| Engine (shared) | Capabilities | Serves |
|---|---|---|
| Product commerce | catalogue, inventory, orders, delivery, wholesale_pricing, batch_expiry, custom_orders | retail, supermarkets, wholesalers, fresh produce, water/gas, bakery, caterer, spare parts, farms, manufacturers, gifts, digital sellers |
| Appointments | services, bookings, recurring_schedules | barber, salon, spa, tutor, consultant, photographer, cleaning, car wash, clinics (later) |
| Resource & date-range booking | resource_booking, rentals, housekeeping | hotels, guest houses, short-lets, hostels, venues, coworking, car rental, equipment rental, sports courts |
| Ticketed events & seats | events_ticketing, seat_inventory | organisers, attractions, nonprofits, bus operators |
| Job / quote workflow | job_cards, quotes, documents | technicians, auto repair, construction, printing, tailors, interior/furniture |
| Listings & enquiries | listings, enquiries, bookings (viewings/test drives) | real estate, car dealers |
| Membership & classes | memberships, classes | gyms, studios, driving school, schools |
| Dispatch | dispatch, quotes | courier, logistics |

Resource booking is deliberately **not** one availability rule: hotels (nights), venues (time blocks), beds (bed-level),
vehicles (rental periods) are configured as different availability policies on the same engine. This is an open design item.

## Regulation flags (enforced in tests)
`licensed`: pharmacy, clinic, lab, dental/optical, veterinary, lawyers/accounting. `sensitive_data`: school, security/facility, car rental.
Rules: requires verification before the capability goes live; never in the MVP tier; no clinical notes, results or prescription
workflows on public pages; pharmacy flows must not bypass prescription rules. Clinical-record or lab-information systems are
separately scoped, security-reviewed modules, not part of Fluo core.

## Tiers
- **mvp:** retail, restaurant, bakery, salon/barber, technician, event organiser, general.
- **launch:** most remaining types, built progressively by demand and reuse of engines (see registry).
- **later:** all regulated/sensitive types, construction, interior/furniture, driving school, bus operator.
- **Universal fallback:** `general` lets any owner turn on the capabilities they need; new types are added as versioned config.

## Still to specify per category (not yet written)
Onboarding questions, storefront layout, dashboard layout, status transitions, notifications, reports, mobile behaviour.
