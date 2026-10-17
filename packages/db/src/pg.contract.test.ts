// Runs the SAME contract against real PostgreSQL. Skipped unless TEST_DATABASE_URL is set.
// WARNING: it DROPS and recreates the public schema, so the database name must contain "test".
//   TEST_DATABASE_URL=postgres://user:pass@localhost:5432/fluo_test npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runStoreContract, type Harness } from "./store-contract.ts";

const url = process.env["TEST_DATABASE_URL"];
if (!url) {
  test("PgStore contract (skipped: set TEST_DATABASE_URL to a throwaway *test* database)", { skip: true }, () => undefined);
} else {
  assert.ok(/test/i.test(new URL(url).pathname), "refusing to run: the database name must contain 'test'");
  const { createPool } = await import("./pool.ts");
  const { PgStore } = await import("./pg-store.ts");
  const pool = createPool({ url, max: 8 });
  await pool.query("drop schema public cascade; create schema public;");
  const dir = fileURLToPath(new URL("../../../database/migrations/", import.meta.url));
  const files = readdirSync(dir).filter((x: string) => x.endsWith(".sql")).sort();
  for (const f of files) await pool.query(readFileSync(join(dir, f), "utf8"));
  for (const f of files) await pool.query(readFileSync(join(dir, f), "utf8"));       // idempotency: running every migration a second time must change nothing and fail nothing
  const store = new PgStore(pool);
  runStoreContract("PgStore", async (): Promise<Harness> => ({
    store,
    seedUser: async (id) => { await pool.query("insert into users (id, name, email) values ($1,$1,$2) on conflict do nothing", [id, `${id}@test.local`]); },
    seedTicketType: async (a) => {
      await pool.query("insert into events (id, business_id, short_id, slug, name, starts_at, status) values ($1,$2,$3,'e','Event', now() + interval '30 days','published')", [a.eventId, a.businessId, a.eventId.replaceAll("-", "").slice(0, 8)]);
      await pool.query("insert into ticket_types (id, event_id, business_id, name, price_minor, currency, capacity) values ($1,$2,$3,'General',0,'NGN',$4)", [a.id, a.eventId, a.businessId, a.capacity]);
    },
    seedBookable: async (a) => {
      await pool.query(`insert into resource_groups (id, business_id, short_id, slug, name, policy_kind, timezone, min_duration_minutes, granularity_minutes, price_minor, price_unit, currency, status)
        values ($1,$2,$3,'g','Group','nights','Africa/Lagos',60,60,1000,'per_night','NGN','active')`, [a.groupId, a.businessId, a.groupId.replaceAll("-", "").slice(0, 8)]);
      for (const id of a.resourceIds) await pool.query("insert into resources (id, business_id, group_id, label) values ($1,$2,$3,'R')", [id, a.businessId, a.groupId]);
    },
  }));
  test.after(async () => { await (pool as unknown as { end(): Promise<void> }).end(); });
}
