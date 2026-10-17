-- IDEMPOTENT. One thread per customer per business; messages are append-only.
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_user_id text not null references users(id) on delete cascade,
  topic text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  business_unread int not null default 0 check (business_unread >= 0),
  customer_unread int not null default 0 check (customer_unread >= 0),
  unique (business_id, customer_user_id),
  unique (id, business_id)
);
create index if not exists conversations_business_idx on conversations(business_id, last_message_at desc);
create index if not exists conversations_customer_idx on conversations(customer_user_id, last_message_at desc);
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null, business_id uuid not null,
  sender_kind text not null check (sender_kind in ('customer','business')),
  sender_user_id text not null references users(id),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  foreign key (conversation_id, business_id) references conversations(id, business_id) on delete cascade
);
create index if not exists messages_thread_idx on messages(conversation_id, created_at, id);
