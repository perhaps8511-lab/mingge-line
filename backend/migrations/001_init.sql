-- MAKE_EXIT 第1段骨架｜候選 schema 的最小垂直切片(卦記保存)+ inbox/outbox/jobs 骨架。
-- 依 reports/mingge-architecture-20260909 的候選表名承接方向,但本檔不承接該報告的欄位細節,
-- 欄位以本次骨架實際需要為準,之後正式切片(第2段)再依 Owner 採用的 Product Basis 調整,不預先假裝完備。

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- 卦記保存 owning store(隔離 staging 用,合成資料;正式資料所有權仍在 Airtable Divination_Log,
-- 本表不是它的替代品,是遷移驗證骨架)。
CREATE TABLE IF NOT EXISTS gua_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject       text NOT NULL,              -- 對應已驗證 LINE subject(合成環境用假值)
  request_id    text NOT NULL,              -- 冪等鍵:同 subject+request_id 視為同一次請求
  ben_gua       text NOT NULL,
  question_text text,
  trace_text    text,
  trace_at      timestamptz,
  revision      integer NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject, request_id)
);

-- Transactional outbox:業務寫入與「要對外做的事」在同一 transaction 落地,
-- 之後由背景 worker(本骨架未實作 worker,只留表)依 delivered_at IS NULL 撈取轉送。
CREATE TABLE IF NOT EXISTS outbox_messages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type text NOT NULL,
  aggregate_id   uuid NOT NULL,
  event_type     text NOT NULL,
  payload        jsonb NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  delivered_at   timestamptz
);
CREATE INDEX IF NOT EXISTS idx_outbox_undelivered ON outbox_messages (created_at) WHERE delivered_at IS NULL;

-- Durable inbox:外部事件(LINE/Dify/provider)去重登記,本骨架未接任何正式外部來源,只留表結構。
CREATE TABLE IF NOT EXISTS inbox_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source       text NOT NULL,
  external_id  text NOT NULL,
  received_at  timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (source, external_id)
);

-- 背景工作佇列(lease-based),本骨架未實作真正的 worker loop,只留表結構供第2段擴充。
CREATE TABLE IF NOT EXISTS jobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type    text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  status      text NOT NULL DEFAULT 'pending',
  lease_until timestamptz,
  attempts    integer NOT NULL DEFAULT 0,
  last_error  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 稽核留痕:actor/action/result/opaque ref,不存敏感 payload。
CREATE TABLE IF NOT EXISTS audit_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor       text NOT NULL,
  action      text NOT NULL,
  subject_ref text,
  result      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
