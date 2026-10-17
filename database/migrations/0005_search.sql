-- IDEMPOTENT. Trigram indexes so "contains" searches stay fast as the marketplace grows (pg_trgm ships with Postgres contrib and Supabase).
create extension if not exists pg_trgm;
create index if not exists businesses_name_trgm_idx on businesses using gin (name gin_trgm_ops);
create index if not exists products_name_trgm_idx on products using gin (name gin_trgm_ops);
create index if not exists events_name_trgm_idx on events using gin (name gin_trgm_ops);
