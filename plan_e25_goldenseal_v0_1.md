# plan_e25_goldenseal_v0_1

## 0. 基礎檔紅線證明(§6-8之一:禁記憶/禁本機舊副本)
- 基礎檔:Cloudflare Worker script **`mingge-relay`**(id tag `a325768bf5f64151bd8bccebe2818ad6`,modified_on `2026-07-04T11:32:53.924488Z`)
- 抓取方式:2026-07-05 透過 Cloudflare API(`workers_get_worker_code`)**直接自雲端抓現役部署版**,非本機檔案、非記憶。
- 首行版本註記(原文摘錄,證明取自 live 源):
  ```
  // ====================================================
  // mingge-relay — 命格轉發層 Worker v6
  // S39: 方案3 LIFF Access Token 驗證(POST / → Make webhook)
  // S135+: 新增 GET /history (E09 歷史卦例 + 會員狀態)
  //         需要 Secret: AIRTABLE_API_KEY (Perth 貼進 Cloudflare Secrets)
  // S137-R02: 新增 GET /log (E23 卦記詳情) + /history 加 log_id 欄位
  // ====================================================
  ```
- 現役路由清單(v6 已有,本計畫只新增、不改動既有路由邏輯):`OPTIONS`(CORS 預檢)、`GET /history`、`GET /log`、`GET /study`、`POST /`(起卦轉發)。
- Airtable 已查證 ID(沿用現役常數,不重新猜測):`AT_BASE=apptFfyVBYE4ygW3E`、`AT_DIV_LOG=tblVyf8WfTQxvtpEg`(Divination_Log)。
- 範圍外變動聲明(**第 1 輪互審後修正**):本計畫**不修改**現有 `/history`、`/log`、`/study`、`POST /` 任一路由的**驗證邏輯、擁有權判斷、路由結構**;`resolveUserId()`、`corsHeaders()`、`json()`、`airtableFetch()` 等既有 helper **原樣沿用**,不重寫其內部邏輯。
  - 🔴 唯一允許的既有路由變動(明確列為契約變更,非「不動」):`/history` 與 `/log` 的 Airtable `fields` 白名單各追加 `golden_seal`、`golden_seal_time` 兩個唯讀欄位,使其出現在回傳 JSON 中,供前端顯示金印狀態。此變動只**新增**回傳欄位,不改變既有欄位的值、型別或既有欄位的判斷邏輯,故仍在本計畫可控範圍內,但明確承認這是 §6 中「基礎檔變動」的一部分。

---

## 1. Airtable Divination_Log 新欄位設計

| 欄位名 | 型別 | 說明 |
|---|---|---|
| `golden_seal` | Checkbox(boolean) | 是否已蓋金印。預設 false/未勾選。**只存布林標記,不存任何自由文字**。 |
| `golden_seal_time` | Date(含時間,ISO 8601,系統寫入) | 蓋章當下時間戳,供留痕稽核與冪等判斷;非自由輸入欄,值恆為伺服器端 `new Date().toISOString()`。 |

- 兩欄皆為**新增**欄位,不覆用/不改型別於任何既有欄位(`line_user_id_raw`、`session_id` 等維持原樣)。
- 不新增任何 `multilineText` / `singleLineText` 型別的「自由文字」留痕欄位 — 符合「只存標記」要求。
- Perth 需在 Airtable 後台手動建這兩個欄位(本計畫不含 schema migration 腳本,Worker 端假設欄位已存在;若欄位不存在,Airtable PATCH 會回 422,Worker 需能辨識並回報,見 §2 錯誤處理)。

---

## 2. Worker 新寫入端點

### 路徑與方法
```
POST /log/seal
```
(選擇獨立子路徑而非覆用 `/log`,因 `/log` 現為 GET-only 唯讀路由;新增 POST 於同路徑會混淆既有路由判斷邏輯,獨立路徑保持路由表清晰、範圍不外溢。)

### Request Headers(與現役 `/log`、`/history` 一致慣例)
```
X-Line-AccessToken: <LIFF getAccessToken() 取得之 token>
Content-Type: application/json
```

### Request Payload Schema
```json
{
  "log_id": "recXXXXXXXXXXXXXX"
}
```
- `log_id`:必填,string,Airtable record ID(對應 Divination_Log 的 `recId`)。**第 1 輪互審後修正**:格式驗證改嚴 — 必須符合正則 `/^rec[a-zA-Z0-9]{14}$/`(Airtable record ID 標準格式);不符合(非 string、空字串、含 `/ ? # % &` 等路徑注入字元、長度不符)一律視為無效輸入。
- 🔴 **禁止**接受任何其他欄位。**第 1 輪互審後修正**:若 payload 含 `log_id` 以外欄位(如 `golden_seal`、`note`、`user_id`),Worker 一律回 `400 { "error": "Unexpected field in payload" }`,**不進入任何 Airtable 呼叫**(比原「靜默忽略」更嚴格,避免前端誤用長期潛伏未被發現)。

### Response Schema
- 成功(首次蓋章):`200 { "sealed": true, "sealed_at": "<ISO時間>", "already_sealed": false }`
- 成功(已蓋過,冪等回覆,時間正常):`200 { "sealed": true, "sealed_at": "<原蓋章時間>", "already_sealed": true }`
- 成功(已蓋過,但 `golden_seal_time` 缺值 — **第 1 輪互審後新增**,見下方「資料異常處理」):`200 { "sealed": true, "sealed_at": null, "already_sealed": true }`
- 缺 token:`401 { "error": "Missing access token" }`
- token 無效/非本 channel:`401 { "error": "Invalid access token" }`(**第 1 輪互審後修正**:對外一律用固定文案,不直接透傳 `resolveUserId()` 內部錯誤訊息,避免外洩 LINE 驗證細節;詳細原因只寫 `console.log` server log)
- 缺 log_id 或格式不符(**第 1 輪互審後修正,合併為同一錯誤碼**):`400 { "error": "Invalid log_id" }`
- payload 含 `log_id` 以外欄位:`400 { "error": "Unexpected field in payload" }`(**第 1 輪互審後新增**)
- payload 非合法 JSON 或 `Content-Type` 非 `application/json`:`400 { "error": "Bad JSON body" }`(**第 1 輪互審後新增**)
- 查無此卦記(Airtable 回 404):`404 { "record": null }`
- 越權(卦記不屬於此 user):`403 { "error": "Forbidden" }`
- Airtable 讀取失敗但非 404(401/403/429/5xx/JSON 解析失敗 — **第 1 輪互審後新增**):`502 { "error": "Airtable read failed" }`(🔴 不得誤判為「查無記錄」)
- Airtable 寫入失敗(含欄位未建好的 422、429、5xx):`502 { "error": "Airtable write failed" }`
- `AIRTABLE_API_KEY` 未設定:`503 { "error": "AIRTABLE_API_KEY not configured" }`

### 實作邏輯(沿用現役 `/log` 的擁有權驗證模式,不重新發明)
0. 檢查 `Content-Type` 含 `application/json` 且 body 可被 `request.json()` 成功解析,失敗 → 400 `Bad JSON body`,**不呼叫**`resolveUserId()`、**不呼叫**任何 Airtable API。(**第 1 輪互審後新增步驟**,順序刻意放在驗 token 之前,因為連 payload 都解不開就沒有繼續驗證的意義,且不消耗 LINE API 額度。)
1. 驗 `X-Line-AccessToken` → `resolveUserId()`(現役 helper,原樣呼叫)取得 `verifiedUserId`;失敗 → 401(對外文案固定,見上方 Response Schema),**不呼叫**任何 Airtable API。
2. 解析 payload:僅允許鍵集合恰為 `{"log_id"}`;若含其他鍵 → 400 `Unexpected field in payload`,**不呼叫**任何 Airtable API(**第 1 輪互審後修正**:原設計為靜默忽略多餘欄位,現改為直接拒絕,見上方 Request Payload Schema)。
3. 驗證 `log_id` 格式(正則 `/^rec[a-zA-Z0-9]{14}$/`);不符 → 400 `Invalid log_id`,**不呼叫**任何 Airtable API(**第 1 輪互審後新增**)。
4. `GET https://api.airtable.com/v0/{AT_BASE}/{AT_DIV_LOG}/{encodeURIComponent(log_id)}` 讀出該筆記錄(沿用 `/log` 路由既有的 `encodeURIComponent` 慣例)。
5. 依 Airtable 回應狀態碼分流(**第 1 輪互審後新增,不可用單一 if 概括**):
   - `404` → 回 404 `{ "record": null }`。
   - 其他非 2xx(401/403/429/5xx)或 JSON 解析失敗 → 回 502 `Airtable read failed`,**不視為查無記錄**。
   - `2xx` 但解析成功 → 進入步驟 6。
6. 擁有權比對:`record.fields.line_user_id_raw !== verifiedUserId` → 403(邏輯與現役 `/log` 路由第 3 步完全一致),**不執行寫入**。
7. 冪等檢查:若 `record.fields.golden_seal === true`:
   - 若 `record.fields.golden_seal_time` 存在且為有效 ISO 字串 → 回 200 `{ sealed:true, sealed_at:<該值>, already_sealed:true }`。
   - 若 `golden_seal_time` 缺值/非法(資料異常,理論上不應發生但需防禦性處理 — **第 1 輪互審後新增**)→ 回 200 `{ sealed:true, sealed_at:null, already_sealed:true }`,並 `console.log` 記錄此資料異常供人工排查;**不自動補寫**該筆記錄(避免在「已冪等」分支意外觸發寫入,違反 §3-d 白名單鐵律的精神)。
   - 兩種情形皆**不重新 PATCH**(見 §3-e)。
8. 未蓋過 → `PATCH https://api.airtable.com/v0/{AT_BASE}/{AT_DIV_LOG}/{encodeURIComponent(log_id)}`,body:
   ```json
   { "fields": { "golden_seal": true, "golden_seal_time": "<伺服器產生的 ISO 時間>" } }
   ```
   (🔴 白名單鐵律:PATCH body 只包含這兩個欄位,程式碼層面硬編碼欄位名,不接受外部輸入拼接欄位名或欄位值。)
9. Airtable 寫入回應非 2xx(含 422/429/5xx)→ 502 `Airtable write failed`。
10. 成功 → 回 200 `{ sealed:true, sealed_at:<剛寫入的時間>, already_sealed:false }`。

---

## 3. 🔴 安全紅線(S37 紀律)逐條落實

**a. 前端永不持有真後端 endpoint/key**
- 前端(LIFF 頁面)只呼叫 Worker relay 網域(現役 `ALLOWED_ORIGIN` 對應的前端網域不變),不新增任何直連 Airtable / 其他後端的呼叫。
- 沿用現役 CORS 設定(`corsHeaders()`),新路徑同樣掛 CORS。

**b. 寫入必須驗 LIFF Access Token,禁信前端自報 userId**(**第 1 輪互審後修正命名**:任務背景原文寫「LIFF ID Token」,但現役架構與本計畫 header(`X-Line-AccessToken`)、驗證流程(LINE `/oauth2/v2.1/verify` + `/v2/profile`)實際驗的是 **LIFF Access Token**,非 OIDC ID Token。為與 §2 payload/header 定義一致、避免安全契約文字誤導施工方,本計畫統一採「Access Token」用語,與現役 `resolveUserId()` 的既有驗證方式完全一致,不改變驗證強度或安全性質。)
- 100% 沿用現役 `resolveUserId(accessToken, LINE_CHANNEL_ID)`:先呼叫 LINE `/oauth2/v2.1/verify` 驗 token 有效性與 `client_id` 是否本 channel,再呼叫 `/v2/profile` 換真實 `userId`。
- 端點**不接受**、也不解析 payload 中任何 `line_user_id` / `user_id` 欄位(§2 payload schema 僅有 `log_id`)。

**c. TA 只能寫「自己的」卦記(防越權)**
- §2 步驟 5:讀出目標記錄的 `line_user_id_raw`,與 `resolveUserId()` 驗證後的 `verifiedUserId` 比對,不符 → 403,**不執行任何寫入**。
- 此比對邏輯與現役 `/log`(GET,讀取越權防護)完全同構,不新創一套判斷方式,降低邏輯分裂風險。

**d. 寫入白名單:端點只准改「金印欄位組」(`golden_seal` + `golden_seal_time`)**(**第 1 輪互審後修正措辭**:原文「一欄」與實際 PATCH 兩欄位矛盾,改稱「欄位組」以求驗收時不誤判;安全性質不變 — 這兩欄仍是**唯一**允許被寫入的欄位,值仍全部由伺服器端硬編碼產生)
- PATCH body 的欄位名/欄位值皆為程式碼硬編碼(`golden_seal: true`, `golden_seal_time: <server-generated>`),**不從 request payload 組裝任何 PATCH 欄位**。
- **第 2 輪互審後修正(修掉與 §2/§5 矛盾的舊描述)**:即使前端傳來 `{"log_id":"rec123","golden_seal":false,"note":"hack"}`,Worker 必須在 payload key 檢查階段(§2 步驟 2)直接回 `400 Unexpected field in payload`,**不呼叫 Airtable、不進入 PATCH**;PATCH body 只會在 payload 合法(僅含 `log_id`)且完成擁有權驗證後才產生,其欄位值恆為程式碼常數 `true` + 伺服器時間,與 payload 內容完全無關。

**e. 冪等與防連打**(**第 1 輪互審後:對 Codex 的 race condition BLOCKER 提出立場,見下方「本方立場」**)
- 冪等:寫入前先讀記錄現況(§2 步驟 7),`golden_seal` 已為 true → 直接回成功、不重複 PATCH,天然避免重複觸發造成的多次寫入與 Airtable rate limit 消耗。
- 連打(同一使用者短時間內狂點按鈕):因步驟 7 的 read-before-write,重複請求最終效果一致(冪等),不會產生資料錯誤;**未做**跨請求鎖(如 KV lock / Durable Object)防止極短時間內的 race condition(同時兩個請求都讀到「未蓋章」而都執行 PATCH)。
  - **本方立場(回應 Codex 第 1 輪 BLOCKER「防連打不足」)**:不採納「加 KV lock / Durable Object」的修改建議,理由如下,若 Codex 不同意請於下一輪明確表態被說服或堅持:
    1. **影響範圍有限且無害**:`golden_seal` 為布林值,race 下重複 PATCH 兩次的最終值仍是 `true`,不會產生錯誤資料、不會越權、不會洩漏任何東西;唯一副作用是 `golden_seal_time` 可能記到兩次呼叫中「較晚完成」的那個時間戳(而非「較早發起」的時間戳),誤差量級是同一使用者同一動作的**同一次點擊**在極短視窗內的網路時序,對「留痕稽核」(證明使用者曾經蓋過章)語意**沒有實質影響** — 稽核要證明的是「有蓋章」與「大致何時」,不是毫秒級因果順序。
    2. **成本不對稱**:此功能是 TA 手動點擊的低頻互動(不是高併發 API),加 Durable Object/KV lock 屬於為極低機率、零資料危害的邊界情況引入額外基礎設施依賴(新 binding、額外部署設定、額外故障點),與現役 Worker 其餘路由(`/history`、`/log`、`POST /`)一貫的「無狀態、直接呼叫外部 API」風格不一致,屬於過度工程。
    3. **已有的緩解已足夠**:前端按鈕於送出後立即 disabled(見 §4)已從 UI 層面幾乎消除連打;真正需要兩個請求「同時」抵達 Worker 且都通過驗證,需要使用者用兩個不同分頁/裝置在毫秒級同時操作同一筆卦記,屬於刻意製造的極端測試情境,不影響一般使用。
  - 基本節流:前端按鈕在送出請求後立即進入 disabled 狀態直到收到回應(見 §4),從 UI 層面降低連打發生率。
  - 若 Perth / Codex 仍要求鎖定機制,替代方案(留待下一輪討論,不預先施工):可用 Airtable 本身的 `PATCH` 搭配 `Etag`/版本比對(Airtable API 不原生支援 conditional update),或引入單一 Durable Object 作為每個 `log_id` 的序列化鎖 — 兩者皆會增加本計畫範圍與複雜度,建議列為**後續加強項**而非本次 E25 上線的必要條件。

---

## 4. 前端互動(LIFF 頁面,對應現役「我的卦記」列表/詳情頁)

- **按鈕狀態**:
  - 未蓋章:顯示「🖋 蓋金印」可點擊按鈕。
  - 已蓋章(`record.golden_seal === true`,來自 `/history` 或 `/log` 回傳資料):顯示「🔶 已蓋金印 · <sealed_at 格式化日期>」徽章,不可再點擊。
- **互動流程**:
  1. 點擊「蓋金印」→ 按鈕立即轉為 disabled + loading 樣式(防連打,見 §3-e)。
  2. 呼叫 `POST /log/seal`,帶 `X-Line-AccessToken`。
  3. 成功(`sealed:true`)→ 按鈕狀態切換為「已蓋金印」徽章,畫面即時更新(樂觀更新僅在收到 200 成功回應後才套用,**不在送出當下就假裝已蓋章**,避免假資料混入真資料)。
  4. 失敗 → 按鈕恢復可點擊狀態,顯示 toast 錯誤訊息:
     - 401 → 「登入逾時,請重新開啟」。
     - 403 → 「無法蓋章:此卦記不屬於您的帳號」。
     - 404 → 「找不到此筆卦記」。
     - 400 → 「請求格式錯誤,請重新整理後再試」(**第 1 輪互審後新增**:對應 `Invalid log_id` / `Unexpected field in payload` / `Bad JSON body` 三種 400,前端統一顯示,不需分案文案)。
     - 其他(502/503)→ 「系統忙碌,請稍後再試」。
- **資料一致性**:`/history` 列表與 `/log` 詳情的 API 回傳需附帶 `golden_seal`(boolean,若 Airtable checkbox 未勾選則欄位可能整個不存在於回傳 JSON,前端與 Worker 端一律以 `!!record.fields.golden_seal` 正規化為 `false`)與 `golden_seal_time`(string ISO 或 `null`,同理未寫入時正規化為 `null`)。**第 1 輪互審後新增**:此正規化邏輯需在 Worker 端(`/history`、`/log` 回傳前)統一處理,不讓前端各自猜測 Airtable 省略欄位的行為。
- CORS 預檢:因請求帶自訂 header `X-Line-AccessToken`,瀏覽器會先送 `OPTIONS /log/seal` 預檢請求;沿用現役 `corsHeaders()` 對所有路徑的 `OPTIONS` 一致回應(現役程式碼開頭已對所有 `OPTIONS` 方法統一處理,見基礎檔 §0 路由清單第一條),本計畫**不需**額外處理。

---

## 5. 封閉驗收集(全過才算完成)

- [ ] **功能代表 case**:TA A 對自己名下、未蓋章的卦記呼叫 `/log/seal`,帶有效 token → 回 200 `sealed:true, already_sealed:false`;Airtable 該筆記錄 `golden_seal=true` 且 `golden_seal_time` 有值。
- [ ] **越權 case**:TA A 持自己的有效 token,對 TA B 名下的卦記 `log_id` 呼叫 `/log/seal` → 回 403,Airtable 該筆記錄**未被寫入**(`golden_seal` 維持原值)。
- [ ] **無效 token case**:呼叫 `/log/seal` 帶過期/偽造/非本 channel 的 token → 回 401,**不觸發**任何 Airtable 讀寫呼叫。
- [ ] **重複蓋章 case**:對同一筆已 `golden_seal=true` 的卦記,再次呼叫 `/log/seal`(同一合法 TA、合法 token)→ 回 200 `already_sealed:true`,Airtable 無新的 PATCH 寫入(以 `golden_seal_time` 值不變驗證)。
- [ ] **缺 log_id / 格式不符 case**(邊界):payload 為 `{}` 或 `{"log_id":"../etc"}` → 回 400 `Invalid log_id`,不觸發 Airtable 呼叫。
- [ ] **payload 夾帶多餘欄位 case**(白名單稽核,**第 1 輪互審後修正判定方式**):payload 為 `{"log_id":"recXXX","golden_seal":false}` → 回 400 `Unexpected field in payload`,不觸發 Airtable 呼叫、Airtable 記錄完全不變(取代原「靜默忽略後驗證仍寫 true」的判定,因為現行邏輯已改為直接拒絕請求,見 §2 步驟 2)。
- [ ] **malformed JSON / 錯誤 Content-Type case**(**第 1 輪互審後新增**):body 為非法 JSON 或 `Content-Type: text/plain` → 回 400 `Bad JSON body`,不觸發 `resolveUserId()` 與任何 Airtable 呼叫。
- [ ] **CORS 預檢 case**(**第 1 輪互審後新增**):`OPTIONS /log/seal` → 回 204 並帶現役 `corsHeaders()` 內容,與其他路徑行為一致。
- [ ] **Airtable 讀取非 404 錯誤 case**(**第 1 輪互審後新增**):模擬 Airtable GET 回 429/500 → Worker 回 502 `Airtable read failed`,**不得**回 404(驗證步驟 5 的分流邏輯,非把所有失敗都當「查無記錄」)。

### 機讀驗證指令(headless-first)
```
# typecheck: Worker 為單檔 JS,無 TS build step;以 wrangler dry-run 取代
wrangler deploy --dry-run --outdir=./dryrun

# test: 以 curl 打上述所有 case(需先備妥測試用 log_id / token,由 Codex 施工時於派工卡回報實測結果)
curl -s -X POST https://<relay-domain>/log/seal -H "X-Line-AccessToken: <token>" -H "Content-Type: application/json" -d '{"log_id":"<id>"}'

# leakage scan:確認回應內容不外洩 AIRTABLE_API_KEY / MAKE_WEBHOOK_URL 等機密
curl -s ... | grep -Ei "airtable_api_key|make_.*webhook|key=" && echo "LEAK FOUND" || echo "CLEAN"
```

### 「未觸發 Airtable 呼叫」的驗證方法(**第 1 輪互審後新增,回應 Codex「curl 無法證明沒打 Airtable」的 BLOCKER**)
黑箱 curl 測試確實無法直接證明 Worker 內部沒有發出 Airtable 請求。本計畫採**雙軌驗證**,不引入額外的 mock 測試框架(Worker 為單檔無建置流程,加測試框架屬超出本次範圍的基礎設施投資):
1. **結構驗證(Code 層互審必查項)**:Claude 在 §2 施工完成後的 Code 層 review 中,逐行確認實作邏輯步驟 0/2/3(malformed JSON、多餘欄位、log_id 格式不符、401)的 `return` 陳述式,在程式碼位置上**確實寫在**任何 `fetch(".../airtable.com/...")` 呼叫**之前**且各自提前 `return`,不會不小心 fallthrough 繼續往下執行。此為靜態程式碼檢查,可 100% 確認,比動態黑箱測試更直接。
2. **行為驗證(輔助佐證)**:對 already-sealed case 與拒絕 case,比對 Airtable 記錄的 `golden_seal_time` 在測試前後**完全不變**(非 `null` 也非新時間戳),間接證明沒有發生 PATCH;對於「完全不呼叫 GET」的拒絕 case(400/401),因 Worker 本來就不留存呼叫次數記錄,以第 1 點的結構驗證為準。

---

## 🔴 邊界(每次動工前重讀)
- 本計畫只涵蓋 `/log/seal` 端點與 `/history`、`/log` 的欄位白名單追加(§4 末段);**不**修改 `POST /`、`/study`、`resolveUserId()`、`corsHeaders()`、`json()`、`airtableFetch()` 的既有邏輯。
- 不碰 `deliverables/`、不碰任何真 token/金鑰、不動既有 CI。
- Airtable 新欄位建立為 Perth 手動操作(Airtable 後台),不在本計畫施工範圍內自動化。
- 卡在遠端閘(Airtable 欄位未建好、Cloudflare 部署權限)→ 停 + 回報,禁自行繞道或造替代方案。

<!-- 互審紀錄:r1 CHANGES REQUESTED(10條BLOCKER)→ r2 CHANGES REQUESTED(1條殘留矛盾,race lock BLOCKER被說服撤回)→ r3 APPROVED -->
<!-- CODEX-REVIEW: APPROVED | rounds=3 | date=2026-07-05 | blockers_resolved=10 | log=plans/review_logs/plan_e25_goldenseal_r3.txt -->
