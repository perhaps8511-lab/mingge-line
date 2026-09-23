-- MAKE_EXIT 第2段 item4｜承接 Worker `/log/seal`、`/trace` 語意，供 staging Worker 對接用。

ALTER TABLE gua_records
  ADD COLUMN IF NOT EXISTS golden_seal      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS golden_seal_time timestamptz;

-- 補記(trace)改用正規化表,以 (gua_record_id, request_id) 當真正的冪等鍵,
-- 不像現役 Worker 那樣把 request_id 字串塞進單一 trace_text 欄位裡再解析比對——
-- Postgres 有關聯式表可以用,不需要繼續沿用 Airtable 單欄限制下的權宜寫法。
CREATE TABLE IF NOT EXISTS trace_entries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gua_record_id  uuid NOT NULL REFERENCES gua_records(id),
  request_id     text NOT NULL,
  entry_text     text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gua_record_id, request_id)
);
CREATE INDEX IF NOT EXISTS idx_trace_entries_record ON trace_entries (gua_record_id, created_at);
