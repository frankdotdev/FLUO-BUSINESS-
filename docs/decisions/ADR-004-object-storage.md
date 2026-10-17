# ADR-004: Object storage: Cloudflare R2

**Status:** Accepted, built (unrun against a real bucket)

## Decision
Public and private buckets, direct signed uploads, metadata and ownership in Postgres, image variants per purpose. Validation rules are implemented (`platform/image-policy.ts`).

## Consequences
Built: signed upload intent (type and size pinned in the signature), server-side inspection of the real bytes, WebP variants per purpose with EXIF stripped, versioned public keys, quota per business. Only public image purposes are supported; private files (payment proofs, documents) need a second private bucket and signed reads, not built yet. Uses a from-scratch SigV4 signer verified against Amazon's published test vector.
