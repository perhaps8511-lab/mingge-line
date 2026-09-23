-- MAKE_EXIT 第2段｜卦記保存切片深化：深卜/複盤接回原卦記的關聯設計、
-- 複盤改讀 Entitlements(v1.2 語意，非 subscriber_tier)的骨架資料。
-- Owner 裁定(2026-09-11)：①深卜/複盤要接回原卦——新資料庫這段就建關聯，搬舊資料對不回的標 orphan，
-- 不硬湊，現役鏈第4段才動；②複盤准入改讀 Entitlements，只是新系統只認這一套。
-- 本檔只影響隔離 staging 的 Postgres，不碰任何正式 Airtable 資料。

-- 1) gua_records 補深卜欄位：對齊 Airtable Divination_Log 既有(但從未被寫入)的 deep_read_* 欄位語意，
--    寫回「同一筆」卦記，取代現役 Make 深卜鏈另開孤兒列的做法(見 GUA_RECORD_LIFECYCLE_20260911.md §2 階段D)。
ALTER TABLE gua_records
  ADD COLUMN IF NOT EXISTS deep_read_entitlement_id text,
  ADD COLUMN IF NOT EXISTS deep_read_request_id     text,
  ADD COLUMN IF NOT EXISTS deep_read_state          text
    CHECK (deep_read_state IS NULL OR deep_read_state IN ('pending','completed','failed')),
  ADD COLUMN IF NOT EXISTS deep_read_output_json     text,
  ADD COLUMN IF NOT EXISTS deep_read_started_at      timestamptz,
  ADD COLUMN IF NOT EXISTS deep_read_completed_at    timestamptz;

-- 同一筆卦記最多一次深卜請求生命週期；deep_read_request_id 是這次深卜動作的冪等鍵(非 gua_records 本身的鍵)。
CREATE UNIQUE INDEX IF NOT EXISTS uq_gua_records_deep_read_request
  ON gua_records (deep_read_request_id) WHERE deep_read_request_id IS NOT NULL;

-- 2) entitlements：staging 用的最小權益快照表。合成資料，不是正式 Payment/Entitlement 真相源，
--    正式資料仍在 Airtable 命格金流庫；第5段才處理真正的金流/權益遷移。
--    這裡只承接 v1.2 Offer Contract 已經寫死、但現役 Make/Worker 尚未使用的語意：
--    action_scope='fupan' + entitlement_state='active' + 期間未過期 才准入，不看 subscriber_tier。
CREATE TABLE IF NOT EXISTS entitlements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entitlement_id    text NOT NULL UNIQUE,
  holder_id         text NOT NULL,
  offer_id          text,
  offer_version     text,
  action_scope      text NOT NULL, -- base_gua / deep_read / fupan / period_rights_unit
  entitlement_state text NOT NULL DEFAULT 'active' CHECK (entitlement_state IN ('active','expired','revoked')),
  starts_at         timestamptz,
  expires_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_entitlements_holder_scope ON entitlements (holder_id, action_scope);

-- 3) fupan_reviews：複盤 owning store 骨架，呼應 Airtable Fupan_Reviews 既有(但現役鏈從未寫入)的表。
CREATE TABLE IF NOT EXISTS fupan_reviews (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_id          text NOT NULL,
  request_id         text NOT NULL,
  state              text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','completed','failed')),
  source_entitlement_id text,
  current_question   text NOT NULL,
  result_json        text,
  error_code         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  completed_at       timestamptz,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (holder_id, request_id)
);

-- 4) fupan_review_sources：複盤引用哪幾筆原始卦記的關聯表。gua_record_id 可為 NULL 且 is_orphan=true，
--    專門承接「搬舊資料時對不回」的情況(Owner 裁定明文:標 orphan,不硬湊)；本段合成測試資料不會產生
--    真正的 orphan，這個欄位是為未來第4段搬遷正式資料時準備的。
CREATE TABLE IF NOT EXISTS fupan_review_sources (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fupan_review_id  uuid NOT NULL REFERENCES fupan_reviews(id) ON DELETE CASCADE,
  gua_record_id    uuid REFERENCES gua_records(id),
  raw_reference    text,           -- 對不回時保留原始參照(如舊 Airtable record id)供事後查核
  is_orphan        boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK ( (is_orphan = false AND gua_record_id IS NOT NULL) OR (is_orphan = true) )
);
CREATE INDEX IF NOT EXISTS idx_fupan_review_sources_review ON fupan_review_sources (fupan_review_id);

-- 5) airtable_sync_log：Airtable 回寫適配的「mock」留痕表(本段不打正式/測試 base，只記錄「本來要同步什麼」)。
CREATE TABLE IF NOT EXISTS airtable_sync_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_table  text NOT NULL,     -- 例如 'Divination_Log'
  target_action text NOT NULL,     -- 'create' / 'update'
  source_table  text NOT NULL,     -- Postgres 側來源表
  source_id     uuid NOT NULL,
  payload       jsonb NOT NULL,    -- 準備寫給 Airtable 的欄位(去敏)
  status        text NOT NULL DEFAULT 'mocked' CHECK (status IN ('mocked','sent','failed')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
