-- MAKE_EXIT 第2b段(獨立審 HOLD 修正)｜Airtable→Postgres 常駐增量同步 + 對帳留痕。
-- Owner 裁定(2026-09-11)：不接受第3→4步之間「新卦消失」的窗口；加一個常駐 job，
-- 從第3步切換前開始跑到第4步雙寫觀察期結束；同時是對帳工具，差異記 log 不自動修。

-- 每一輪同步的留痕：筆數 + 差異清單(哪些 Airtable record id 在 Postgres 找不到、
-- 哪些 Postgres gua_record 在 Airtable 找不到)，不是只留筆數。
CREATE TABLE IF NOT EXISTS incremental_sync_runs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source                  text NOT NULL, -- 'airtable_divination_log'(正式)或本次演練用的 test base 代號
  started_at              timestamptz NOT NULL DEFAULT now(),
  finished_at             timestamptz,
  airtable_row_count      integer,
  matched_count           integer,      -- Airtable 有、Postgres 也有(同一筆 legacy_source_airtable_id)
  inserted_count          integer,      -- Airtable 有、Postgres 原本沒有 → 這次補進去的
  updated_count           integer,      -- 兩邊都有，內容有差異而更新的
  missing_in_postgres     jsonb,        -- Airtable record id 陣列:這輪結束後仍缺(理論上應該=0,inserted已補)
  missing_in_airtable     jsonb,        -- gua_records.id 陣列:有 legacy_source_airtable_id 但 Airtable 端已查無
  error                   text,
  created_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incremental_sync_runs_started ON incremental_sync_runs (started_at DESC);
