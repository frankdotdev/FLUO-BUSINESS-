# Route and Link Scheme

**Status:** implemented as tested pure logic in `packages/core/src/platform/routes.ts`; web routes not built yet.

| Path | Resource |
|---|---|
| `/b/{slug}` | Business storefront. Slug is globally unique and human-readable |
| `/p/{slug}-{id}` | Product |
| `/s/{slug}-{id}` | Service |
| `/e/{slug}-{id}` | Event |
| `/r/{slug}-{id}` | Bookable resource group (room type, venue, vehicle) |

- `{id}` is an immutable 8-character code (lowercase Crockford base32). The page is found by id; if the slug part is stale the server redirects to the canonical path. Renaming never breaks shared links.
- Business renames keep a slug history so old links redirect (table not yet created).
- Reserved words (`admin`, `api`, `login`, `b`, `p`, `s`, `e`, `r`, and others) can never be business slugs. Collisions get `-2`, `-3`.
- Malformed or hostile paths are rejected before any lookup (tested).
- Private data is never in a public URL. IDs are not authorisation: every request is authorised server-side.
- Opening any of these links lands directly on the resource, never the marketing homepage.
