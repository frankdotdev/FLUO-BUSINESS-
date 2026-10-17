-- IDEMPOTENT. Escrow transactions and Group Cart split payment sessions.

create table if not exists escrow_records (
  order_id uuid primary key references orders(id),
  business_id uuid not null references businesses(id),
  buyer_user_id text references users(id),
  amount_minor numeric(20, 0) not null,
  currency text not null default 'NGN',
  status text not null check (status in ('held', 'released', 'disputed', 'refunded')),
  release_pin_hash text not null,
  qr_secret_hash text not null,
  held_at timestamptz not null default now(),
  released_at timestamptz,
  disputed_at timestamptz,
  dispute_reason text
);

create index if not exists escrow_records_biz on escrow_records(business_id);
create index if not exists escrow_records_status on escrow_records(status);

create table if not exists group_cart_sessions (
  id uuid primary key,
  short_code text not null unique,
  business_id uuid not null references businesses(id),
  host_user_id text references users(id),
  host_name text not null,
  host_email text not null,
  split_kind text not null check (split_kind in ('itemized', 'equal', 'custom')),
  target_amount_minor numeric(20, 0) not null,
  funded_amount_minor numeric(20, 0) not null default 0,
  currency text not null default 'NGN',
  status text not null check (status in ('open', 'locked', 'funded', 'expired', 'cancelled')),
  items jsonb not null default '[]'::jsonb,
  contributions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists group_cart_sessions_biz on group_cart_sessions(business_id);
create index if not exists group_cart_sessions_status on group_cart_sessions(status);
create index if not exists group_cart_sessions_code on group_cart_sessions(short_code);
