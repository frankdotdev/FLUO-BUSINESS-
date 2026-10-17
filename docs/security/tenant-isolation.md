# Tenant isolation

**Status:** implemented in application code and schema; row-level security is deliberately not used yet (ADR-007).

1. **Every tenant-owned row carries `business_id`.** Child tables reference parents by `(id, business_id)` composite keys, so a row cannot point at another tenant's parent (for example, an order item cannot reference another business's product).
2. **Every business-scoped Store method takes `businessId`**, and its SQL filters on it. Ids from URLs are validated as UUIDs before they reach SQL.
3. **Authorisation is evaluated from memberships loaded for the signed-in user**, per request, against the business being acted on. Role names and business ids from the client are never trusted.
4. **Other tenants' records answer "not found"**, the same as records that do not exist, so ids cannot be probed.
5. **Tests:** cross-tenant read, write and action attempts exist for orders, bookings, payments, tickets, catalogue, messaging, invites and staff (`services.test.ts`, `ops.test.ts`, `messaging.test.ts`, `product.test.ts`, contract suite).

## Adding a table
Give it `business_id`, a composite unique `(id, business_id)` if anything will reference it, composite foreign keys from children, a Store method that takes `businessId`, and a cross-tenant test in the contract suite. A pull request without those is not done.
