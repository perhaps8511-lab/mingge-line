// MAKE_EXIT 第1段｜備援演練:對隔離 staging Postgres 做一次邏輯 dump,
// 建第二個獨立 staging Postgres 做 restore,readback 比對筆數與內容雜湊。
// 全程合成資料,不碰任何正式庫。
//
// 用法(在 backend/ 目錄下,已 npm install 過):
//   SOURCE_DATABASE_URL=postgresql://... \
//   TARGET_DATABASE_URL=postgresql://...(另一個空庫,會被本腳本建表+寫入) \
//   MIGRATION_SQL_PATH=$(pwd)/migrations/001_init.sql \
//   OUT_PATH=/path/to/restore-drill-result.json \
//   node scripts/dump-restore-drill.mjs
//
// 連線字串一律用環境變數傳入,不寫死在檔案裡;TARGET 必須是全新/可覆蓋的庫,本腳本會直接 INSERT。
import pg from "pg";
import { readFileSync, writeFileSync } from "node:fs";
import crypto from "node:crypto";

const SOURCE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_URL = process.env.TARGET_DATABASE_URL;
const MIGRATION_SQL_PATH = process.env.MIGRATION_SQL_PATH;
const OUT_PATH = process.env.OUT_PATH;

const TABLES = ["gua_records", "outbox_messages", "inbox_events", "jobs", "audit_events"];

function hashRows(rows) {
  return crypto.createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

async function main() {
  const src = new pg.Client({ connectionString: SOURCE_URL });
  const tgt = new pg.Client({ connectionString: TARGET_URL });
  await src.connect();
  await tgt.connect();

  const report = { startedAt: new Date().toISOString(), tables: {} };

  // 1. dump：逐表讀出全部列(依 created_at 排序,固定順序供 hash 比對)
  const dump = {};
  for (const t of TABLES) {
    const { rows } = await src.query(`SELECT * FROM ${t} ORDER BY id`);
    dump[t] = rows;
  }
  report.dumpedAt = new Date().toISOString();
  report.dumpCounts = Object.fromEntries(TABLES.map((t) => [t, dump[t].length]));
  report.dumpHashes = Object.fromEntries(TABLES.map((t) => [t, hashRows(dump[t])]));

  // 2. 在目標庫建立 schema(套用同一份 migration SQL,全新庫,冪等 CREATE TABLE IF NOT EXISTS)
  const migrationSql = readFileSync(MIGRATION_SQL_PATH, "utf8");
  await tgt.query(migrationSql);
  report.schemaAppliedAt = new Date().toISOString();

  // 3. restore：把 dump 的每一列原樣插回目標庫(保留原 id/created_at,不重新生成)
  for (const t of TABLES) {
    for (const row of dump[t]) {
      const cols = Object.keys(row);
      const vals = cols.map((c) => row[c]);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const colList = cols.map((c) => `"${c}"`).join(", ");
      await tgt.query(
        `INSERT INTO ${t} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        vals
      );
    }
  }
  report.restoredAt = new Date().toISOString();

  // 4. readback：從目標庫重新讀出,跟 dump 做筆數+內容雜湊比對
  const restoredCounts = {};
  const restoredHashes = {};
  let allMatch = true;
  for (const t of TABLES) {
    const { rows } = await tgt.query(`SELECT * FROM ${t} ORDER BY id`);
    restoredCounts[t] = rows.length;
    restoredHashes[t] = hashRows(rows);
    if (restoredCounts[t] !== report.dumpCounts[t] || restoredHashes[t] !== report.dumpHashes[t]) {
      allMatch = false;
    }
  }
  report.restoredCounts = restoredCounts;
  report.restoredHashes = restoredHashes;
  report.allMatch = allMatch;
  report.finishedAt = new Date().toISOString();

  writeFileSync(OUT_PATH, JSON.stringify({ report, dump }, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));

  await src.end();
  await tgt.end();

  if (!allMatch) {
    console.error("RESTORE_DRILL_MISMATCH");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("RESTORE_DRILL_FAILED", err);
  process.exit(1);
});
