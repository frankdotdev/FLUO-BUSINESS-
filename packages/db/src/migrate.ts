import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createPool } from "./pool.ts";

// Usage: DATABASE_URL=postgres://... npm run db:migrate   (use the DIRECT connection string, not the pooler)
// Applies database/migrations/*.sql in order, each in a transaction, under an advisory lock.
// Refuses to continue if an already-applied file was edited (checksum mismatch): add a new migration instead.
const url = process.env["DATABASE_URL"];
if (!url) { console.error("DATABASE_URL is required"); process.exit(1); }
const dir = new URL("../../../database/migrations/", import.meta.url).pathname;
const pool = createPool({ url, max: 1 });
const c = await pool.connect();
try {
  await c.query("select pg_advisory_lock(727274)");
  await c.query("create table if not exists schema_migrations (filename text primary key, checksum text not null, applied_at timestamptz not null default now())");
  const done = new Map((await c.query("select filename, checksum from schema_migrations")).rows.map((r: any) => [r.filename, r.checksum]));
  for (const f of readdirSync(dir).filter((x: string) => x.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(dir, f), "utf8");
    const sum = createHash("sha256").update(sql).digest("hex");
    if (done.has(f)) { if (done.get(f) !== sum) throw new Error(`${f} was changed after being applied; create a new migration instead`); continue; }
    console.log(`applying ${f}`);
    await c.query("begin");
    try { await c.query(sql); await c.query("insert into schema_migrations (filename, checksum) values ($1,$2)", [f, sum]); await c.query("commit"); }
    catch (e) { await c.query("rollback"); throw e; }
  }
  console.log("migrations up to date");
} finally {
  await c.query("select pg_advisory_unlock(727274)").catch(() => undefined);
  c.release(); await (pool as any).end();
}
