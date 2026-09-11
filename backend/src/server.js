import http from "node:http";
import crypto from "node:crypto";
import { getPool, withTransaction } from "./db.js";
import { runMigrations } from "./migrate.js";
import { log } from "./log.js";

const PORT = Number(process.env.PORT || 8080);

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = "";
    req.on("data", (c) => {
      chunks += c;
      if (chunks.length > 1_000_000) {
        reject(new Error("payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(chunks));
    req.on("error", reject);
  });
}

// POST /gua-records — 冪等建立(subject+request_id 唯一);同一 transaction 內寫 outbox。
async function createGuaRecord(req, res) {
  let body;
  try {
    body = JSON.parse((await readBody(req)) || "{}");
  } catch {
    return json(res, 400, { error: "invalid_json_body" });
  }
  const { subject, request_id, ben_gua, question_text } = body || {};
  if (!subject || !request_id || !ben_gua) {
    return json(res, 400, { error: "missing_required_field", required: ["subject", "request_id", "ben_gua"] });
  }

  const requestId = crypto.randomUUID();
  try {
    const record = await withTransaction(async (client) => {
      const existing = await client.query(
        "SELECT * FROM gua_records WHERE subject = $1 AND request_id = $2",
        [subject, request_id]
      );
      if (existing.rows.length > 0) {
        log.info("gua_record_idempotent_replay", { requestId, subject, request_id, recordId: existing.rows[0].id });
        return { row: existing.rows[0], replay: true };
      }
      const inserted = await client.query(
        `INSERT INTO gua_records (subject, request_id, ben_gua, question_text)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [subject, request_id, ben_gua, question_text || null]
      );
      const row = inserted.rows[0];
      await client.query(
        `INSERT INTO outbox_messages (aggregate_type, aggregate_id, event_type, payload)
         VALUES ('gua_record', $1, 'gua_record.created', $2::jsonb)`,
        [row.id, JSON.stringify({ subject, request_id, ben_gua })]
      );
      await client.query(
        `INSERT INTO audit_events (actor, action, subject_ref, result)
         VALUES ('api', 'gua_record.create', $1, 'success')`,
        [subject]
      );
      return { row, replay: false };
    });

    // D-U03「顯式保存成功且 readback PASS」——commit 之後,用另一條連線重新讀一次,
    // 確認資料真的落地、欄位真的一致,才對外回成功;不是「INSERT 沒噴錯」就直接宣稱已保存。
    let verified;
    try {
      const { rows } = await getPool().query("SELECT * FROM gua_records WHERE id = $1", [record.row.id]);
      verified = rows[0];
    } catch (err) {
      log.error("gua_record_readback_verify_query_failed", { requestId, recordId: record.row.id, error: String(err && err.message || err) });
      return json(res, 500, { error: "write_unconfirmed", reason: "readback_query_failed" });
    }
    if (!verified || verified.subject !== subject || verified.request_id !== request_id || verified.ben_gua !== ben_gua) {
      log.error("gua_record_readback_verify_mismatch", { requestId, recordId: record.row.id });
      return json(res, 500, { error: "write_unconfirmed", reason: "readback_mismatch" });
    }

    log.info("gua_record_create_done", { requestId, subject, request_id, replay: record.replay, recordId: record.row.id, readback_verified: true });
    return json(res, record.replay ? 200 : 201, { ...verified, idempotent_replay: record.replay, readback_verified: true });
  } catch (err) {
    log.error("gua_record_create_failed", { requestId, subject, request_id, error: String(err && err.message || err) });
    return json(res, 500, { error: "internal_error" });
  }
}

// GET /gua-records/:id — 單筆 readback
async function getGuaRecordById(res, id) {
  try {
    const { rows } = await getPool().query("SELECT * FROM gua_records WHERE id = $1", [id]);
    if (rows.length === 0) return json(res, 404, { error: "not_found" });
    return json(res, 200, rows[0]);
  } catch (err) {
    log.error("gua_record_read_failed", { id, error: String(err && err.message || err) });
    return json(res, 500, { error: "internal_error" });
  }
}

// GET /gua-records/by-key?subject=&request_id= — 依冪等鍵查(readback 用,不新增)
async function getGuaRecordByKey(res, subject, requestId) {
  if (!subject || !requestId) return json(res, 400, { error: "missing_query_param", required: ["subject", "request_id"] });
  try {
    const { rows } = await getPool().query(
      "SELECT * FROM gua_records WHERE subject = $1 AND request_id = $2",
      [subject, requestId]
    );
    if (rows.length === 0) return json(res, 404, { error: "not_found" });
    return json(res, 200, rows[0]);
  } catch (err) {
    log.error("gua_record_read_by_key_failed", { subject, requestId, error: String(err && err.message || err) });
    return json(res, 500, { error: "internal_error" });
  }
}

// ── 深卜：接回原卦記(Owner 2026-09-11 裁定①)。inbox 去重(Owner 卡§2 item3)+ jobs 背景處理(item2)。
// POST /gua-records/:id/deep-read  body: { request_id, external_event_id? }
async function triggerDeepRead(req, res, id) {
  let body;
  try {
    body = JSON.parse((await readBody(req)) || "{}");
  } catch {
    return json(res, 400, { error: "invalid_json_body" });
  }
  const { request_id, external_event_id, force_fail_count } = body || {};
  if (!request_id) return json(res, 400, { error: "missing_required_field", required: ["request_id"] });

  try {
    const outcome = await withTransaction(async (client) => {
      // inbox 去重:同一個外部事件(如 LINE webhook 重送)重送兩次,只處理一次。
      if (external_event_id) {
        const existingInbox = await client.query(
          "SELECT * FROM inbox_events WHERE source = 'deepdive_trigger' AND external_id = $1",
          [external_event_id]
        );
        if (existingInbox.rows.length > 0) {
          const rec = await client.query("SELECT * FROM gua_records WHERE id = $1", [id]);
          return { row: rec.rows[0], inbox_replay: true, job_created: false };
        }
        await client.query(
          "INSERT INTO inbox_events (source, external_id) VALUES ('deepdive_trigger', $1)",
          [external_event_id]
        );
      }

      const recRes = await client.query("SELECT * FROM gua_records WHERE id = $1 FOR UPDATE", [id]);
      if (recRes.rows.length === 0) return { notFound: true };
      const rec = recRes.rows[0];

      // 同一筆卦記若已有 deep_read_request_id 且非本次 request_id,視為已經在跑/跑完,不重複啟動。
      if (rec.deep_read_request_id && rec.deep_read_request_id !== request_id) {
        return { row: rec, already_started: true, job_created: false };
      }
      if (rec.deep_read_request_id === request_id) {
        return { row: rec, request_replay: true, job_created: false };
      }

      const updated = await client.query(
        `UPDATE gua_records
         SET deep_read_request_id = $1, deep_read_state = 'pending', deep_read_started_at = now()
         WHERE id = $2
         RETURNING *`,
        [request_id, id]
      );
      const job = await client.query(
        `INSERT INTO jobs (job_type, payload) VALUES ('deep_read.process', $1::jsonb) RETURNING id`,
        [JSON.stringify({ gua_record_id: id, request_id, force_fail_count: force_fail_count || 0 })]
      );
      await client.query(
        `INSERT INTO audit_events (actor, action, subject_ref, result) VALUES ('api', 'deep_read.trigger', $1, 'accepted')`,
        [rec.subject]
      );
      return { row: updated.rows[0], job_created: true, job_id: job.rows[0].id };
    });

    if (outcome.notFound) return json(res, 404, { error: "not_found" });
    return json(res, outcome.job_created ? 202 : 200, outcome);
  } catch (err) {
    log.error("deep_read_trigger_failed", { id, error: String(err && err.message || err) });
    return json(res, 500, { error: "internal_error" });
  }
}

// ── 複盤：接回原卦記 + 改讀 Entitlements(Owner 裁定②)+ 先落地再通知(Owner 裁定④，靠 outbox)。
// POST /fupan-reviews  body: { holder_id, request_id, current_question, source_gua_record_ids: [] }
async function createFupanReview(req, res) {
  let body;
  try {
    body = JSON.parse((await readBody(req)) || "{}");
  } catch {
    return json(res, 400, { error: "invalid_json_body" });
  }
  const { holder_id, request_id, current_question, source_gua_record_ids } = body || {};
  if (!holder_id || !request_id || !current_question || !Array.isArray(source_gua_record_ids) || source_gua_record_ids.length === 0) {
    return json(res, 400, {
      error: "missing_required_field",
      required: ["holder_id", "request_id", "current_question", "source_gua_record_ids(non-empty array)"],
    });
  }

  try {
    const outcome = await withTransaction(async (client) => {
      const existing = await client.query(
        "SELECT * FROM fupan_reviews WHERE holder_id = $1 AND request_id = $2",
        [holder_id, request_id]
      );
      if (existing.rows.length > 0) {
        return { row: existing.rows[0], replay: true, job_created: false };
      }

      // Owner 裁定②:複盤准入改讀 Entitlements(action_scope='fupan'),不看 Subscribers.subscriber_tier。
      const ent = await client.query(
        `SELECT * FROM entitlements
         WHERE holder_id = $1 AND action_scope = 'fupan' AND entitlement_state = 'active'
           AND (expires_at IS NULL OR expires_at > now())
         ORDER BY created_at DESC LIMIT 1`,
        [holder_id]
      );
      if (ent.rows.length === 0) {
        return { entitlementDenied: true };
      }
      const entitlement = ent.rows[0];

      const review = await client.query(
        `INSERT INTO fupan_reviews (holder_id, request_id, current_question, source_entitlement_id)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [holder_id, request_id, current_question, entitlement.entitlement_id]
      );
      const reviewId = review.rows[0].id;

      // 來源卦記:依 qigua_time 明確排序(修正現役複盤鏈「maxRecords=6 無排序」的落差),
      // 讀不到/非本人擁有的 id 標 orphan,不硬湊(Owner 裁定①)。
      const ownedRes = await client.query(
        `SELECT id, qigua_time FROM gua_records WHERE id = ANY($1::uuid[]) AND subject = $2 ORDER BY qigua_time ASC NULLS LAST`,
        [source_gua_record_ids, holder_id]
      );
      const ownedIds = new Set(ownedRes.rows.map((r) => r.id));
      for (const refId of source_gua_record_ids) {
        if (ownedIds.has(refId)) {
          await client.query(
            `INSERT INTO fupan_review_sources (fupan_review_id, gua_record_id, raw_reference, is_orphan)
             VALUES ($1, $2, $3, false)`,
            [reviewId, refId, refId]
          );
        } else {
          await client.query(
            `INSERT INTO fupan_review_sources (fupan_review_id, gua_record_id, raw_reference, is_orphan)
             VALUES ($1, NULL, $2, true)`,
            [reviewId, refId]
          );
        }
      }

      const job = await client.query(
        `INSERT INTO jobs (job_type, payload) VALUES ('fupan.process', $1::jsonb) RETURNING id`,
        [JSON.stringify({ fupan_review_id: reviewId })]
      );
      await client.query(
        `INSERT INTO audit_events (actor, action, subject_ref, result) VALUES ('api', 'fupan_review.create', $1, 'accepted')`,
        [holder_id]
      );
      return { row: review.rows[0], job_created: true, job_id: job.rows[0].id, owned_source_count: ownedIds.size, orphan_count: source_gua_record_ids.length - ownedIds.size };
    });

    if (outcome.entitlementDenied) return json(res, 403, { error: "entitlement_required", action_scope: "fupan" });
    return json(res, outcome.job_created ? 202 : 200, outcome);
  } catch (err) {
    log.error("fupan_review_create_failed", { holder_id, request_id, error: String(err && err.message || err) });
    return json(res, 500, { error: "internal_error" });
  }
}

async function getFupanReviewById(res, id) {
  try {
    const { rows } = await getPool().query("SELECT * FROM fupan_reviews WHERE id = $1", [id]);
    if (rows.length === 0) return json(res, 404, { error: "not_found" });
    const sources = await getPool().query(
      "SELECT gua_record_id, raw_reference, is_orphan FROM fupan_review_sources WHERE fupan_review_id = $1 ORDER BY created_at ASC",
      [id]
    );
    return json(res, 200, { ...rows[0], sources: sources.rows });
  } catch (err) {
    log.error("fupan_review_read_failed", { id, error: String(err && err.message || err) });
    return json(res, 500, { error: "internal_error" });
  }
}

// 假 LINE 通知端點(staging 用);背景 worker 消化 outbox 後呼叫這裡,不打正式 LINE。
async function mockLinePush(req, res) {
  let body;
  try {
    body = JSON.parse((await readBody(req)) || "{}");
  } catch {
    return json(res, 400, { error: "invalid_json_body" });
  }
  log.info("mock_line_push_received", { to: body.to, event_type: body.event_type, textPreview: (body.text || "").slice(0, 40) });
  return json(res, 200, { ok: true, mocked: true, received_at: new Date().toISOString() });
}

async function health(res) {
  try {
    await getPool().query("SELECT 1");
    return json(res, 200, { ok: true, db: "connected", service: "mingge-backend", version: "0.1.0" });
  } catch (err) {
    return json(res, 503, { ok: false, db: "unreachable", error: String(err && err.message || err) });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const startedAt = Date.now();
  res.on("finish", () => {
    log.info("http_request", { method: req.method, path: url.pathname, status: res.statusCode, ms: Date.now() - startedAt });
  });

  if (req.method === "GET" && url.pathname === "/health") return health(res);
  if (req.method === "POST" && url.pathname === "/gua-records") return createGuaRecord(req, res);
  if (req.method === "GET" && url.pathname === "/gua-records/by-key") {
    return getGuaRecordByKey(res, url.searchParams.get("subject"), url.searchParams.get("request_id"));
  }
  if (req.method === "POST" && /^\/gua-records\/[^/]+\/deep-read$/.test(url.pathname)) {
    const id = url.pathname.split("/")[2];
    return triggerDeepRead(req, res, id);
  }
  if (req.method === "GET" && url.pathname.startsWith("/gua-records/")) {
    const id = url.pathname.slice("/gua-records/".length);
    return getGuaRecordById(res, id);
  }
  if (req.method === "POST" && url.pathname === "/fupan-reviews") return createFupanReview(req, res);
  if (req.method === "GET" && url.pathname.startsWith("/fupan-reviews/")) {
    const id = url.pathname.slice("/fupan-reviews/".length);
    return getFupanReviewById(res, id);
  }
  if (req.method === "POST" && url.pathname === "/internal/mock-line-push") return mockLinePush(req, res);
  return json(res, 404, { error: "not_found" });
});

async function main() {
  log.info("boot_start", { port: PORT });
  await runMigrations();
  server.listen(PORT, () => {
    log.info("boot_listening", { port: PORT });
  });
}

main().catch((err) => {
  log.error("boot_failed", { error: String(err && err.message || err) });
  process.exit(1);
});
