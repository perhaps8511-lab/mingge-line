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
    log.info("gua_record_create_done", { requestId, subject, request_id, replay: record.replay, recordId: record.row.id });
    return json(res, record.replay ? 200 : 201, { ...record.row, idempotent_replay: record.replay });
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
  if (req.method === "GET" && url.pathname.startsWith("/gua-records/")) {
    const id = url.pathname.slice("/gua-records/".length);
    return getGuaRecordById(res, id);
  }
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
