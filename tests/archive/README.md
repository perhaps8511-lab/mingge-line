# Archived tests

此目錄保留已廢止的歷史測試，不屬於現行回歸集，也不應由 CI／測試 runner 遞迴執行。

## E25 stamp v1.0

- 原路徑：`tests/test_e25_stamp_v1_0.sh`。
- 廢止授權：2026-09-03，Perth 本次明示「Hub 蓋章 recs3nBslhXrd3nRM；E25 廢止移 archive；同 worktree 單 commit，不 push」。此 reference 來自使用者交付，未另讀 Airtable record。
- 原因：旧 overwrite／未帶 request_id 的契約與 R2 核定的 UUIDv4 append、readback、unconfirmed 語意衝突；舊 UI assertions 亦已有 baseline drift。
- 保留原始 bytes，SHA-256：`9e0e92cce6489739187c49a62ebae49bc8faef6814fa6bc563230aeb768ddb03`。檔內相對路徑維持歷史原樣，不把封存檔当作新位置可執行的測試。
- 現行替代：從 repo root 執行 `node tests/test_r2_delayed_return_v1_0.mjs` 與 `node tests/check_r2_copy_bytes.mjs`。
- 原始失敗計數與契約差異：`governance/plans/plan_r2_delayed_return_v0_1.md` §12.4；本次收口授權見 §13。
