// MAKE_EXIT 第2b段｜Airtable Divination_Log → gua_records 回填(staging 去識別化演練)。
//
// 輸入:Airtable list_records 匯出的 JSON 檔(格式 {records:[{id, createdTime, cellValuesByFieldId:{...}}], ...})，
// 可以是多個檔案(分頁匯出時)。本腳本不會去打 Airtable API,只處理已經匯出的檔案——
// 匯出動作本身(讀哪些欄位)由呼叫端決定,這樣同一支腳本正式遷移時也能重用,只要換掉輸入檔。
//
// 隱私處理(Owner 2026-09-11 明文要求「去識別化的複本演練」)：
// - line_user_id_raw 一律 SHA-256 雜湊,加 STG-legacy- 前綴,不存明文。
// - question_text／output_json／trace_text 一律替換成固定遮罩字串,不存原文一個字。
// - redline_hit／kaguan_type／standard_response／hotline_given／level 這些合規敏感分類欄位，
//   本腳本刻意不讀取、不搬——不是遺漏，是本段刻意排除(見交付報告)。
// - ben_gua／bian_gua／dong_yao／qigua_time／golden_seal 等結構性卦象資料視為非個資，予以保留，
//   用來驗證回填的關聯/對帳邏輯是否正確。
//
// 用法：
//   AIRTABLE_EXPORT_FILES=/path/a.json,/path/b.json \
//   DATABASE_URL=postgresql://... \
//   node scripts/backfill_from_airtable.mjs
//
// 輸出：只印筆數統計(不印任何個資/內容)，並把統計寫進 OUT_SUMMARY_PATH(若有設定)。

import { readFileSync, writeFileSync } from "node:fs";
import crypto from "node:crypto";
import pg from "pg";

const EXPORT_FILES = (process.env.AIRTABLE_EXPORT_FILES || "").split(",").map((s) => s.trim()).filter(Boolean);
const OUT_SUMMARY_PATH = process.env.OUT_SUMMARY_PATH;
const MASK_TEXT = "[遮罩：正式回填時再解遮罩，本次 staging 去識別化演練不搬運原文]";

// Divination_Log 欄位 ID(來自 apptFfyVBYE4ygW3E / tblVyf8WfTQxvtpEg schema)。
const F = {
  session_id: "fld67Yn6ogmsQJ6Hn",
  entry_type: "fldXW48ZTDcrwnA0k",
  line_user_id_raw: "fldqFGVohUrJFRYX9",
  question_text: "fldXIHjsI3yimw7IP",
  ben_gua: "fldmIF4i5o9sOflZX",
  bian_gua: "fldVFGQjExKrTHO6d",
  dong_yao: "fldQ8nRf3DA2br242",
  qigua_time: "fldHxJQcy4q6cSb1g",
  golden_seal: "fldXH6MZGcbhyc4ZG",
  golden_seal_time: "fldDzkTIZLTp76rpm",
  trace_text: "fldrZzWVA0pS9gASk",
  output_json: "fldhcvDKqS1ACQnaq",
  ben_gua_no: "fldklaYfLUuyJrOwg",
  bian_gua_no: "fldWHZHreX24Pu2He",
};

function hashSubject(raw) {
  if (!raw) return null;
  const h = crypto.createHash("sha256").update(String(raw)).digest("hex").slice(0, 16);
  return `STG-legacy-${h}`;
}

function loadRecords() {
  const all = [];
  for (const f of EXPORT_FILES) {
    const raw = readFileSync(f, "utf8");
    // 匯出檔可能是 MCP 工具原樣回傳的 [{type:"text", text:"..."}] 包裝,也可能是純 {records:[...]}。
    let parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed[0] && parsed[0].text) parsed = JSON.parse(parsed[0].text);
    all.push(...(parsed.records || []));
  }
  return all;
}

function extractFields(rec) {
  const c = rec.cellValuesByFieldId || {};
  const val = (fieldId) => (c[fieldId] === undefined ? null : c[fieldId]);
  const entryTypeCell = val(F.entry_type);
  return {
    airtableId: rec.id,
    airtableCreatedTime: rec.createdTime,
    sessionId: val(F.session_id),
    entryType: entryTypeCell && entryTypeCell.name ? entryTypeCell.name : (val(F.session_id) ? "divination" : null),
    lineUserIdRaw: val(F.line_user_id_raw),
    hasQuestionText: val(F.question_text) != null && String(val(F.question_text)).trim() !== "",
    hasOutputJson: val(F.output_json) != null && String(val(F.output_json)).trim() !== "",
    hasTraceText: val(F.trace_text) != null && String(val(F.trace_text)).trim() !== "",
    benGua: val(F.ben_gua),
    bianGua: val(F.bian_gua),
    dongYao: val(F.dong_yao),
    benGuaNo: val(F.ben_gua_no),
    bianGuaNo: val(F.bian_gua_no),
    qiguaTime: val(F.qigua_time),
    goldenSeal: !!val(F.golden_seal),
    goldenSealTime: val(F.golden_seal_time),
  };
}

async function main() {
  if (EXPORT_FILES.length === 0) throw new Error("AIRTABLE_EXPORT_FILES not set");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const rawRecords = loadRecords();
  const summary = {
    total_airtable_records: rawRecords.length,
    empty_skipped: 0,
    divination_imported: 0,
    divination_skipped_already_imported: 0,
    deepdive_merged: 0,
    deepdive_orphan: 0,
    fupan_imported_as_legacy_orphan: 0,
    errors: [],
  };

  const parsed = rawRecords.map(extractFields);

  // Pass 1: divination(先建立 subject_hash+session_id → gua_record_id 對照,供 deepdive 關聯用)。
  const parentMap = new Map(); // key: subjectHash|sessionId -> gua_record.id
  for (const r of parsed) {
    if (!r.sessionId && !r.entryType) { summary.empty_skipped++; continue; }
    if (r.entryType !== "divination") continue;
    const subject = hashSubject(r.lineUserIdRaw) || `STG-legacy-unknown-${r.airtableId}`;
    try {
      const result = await client.query(
        `INSERT INTO gua_records
           (subject, request_id, ben_gua, question_text, trace_text, trace_at, revision,
            golden_seal, golden_seal_time, qigua_time, created_at,
            is_legacy_import, legacy_source_airtable_id)
         VALUES ($1,$2,$3,$4,$5,$6,1,$7,$8,$9,$10,true,$11)
         ON CONFLICT (legacy_source_airtable_id) WHERE legacy_source_airtable_id IS NOT NULL DO NOTHING
         RETURNING id`,
        [
          subject, `legacy-${r.airtableId}`, r.benGua || "UNKNOWN",
          r.hasQuestionText ? MASK_TEXT : null,
          r.hasTraceText ? MASK_TEXT : null,
          r.hasTraceText ? (r.qiguaTime || r.airtableCreatedTime) : null,
          r.goldenSeal, r.goldenSealTime || null,
          r.qiguaTime || null, r.airtableCreatedTime, r.airtableId,
        ]
      );
      if (result.rows.length > 0) {
        summary.divination_imported++;
        if (r.sessionId) parentMap.set(`${subject}|${r.sessionId}`, result.rows[0].id);
      } else {
        summary.divination_skipped_already_imported++;
        // 已存在也要補進 parentMap,供本次 run 內的 deepdive 關聯用。
        const existing = await client.query(
          "SELECT id FROM gua_records WHERE legacy_source_airtable_id = $1", [r.airtableId]
        );
        if (existing.rows[0] && r.sessionId) parentMap.set(`${subject}|${r.sessionId}`, existing.rows[0].id);
      }
    } catch (err) {
      summary.errors.push({ airtableId: r.airtableId, entryType: "divination", error: String(err.message || err) });
    }
  }

  // Pass 2: deepdive(嘗試用 subject_hash+session_id 接回本卦記;接不回標 orphan,不硬湊)。
  for (const r of parsed) {
    if (r.entryType !== "deepdive") continue;
    const subject = hashSubject(r.lineUserIdRaw) || `STG-legacy-unknown-${r.airtableId}`;
    const key = r.sessionId ? `${subject}|${r.sessionId}` : null;
    const parentId = key ? parentMap.get(key) : null;
    try {
      if (parentId) {
        await client.query(
          `UPDATE gua_records
           SET deep_read_request_id = COALESCE(deep_read_request_id, $1),
               deep_read_state = $2,
               deep_read_output_json = $3,
               deep_read_completed_at = $4
           WHERE id = $5 AND deep_read_request_id IS NULL`,
          [`legacy-${r.airtableId}`, r.hasOutputJson ? "completed" : "pending",
           r.hasOutputJson ? MASK_TEXT : null, r.airtableCreatedTime, parentId]
        );
        summary.deepdive_merged++;
      } else {
        await client.query(
          `INSERT INTO legacy_backfill_orphans (entry_type, source_airtable_id, subject_hash, session_id, reason)
           VALUES ('deepdive', $1, $2, $3, 'no_matching_divination_parent_by_subject_and_session_id')
           ON CONFLICT (source_airtable_id) DO NOTHING`,
          [r.airtableId, subject, r.sessionId]
        );
        summary.deepdive_orphan++;
      }
    } catch (err) {
      summary.errors.push({ airtableId: r.airtableId, entryType: "deepdive", error: String(err.message || err) });
    }
  }

  // Pass 3: fupan(舊資料沒有留存來源卦記清單,全部視為 legacy orphan,不假裝知道來源)。
  for (const r of parsed) {
    if (r.entryType !== "fupan") continue;
    const subject = hashSubject(r.lineUserIdRaw) || `STG-legacy-unknown-${r.airtableId}`;
    try {
      await client.query(
        `INSERT INTO fupan_reviews
           (holder_id, request_id, state, current_question, result_json, completed_at,
            is_legacy_import, legacy_source_note)
         VALUES ($1,$2,$3,$4,$5,$6,true,$7)
         ON CONFLICT (holder_id, request_id) DO NOTHING`,
        [
          subject, `legacy-${r.airtableId}`, r.hasOutputJson ? "completed" : "pending",
          MASK_TEXT, r.hasOutputJson ? MASK_TEXT : null, r.airtableCreatedTime,
          "舊資料無法回溯來源卦記清單(現役複盤鏈本身未記錄);sources 留空,不硬湊",
        ]
      );
      summary.fupan_imported_as_legacy_orphan++;
    } catch (err) {
      summary.errors.push({ airtableId: r.airtableId, entryType: "fupan", error: String(err.message || err) });
    }
  }

  await client.end();
  console.log(JSON.stringify(summary, null, 2));
  if (OUT_SUMMARY_PATH) writeFileSync(OUT_SUMMARY_PATH, JSON.stringify(summary, null, 2), "utf8");
}

main().catch((err) => {
  console.error("BACKFILL_FAILED", err);
  process.exit(1);
});
