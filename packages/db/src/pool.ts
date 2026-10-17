import pg from "pg";
import type { PoolLike } from "./pg-store.ts";

export interface PoolOptions { readonly url: string; readonly max?: number }

/** One shared pool per server process. Use the POOLED connection string (Supabase "transaction pooler") from the app;
 *  use the direct string only for migrations. TLS is on unless the host is local or DB_SSL=disable. */
export function createPool(o: PoolOptions): PoolLike {
  const local = /@(localhost|127\.0\.0\.1|\[::1\])/.test(o.url);
  const ssl = process.env["DB_SSL"] === "disable" || local ? false : { rejectUnauthorized: process.env["DB_SSL_REJECT_UNAUTHORIZED"] === "true" };
  const pool = new pg.Pool({ connectionString: o.url, max: o.max ?? 10, ssl, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000 });
  pool.on("error", (e: Error) => console.error("postgres pool error", e.message));    // idle client errors must not crash the process
  return pool as unknown as PoolLike;
}
