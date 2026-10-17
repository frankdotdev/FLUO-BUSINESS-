# Booking and Availability Engine

**Status:** logic implemented and tested (`availability.ts`); schema in migration 0003 (unexecuted).

One engine, four policies: `nights` (hotels, lodges, short-lets), `time_block` (venues, courts, rooms, appointments), `rental_period` (cars, equipment), `bed` (each bed is its own resource).

- Intervals are half-open: check-out and next check-in at the same instant do not conflict.
- A booking occupies its time plus a turnaround **buffer after it** (cleaning, vehicle prep).
- Requests are validated against minimum/maximum duration, granularity alignment, minimum notice and booking window.
- Customers pick a *group* (e.g. Deluxe room); the server assigns a specific free *resource*.
- **The database enforces no double-booking:** an exclusion constraint on (resource, blocked range) for active statuses, so two simultaneous requests end with one success and one retry. Resources reference their business through composite keys, so tenants cannot be mixed.
- Unpaid holds expire through a job (`held` to `expired`).

## Service flow (implemented in `booking-service.ts`, tested in memory)
1. Local dates and times are converted in the **business's own timezone** (`stayToInterval`), including daylight-saving edge cases.
2. `holdBooking` validates the request against the group's policy, prices it on the server (`booking-price.ts`: per night/hour/day/bed-night/flat), checks allowed payment methods, finds free units, and inserts a hold atomically. If a race takes one unit it tries the next; otherwise `fully_booked`.
3. Holds last 15 minutes for provider payments and 2 hours for manual transfers (`TRANSFER_HOLD_MINUTES`). Expired holds stop blocking immediately, and a maintenance job marks them expired.
4. A verified provider payment confirms the booking. **If payment arrives after the hold lapsed, nothing is confirmed and a refund-needed audit event is recorded.**
5. For manual transfers the business confirms (`confirmBookingTransfer`); lapsed holds cannot be confirmed.
6. Free bookings are confirmed immediately.

## Not done yet
Deposits, cancellation and rescheduling rules; refunds; recurring bookings and class seat-count bookings (gyms, classes need capacity counts, not single-resource locks); guest contact table in Postgres; Postgres Store; a rule for transfers the customer marked as sent but the business hasn't confirmed before the hold ends.
