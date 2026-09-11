import pg from "pg";
import { log } from "./log.js";

const { Pool } = pg;

let pool;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set — fail closed, no default/local fallback");
    }
    pool = new Pool({
      connectionString,
      // Railway 內網 Postgres 走 private network,不需要也不應該關 SSL 驗證去將就外部憑證。
      max: 5,
      idleTimeoutMillis: 30_000,
    });
    pool.on("error", (err) => {
      log.error("pg_pool_idle_client_error", { error: String(err && err.message || err) });
    });
  }
  return pool;
}

export async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackErr) {
      log.error("rollback_failed", { error: String(rollbackErr && rollbackErr.message || rollbackErr) });
    }
    throw err;
  } finally {
    client.release();
  }
}
