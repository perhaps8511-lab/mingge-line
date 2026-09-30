// MAKE_EXIT 第2b段｜真的把回寫送到 Airtable 測試 base(不是正式兩個 base)。
// 需要環境變數 AIRTABLE_API_KEY(讀寫測試 base 的 PAT)、AIRTABLE_TEST_BASE_ID、AIRTABLE_TEST_TABLE_ID。
// 任一變數缺少 → syncToAirtable 回傳 { skipped: true, reason: "not_configured" }，
// 呼叫端(worker.js)照舊只更新 airtable_sync_log 為 mocked,不假裝送出成功。
import { log } from "./log.js";

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_TEST_BASE_ID = process.env.AIRTABLE_TEST_BASE_ID;
const AIRTABLE_TEST_TABLE_ID = process.env.AIRTABLE_TEST_TABLE_ID;

// 欄位 ID(appXHjfHh4FK8ZlsF / Divination_Log_STAGING_TEST，2026-09-11 建)。
const FIELDS = {
  session_id: "fld1vLRmYTUFpgN6N",
  entry_type: "fldbEx2EUNj4lrlGE",
  line_user_id_raw: "flduvHI2sK0z1pxH8",
  ben_gua: "fldEhqiZirgRRlRPL",
  question_text: "fldJoapvysSXaGAUw",
  privacy_flag: "fldAo1fMdndAQxCxJ",
  source_postgres_table: "fldfH05KCAGqFM25h",
  source_postgres_id: "fldzUslXGGDqACizT",
  synced_at: "fldR1i4CYr5zYwoHU",
};

export function airtableConfigured() {
  return !!(AIRTABLE_API_KEY && AIRTABLE_TEST_BASE_ID && AIRTABLE_TEST_TABLE_ID);
}

// ── 增量同步(Airtable→Postgres，item2)的來源端設定 ──────────────────────────
// 正式 Divination_Log 的真實 base/table/欄位 ID(見 backend/scripts/backfill_from_airtable.mjs
// 的同一份欄位對照，這裡只挑增量同步需要的欄位，不含合規敏感欄位)。
// 本卡授權仍是 staging-only：AIRTABLE_SYNC_SCHEMA 預設 'test'，只有正式切換第3步經 Owner
// 另發 GO 才會有人把它設成 'production' 並指向真正的 Divination_Log。
const SYNC_SCHEMAS = {
  production: {
    baseId: "apptFfyVBYE4ygW3E",
    tableId: "tblVyf8WfTQxvtpEg",
    fields: {
      session_id: "fld67Yn6ogmsQJ6Hn",
      entry_type: "fldXW48ZTDcrwnA0k",
      line_user_id_raw: "fldqFGVohUrJFRYX9",
      ben_gua: "fldmIF4i5o9sOflZX",
      question_text: "fldXIHjsI3yimw7IP",
      qigua_time: "fldHxJQcy4q6cSb1g",
      golden_seal: "fldXH6MZGcbhyc4ZG",
      golden_seal_time: "fldDzkTIZLTp76rpm",
      trace_text: "fldrZzWVA0pS9gASk",
    },
  },
  test: {
    // 指向本次演練的測試 base，欄位對照見上面 FIELDS(session_id/entry_type/line_user_id_raw/
    // ben_gua/question_text)。測試 base 沒有 qigua_time/golden_seal/trace_text 欄位，同步時視為缺值。
    baseId: AIRTABLE_TEST_BASE_ID,
    tableId: AIRTABLE_TEST_TABLE_ID,
    fields: {
      session_id: FIELDS.session_id,
      entry_type: FIELDS.entry_type,
      line_user_id_raw: FIELDS.line_user_id_raw,
      ben_gua: FIELDS.ben_gua,
      question_text: FIELDS.question_text,
    },
  },
};

export function incrementalSyncConfigured() {
  const schema = process.env.AIRTABLE_SYNC_SCHEMA || "test";
  const cfg = SYNC_SCHEMAS[schema];
  return !!(AIRTABLE_API_KEY && cfg && cfg.baseId && cfg.tableId);
}

// 全表掃描(本次規模 ~126-200 筆，全表掃描比另外維護 lastModifiedTime 過濾簡單且不會漏更新;
// 量大到需要真正增量過濾時，需另外在來源表加 lastModifiedTime 欄位，這裡先誠實記錄這個限制)。
export async function listAirtableSourceRows() {
  const schema = process.env.AIRTABLE_SYNC_SCHEMA || "test";
  const cfg = SYNC_SCHEMAS[schema];
  if (!incrementalSyncConfigured()) return { skipped: true, reason: "not_configured" };

  const rows = [];
  let offset;
  do {
    // returnFieldsByFieldId=true 是必要的:Airtable 原生 REST API 預設用「欄位名稱」當
    // fields 物件的 key,只有加這個參數才會改成用「欄位 ID」當 key——這裡的 cfg.fields.xxx
    // 全部是欄位 ID,沒有這個參數會全部查不到值(見下方 bug 記錄)。
    const params = new URLSearchParams({ pageSize: "100", returnFieldsByFieldId: "true" });
    if (offset) params.set("offset", offset);
    const res = await fetch(
      `https://api.airtable.com/v0/${cfg.baseId}/${cfg.tableId}?${params.toString()}`,
      { headers: { Authorization: "Bearer " + AIRTABLE_API_KEY } }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`airtable_list_failed_${res.status}:${text.slice(0, 200)}`);
    }
    const data = await res.json();
    for (const rec of data.records || []) {
      const f = rec.fields || {};
      const et = f[cfg.fields.entry_type];
      rows.push({
        airtableId: rec.id,
        sessionId: f[cfg.fields.session_id] || null,
        entryType: (et && et.name) || et || null,
        lineUserIdRaw: f[cfg.fields.line_user_id_raw] || null,
        benGua: f[cfg.fields.ben_gua] || null,
        questionText: f[cfg.fields.question_text] || null,
        qiguaTime: cfg.fields.qigua_time ? f[cfg.fields.qigua_time] || null : null,
        goldenSeal: cfg.fields.golden_seal ? !!f[cfg.fields.golden_seal] : false,
        goldenSealTime: cfg.fields.golden_seal_time ? f[cfg.fields.golden_seal_time] || null : null,
        traceText: cfg.fields.trace_text ? f[cfg.fields.trace_text] || null : null,
      });
    }
    offset = data.offset;
  } while (offset);
  return { skipped: false, schema, baseId: cfg.baseId, tableId: cfg.tableId, rows };
}

// payload: { entry_type, line_user_id_raw, session_id, ben_gua, question_text, source_table, source_id }
export async function syncToAirtable(payload) {
  if (!airtableConfigured()) return { skipped: true, reason: "not_configured" };

  const fields = {
    [FIELDS.entry_type]: payload.entry_type || "divination",
    [FIELDS.line_user_id_raw]: payload.line_user_id_raw || "",
    [FIELDS.session_id]: payload.session_id || "",
    [FIELDS.ben_gua]: payload.ben_gua || "",
    [FIELDS.question_text]: payload.question_text || "",
    [FIELDS.privacy_flag]: "private",
    [FIELDS.source_postgres_table]: payload.source_table,
    [FIELDS.source_postgres_id]: payload.source_id,
    [FIELDS.synced_at]: new Date().toISOString(),
  };

  const res = await fetch(
    `https://api.airtable.com/v0/${AIRTABLE_TEST_BASE_ID}/${AIRTABLE_TEST_TABLE_ID}`,
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + AIRTABLE_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({ records: [{ fields }], typecast: true }),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.error("airtable_sync_failed", { status: res.status, bodyPreview: text.slice(0, 200) });
    throw new Error(`airtable_write_failed_${res.status}`);
  }
  const data = await res.json();
  const airtableRecordId = data.records && data.records[0] && data.records[0].id;
  return { skipped: false, airtableRecordId };
}
