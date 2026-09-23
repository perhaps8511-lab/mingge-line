import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getPool } from "./db.js";
import { log } from "./log.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");

export async function runMigrations() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename    text PRIMARY KEY,
      applied_at  timestamptz NOT NULL DEFAULT now()
    );
  `);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const { rows } = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE filename = $1",
      [file]
    );
    if (rows.length > 0) {
      log.info("migration_skip_already_applied", { file });
      continue;
    }
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      log.info("migration_applied", { file });
    } catch (err) {
      await client.query("ROLLBACK");
      log.error("migration_failed", { file, error: String(err && err.message || err) });
      throw err;
    } finally {
      client.release();
    }
  }
}

// 允許 `npm run migrate` 獨立執行,也允許 server.js import 後在啟動時呼叫。
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  runMigrations()
    .then(() => {
      log.info("migrate_cli_done");
      process.exit(0);
    })
    .catch((err) => {
      log.error("migrate_cli_failed", { error: String(err && err.message || err) });
      process.exit(1);
    });
}
