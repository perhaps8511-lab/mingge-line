# E25 金印蓋章 · Code 層 Review 報告

## 範圍守門(對照派工卡邊界)
- ✅ `POST /`(起卦轉發)、`/study`、`resolveUserId()`、`corsHeaders()`、`json()`、`airtableFetch()` — diff 確認**完全未變動**。
- ✅ `/history`、`/log` 僅追加 `golden_seal`/`golden_seal_time` 至 fields 白名單與回傳正規化,未改既有欄位或驗證邏輯。
- ✅ 新增內容限縮在 `POST /log/seal` 路由與新 helper `isValidIsoDateString()`。
- ✅ 未執行 `wrangler deploy`(僅本機檔案交付,無實際上線動作)。

## 驗收條件逐條 PASS/FAIL
| # | Case | 結果 |
|---|---|---|
| 1 | 功能代表 case | PASS(邏輯正確:通過驗證後 PATCH 兩欄,回 sealed:true/already_sealed:false) |
| 2 | 越權 case | PASS(§6 `line_user_id_raw !== verifiedUserId` → 403,PATCH 前即 return) |
| 3 | 無效 token case | PASS(401 固定文案 `Invalid access token`,不透傳內部訊息,發生在任何 Airtable 呼叫之前) |
| 4 | 重複蓋章 case | PASS(`golden_seal===true` 分支不重新 PATCH;`golden_seal_time` 缺值有防禦性 `sealed_at:null` 分支) |
| 5 | 缺 log_id / 格式不符 case | PASS(正則 `/^rec[a-zA-Z0-9]{14}$/`,不符 400 `Invalid log_id`,在 Airtable 呼叫前) |
| 6 | payload 多餘欄位 case | PASS(`payloadKeys.some(k => k !== "log_id")` → 400,在 Airtable 呼叫前) |
| 7 | malformed JSON / 錯誤 Content-Type case | PASS(Content-Type 檢查 + `request.json()` try/catch,皆在驗 token 之前) |
| 8 | CORS 預檢 case | PASS(沿用既有全域 `OPTIONS` 分支,無需改動) |
| 9 | Airtable 讀取非 404 錯誤 case | PASS(404→404;其餘非 2xx/JSON parse fail→502,不誤判為查無記錄) |
| 10 | 紅線:機密/範圍外變動 | PASS(見下方紅線自查) |

## 🔴 紅線自查
- 真實 token/API key/硬編碼機密:**未發現**(僅 `env.AIRTABLE_API_KEY`、`env.MAKE_WEBHOOK_URL` 等既有變數參照,literal-secret grep CLEAN)。
- TA 文案/合規判斷/價格/刪除權限:**未觸碰**(本次全為 API 層級 JSON 契約,無使用者可見文案變更)。
- 範圍外變動:**無**(diff 已核對,見上方範圍守門)。

## 結構驗證(對應計畫 §5 雙軌驗證第 1 點)
逐行確認:`/log/seal` 內所有拒絕分支(Content-Type 檢查、JSON parse 失敗、缺 token、token 無效、payload 多餘欄位、log_id 格式錯誤、AIRTABLE_API_KEY 未設定)皆在第一個 `fetch(".../airtable.com/...")` 呼叫(worker.js:188)**之前** `return`,無 fallthrough 風險。✅

## 語法 / 靜態檢查
- `node --check workers/mingge-relay/worker.js` → 無錯誤輸出,語法合法。

## 未完成/受限項(如實回報,B1 工具限制)
- **B1**:`wrangler deploy --dry-run` 因本機 Codex CLI 的 Windows sandbox helper 故障(`codex-windows-sandbox-setup.exe` 找不到)未能執行,以上述「結構驗證 + node --check」替代完成静態驗證,實際部署前建議 Perth 或有 wrangler 環境者另行跑一次 dry-run 把關。
- 端到端 curl 實測(對真實 Airtable 記錄與真實 LINE token)未執行 — 需要 Airtable 後台先手動建立 `golden_seal`/`golden_seal_time` 兩欄位(計畫 §1 已載明由 Perth 負責),且需要測試用有效 LIFF token,不在本次施工範圍。
- 前端 LIFF 頁面串接(計畫 §4)**未施工** — 該頁面原始碼不在 `mingge-line` repo 範圍內(部署於 `perhaps8511-lab.github.io`,本機無此 repo 存取權),留待下一張派工卡由持有該 repo 權限者施工。

## 總結
**PASS** — 可交付。`workers/mingge-relay/worker.js` 現為 repo 內可追溯的 Worker 原始碼真相源,建議下一步:
1. Perth 於 Airtable 後台建立 `golden_seal`(Checkbox)、`golden_seal_time`(Date incl. time)兩欄位。
2. 有 Cloudflare 部署權限者執行 `wrangler deploy` 上線(本次未部署,依邊界要求)。
3. 開新派工卡處理前端 LIFF 頁面串接(§4)。
