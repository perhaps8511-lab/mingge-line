# mingge-backend(MAKE_EXIT 第1段骨架)

```yaml
card_id: MINGGE-CC-MAKE-EXIT-P0P1-20260911
段: 第1段
狀態: 隔離 staging 骨架,不接正式 LINE/Dify/Airtable,不寫正式資料,不切流
```

## 這是什麼

命格 Make 退場計畫第1段的最小後端骨架：一個模組化單體 API + Postgres migrations + inbox/outbox/jobs 表結構，
用來證明「寫入→readback→關閉重開→再讀」這條最基本的保存鏈可以在 GitHub 管理的程式碼＋獨立 Postgres 上跑，
不是要在這一段就取代任何現役 Make scenario。

## 不是什麼

- 不是正式後端。沒有接 LINE webhook、沒有呼叫 Dify、沒有寫 Airtable。
- 不是完整的六段遷移。inbox/jobs 表只建了結構，沒有真正的背景 worker 在跑。
- 不承接 `reports/mingge-architecture-20260909` 的欄位細節（該報告僅供參考），schema 是本次骨架重新設計的最小版本。

## 端點

| 方法 | 路徑 | 用途 |
|---|---|---|
| GET | `/health` | 健康檢查，含 DB 連線 |
| POST | `/gua-records` | 冪等建立卦記（`subject`+`request_id` 唯一鍵；同一 request_id 重送回同一筆，不重建） |
| GET | `/gua-records/:id` | 依 id 讀回 |
| GET | `/gua-records/by-key?subject=&request_id=` | 依冪等鍵讀回 |

## 本機執行

```bash
npm install
export DATABASE_URL=postgres://user:pass@host:5432/dbname
npm run migrate   # 可選：server 啟動時也會自動跑一次(冪等,已套用的 migration 會跳過)
npm start
```

## 環境變數

| 變數 | 必要 | 說明 |
|---|---|---|
| `DATABASE_URL` | 是 | Postgres 連線字串。**沒有預設值/本機 fallback**，缺少時 fail-closed（拋錯，不靜默用假連線）。 |
| `PORT` | 否 | 預設 8080。 |

## 資料模型

見 `migrations/001_init.sql`：`gua_records`、`outbox_messages`、`inbox_events`、`jobs`、`audit_events`。
`schema_migrations` 表由 migration runner 自動建立，記錄哪些檔案已套用。

## 備援演練腳本

`scripts/dump-restore-drill.mjs`：對一個 staging Postgres 做邏輯 dump，在另一個全新 Postgres 套用同一份
migration 建 schema，把 dump 的資料原樣插回去，readback 後用 SHA-256 比對筆數與內容是否一致。
用法見腳本檔頭註解。每次做備援演練前先確認 `TARGET_DATABASE_URL` 指向的是可覆蓋的空庫，不是正式庫。

## 重播證據 / 備援演練

見上一層目錄 `../00F_report/MAKE_EXIT_P1_DELIVERY_20260911.md`（第1段交付報告），
裡面附了對 Railway staging 實際 URL 的 write→readback→重啟→再讀 四步驟回應，以及一次 DB dump/restore 演練的結果。
