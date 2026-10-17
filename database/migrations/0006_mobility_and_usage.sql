-- IDEMPOTENT. Mobility, rides, and transaction usage overage ledger.

create table if not exists mobility_operators (
  id uuid primary key,
  business_id uuid not null references businesses(id),
  user_id text not null unique references users(id),
  name text not null,
  phone text not null,
  kind text not null check (kind in ('keke', 'bike', 'car', 'van', 'courier', 'private_driver')),
  status text not null default 'offline' check (status in ('offline', 'available', 'on_trip')),
  rating numeric(3, 2) not null default 5.0,
  completed_trips int not null default 0,
  current_lat double precision,
  current_lng double precision,
  current_address text,
  vehicle jsonb not null default '{}'::jsonb,
  is_verified boolean not null default false,
  languages text[] not null default array['English'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mobility_operators_status_kind on mobility_operators(status, kind);
create index if not exists mobility_operators_location on mobility_operators(current_lat, current_lng);

create table if not exists rides (
  id uuid primary key,
  business_id uuid not null references businesses(id),
  customer_user_id text references users(id),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  operator_user_id text references users(id),
  vehicle_kind text not null,
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  pickup_address text not null,
  dest_lat double precision not null,
  dest_lng double precision not null,
  dest_address text not null,
  distance_km numeric(6, 2) not null,
  customer_offer_minor numeric(20, 0) not null,
  currency text not null default 'NGN',
  agreed_fare_minor numeric(20, 0),
  counter_offers jsonb not null default '[]'::jsonb,
  status text not null check (status in ('requested', 'counter_offered', 'matched', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled')),
  scheduled_for timestamptz,
  delivery_order_id uuid references orders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rides_status on rides(status);
create index if not exists rides_customer on rides(customer_user_id);
create index if not exists rides_operator on rides(operator_user_id);

create table if not exists favorite_riders (
  customer_user_id text not null references users(id),
  operator_user_id text not null references users(id),
  created_at timestamptz not null default now(),
  primary key (customer_user_id, operator_user_id)
);

-- Auditable ledger for completed online order usage and Fluo overage fees
create table if not exists order_usage_ledger (
  id uuid primary key,
  business_id uuid not null references businesses(id),
  order_id uuid not null unique references orders(id),
  amount_minor numeric(20, 0) not null,
  fee_minor numeric(20, 0) not null default 0,
  completed_at timestamptz not null default now()
);

create index if not exists order_usage_ledger_biz_time on order_usage_ledger(business_id, completed_at);
