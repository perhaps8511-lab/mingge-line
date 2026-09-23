-- MAKE_EXIT 第2b段｜回填支援。Owner 裁定(2026-09-11)：qigua_time 與 created_at 分開存,不合併;
-- 起卦時間是使用者的事,寫入時間是系統的事。回填時從 Airtable 帶過來。

ALTER TABLE gua_records
  ADD COLUMN IF NOT EXISTS qigua_time             timestamptz,
  ADD COLUMN IF NOT EXISTS is_legacy_import        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legacy_source_airtable_id text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_gua_records_legacy_source
  ON gua_records (legacy_source_airtable_id) WHERE legacy_source_airtable_id IS NOT NULL;

ALTER TABLE fupan_reviews
  ADD COLUMN IF NOT EXISTS is_legacy_import   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS legacy_source_note text;

-- 舊資料對不回的紀錄(目前只有 deepdive 類型可能發生:找不到同 subject+session_id 的本卦記)。
-- 不存內容,只存足以事後人工核對的座標。
CREATE TABLE IF NOT EXISTS legacy_backfill_orphans (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type          text NOT NULL,
  source_airtable_id  text NOT NULL,
  subject_hash        text,
  session_id          text,
  reason              text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_airtable_id)
);
