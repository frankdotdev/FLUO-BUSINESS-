-- 0010_platform_analytics.sql
-- Platform visit & traffic tracking for the founder super-admin analytics dashboard

create table if not exists platform_pageviews (
  id text primary key,
  path text not null,
  business_id text,
  visitor_id text not null,
  user_id text,
  country text default 'NG',
  region text,
  city text,
  campus text,
  referer text,
  device_type text,
  created_at timestamptz not null default now()
);

create index if not exists idx_pageviews_created_at on platform_pageviews (created_at desc);
create index if not exists idx_pageviews_geo on platform_pageviews (country, city);
create index if not exists idx_pageviews_campus on platform_pageviews (campus);
create index if not exists idx_pageviews_biz on platform_pageviews (business_id);
