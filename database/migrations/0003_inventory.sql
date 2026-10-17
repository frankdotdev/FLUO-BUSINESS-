-- IDEMPOTENT. Optional stock count per product: null = not tracked. Orders reserve stock atomically; unpaid orders give it back.
alter table products add column if not exists stock_quantity int;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'products_stock_nonnegative') then
    alter table products add constraint products_stock_nonnegative check (stock_quantity is null or stock_quantity >= 0);
  end if;
end $$;
