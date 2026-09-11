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
