-- IDEMPOTENT: every statement is safe to run again (create ... if not exists, inserts use on conflict). The runner also records applied files.
-- Fluo baseline schema. Plain PostgreSQL only (no Supabase-specific features) so it moves to any Postgres unchanged.
-- Conventions: money = bigint minor units + char(3) currency; tenant column = business_id; times = timestamptz.
-- Tenant safety: child rows reference parents by (id, business_id) so rows from different businesses cannot be mixed.
-- STATUS: written to match packages/db/src/pg-store.ts; run it against a real database and the integration test before relying on it.
create extension if not exists citext;
create extension if not exists btree_gist;

create table if not exists markets (
  country_code char(2) primary key, name text not null, default_currency char(3) not null,
  default_locale text not null, default_timezone text not null, enabled boolean not null default false
);
insert into markets (country_code, name, default_currency, default_locale, default_timezone, enabled) values
  ('NG','Nigeria','NGN','en-NG','Africa/Lagos',true),
  ('GH','Ghana','GHS','en-GH','Africa/Accra',false),
  ('KE','Kenya','KES','en-KE','Africa/Nairobi',false),
  ('ZA','South Africa','ZAR','en-ZA','Africa/Johannesburg',false)
  on conflict (country_code) do nothing;

-- ---- identity (Better Auth owns these four tables; names/columns are mapped in apps/web/src/server/auth.ts) ----
create table if not exists users (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  email citext not null unique,
  email_verified boolean not null default false,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  country_code char(2) references markets(country_code),
  locale text,
  deleted_at timestamptz
);
create table if not exists sessions (
  id text primary key, expires_at timestamptz not null, token text not null unique,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  ip_address text, user_agent text, user_id text not null references users(id) on delete cascade
);
create index if not exists sessions_user_idx on sessions(user_id);
create table if not exists accounts (
  id text primary key, account_id text not null, provider_id text not null,
  user_id text not null references users(id) on delete cascade,
  access_token text, refresh_token text, id_token text,
  access_token_expires_at timestamptz, refresh_token_expires_at timestamptz, scope text, password text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (provider_id, account_id)
);
create index if not exists accounts_user_idx on accounts(user_id);
create table if not exists verifications (
  id text primary key, identifier text not null, value text not null, expires_at timestamptz not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists verifications_identifier_idx on verifications(identifier);
create table if not exists push_tokens (
  token text primary key, user_id text not null references users(id) on delete cascade,
  platform text not null check (platform in ('ios','android','web')), created_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on push_tokens(user_id);

-- ---- businesses ----
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique, name text not null,
  business_type_id text not null, business_type_ver int not null,
  country_code char(2) not null references markets(country_code), currency char(3) not null, timezone text not null,
  status text not null default 'draft' check (status in ('draft','active','suspended','archived')),
  verification_status text not null default 'not_required' check (verification_status in ('not_required','pending','verified','rejected')),
  allows_transfer boolean not null default true,
  accepts_automatic boolean not null default false,
  refund_policy jsonb not null default '{"kind":"none"}' check (jsonb_typeof(refund_policy) = 'object'),
  published_at timestamptz, created_at timestamptz not null default now(), deleted_at timestamptz,
  check (status <> 'active' or allows_transfer or accepts_automatic)
);
create index if not exists businesses_public_idx on businesses(country_code, published_at desc) where status = 'active';

create table if not exists business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null check (role in ('owner','admin','manager','staff','cashier')),
  status text not null default 'active' check (status in ('active','suspended','removed')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);
create index if not exists business_members_user_idx on business_members(user_id) where status = 'active';
create unique index if not exists business_one_owner_idx on business_members(business_id) where role = 'owner' and status = 'active';

create table if not exists business_capabilities (
  business_id uuid not null references businesses(id) on delete cascade, capability text not null,
  enabled_at timestamptz not null default now(), primary key (business_id, capability)
);
create table if not exists member_invites (
  token_hash bytea primary key, business_id uuid not null references businesses(id) on delete cascade,
  email citext not null, role text not null check (role in ('admin','manager','staff','cashier')),
  invited_by text not null references users(id), expires_at timestamptz not null, used_at timestamptz
);
create table if not exists business_trials (
  business_id uuid primary key references businesses(id) on delete cascade,
  owner_user_id text not null references users(id), started_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > started_at)
);
create unique index if not exists business_trials_one_per_owner_idx on business_trials(owner_user_id);
create table if not exists subscriptions (
  business_id uuid primary key references businesses(id) on delete cascade,
  plan_key text not null, paid_until timestamptz not null, cancel_at_period_end boolean not null default false, currency char(3) not null
);
create table if not exists business_payout_accounts (
  business_id uuid primary key references businesses(id) on delete cascade,
  provider text not null, provider_ref text not null default '', bank_code text not null,
  account_last4 char(4) not null, account_name text not null, verified boolean not null default false
);
create table if not exists business_transfer_accounts (
  business_id uuid primary key references businesses(id) on delete cascade,
  bank_name text not null, account_name text not null,
  account_number_encrypted text not null,           -- AES-256-GCM, key held outside the database
  account_last4 char(4) not null
);
create table if not exists business_verifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  kind text not null check (kind in ('contact','payout_account','owner_identity','business_registration','professional_license','address')),
  status text not null default 'pending' check (status in ('pending','verified','rejected','expired')),
  method text not null check (method in ('automated','manual')), provider text, provider_reference text,
  reviewed_by text references users(id), reviewed_at timestamptz, expires_at timestamptz, notes text,
  created_at timestamptz not null default now()
);
create table if not exists audit_events (                       -- append-only: the application role should have INSERT and SELECT only
  id bigint generated always as identity primary key,
  business_id uuid references businesses(id), actor_user_id text references users(id),
  action text not null, target_id text, created_at timestamptz not null default now()
);
create index if not exists audit_events_business_idx on audit_events(business_id, created_at desc);

-- ---- catalogue ----
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  short_id char(8) not null unique, slug text not null, name text not null, description text,
  price_minor bigint not null check (price_minor >= 0), currency char(3) not null,
  fulfilment text not null default 'stock' check (fulfilment in ('stock','made_to_order')),
  lead_time_hours int not null default 0 check (lead_time_hours >= 0),
  max_per_order int not null default 10 check (max_per_order between 1 and 100),
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  created_at timestamptz not null default now(), unique (id, business_id)
);
create index if not exists products_business_status_idx on products(business_id, status, created_at);

-- ---- resource booking ----
create table if not exists resource_groups (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  short_id char(8) not null unique, slug text not null, name text not null,
  policy_kind text not null check (policy_kind in ('nights','time_block','rental_period','bed')),
  timezone text not null,
  min_duration_minutes int not null check (min_duration_minutes > 0),
  max_duration_minutes int check (max_duration_minutes is null or max_duration_minutes >= min_duration_minutes),
  granularity_minutes int not null check (granularity_minutes > 0),
  buffer_minutes int not null default 0 check (buffer_minutes >= 0),
  min_notice_minutes int not null default 0 check (min_notice_minutes >= 0),
  max_advance_minutes int check (max_advance_minutes is null or max_advance_minutes > 0),
  price_minor bigint not null check (price_minor >= 0),
  price_unit text not null check (price_unit in ('per_night','per_hour','per_day','per_bed_night','flat')),
  currency char(3) not null,
  status text not null default 'draft' check (status in ('draft','active','archived')),
  unique (id, business_id)
);
create table if not exists resources (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references businesses(id) on delete cascade,
  group_id uuid not null, label text not null,
  status text not null default 'active' check (status in ('active','maintenance','archived')),
  unique (id, business_id), foreign key (group_id, business_id) references resource_groups(id, business_id)
);

create table if not exists guest_contacts (
  id uuid primary key default gen_random_uuid(), name text not null, email citext not null, phone text,
  created_at timestamptz not null default now()
);
create index if not exists guest_contacts_email_idx on guest_contacts(email);

-- ---- payments (provider-agnostic; payment state is separate from order/booking/ticket state) ----
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id),
  purpose text not null check (purpose in ('order','booking','ticket','subscription')),
  subject_id uuid not null,                          -- the order, booking or ticket purchase this pays for
  amount_minor bigint not null check (amount_minor > 0), currency char(3) not null,
  method text not null check (method in ('provider','bank_transfer')),
  provider text, provider_reference text,
  status text not null default 'created' check (status in
    ('created','pending','awaiting_confirmation','succeeded','failed','expired','partially_refunded','refunded')),
  transfer_reference text, expires_at timestamptz,
  platform_fee_minor bigint not null default 0 check (platform_fee_minor >= 0),
  plan_key text, billing_interval text check (billing_interval in ('month','year')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (platform_fee_minor < amount_minor),
  check ((method = 'bank_transfer') = (transfer_reference is not null)),
  check (status = 'created' or method = 'bank_transfer' or (provider is not null and provider_reference is not null)),
  unique (id, business_id)
);
create unique index if not exists payments_provider_ref_idx on payments(provider, provider_reference) where provider_reference is not null;
create unique index if not exists payments_transfer_ref_idx on payments(transfer_reference) where transfer_reference is not null;
create index if not exists payments_subject_idx on payments(business_id, subject_id);
create table if not exists refund_requests (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references businesses(id),
  payment_id uuid not null references payments(id), subject_kind text not null check (subject_kind in ('booking','order')),
  subject_id uuid not null, amount_minor bigint not null check (amount_minor > 0), currency char(3) not null,
  status text not null default 'requested' check (status in ('requested','refunded','declined')), reason text,
  created_at timestamptz not null default now(), resolved_at timestamptz
);
create index if not exists refund_requests_business_idx on refund_requests(business_id, status);
create table if not exists webhook_events (                        -- the unique key makes duplicate deliveries harmless
  provider text not null, event_id text not null, received_at timestamptz not null default now(), primary key (provider, event_id)
);

-- ---- orders ----
create table if not exists orders (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references businesses(id),
  user_id text references users(id), guest_contact_id uuid references guest_contacts(id),
  kind text not null default 'standard' check (kind in ('standard','made_to_order')),
  status text not null default 'awaiting_payment' check (status in
    ('awaiting_payment','paid','accepted','in_production','ready','completed','cancelled','refunded')),
  currency char(3) not null, total_minor bigint not null check (total_minor >= 0),
  required_by timestamptz, customer_note text, refund_policy jsonb not null,
  created_at timestamptz not null default now(),
  unique (id, business_id), check (user_id is not null or guest_contact_id is not null)
);
create index if not exists orders_business_idx on orders(business_id, created_at desc);
create index if not exists orders_user_idx on orders(user_id, created_at desc);
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null, business_id uuid not null, product_id uuid not null,
  name_snapshot text not null, unit_price_minor bigint not null check (unit_price_minor >= 0), quantity int not null check (quantity > 0),
  foreign key (order_id, business_id) references orders(id, business_id) on delete cascade,
  foreign key (product_id, business_id) references products(id, business_id)
);
create index if not exists order_items_order_idx on order_items(order_id);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(), business_id uuid not null, resource_id uuid not null, group_id uuid not null,
  user_id text references users(id), guest_contact_id uuid references guest_contacts(id),
  during tstzrange not null,                         -- the stay/slot itself, half-open [start, end)
  blocked tstzrange not null,                        -- during + turnaround buffer
  status text not null check (status in ('held','confirmed','checked_in','completed','cancelled','expired','no_show')),
  hold_expires_at timestamptz, payment_id uuid references payments(id), refund_policy jsonb not null,
  created_at timestamptz not null default now(),
  foreign key (resource_id, business_id) references resources(id, business_id),
  check (not isempty(during) and lower_inc(during) and not upper_inc(during)),
  check (blocked @> during),
  check (user_id is not null or guest_contact_id is not null),
  -- THE guarantee: two active bookings can never overlap on one resource, even under concurrent requests.
  constraint bookings_no_overlap exclude using gist (resource_id with =, blocked with &&) where (status in ('held','confirmed','checked_in'))
);
create index if not exists bookings_business_during_idx on bookings using gist (business_id, during);
create index if not exists bookings_user_idx on bookings(user_id);
create index if not exists bookings_hold_idx on bookings(hold_expires_at) where status = 'held';

create table if not exists guest_access_tokens (                   -- only the SHA-256 hash of the link secret is stored
  token_hash bytea primary key, subject_id uuid not null, business_id uuid not null references businesses(id),
  expires_at timestamptz not null, revoked_at timestamptz
);
create index if not exists guest_access_subject_idx on guest_access_tokens(subject_id);

-- ---- events and tickets ----
create table if not exists events (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references businesses(id) on delete cascade,
  short_id char(8) not null unique, slug text not null, name text not null, description text, venue text,
  starts_at timestamptz not null, ends_at timestamptz,
  status text not null default 'draft' check (status in ('draft','published','cancelled','completed')),
  created_at timestamptz not null default now(), unique (id, business_id), check (ends_at is null or ends_at > starts_at)
);
create table if not exists ticket_types (
  id uuid primary key default gen_random_uuid(), event_id uuid not null, business_id uuid not null,
  name text not null, price_minor bigint not null check (price_minor >= 0), currency char(3) not null,
  capacity int not null check (capacity > 0), sales_start timestamptz, sales_end timestamptz,
  unique (id, business_id), foreign key (event_id, business_id) references events(id, business_id) on delete cascade
);
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(), business_id uuid not null, event_id uuid not null, ticket_type_id uuid not null,
  payment_id uuid references payments(id), holder_name text not null, holder_email citext not null,
  status text not null default 'valid' check (status in ('held','valid','used','refunded','cancelled')),
  used_at timestamptz, hold_expires_at timestamptz, checked_in_by text references users(id),
  created_at timestamptz not null default now(),
  foreign key (event_id, business_id) references events(id, business_id),
  foreign key (ticket_type_id, business_id) references ticket_types(id, business_id),
  check ((status = 'used') = (used_at is not null)), check ((status = 'held') = (hold_expires_at is not null))
);
create index if not exists tickets_event_status_idx on tickets(event_id, status);
create index if not exists tickets_payment_idx on tickets(payment_id);
create index if not exists tickets_type_idx on tickets(ticket_type_id, status);
create index if not exists tickets_hold_idx on tickets(hold_expires_at) where status = 'held';

-- ---- media and notifications ----
create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(), business_id uuid references businesses(id) on delete cascade,
  owner_user_id text references users(id),
  purpose text not null check (purpose in ('avatar','logo','product','gallery','event_cover','banner','proof_of_payment')),
  status text not null default 'processing' check (status in ('processing','ready','failed')),
  original_bytes bigint not null check (original_bytes > 0), detected_type text not null check (detected_type in ('jpeg','png','webp')),
  width int, height int, created_at timestamptz not null default now(),
  check (business_id is not null or owner_user_id is not null)
);
create table if not exists notification_outbox (
  id uuid primary key, dedupe_key text not null unique, user_id text references users(id) on delete set null, email citext,
  kind text not null, email_class text not null check (email_class in ('critical','important','marketing')),
  vars jsonb not null default '{}',                  -- template variables; wiped after sending (may hold one-time links)
  send_after timestamptz not null, sent_at timestamp with time zone, attempts int not null default 0, last_error text
);
create index if not exists notification_outbox_due_idx on notification_outbox(send_after) where sent_at is null;
