-- IDEMPOTENT. Media: uploads go to object storage via signed URLs; this table records ownership, state and published variants.
alter table media_assets add column if not exists declared_type text;
alter table media_assets add column if not exists declared_bytes bigint;
alter table media_assets add column if not exists variants text[] not null default '{}';
alter table media_assets alter column detected_type drop not null;
alter table media_assets alter column original_bytes drop not null;
do $$ begin
  if exists (select 1 from pg_constraint where conname = 'media_assets_status_check') then
    alter table media_assets drop constraint media_assets_status_check;
  end if;
  alter table media_assets add constraint media_assets_status_check check (status in ('pending_upload','processing','ready','failed'));
end $$;
alter table media_assets alter column status set default 'pending_upload';
create index if not exists media_assets_owner_idx on media_assets(business_id, status);
alter table products add column if not exists image_asset_id uuid references media_assets(id) on delete set null;
alter table events add column if not exists cover_asset_id uuid references media_assets(id) on delete set null;
alter table businesses add column if not exists logo_asset_id uuid references media_assets(id) on delete set null;
