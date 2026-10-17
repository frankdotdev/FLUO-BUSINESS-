-- IDEMPOTENT. Customer favorite businesses / "Regulars".

create table if not exists customer_favorite_businesses (
  customer_user_id text not null references users(id),
  business_id uuid not null references businesses(id),
  created_at timestamptz not null default now(),
  primary key (customer_user_id, business_id)
);

create index if not exists customer_favorite_businesses_biz on customer_favorite_businesses(business_id);
create index if not exists customer_favorite_businesses_customer on customer_favorite_businesses(customer_user_id);
