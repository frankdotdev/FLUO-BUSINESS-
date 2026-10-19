-- IDEMPOTENT. Adds gallery photos, compare-at price (discounts) and promo badges to products.
alter table products add column if not exists gallery_asset_ids text[] not null default '{}';
alter table products add column if not exists compare_at_price_minor bigint;
alter table products add column if not exists promo_badge text;
