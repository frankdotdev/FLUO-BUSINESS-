// Compares two PostgreSQL databases table by table (row count + content checksum). Run after restoring into a new server and again at cutover.
//   SOURCE_DATABASE_URL=... TARGET_DATABASE_URL=... node scripts/verify-migration.mjs [--skip sessions,verifications]
// Content checksum = md5 of every row rendered as text, in a stable order. Exit code 0 only if every table matches.
import pg from "pg";
const src = process.env.SOURCE_DATABASE_URL, dst = process.env.TARGET_DATABASE_URL;
if (!src || !dst) { console.error("Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL"); process.exit(1); }
const skip = new Set(((process.argv.indexOf("--skip") > 0 && process.argv[process.argv.indexOf("--skip") + 1]) || "").split(",").filter(Boolean));
const ssl = (u) => (/@(localhost|127\.0\.0\.1)/.test(u) ? false : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" });
const a = new pg.Client({ connectionString: src, ssl: ssl(src) }), b = new pg.Client({ connectionString: dst, ssl: ssl(dst) });
await a.connect(); await b.connect();
const tables = async (c) => (await c.query("select tablename from pg_tables where schemaname = 'public' order by 1")).rows.map((r) => r.tablename);
const fingerprint = async (c, t) => (await c.query(`select count(*)::text as n, coalesce(md5(string_agg(x::text, '|' order by x::text)), '') as h from public."${t}" x`)).rows[0];
const ta = await tables(a), tb = await tables(b); let bad = 0;
for (const t of new Set([...ta, ...tb])) {
  if (skip.has(t)) { console.log(`skip     ${t}`); continue; }
  if (!ta.includes(t) || !tb.includes(t)) { console.log(`MISSING  ${t} (${ta.includes(t) ? "not in target" : "not in source"})`); bad++; continue; }
  const [x, y] = [await fingerprint(a, t), await fingerprint(b, t)];
  const ok = x.n === y.n && x.h === y.h; if (!ok) bad++;
  console.log(`${ok ? "ok      " : "MISMATCH"} ${t}  source=${x.n} target=${y.n}`);
}
await a.end(); await b.end();
console.log(bad === 0 ? "\nAll tables match." : `\n${bad} table(s) differ. Do NOT cut over.`);
process.exit(bad === 0 ? 0 : 2);
