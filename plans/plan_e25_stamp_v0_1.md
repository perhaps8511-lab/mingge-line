# plan_e25_stamp_v0_1

來源:Drive `001_taskcard_e25_stamp_S163_v1_0`(ID `14SEbyBFzlbIJs1WzsHvmF-mFQ3OOsDnb`)。文案定稿源:`001_spec_wdj_copy_S163_v1_0`(Perth 終審 2026-07-11)。**本計畫文案逐字寫死,禁改寫禁另創**(見 §3)。

## 0. 基礎檔真相源(🔴 鐵律:自抓 live,禁本機舊副本)

- `log.html` / `index.html`:`raw.githubusercontent.com/perhaps8511-lab/mingge-line/main/{log,index}.html`,施工前已 clone repo 核對(HEAD `4f26e60`,S159 格3五卡,live index=v1.5.1)。
- Worker `mingge-relay`:🔴 **更正第 1 輪計畫的誤判**——原判斷「mingge-line repo 內無 worker 源」錯誤(沿用了 E42 舊記憶,未實際搜過本 repo)。**實際上 `workers/mingge-relay/worker.js` + `workers/mingge-relay/wrangler.toml` 是本 repo 已 tracked 的檔案**(git log 見 commit `0071a64 sync worker.js from Cloudflare live deploy`、`3373fec E25: 卦記留痕·蓋金印`、`4be5a71 chore: add wrangler.toml`),與 Cloudflare MCP `workers_get_worker_code` 取回的 live bundle 逐邏輯比對(路由集合、golden_seal 處理完全一致,只差 esbuild 打包器加的 `__name`/`__defProp` 包裝),確認是同一份未打包原始碼,可信任為真相源。**`workers/mingge-relay/worker.js` 為本計畫唯一施工目標檔**,不再另外維護 scratchpad 副本(第 2 輪互審抓到「測 A 檔、部署 B 檔」風險,已刪除舊 scratchpad 副本)。`wrangler.toml`(`name=mingge-relay, main=worker.js, compatibility_date=2024-12-01`)提供部署設定真相源,`wrangler deploy --dry-run` 可安全執行(見 §5)。
  - 既有端點:`POST /`(consent/relay)、`GET /history`、`GET /log`、`GET /study`、`POST /log/seal`(**E25 舊功能:golden_seal 布林印章,S137 已上線,本計畫零觸碰**)、`POST /trigger/deepdive`、`POST /trigger/fupan`。
  - 共用工具函式:`resolveUserId(accessToken, channelId)`(LINE token 驗證+profile)、`airtableFetch`、`json`、`corsHeaders`、`isValidIsoDateString`。
  - 常數:`AT_BASE=apptFfyVBYE4ygW3E`、`AT_DIV_LOG=tblVyf8WfTQxvtpEg`、`AT_SUBS=tbljXninuBm76D9nf`、`ALLOWED_ORIGIN=https://perhaps8511-lab.github.io`、`LINE_CHANNEL_ID=2010192384`。
  - **第 2 輪互審 BLOCKER 已修復**:上一版誤判「repo tracked 版 `/study` 缺 `featured` 欄與本卡無關、不動」——**錯誤**,`wrangler deploy` 會整包發布 100% 流量,即使本卡不碰 `/study` 也會把這個 drift 一併部署上去,實質等於回滾 E42 已上線的精選位功能。已修復:`/study` fields 陣列補回 `"featured"`(見 §2),並重新取 live bundle 逐 route 比對(error 字串集合+status code 計數,存於 `plans/review_logs/`),確認除本卡新增內容外,canonical source 與 live 完全一致,無其他未同步 drift。已補回歸測試 case22b 鎖住此欄不再漂移。
- Airtable 現況(2026-07-11 更新):四欄已由 Claude Code 用 Airtable MCP `create_field` 補建完成(Perth 裁示自救,不等手動前置)——`Divination_Log`(`tblVyf8WfTQxvtpEg`)新增 `trace_text`(multilineText,`fldrZzWVA0pS9gASk`)/`trace_at`(dateTime,Asia/Taipei,`fldysg0lBLZIyvSm7`)/`echo_sent_at`(dateTime,Asia/Taipei,`fldgIX6ioDd5pFxns`);`Subscribers`(`tbljXninuBm76D9nf`)新增 `echo_opt_out`(checkbox,`fld0cNPLlgtx4tLQq`)。`get_table_schema` 機讀回證四欄型別/設定皆符合派工卡規格。端到端 PATCH 實測可正式進行,不再是等欄狀態。

## 1. 資料契約(新端點,不改既有端點)

`POST /trace`

請求:
```
Headers: X-Line-AccessToken: <token>, Content-Type: application/json
Body: { "log_id": "recXXXXXXXXXXXXXX", "trace_text": "<TA 輸入,1-500 字>" }
```

行為(仿 `/log/seal` 既有模式,S37 紀律):
1. `OPTIONS` → 204 + `corsHeaders()`(既有全域 OPTIONS 分支已覆蓋,免另寫)。
2. Content-Type 非 json → 400 `Bad JSON body`。
3. body parse 失敗 → 400 `Bad JSON body`。
4. 缺 `X-Line-AccessToken` → 401 `Missing access token`。
5. `resolveUserId` 失敗(token 過期/非本 channel)→ 401 `Invalid access token`。
6. payload 白名單:僅允許 `log_id`、`trace_text` 兩鍵,多餘鍵 → 400 `Unexpected field in payload`。
7. `log_id` 非 `/^rec[a-zA-Z0-9]{14}$/` → 400 `Invalid log_id`。
8. `trace_text`:非字串 / trim 後空字串 / trim 後長度 >500 → 400 `Invalid trace_text`。
9. `AIRTABLE_API_KEY` 未配置 → 503(既有模式)。
10. GET 該筆 Divination_Log record:
    - fetch 失敗(network)→ 502 `Airtable read failed`。
    - 404 → 404 `{record:null}`。
    - 非 ok 非 404 → 502 `Airtable read failed`。
    - JSON parse 失敗 → 502 `Airtable read failed`。
11. **擁有權驗證**:`f.line_user_id_raw !== verifiedUserId` → **403** `Forbidden`(他人 log_id 寫入的機讀證據項,card 驗收 #2/#5)。
12. PATCH 該筆 `trace_text`(trim 後)+ `trace_at`(伺服端 `new Date().toISOString()`,+08:00 由 Airtable Date 欄時區顯示設定負責,伺服端一律存 UTC ISO,與 `golden_seal_time` 既有慣例一致)。
    - PATCH 失敗(network/非 ok)→ 502 `Airtable write failed`。
13. 成功 → 200 `{ traced: true, trace_text: "<trim後>", trace_at: "<ISO>" }`。

**覆寫策略(第 1 輪互審 BLOCKER 已修正措辭)**:明確定義為 **last-write-wins**,非「冪等」——重送同一請求會把 `trace_at` 更新為最新一次寫入的時間戳,結果本就會變,這是刻意設計而非缺陷。存取控制仍由 §步驟11 擁有權驗證(僅本人 LINE token 可寫自己的卦記)保證,前端隱藏入口按鈕只是體感引導,不是安全邊界,不作此宣稱。原「客服代補情境」提案已撤回(超出本卡範圍,若未來要開管理端點另立派工卡)。

**記錄類型守門(第 1 輪互審 BLOCKER 已採納)**:PATCH 前需再驗證 `(f.entry_type || "divination") !== "divination"` → 404(視為找不到,不寫入非卦記類型如 mood/deepdive/fupan)。

**Request body 位元組上限(第 1 輪互審 BLOCKER 已採納,第 2 輪互審後修正為真串流限額)**:第 1 輪版本用 `request.text()` 先讀完整包再檢查位元組數,被 Codex 抓到「讀完後才檢查」不算真上限(chunked body 無 `Content-Length` 時仍會被迫整包吃進記憶體)。已改為 `readBodyWithLimit()` helper:先檢查 `Content-Length` header(若有且超標直接 413,省一次無用的 stream 讀取);無論如何都用 `request.body.getReader()` 逐塊累計位元組數,**一旦累計超過 `TRACE_MAX_BODY_BYTES=4096` 立即 `reader.cancel()` 並丟出 413**,不等整包讀完。已用 12×1024-byte 自訂 `ReadableStream` 實測驗證「未讀完全部 chunk 即中斷」(tests/ case11)。

**Content-Type 嚴格化(第 1 輪互審 SUGGEST 已採納)**:改用 `/^application\/json(?:;.*)?$/i` 比對整個 header 值,不再用寬鬆 `includes`,避免 `application/jsonp` 之類誤判通過。

`/history` 與 `/log` 回傳欄位白名單追加 `trace_text`、`trace_at`(仿現行 `golden_seal`/`golden_seal_time` 追加方式,`airtableFetch` 的 `fields` 陣列與 `/log` 的 `record` 物件組裝處各加兩行)。

**第 1 輪互審 BLOCKER 答辯(不採納,附理由)**:
- 「`resolveUserId` 把 LINE 429/5xx/逾時全部歸類成 401」——屬實,但 `resolveUserId` 是 `/log/seal`、`/trigger/deepdive`、`/trigger/fupan`、`POST /` 四個既有端點共用的函式,此問題在這些端點上早已存在,並非本次新增。§2 明確禁止修改 `resolveUserId`(diff 邊界鐵律,card 也未授權動共用函式)。此為既有系統性缺口,建議另立獨立派工卡統一修,不阻擋本卡(本卡新端點的錯誤分類與既有三個端點完全一致,不製造新的不一致)。`/trace` 的 catch 區塊已改為透傳 `e.status`/`e.message`(不再無條件寫死 401),為未來若修 `resolveUserId` 預留正確傳遞路徑。

## 2. Worker 施工範圍(diff 邊界)

- 新增 1 個 route 分支 `POST /trace`(插入位置:緊接既有 `POST /log/seal` 分支之後,`POST /trigger/deepdive` 之前;不打散既有分支順序)。
- `/history` fields 陣列追加 `"trace_text","trace_at"`;`records.map` 組裝物件追加 `trace_text: f.trace_text || null, trace_at: f.trace_at || null`。
- `/log` 的 `record` 組裝物件同樣追加兩欄。
- **不修改**:`POST /`、`/log/seal`、`/trigger/deepdive`、`/trigger/fupan`、`resolveUserId`、`airtableFetch`、`readQuotaGate`、`corsHeaders`、`json`、`isValidIsoDateString`、任何常數。`/study` 除同步補回 §0 記載的 `featured` 欄漂移修復外,不作其他修改(第 4 輪互審文件清理項)。
- 交付物:完整 `worker.js`(供逐行 diff),不含 wrangler.toml/secrets(未變動)。

## 3. log.html 蓋印互動(文案逐字,零改字——card §二第2項唯一合法字面)

- 入口按鈕(僅當該筆卦記 `trace_text` 為空/null 時顯示):`補後續 · 蓋金印`
- 點擊 → 開啟既有 modal 慣例(仿 `mingge_guaji_main_prototype_v0_2.html` btn-stamp 流程,沿用現有 `.modal`/`.sheet` class 與墨綠金 tokens,不新造美學元件):
  - textarea placeholder:`當時所問的事,後來往哪邊走了 —— 一兩句即可。`
  - 確認按鈕:`蓋下金印`
- 確認送出成功(僅本次顯示,不常駐):`已蓋印。這一卦,有了後續。`
- 之後常駐(取代入口按鈕位置):`金印 · 已補後續` + 其下顯示 `trace_text` 內容(唯讀文字,非再編輯輸入框——card 未給編輯文案,不自創)。
- 失敗分支(仿 goldenseal 前端既有慣例,非文案表列項,屬工程必要的 fallback):fetch reject / 非 200 / json 契約不合 → 保留入口按鈕、不寫入常駐態,不彈出未定稿文案(僅 console.warn,不打斷 TA)。
- **禁動**:index.html 本卡不碰;log.html 既有 `.topbar .seal`(顯示「命」字圓形裝飾,與本次金印無關,S137 命名時已刻意避開衝突)不改動、不共用 class 名。
- **XSS(第 1 輪互審 BLOCKER 已採納,明定政策)**:所有 TA 自由文字(`trace_text`)一律經既有 `esc()`/`textToHtml()` helper 轉義後才插入 `innerHTML`(與檔內既有 `question_text`/`output_json` 呈現方式一致,非新政策,只是本次明文寫下並補測試);絕不允許未轉義字串直接進 `innerHTML`。

## 4. 回歸鉤 tests/

`tests/test_e25_stamp_v1_0.sh`(仿現行 `tests/test_e40_giftfix_v1_0.sh` 風格,兩輪互審後擴充,56 案例全 PASS):
- **V1 Worker 層**(24 cases。Node ESM `import` 真檔 `workers/mingge-relay/worker.js`——第 2 輪互審後鎖定 canonical 路徑,不用可能不同步的副本;mock `global.fetch` 分流 LINE verify/profile、Airtable GET/PATCH;**缺檔或 node process 崩潰 = 硬 FAIL,不得靜默算 SKIP/綠燈**):
  - 契約矩陣涵蓋 §1 每條錯誤路徑:200/403/401×2/400×6/413(真 chunked stream 中斷測試)/503/502×5/404×2/204+CORS headers/500 vs 501字邊界/entry_type 非 divination/`/log`+`/history` 欄位白名單 passthrough(各 2 案例)。
- **V2**(5 cases):5 條文案字串逐字存在且全檔**恰好一次**(regex per-string 計數,非合併 `grep -c`)。
- **V3**(27 cases。Node vm **真執行**,含最小 fake DOM——第 2 輪互審指出只測 `buildStampSectionHtml` 不夠,已補):
  - `buildStampSectionHtml`/`buildStampBadgeHtml`:無/有 `trace_text` 兩態互斥(入口按鈕 vs 常駐標示,非用 regex 猜)。
  - `submitStamp`/`renderStampResult` 真執行四態:成功(常駐標示+一次性完成語+關閉 modal)、fetch reject(保留入口、按鈕重新啟用)、非 200(同上)、200 但契約不合缺 `trace_text`(視為失敗,同上)。
  - XSS:`<script>`/`<img onerror>` payload 跑過 `buildStampSectionHtml` 後,輸出不含未轉義 `<script>`/`<img` 標籤,且含 `&lt;script&gt;` 轉義結果。

## 5. 機讀驗證指令與驗收分層(兩輪互審後拆層+補實跑)

**Tier 1 — pre-deploy(本輪已執行,無需密鑰/無需真部署)**:
```
cd workers/mingge-relay && npx wrangler deploy --dry-run --outdir=./dryrun
# → 實跑結果:Total Upload 24.72 KiB / gzip 4.43 KiB,No bindings found,exit 正常(見 review_logs)
bash tests/test_e25_stamp_v1_0.sh   # V1+V2+V3,56/56 PASS(見 review_logs)
```
`wrangler.toml` 已於 §0 更正找到,dry-run 已可安全實跑(第 1 輪計畫誤判「無法 dry-run」已撤回)。

**Tier 2 — Perth 授權後的正式 canary E2E(本輪未執行,需 Perth 授權才能做)**:
- 嘗試以 Airtable MCP 直接寫入一筆 canary 測試記錄到 `Divination_Log` 驗證 PATCH 讀寫回路,**被 Claude Code 權限分類器擋下**(判定為「未經明確指名的生產表寫入」,2026-07-11)。這證明 Tier 1/Tier 2 分層是對的:寫測試資料進生產 Airtable base 需要 Perth 明確授權,不是 Claude 自行判斷可做的事。
- Tier 2 待辦(需 Perth 授權後執行,不算本輪 BLOCKER):① 建一筆標記清楚的 canary 記錄(如 `session_id="TEST_E25_CANARY_*"`)② 走 worker 實際部署後的真實 HTTP `/trace` 呼叫(部署本身待 Perth 放行)③ 讀回比對 `trace_text`/`trace_at` ④ 用 `delete_records_for_table` 清除該筆 canary,不留痕。

## 🔴 邊界(每次動工前重讀)

- 禁動凍結鏈(5202754/起卦演算法/`gua_result`/Dify prompt/書僮 v1.6)、`/log/seal`(golden_seal)、index.html。
- 文案零改字,五條為唯一合法字面;TA 看得到的任何新字 = 回 chat,Codex 只貼不寫。
- Airtable 4 欄已由 Claude Code 用 MCP 補建完成(見 §0)。**端到端 PATCH 實測 = Tier 2,本輪未執行,待 Perth 授權**(§5 已拆層,此處不重複宣稱「已納入本輪」——第 2 輪互審抓到此處與 §5 矛盾,已訂正)。
- 交付完整檔案供逐行 diff;push/deploy 需 Perth 明確授權後才執行(依既有卡A/E42 慣例)。
- Worker 唯一施工目標檔 = `workers/mingge-relay/worker.js`(見 §0 更正),不得再產生第二份副本。


<!-- 互審紀錄:r1 CHANGES REQUIRED(10 BLOCKER)→ r2 CHANGES REQUIRED(5 BLOCKER,1 撤回)→ r3 CHANGES REQUIRED(1 部署級 BLOCKER:/study featured drift)→ r4 APPROVED -->
<!-- CODEX-REVIEW: APPROVED | rounds=4 | date=2026-07-11 | blockers_resolved=16 | log=plans/review_logs/plan_e25_stamp_r4.txt -->
