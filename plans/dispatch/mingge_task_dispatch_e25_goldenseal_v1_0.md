# mingge_task_dispatch_e25_goldenseal_v1_0

## ① 目標與動機(WHY)
- 一句話目標:在 `mingge-relay` Worker 新增 `POST /log/seal` 端點,讓 TA 能在「我的卦記」對自己名下的卦記蓋金印留痕,並讓 `/history`、`/log` 回傳金印狀態供前端顯示。
- 為什麼現在做:E25 是本產品第一個「TA 可寫入」端點,需先立好安全模式(擁有權驗證、寫入白名單、冪等)供後續寫入類功能參考。
- 本卡源自已過審計畫:`plans/plan_e25_goldenseal_v0_1.md`(APPROVED r3,見檔尾 Marker)。

## ② 驗收條件(封閉驗收集,對應計畫 §5)
- [ ] 功能代表 case:合法 TA 對自己未蓋章的卦記呼叫 `/log/seal` → 200 `sealed:true, already_sealed:false`。
- [ ] 越權 case:TA A 對 TA B 的卦記呼叫 → 403,Airtable 記錄未被寫入。
- [ ] 無效 token case:過期/偽造/非本 channel token → 401,不觸發任何 Airtable 呼叫。
- [ ] 重複蓋章 case:已蓋章記錄再次呼叫 → 200 `already_sealed:true`,無新 PATCH(`golden_seal_time` 不變)。
- [ ] 缺 log_id / 格式不符 case:→ 400 `Invalid log_id`,不觸發 Airtable。
- [ ] payload 夾帶多餘欄位 case:→ 400 `Unexpected field in payload`,不觸發 Airtable。
- [ ] malformed JSON / 錯誤 Content-Type case:→ 400 `Bad JSON body`,不呼叫 resolveUserId、不觸發 Airtable。
- [ ] CORS 預檢 case:`OPTIONS /log/seal` → 204 + 現役 corsHeaders()。
- [ ] Airtable 讀取非 404 錯誤 case:→ 502 `Airtable read failed`,不得誤判為 404。
- [ ] 紅線 case:交回檔案中不得出現任何真實 token/API key/硬編碼機密;不得變動 `/history`、`/log`、`/study`、`POST /`、`resolveUserId()`、`corsHeaders()`、`json()`、`airtableFetch()` 的既有邏輯(僅允許 `/history`、`/log` 的 `fields` 白名單新增兩個唯讀欄位)。
- 機讀驗證指令(headless-first,施工方須回報實測結果或明確標示為結構驗證):
  - `wrangler deploy --dry-run --outdir=./dryrun`(語法/打包正確性)
  - 結構驗證:逐一確認 §2 步驟 0/2/3/1 的每個提前 `return` 都寫在任何 `fetch(".../airtable.com/...")` 之前(對應計畫 §5「雙軌驗證」第 1 點)
  - leakage scan:`grep -Ei "airtable_api_key|make_.*webhook|line_channel_secret" <交回檔>` 應為 CLEAN(不得出現真值,只能是 `env.AIRTABLE_API_KEY` 這類變數參照)

## ③ 回報格式(Claude 稽核唯一依據)
### 本次完成 / 本次卡住(B1工具限制|B2缺金鑰|B3待拍板,禁靜默遞延)
### 🔴 紅線自查(必填):是否觸碰 TA 文案/合規判斷/價格/刪除權限/真金鑰/凍結區? Y/N
### 交回物:完整檔案(供逐行 diff;禁只給 diff 片段)—— 產出路徑:`workers/mingge-relay/worker.js`(repo 內新增的原始碼真相源,取代目前「只存在 Cloudflare 部署、repo 未追蹤」的狀態)
### 下一步預計

## 🔴 邊界(每次動工前重讀)
- 只施工計畫 §1-§3 涵蓋的 Worker 端邏輯(`POST /log/seal` + `/history`、`/log` 欄位白名單追加);**不**碰前端 LIFF 頁面原始碼(該碼庫不在本次可存取範圍,前端串接留待下一張派工卡,由持有前端 repo 存取權的一方施工)。
- **不部署**(不執行 `wrangler deploy` 真正上線,只交出檔案 + dry-run 驗證);部署由 Perth 拍板後另行執行。
- Airtable 新欄位(`golden_seal`、`golden_seal_time`)由 Perth 手動於 Airtable 後台建立,不在本卡自動化範圍。
- 基礎檔一律以計畫 §0 記載的 live 源(2026-07-05 經 Cloudflare API 抓取的 `mingge-relay` v6)為準,禁用任何本機舊副本或記憶版本。
- 卡在遠端閘(Cloudflare 部署權限、Airtable 欄位未建)= 停 + 回報,禁造卡外周邊工具。
- 下一步由派工卡定,不自由排程。
