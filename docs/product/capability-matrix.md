# Business Capability Matrix

**Status:** in progress (draft). Business types are configuration that enable capabilities; code asks "does this business have capability X", never "is it a barber".

| Capability | Retail | Food | Made-to-order | Barber/Salon | Repair | Events | General |
|---|---|---|---|---|---|---|---|
| catalogue (products/menu) | ● | ● | ● | | ○ | | ○ |
| inventory | ● | ○ | ○ | | ○ | | ○ |
| orders | ● | ● | ● | | | | ○ |
| custom_orders (lead time, deadlines) | | | ● | | | | |
| services | | | | ● | ● | | ○ |
| bookings + availability | | ○ (reservations) | | ● | ● | | ○ |
| job_cards (status, quotes) | | | | | ● | | |
| events + ticketing | | | | | | ● | ○ |
| customers (CRM-lite) | ● | ● | ● | ● | ● | ● | ● |
| staff + permissions | ○ | ○ | ○ | ● | ○ | ○ | ○ |
| messaging | ● | ● | ● | ● | ● | ● | ● |
| promotions | ● | ● | ○ | ○ | | ○ | ○ |

● default on · ○ optional · blank unavailable by default. A business may enable more later (e.g. phone repair + retail).
