// MAKE_EXIT 第2段｜背景 worker：jobs lease/重試/死信 + outbox 消化(先落地再通知)。
// 獨立 entrypoint(npm run worker / node src/worker.js),與 API 共用同一個 DATABASE_URL,
// 部署為 Railway 的第二個 service,持續跑(poll loop),不是一次性 script。
import crypto from "node:crypto";
import { getPool, withTransaction } from "./db.js";
import { log } from "./log.js";
import { syncToAirtable, airtableConfigured, listAirtableSourceRows, incrementalSyncConfigured } from "./airtable.js";

const MAX_ATTEMPTS = 3;
const LEASE_SECONDS = 30;
const POLL_IDLE_MS = 1500;
const API_BASE_URL = process.env.API_BASE_URL; // 內部呼叫「假 LINE 通知端點」用,staging 專屬,不打正式 LINE。

// 獨立審 HOLD 修正(發現1.1)：Airtable→Postgres 常駐增量同步。預設關閉(ENABLE_INCREMENTAL_SYNC
// 未設或非 'true' 就完全不跑),第3步切換前才由施工席/Owner 決定開啟,且開啟時 AIRTABLE_SYNC_SCHEMA
// 預設仍是 'test'(指向 staging 測試 base),只有正式切換才會有人把它設成 'production'。
const ENABLE_INCREMENTAL_SYNC = process.env.ENABLE_INCREMENTAL_SYNC === "true";
const INCREMENTAL_SYNC_INTERVAL_MS = Number(process.env.INCREMENTAL_SYNC_INTERVAL_MS || 60_000);
let lastIncrementalSyncAt = 0;

if (!API_BASE_URL) {
  log.error("worker_boot_failed", { reason: "API_BASE_URL not set" });
  process.exit(1);
}

async function claimOneJob(client) {
  const { rows } = await client.query(`
    WITH claimed AS (
      SELECT id FROM jobs
      WHERE status = 'pending' OR (status = 'in_progress' AND lease_until < now())
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE jobs SET status = 'in_progress', lease_until = now() + interval '${LEASE_SECONDS} seconds',
           attempts = attempts + 1, updated_at = now()
    WHERE id IN (SELECT id FROM claimed)
    RETURNING *;
  `);
  return rows[0] || null;
}

// 合成處理:模擬「呼叫 Dify 做深卜/複盤」,staging 不打正式 Dify。
// force_fail_count 讓同一個 job 可以先失敗 N 次再成功,用來實測重試路徑(可重現,不靠隨機)。
async function processDeepRead(client, job) {
  const { gua_record_id, request_id, force_fail_count } = job.payload;
  if (job.attempts <= Number(force_fail_count || 0)) {
    throw new Error(`synthetic_transient_failure(attempt=${job.attempts}/${force_fail_count})`);
  }
  const syntheticOutput = JSON.stringify({
    synthetic: true,
    note: "[合成測試資料] MAKE_EXIT 第2段深卜背景處理模擬輸出,非真人資料/非真實 Dify 回應",
    request_id,
    processed_at: new Date().toISOString(),
  });
  const updated = await client.query(
    `UPDATE gua_records
     SET deep_read_state = 'completed', deep_read_output_json = $1, deep_read_completed_at = now()
     WHERE id = $2 AND deep_read_request_id = $3
     RETURNING id, subject`,
    [syntheticOutput, gua_record_id, request_id]
  );
  if (updated.rows.length === 0) {
    throw new Error("gua_record_not_found_or_request_id_mismatch");
  }
  await client.query(
    `INSERT INTO outbox_messages (aggregate_type, aggregate_id, event_type, payload)
     VALUES ('gua_record', $1, 'deep_read.completed', $2::jsonb)`,
    [gua_record_id, JSON.stringify({ subject: updated.rows[0].subject, request_id })]
  );
}

async function processFupan(client, job) {
  const { fupan_review_id } = job.payload;
  const syntheticResult = JSON.stringify({
    synthetic: true,
    note: "[合成測試資料] MAKE_EXIT 第2段複盤背景處理模擬輸出,非真人資料/非真實 Dify 回應",
    processed_at: new Date().toISOString(),
  });
  const updated = await client.query(
    `UPDATE fupan_reviews SET state = 'completed', result_json = $1, completed_at = now(), updated_at = now()
     WHERE id = $2 RETURNING id, holder_id, current_question`,
    [syntheticResult, fupan_review_id]
  );
  if (updated.rows.length === 0) throw new Error("fupan_review_not_found");
  const row = updated.rows[0];
  await client.query(
    `INSERT INTO outbox_messages (aggregate_type, aggregate_id, event_type, payload)
     VALUES ('fupan_review', $1, 'fupan.completed', $2::jsonb)`,
    [fupan_review_id, JSON.stringify({ holder_id: row.holder_id })]
  );
  // Owner 裁定④「新系統一律先落地再通知」的另一半:落地後同一 transaction 順便記
  // 「本來要同步回 Airtable 的內容」(mock，不打正式/測試 base)。
  await client.query(
    `INSERT INTO airtable_sync_log (target_table, target_action, source_table, source_id, payload)
     VALUES ('Divination_Log', 'create', 'fupan_reviews', $1, $2::jsonb)`,
    [fupan_review_id, JSON.stringify({
      entry_type: "fupan", line_user_id_raw: row.holder_id, question_text: row.current_question,
    })]
  );
}

async function runJobLoop() {
  const pool = getPool();
  const job = await claimOneJob(pool);
  if (!job) return false;

  log.info("job_claimed", { jobId: job.id, jobType: job.job_type, attempt: job.attempts });
  try {
    await withTransaction(async (client) => {
      if (job.job_type === "deep_read.process") await processDeepRead(client, job);
      else if (job.job_type === "fupan.process") await processFupan(client, job);
      else throw new Error(`unknown_job_type:${job.job_type}`);
      await client.query(`UPDATE jobs SET status = 'done', updated_at = now() WHERE id = $1`, [job.id]);
    });
    log.info("job_succeeded", { jobId: job.id, jobType: job.job_type, attempt: job.attempts });
  } catch (err) {
    const message = String(err && err.message || err);
    if (job.attempts >= MAX_ATTEMPTS) {
      await pool.query(
        `UPDATE jobs SET status = 'dead', last_error = $1, updated_at = now() WHERE id = $2`,
        [message, job.id]
      );
      log.error("job_dead_lettered", { jobId: job.id, jobType: job.job_type, attempts: job.attempts, error: message });
    } else {
      // 遞增 backoff(第2次重試延2秒、第3次延4秒...上限30秒),避免密集重試轟炸。
      // 注意:claimOneJob 對 pending 狀態不看 lease_until,所以要延後重撿必須維持
      // status='in_progress' 並把 lease_until 推到未來——這就是既有 claim 條件
      // (status='in_progress' AND lease_until<now())原本就支援的「租約到期可再撿」路徑,
      // 不需要額外改 claim 邏輯。
      const backoffSeconds = Math.min(30, 2 ** job.attempts);
      await pool.query(
        `UPDATE jobs SET status = 'in_progress', last_error = $1,
                lease_until = now() + ($2 || ' seconds')::interval, updated_at = now()
         WHERE id = $3`,
        [message, String(backoffSeconds), job.id]
      );
      log.info("job_failed_will_retry", { jobId: job.id, jobType: job.job_type, attempts: job.attempts, error: message, backoffSeconds });
    }
  }
  return true;
}

async function runOutboxLoop() {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT * FROM outbox_messages WHERE delivered_at IS NULL ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`
  );
  const msg = rows[0];
  if (!msg) return false;

  try {
    const payload = typeof msg.payload === "string" ? JSON.parse(msg.payload) : msg.payload;
    if (msg.event_type === "deep_read.completed" || msg.event_type === "fupan.completed") {
      const to = payload.subject || payload.holder_id || "unknown";
      const resp = await fetch(`${API_BASE_URL}/internal/mock-line-push`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to, event_type: msg.event_type, text: `[合成] ${msg.event_type} for ${msg.aggregate_id}` }),
      });
      if (!resp.ok) throw new Error(`mock_line_push_http_${resp.status}`);
    } else if (msg.event_type === "gua_record.created") {
      await pool.query(
        `INSERT INTO airtable_sync_log (target_table, target_action, source_table, source_id, payload)
         VALUES ('Divination_Log', 'create', 'gua_records', $1, $2::jsonb)`,
        [msg.aggregate_id, JSON.stringify(payload)]
      );
    } else {
      log.info("outbox_skip_unknown_event_type", { outboxId: msg.id, eventType: msg.event_type });
    }
    await pool.query(`UPDATE outbox_messages SET delivered_at = now() WHERE id = $1`, [msg.id]);
    log.info("outbox_delivered", { outboxId: msg.id, eventType: msg.event_type });
  } catch (err) {
    // outbox 沒有 attempts/dead-letter 欄位(比 jobs 簡單):保持 delivered_at NULL,下一輪重試。
    log.error("outbox_delivery_failed_will_retry", { outboxId: msg.id, eventType: msg.event_type, error: String(err && err.message || err) });
  }
  return true;
}

// 消化 airtable_sync_log 的 'mocked' 列,真的呼叫 Airtable 測試 base(item2)。
// 沒設定 AIRTABLE_* 環境變數時 syncToAirtable 回 skipped,這裡就保持 mocked 不動,
// 不假裝已送出——這就是「Postgres 為準、Airtable 為鏡像、差異記 log 不自動修」的一半：
// 送不出去先留在 log 裡讓人看得到,不是默默吞掉也不是硬改 Postgres 去配合。
async function runAirtableSyncLoop() {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT * FROM airtable_sync_log WHERE status = 'mocked' ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED`
  );
  const row = rows[0];
  if (!row) return false;
  if (!airtableConfigured()) return false; // 沒設定就不算「做了一輪工」,避免空轉洗 log。

  try {
    const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
    const result = await syncToAirtable({
      entry_type: payload.entry_type,
      line_user_id_raw: payload.subject || payload.line_user_id_raw || payload.holder_id,
      session_id: payload.request_id || payload.session_id,
      ben_gua: payload.ben_gua,
      question_text: payload.question_text,
      source_table: row.source_table,
      source_id: row.source_id,
    });
    if (result.skipped) return false;
    await pool.query(
      `UPDATE airtable_sync_log SET status = 'sent', payload = payload || jsonb_build_object('airtable_record_id', $1::text) WHERE id = $2`,
      [result.airtableRecordId, row.id]
    );
    // Owner 裁定(獨立審 HOLD 修正②)：Postgres 先建的卦記回寫 Airtable 後，把新產生的 Airtable
    // record id 記回同一筆 Postgres 列(legacy_source_airtable_id)。這樣之後的 Airtable→Postgres
    // 增量同步認得出「這筆 Airtable 記錄其實就是這筆 Postgres 記錄的鏡像」，不會誤判成一筆新卦
    // 而在 Postgres 端多長出第二筆——同一筆卦記兩個方向都對得回同一個 id，不會變兩筆。
    if (row.source_table === "gua_records") {
      await pool.query(
        `UPDATE gua_records SET legacy_source_airtable_id = $1
         WHERE id = $2 AND legacy_source_airtable_id IS NULL`,
        [result.airtableRecordId, row.source_id]
      );
    }
    log.info("airtable_sync_sent", { syncLogId: row.id, airtableRecordId: result.airtableRecordId });
  } catch (err) {
    log.error("airtable_sync_failed_will_retry", { syncLogId: row.id, error: String(err && err.message || err) });
  }
  return true;
}

// Airtable→Postgres 常駐增量同步(獨立審 HOLD 修正①，「新卦消失」問題)。
// 全表掃描(見 airtable.js 註解:本次規模全表掃描比維護 lastModifiedTime 過濾簡單，
// 量大後應該換成真正的增量過濾，這裡誠實記錄這個限制，不假裝這是最終規模解)。
// 對每一筆 Airtable 來源列，用 legacy_source_airtable_id 當比對鍵：
//   - Postgres 沒有這筆 → 這是「現役鏈在 Airtable 建立、新系統還不知道」的新卦 → INSERT
//   - Postgres 已經有 → 用 Airtable 現況覆寫可變欄位(補記/蓋印可能在 Airtable 端發生)→ UPDATE
// 同時輸出這一輪的對帳結果(筆數+差異清單)到 incremental_sync_runs，差異只記錄不自動修
// (跟 Postgres→Airtable 方向的既定規則一致)。
async function runIncrementalAirtableToPostgresSync() {
  if (!ENABLE_INCREMENTAL_SYNC) return false;
  if (Date.now() - lastIncrementalSyncAt < INCREMENTAL_SYNC_INTERVAL_MS) return false;
  lastIncrementalSyncAt = Date.now();
  if (!incrementalSyncConfigured()) {
    log.info("incremental_sync_skip_not_configured");
    return false;
  }

  const pool = getPool();
  const runId = crypto.randomUUID();
  const startedAt = new Date();
  let airtableRowCount = 0, matchedCount = 0, insertedCount = 0, updatedCount = 0;
  const missingInPostgres = [];
  try {
    const result = await listAirtableSourceRows();
    if (result.skipped) return false;
    airtableRowCount = result.rows.length;

    const existing = await pool.query(
      `SELECT id, legacy_source_airtable_id FROM gua_records WHERE legacy_source_airtable_id = ANY($1::text[])`,
      [result.rows.map((r) => r.airtableId)]
    );
    const existingByAirtableId = new Map(existing.rows.map((r) => [r.legacy_source_airtable_id, r.id]));

    for (const r of result.rows) {
      if (!r.entryType || r.entryType !== "divination") continue; // 深卜/複盤走既有回填腳本的邏輯,增量同步只顧「新卦」
      const gid = existingByAirtableId.get(r.airtableId);
      if (gid) {
        matchedCount++;
        await pool.query(
          `UPDATE gua_records SET
             ben_gua = COALESCE($1, ben_gua),
             question_text = COALESCE($2, question_text),
             qigua_time = COALESCE($3, qigua_time),
             golden_seal = COALESCE($4, golden_seal),
             golden_seal_time = COALESCE($5, golden_seal_time),
             trace_text = COALESCE($6, trace_text),
             updated_at = now()
           WHERE id = $7`,
          [r.benGua, r.questionText, r.qiguaTime, r.goldenSeal, r.goldenSealTime, r.traceText, gid]
        );
        updatedCount++;
      } else {
        missingInPostgres.push(r.airtableId);
        const subject = r.lineUserIdRaw || `UNKNOWN-${r.airtableId}`;
        await pool.query(
          `INSERT INTO gua_records
             (subject, request_id, ben_gua, question_text, qigua_time, golden_seal, golden_seal_time,
              trace_text, is_legacy_import, legacy_source_airtable_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9)
           ON CONFLICT (legacy_source_airtable_id) WHERE legacy_source_airtable_id IS NOT NULL DO NOTHING`,
          [subject, `incr-${r.airtableId}`, r.benGua || "UNKNOWN", r.questionText, r.qiguaTime,
           r.goldenSeal, r.goldenSealTime, r.traceText, r.airtableId]
        );
        insertedCount++;
      }
    }

    // missing_in_airtable:Postgres 側有 legacy_source_airtable_id,但這輪 Airtable 掃描沒看到
    // (可能是刪除、也可能是分頁/篩選漏掉)——只記錄,不自動處理。
    const seenIds = result.rows.map((r) => r.airtableId);
    const orphanCheck = await pool.query(
      `SELECT id, legacy_source_airtable_id FROM gua_records
       WHERE legacy_source_airtable_id IS NOT NULL AND NOT (legacy_source_airtable_id = ANY($1::text[]))`,
      [seenIds]
    );
    const missingInAirtable = orphanCheck.rows.map((r) => r.id);

    await pool.query(
      `INSERT INTO incremental_sync_runs
         (id, source, started_at, finished_at, airtable_row_count, matched_count, inserted_count,
          updated_count, missing_in_postgres, missing_in_airtable)
       VALUES ($1,$2,$3,now(),$4,$5,$6,$7,$8::jsonb,$9::jsonb)`,
      [runId, `airtable_divination_log(${result.schema})`, startedAt, airtableRowCount, matchedCount,
       insertedCount, updatedCount, JSON.stringify(missingInPostgres), JSON.stringify(missingInAirtable)]
    );
    log.info("incremental_sync_run_done", {
      runId, airtableRowCount, matchedCount, insertedCount, updatedCount,
      missingInAirtableCount: missingInAirtable.length,
    });
  } catch (err) {
    await pool.query(
      `INSERT INTO incremental_sync_runs (id, source, started_at, finished_at, error)
       VALUES ($1,'airtable_divination_log',$2,now(),$3)`,
      [runId, startedAt, String(err && err.message || err)]
    ).catch(() => {});
    log.error("incremental_sync_run_failed", { runId, error: String(err && err.message || err) });
  }
  return true;
}

async function mainLoop() {
  log.info("worker_boot_start", {
    apiBaseUrl: API_BASE_URL,
    airtableConfigured: airtableConfigured(),
    incrementalSyncEnabled: ENABLE_INCREMENTAL_SYNC,
    incrementalSyncConfigured: incrementalSyncConfigured(),
  });
  // 開機先跑一次 migration 讀取確認 schema 存在(不重跑;server.js 已跑過,這裡只是保險，冪等)。
  for (;;) {
    let didWork = false;
    try {
      if (await runJobLoop()) didWork = true;
    } catch (err) {
      log.error("job_loop_iteration_failed", { error: String(err && err.message || err) });
    }
    try {
      if (await runOutboxLoop()) didWork = true;
    } catch (err) {
      log.error("outbox_loop_iteration_failed", { error: String(err && err.message || err) });
    }
    try {
      if (await runAirtableSyncLoop()) didWork = true;
    } catch (err) {
      log.error("airtable_sync_loop_iteration_failed", { error: String(err && err.message || err) });
    }
    try {
      if (await runIncrementalAirtableToPostgresSync()) didWork = true;
    } catch (err) {
      log.error("incremental_sync_loop_iteration_failed", { error: String(err && err.message || err) });
    }
    if (!didWork) await new Promise((r) => setTimeout(r, POLL_IDLE_MS));
  }
}

mainLoop().catch((err) => {
  log.error("worker_crashed", { error: String(err && err.message || err) });
  process.exit(1);
});
