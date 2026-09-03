# Mingge RC1 Slice A ②｜delayed-return 計畫 v0.1

日期：2026-09-03（Asia/Taipei）
角色：Codex，bounded engineering slice 的實作者。
狀態：HUB_STAMPED / LOCAL_COMMIT_AUTHORIZED；F／G／live readback 狀態仍依下文證據。
目前以 §13 Hub 蓋章與單 commit 授權、§11 核稿及 §12 施工 evidence 為準；§1–§10 保留初稿交核背景，當中待核事項已由 R1–R9 裁定覆蓋。使用者已授權本 worktree 單一 commit；不 push、不 deploy。

## 1. 交核結論

延續現役 first_completion，補足 delayed_return 的紀錄呈現、分路、比較卡、補記與 readback。**目前不得施工**：除了使用者指定「Hub 過審再施工」，還 fresh-read 到本卡 §3 的明確停手條件：`POST /trace` 直接覆寫單一 `trace_text`，尚無 append。下列方案是交核提案，不是自行解除 B3。

Hub 本次須核定的最小事項：

1. 依本卡 §3 對既有 overwrite 作明確處置，核准本計畫的 append／readback 方案後才解除該項停手；並核定並發與結果不明重試的保障，不能只把 PATCH 改成字串相加。
2. 確認 Worker 範圍包含 `GET /history` 的讀錯不當空、`GET /log` 的深卜欄位白名單。卡 §0「Worker 只在必要時加 /trace append 語意」不足以滿足 A3–A5，不能只改前端假裝有資料。
3. 核定 A3 與 F2 的畫面解法，以及 deep_read pending／failed／unknown 的動作與缺漏文案；既有資料無法證明未建立時不得導購或重送。
4. fupan live 未有 current readback，依卡先隱藏並 ESCALATED；核定比較卡仍使用「這三個差在哪？」及「三個都不是…」的 exact 字串是否可接受兩欄畫面。未核准不得自改為「兩個」。

## 2. 本次查證座標與界線

| 項目 | 本輪直接查證 |
|---|---|
| Repo | `https://github.com/perhaps8511-lab/mingge-line.git` |
| 工作目錄 | `D:\CBD_Lab_OS\001_mingge\worktrees\mingge-r2-delayed-return-plan-20260903` |
| Base／HEAD | `f2bafbcbd1607b1595560ba1e6a4e07dc251a80e`，detached HEAD，來自 freshly fetched `origin/main` |
| pull | 在本工作目錄執行 `git -c safe.directory=D:/CBD_Lab_OS/001_mingge/worktrees/mingge-r2-delayed-return-plan-20260903 pull --ff-only origin main`，exit 0，`Already up to date.`；safe.directory 僅本次命令，未改 global config |
| 原 checkout | `D:\CBD_Lab_OS\001_mingge\mingge-line`，`card/rm03d-chat-copy-land`，HEAD `d3b16b5d9403c8cf3bb2d098b37ec1e24f367252`；既存未追蹤檔保留，未切分支／stash／清除 |
| direct collision | 新獨立 worktree 起始 `git status --short` 為空；本輪不占用原 checkout 的施工檔 |
| 讀取順序 | 在附件定位專案後讀 `governance/SITE_DOSSIER.md` → `governance/CHANGELOG.md` → `governance/STATUS_BOARD.md` → 本卡；pull 後核對這三檔差異，依 main 版判讀 |
| scoped instructions | 父層與本 worktree 未找到適用的 AGENTS.md／AGENTS.override.md；遵循使用者提供的 Global Kernel 與本輪指令 |
| 本卡 | `D:\Downloads\DISPATCH_MINGGE_V1_2_RC1_SLICE_A_R2_DELAYED_RETURN_20260903.md` |
| 本卡 SHA-256 | `feaf48fb9a2f85fea5000614d6f555dceb8199cadac8de685b6e95e81020b801` |
| Copy source | `D:\Downloads\MINGGE_CORE_TA_COPY_AND_CONTENT_ENRICHMENT_v0_2_20260902.md`，直接讀 §5 |
| Copy SHA-256 | `3f29582c40fb1f6b13e2c3000dd9ad7cc380a88547d0816dbbc554cc26d8586c`，與卡上值相同 |
| Basis | 直接讀 `D:\CBD_Lab_OS\001_mingge\00J_canon\Product_Basis\` 的 RC1 Journey State D-J03／C-12、UI D-U03／D-U04、Acceptance R2-06；本輪不修改 |
| adoption anchor | 卡載 `Change_Log recfmGJLEFdsmCsUL`；本輪未對 owning store 另行核實，不把卡載資訊寫成 live readback |
| 原碼行尾 | `index.html`、`log.html`、`governance/STATUS_BOARD.md` 均為 `i/lf w/lf`；本輪未正規化原碼 |

本輪遠端查證到 Git main。GitHub Pages 公開頁讀取工具回 non-retryable open error，未取得 live HTML；Worker deployment id、實際 Airtable field schema／測試戶、fupan runtime live 均 UNVERIFIED。repo HEAD、卡上 fresh-read 摘要、live binding 不互相代替。

SITE_DOSSIER 中舊卡序／價格／commit 習慣不是本卡新的授權；本卡與當前使用者指令優先。本輪不修歷史板、舊卡或其他格。

## 3. Current → resulting TA flow 與直接缺口

目前：保存完成已走 first context；列表進單則雖有簡版分路，但補記只能首次寫、成功只信 POST、複盤只信 tier／筆數，且讀取錯誤可被吞成空。
目標：保存完成體驗保留 → 從②進單則才 delayed → 看既有紀錄 → 選本次動作 → 補記 append → 同筆 GET readback 證明後顯示成功 → 回這一卦或回卦記。

所有下列行號以本計畫 Base 為準，施工後需重新列 resulting 行號。

| 現況 | 原碼座標 | 必要變更 |
|---|---|---|
| 保存成功網址為 `context=first_completion`，readback 成功即清兩個 inflight keys | `index.html:2558–2592`；清理 `2446–2456` | 保留網址及完成畫面；不能只依 `mg_inflight_session_id` 判 first |
| init 另把 `src=letter` 判 first，尚不支援 `ctx=first` | `log.html:666–671` | 集中 context 判定並保留既有相容 |
| delayed 掛在完整信箋後；已有 trace 也要點按鈕才看見 | `log.html:424–434,488–516,637–657` | 已存 trace／深卜結果先可讀，補記表單與既有紀錄分開；已有後續仍可新增 |
| fupan 只驗 subscriber 與 recordsCount≥3；列表另有 ≥2 的舊 banner | `log.html:488–495`；`index.html:1878–1897,1968–1972` | 同一 eligibility 結果控制分路／比較欄／②既有 banner，避免回列表又露出未 live 複盤 |
| GET /log 未回傳任何 deep_read 欄位 | `workers/mingge-relay/worker.js:181–196` | 按 owned record 白名單補讀；不可把缺欄當未建立 |
| POST /trace 只允許 log_id／trace_text，文字 trim 後上限 500，body 上限 4096 bytes | `worker.js:71,362–417` | 保留限制與驗身；本輪不擴 body／加私人欄位 |
| GET ownership 後 PATCH 只送新 trace，200 回 echo，無讀回 | `worker.js:424–488` | append 僅改 trace_text／trace_at；讀回才確認 |
| 前端 submitStamp 直接把 POST body 當成功 | `log.html:437–470` | 追加 authenticated GET /log 驗同筆增量 |
| /history 用 airtableFetch，upstream 非 2xx 被回成 records:[] | `worker.js:106–120,1019–1037` | /history 改用嚴格讀取結果；不全域修改 helper 的其他使用者 |
| read error 顯示診斷內容；records 缺欄也當 empty | `index.html:1975–1979,2009–2016`；`log.html:698–722` | exact read_error；清除 stale 分路；不得輸出 upstream body |

## 4. first／delayed 判定設計

`resolveGuaViewContext` 是純函式，輸入已解析的 navigation source 與驗身讀回的 record；回傳 `first_completion` 或 `delayed_return`。讀取錯誤是外層獨立 state，不能呼叫正常分路 renderer。

| 來源／條件（由上而下） | context 與理由 |
|---|---|
| 自②列表／Rich Menu 的新開啟：`src=log` 或明確 delayed source | `delayed_return`；清掉沿襲的 first query，殘留 inflight key 不覆蓋來源 |
| 保存完成既有連結 `context=first_completion` | `first_completion`；保持 E1 exact URL 不變 |
| 本卡指定別名 `ctx=first` | `first_completion`；僅決定呈現，不授權讀資料 |
| 既有信箋連結 `src=letter`，無明確②列表來源 | 保持 `first_completion` 相容；不改凍結 Make 連結 |
| 保存完成 handoff 沒帶明確 context，但有可證明的 completion source | 只有 GET-owned record 的 `log_id`、`session_id`、normalized `qigua_time` 全匹配該次 completion 才 first；單獨 session 相同不足。沒有這種 handoff 就不新增猜測來源 |
| 普通 direct link、缺參數、未知值 | `delayed_return`；不能自行用「過幾小時」作判斷 |

first 頁仍為原卦／信箋＋既有完成說明＋回首頁；四路、比較卡、三問、深卜 CTA 不建立 DOM。以真 renderer 的 VM 執行結果斷言，不只查 helper 字串。

delayed 頁回列表的連結重新建構，不沿用 `ctx`／`context`。重新整理明確 first URL 仍 first；拿著帶 first 標記的舊 URL 隔天重開也仍 first，卡上要求的隔天回訪應經②列表。若 Hub 要把舊信箋／書籤自動按時間轉 delayed，須另明定期限與來源，不擅自發明。

sessionStorage 僅作來源輔助，絕不作「已保存／已補記」依據。`showSaveComplete`、`waitForPersistedLog`、`recoverInflightSave`、120 秒窗口與兩個 key 清除流程維持原邏輯。

## 5. 讀取與動作矩陣

讀取順序為驗身 → GET /log 同筆 record → GET /history owned divination 集合／會員資訊 → state 分流。成功 response 必須有正確 record id、record 形狀與 records array；null／缺欄／解析失敗不當 empty。只有 /history 真成功且 owned 集合為 [] 才顯示 §2.4 empty。

`GET /history` 局部改用既有 `airtableFetchStrict` 或等效結果處理；divination／subscriber 任一必要讀取失敗就非成功回應，不造 free／zero 的資料。保留既有 owner filter 與欄位限制。這項會被保存輪詢使用，須以 E1 驗證失敗只是保持等待、不能誤宣稱已保存。

| delayed 動作 | 判定／落點 |
|---|---|
| 事情有變了 | 有效 owned divination 一律可進三問，即使已有 trace；不操作 golden_seal |
| 想把這一卦看深：completed | 同筆已確認 `deep_read_state=completed` 且結果可讀 → 顯示同卦的既有結果；零 trigger、零 checkout |
| 想把這一卦看深：明確未建立 | 未 entitled 走現有 `./index.html?action=pay&src=deepdive` 整備態；不加新付款、不重起卦。已 entitled 僅沿原 route，資格仍由伺服端判定 |
| deep_read pending／failed／unknown／completed 缺結果 | 不降為未建立，不猜 entitlement，不重新扣款／trigger；具體等待／失敗呈現與重試規則待 Hub 補定，§2 沒有這些狀態文案 |
| 想回看這一路 | `historyReadOk && ownedDivinationCount>=3 && fupanRuntimeLive===true`；tier／URL／歷史成功／route 存在都不代替 live。需供料 current runtime readback 才可開啟；本輪 unknown→隱藏並 ESCALATED |
| 問另一件新的事 | `./index.html?action=divine`，只帶入口參數；不夾舊 question、record 或 trace |

owned count 來自伺服端 owner filter，前端再驗 `entry_type=divination`，以 log_id 去重；不把其他 entry type 或合成數字充數。50 筆上限足以判 ≥3，與總歷史完整匯出無關。

GET /log 候選最小回傳增量：`deep_read_state`、`deep_read_output_json`；`deep_read_request_id` 只有查證既有流程需要才回傳，不外露身分／憑證。實際 schema 與結果格式未查證前，不拿 fixture 當 production 證據。

## 6. trace append／readback 設計（B3，待核才實作）

### 6.1 前端輸入與生命週期

- 三問各自輸入，任一句非空即可；全空時「記下來」disabled，送出函式仍再檢查。
- 送入 `trace_text` 的提案格式：依卡 §2.3 的三問原文，僅對非空回答組成「問題原句 + LF + 回答」，各組以兩個 LF 分開。原句自本卡擷取，回答作純文字。計算包含標籤的總長度，沿既有 500 字元／4096 body bytes 界線；不截斷已輸入內容。Hub 若不採用標籤格式，須在核稿時指定組合格式。
- `POST /trace` request body 仍是 `{log_id, trace_text}`，token 只在現有 header；不傳原卦、不傳既有 trace，不信任客戶端做 append。
- 編輯／送出／readback 中／成功／失敗分態；成功前不清空輸入。未保存文字只在當頁記憶體，不放 URL、storage、analytics 或 receipt。
- 「先不記」回同筆 delayed 首屏，不 POST；傳送中禁止再次傳送。失敗保留輸入，readback 成功才顯示 §2.3 成功句及「回這一卦」。

### 6.2 Worker 單次 append

1. 沿現有 content type、有限 body、JSON allowlist、token 驗證、record id、owned divination 檢查。取出伺服端 fresh record；缺 trace 視為空，非字串異常則失敗，不覆蓋。
2. 伺服端生成唯一一次本次時間 `t`，把同一 instant 格式化為 `YYYY-MM-DDTHH:mm:ss.SSS+08:00`。stamp 不採用客戶端時鐘。
3. 格式提案固定為 `entry = stamp + "\n" + submittedText`；若既有值是空，`next = entry`；否則 `next = oldTrace + "\n---\n" + entry`。**不 trim／normalize／重排 oldTrace**，其 bytes 必須是新值的原封前綴。舊紀錄沒有日期也不補造歷史日期。
4. PATCH fields allowlist 恰為 `trace_text: next`、`trace_at: t.toISOString()`；前者的內文 stamp 是 +08:00，後者維持 Airtable 日期欄的同一 instant。禁止 question_text／ben_gua／bian_gua／dong_yao／output_json／qigua_time 及 golden_seal 欄進 PATCH。
5. PATCH 成功後 Worker 再 GET 同筆，確認 oldTrace 前綴、新增完整 entry 與本次 trace_at；才回現有 traced envelope。前端仍獨立 GET /log（no-store）驗同筆，不把 Worker echo 當 readback。
6. 前端成功條件：同 log_id、剛送出的完整新增段落及 stamp 出現在基線之後、既有前綴保留；不能只用 `includes(submittedText)`，因為舊段落可能早已含同句。原卦六欄在測試 owning store 二次讀取中逐 byte 不變。
7. readback 只做有限 GET 輪詢（提案 3 次、相隔 1 秒）；不在輪詢迴圈裡再 POST。超時走卡上失敗／未確認狀態，不宣稱成功。

### 6.3 並發、重試與容量不能省略

**2026-09-03 核定補記：KNOWN_RESIDUAL（Hub R1 已接受）。** 本卡採 UUIDv4 request_id、fresh GET → PATCH → GET verify、最多一次 repair 與前端 single-flight；Airtable 無條件更新仍可能由另一裝置稍後覆蓋已驗證段落，不能宣稱跨裝置原子 append。測試已重現該限制。新 Durable Object binding／schema 不在本卡。以下為初稿風險分析，不再要求 R1 已明確豁免的串行化前置；結果不明文案與 same-ID retry 以 R2／R6-U 為準。

目前原碼／wrangler 設定沒有展示 record-scoped 串行化、條件更新或持久化 idempotency 機制。單純 GET→字串相加→PATCH 有可重現 lost update：A、B 都讀到 T，A 寫 T+A，B 再寫 T+B，A 遺失；A 當時 readback 成功也不能防後來被 B 蓋掉。

因此，以上 6.2 是內容轉換與 readback 設計，**不是已證明安全的完整並發 append**。施工前須確定所有 `/trace` writer 由同一 record-scoped 寫入序列控制，或 owning store 已有可驗證條件更新。若查無，Hub 須核定最小串行化／idempotency 範圍；若需要新 binding、migration、schema 或新外部權限，另取得相應授權，本計畫不偷加 wrangler／資料表變更。前端 disabled 或 isolate 內 Map 不能充當跨裝置保障。

write 已完成但 response／readback 遺失時，立刻再 POST 會重複 append。重試先 GET 比對當次 stamp／基線；若已落盤直接確認，不能追加第二段。若連當次 stamp 都未收到且無 durable request identity，不能以相同文字去重（使用者可能有意再次記相同一句）。這種 ambiguous write 的恢復，須和上段 idempotency 一起核定，不能以自動重送取代。

總 trace 上限以 owning field 的已查證契約處理；本輪沒有該容量證據，不能臆造上限或截去舊段落。超限／寫失敗不改原值。任何需給 TA 的新容量提示須 Hub 供稿。

**失敗文案真實性待 Hub 確認**：卡 §2.3 要在「write 或 readback FAIL」都說沒有保存成功，但 PATCH 已生效而 GET 暫時失敗時，只知道尚未確認，不能證明沒寫入。不得為配合文案刪除已寫紀錄；請 Hub 區分確定寫失敗與結果不明，或提供結果不明 exact copy。核定前不自行寫替代 TA 句子。

## 7. 畫面、copy 與 safe return

- first 分支保持原有 markup／copy／回首頁行為；新增 UI 僅在 valid delayed context 渲染。
- delayed 的已存在 trace 與 completed deep_read 應直接讀得到，不藏在「新增一筆」內；三問另開同頁 view。深卜結果以既有 escaped text／已查證格式呈現，不讓任意 JSON／HTML 執行。
- 比較卡預設收合；fupan 動作、比較欄、②舊 banner 共用 gate。false 時移除整欄與布局位置，不以 CSS 空白柱佔位。
- 列表按 §2.5 呈現所問摘要（最多兩行）、原始日期、最後一次後續日期／摘要或 exact 無後續句、看這一卦。摘要從資料確定性截取／CSS clamp，不使用 LLM 改寫，不把 trace delimiter 當正文。
- delayed 首屏 safe exit 用卡核定的「回卦記」→ `index.html?action=log`；列表用「回首頁」→ 既有首頁／LINE 退出行為；三問／成功回同 log_id。錯誤屏只依 §2.4 提供再試一次與回首頁。
- 四路是一個動作選擇區；其餘比較卡為次要 disclosure，safe exit 為次要返回。三問只有「記下來」一個 Primary，不再同屏擺深卜／複盤按鈕。
- 所有新增主要文字 font-size≥17px、line-height≥1.9；F1 由 Cowork PM 實際 browser computed style 與最差合成背景像素量測，對比≥4.5:1。不能拿宣告 backgroundColor 代替像素。

**A3／F2 交核提案**：原碼先放完整且可任意長的信箋，再放分路（log.html:637–643）；若保持此順序與完整展開，不能保證 380px 寬的初始 viewport 同時見完分路＋safe exit，卡也未定 viewport 高度。建議 Hub 採「紀錄在 DOM／閱讀順序前，進 delayed 時定位到動作區，原紀錄仍可向上查看」並明定 F2 測試 viewport 高度／容許的紀錄折疊方式。這會影響「先顯示」的驗收意義，核定前不自行用截斷、縮字、換 copy 或藏原紀錄來取綠。

copy 綁定：實作與 byte checker 應由本卡 §2 機械擷取，來源全文 hash 如 §2；不從本計畫手打的說明回填 TA 文案。`【標題】`、`【Primary】`、括號條件、箭頭是來源標記，須在 extractor 明確對應 field，不誤渲染為產品文字。`您`、`・`、`·`、全形標點不互換。比較卡「複盤（fupan runtime live 才渲染）」之括號是條件註記。

測試的 byte expectation 必須由來源生成，與 production renderer 分開讀取；不能讓兩者共用一個可被同時改錯的常數檔。B3 禁語只掃四路／比較卡的受控 UI copy，不把使用者原始問題中的數字或詞誤判成新文案違規。

## 8. 待核施工 write set 與順序

本輪實際 write set：

```text
governance/plans/plan_r2_delayed_return_v0_1.md
governance/STATUS_BOARD.md  # 僅本輪 plan 留痕一行
```

Hub 過審、B3 與必要供料解決後的候選 write set（不是現在開始寫）：

```text
index.html                                   # 僅②列表／錯誤態／相關 fupan 可見性
log.html                                     # context／紀錄／delayed 分路／比較卡／補記／safe return
workers/mingge-relay/worker.js                # /trace；待核 /history、/log 最小支援
tests/test_r2_delayed_return_v1_0.mjs          # VM 真執行與 mock owning store
tests/check_r2_copy_bytes.mjs                 # 本卡 §2 來源獨立比對
governance/cards/DISPATCH_MINGGE_V1_2_RC1_SLICE_A_R2_DELAYED_RETURN_20260903.md
                                              # 待核來源入庫，僅附件 exact bytes，不改本卡
governance/plans/plan_r2_delayed_return_v0_1.md # 執行證據／核准座標
governance/STATUS_BOARD.md                    # 實際狀態與證據一行
```

原測試、Offer／價格／六格 label／①保存完成 state／Make 5202754、5468020、5500272／Dify／LINE console／其他格／runtime bindings／schema 均不在此 write set。若安全 append 必須增加 binding／檔案，先核定 amendment，不能擅加。無 git add -A、無 commit／push／deploy／刪除。

順序：核准與供料 → fresh base／直接碰撞確認 → scoped source bytes 入庫 → 合成資料重現 → append 與讀取契約 → readback → delayed UI／copy → A–E → Cowork F → 回 Hub；後續 G 與 TA replay 依卡由相應角色接手，工地不預研④⑤。

## 9. 驗收與證據安排

| 集合 | 要實際驗什麼 | 本輪 |
|---|---|---|
| A1–A5 | 實際 init／renderDetail VM；context 來源矩陣、stale session、同 session 不同時間、first 無分路；深卜與 fupan state matrix；HTTP／JSON／schema read_error ≠ empty | NOT_RUN（未實作） |
| B1–B3 | 從來源 bytes 對到渲染文案；您／標點不變；false gate 不渲染 fupan 欄；exact 受控畫面無價格與禁語；expected 不抄 renderer | NOT_RUN |
| C1–C4 | 假 token／合成 owned records：已有 T append A 再 B；old prefix byte 不變；六原欄不變；PATCH fields 只有兩欄；write/readback 失敗；全部空／單句／三句；先不記零寫入 | NOT_RUN |
| C 的必要負例 | 他人 record／錯 entry type／body extra keys／超限／XSS；同文已存在不得冒充新成功；兩個 concurrent writer 不丟段；response lost 重試不重複；跨裝置仍安全 | NOT_RUN；並發／idempotency 前置待核 |
| D1–D2 | 每 view 的 Primary／safe exit、history 無前頁、登入返回 context、問新事 query 不含舊資料 | NOT_RUN |
| E1 | `node tests/test_mingge_v12_rc1_product_loop_v1_0.mjs` | 基線本輪已跑：PASS=59 FAIL=0，exit 0；不是新 slice 驗收 |
| E2 | `node tests/test_rm03_intent_split_v1_0.mjs`、`test_rm03_artifact_data_wiring_v1_0.mjs`、`test_gift_claim_truth_v1_0.mjs`、`test_r1_divination_guidance_v1_0.mjs`、`test_r1_press_release_behavior_v1_0.mjs` | NOT_RUN（待施工後） |
| E2 shell 四支 | `test_zero_quota_gate.sh`、`test_e086_checkout_mock_v1_0.sh`、`test_lettertail_taskB.sh`、`test_mingge_showcase_005a.sh` | NOT_RUN；sandbox B1 才由 Claude Code unrestricted 補跑；不得宣稱 PASS |
| Worker 直接回歸 | `node tests/test_security_fail_closed_v1_0.mjs`；E25 `/trace` 合成 route cases；舊 `test_e25_stamp_v1_0.sh` 若綁舊 UI，報 exact 衝突，不改測試迎合 | NOT_RUN |
| E3 | `git diff --check`、changed-path containment、寫前後 hash；換 worktree 後再驗行尾，只處理獲准檔 | 文件 whitespace 檢查無 findings；新增 plan 另以 no-index 檢查，未為檢查而 git add；實作尚未驗收 |
| F1–F2 | Cowork PM 真 browser，合成已知紀錄、380px 寬、Hub 核定高度、fupan false/true、worst backdrop 對比、比較卡預設收合 | NOT_RUN／待畫面裁定 |
| G1–G5 | Owner 手機真實流程；其他席不得代宣稱 | PENDING_OWNER，現在不要求 Owner 提前 UAT |

既有 STATUS_BOARD 2026-08-20 記錄 lettertail 1 FAIL、005a 4 FAIL 是歷史 baseline drift；本輪未重跑，所以不把舊計數當本輪結果。施工若觸及相關路徑，須對同 base 前後輸出定位，不能一律豁免新回歸。

合成 harness 可證程式行為，不能標成 Airtable runtime readback。C 的真測試戶驗證須已有授權的假 token／測試戶與確切部署；只寫合成文字、只讀該筆。receipt 僅測試 record alias／必要允許的測試 id、摘要 hash、欄位不變判定；不存私人內容、raw LINE id、token 或原始 provider body。

## 10. Hub 可直接回覆的交核單

請對本計畫 exact file hash 回覆 APPROVED 或具體修訂，並逐項處理 §1／§6／§7 的 affected boundary：

- `/trace` overwrite 停手如何解除；append 並發／結果不明重試如何證明不丟不重複。
- 同卡 Worker `/history` strict read 與 `/log` deep_read allowlist 是否納入，以及必要 current schema／結果樣本（合成或 masked）。
- pending／failed／unknown deep_read 與結果不明 trace 的 exact copy／動作。
- A3／F2 的初始 viewport、順序與完整紀錄可及性；fupan 隱藏後比較卡 exact 標題／尾句。
- fupan live 未證明期間全部相關②入口隱藏；新 binding／schema 若需要，先另核具體最小範圍。

初稿已經由 Perth 傳交 Hub；本輪使用者攜回 §11 核稿並明示 go。Hub 明定 Perth 轉貼為現階段唯一通道，沒有 Hub 對話 URL；不得再找。施工 evidence 同樣備妥交回 Perth／Hub，不能把其他 task 當收件處。

Terminal（本輪計畫交付）：PRODUCT_DELIVERABLE_PRODUCED / AWAITING_HUB_REVIEW。② Product Gap 尚未完成；未施工、未 commit、未 push、未 deploy。Hub 核准與 affected B3 解決後，才在同一 bounded task 續做。


## 11. Hub 核稿與本輪施工授權

使用者於本輪提供下列核稿並明示 go；reviewed SHA 與原計畫相符，base 與遠端 main 同為 f2bafbcbd1607b1595560ba1e6a4e07dc251a80e。此前 §1/§10 待核状态為歷史提案，由下列 R1–R9 裁定覆蓋。KNOWN_RESIDUAL：跨裝置競爭仍可能 lost update，依 R1 接受；不建新 binding／schema。當前只施工本卡，未 commit／push／deploy。

Hub review 原件 SHA-256：c1693af3a7e2f07cb7bfb51b395377ab5944d0355ceb11568914b4214a9197e0。以下保留來源文字；檔案行尾轉 LF，原件 hash 如上。

<!-- HUB_REVIEW_SOURCE_BEGIN -->
# HUB REVIEW｜plan_r2_delayed_return_v0_1.md → APPROVED_WITH_RULINGS（r1）

```yaml
reviewed_file: governance/plans/plan_r2_delayed_return_v0_1.md
reviewed_sha256: 58ef6caf6fddbbcac3ba6b034422fa8a01fdf329e6e14b0593a75eb8a41b4592
base_head: f2bafbcbd1607b1595560ba1e6a4e07dc251a80e
card: DISPATCH_MINGGE_V1_2_RC1_SLICE_A_R2_DELAYED_RETURN_20260903.md（sha256 feaf48fb…0b801）
reviewer: Claude Chat（Hub）2026-09-03
verdict: APPROVED ── R1–R8 施工；R9 已由 Owner 裁 (a)（FUPAN_LIVE_PROVEN: NO），Codex 自 B3 續做；不 commit／不 push／不 deploy，完成回 terminal evidence
hub_delivery_path: 本卡與本核稿由 Perth 轉貼進 Codex 入口（SITE_DOSSIER §9.1 現階段唯一通道）；沒有 Hub 對話 URL，勿再找
```

## R1｜`/trace` overwrite → append：B3 解除條件（ordinary implementation，不加 binding／schema）
採 plan §6.2 內容轉換，外加以下三道，缺一不得施工：
1. **request_id idempotency（無新 binding）**：前端每次「記下來」compose session 產生一次 `request_id`（UUID v4），隨 body 送（allowlist 增 `request_id`，格式驗證）；Worker 把它寫進 stamp 行：`{YYYY-MM-DDTHH:mm:ss.SSS+08:00} · req:{request_id}`。Worker 收到請求先 GET fresh record：`trace_text` 已含 `req:{request_id}` → 直接回既有 traced envelope（`idempotent:true`），不 append。
2. **write window 收窄＋post-verify**：GET fresh（作 oldTrace）→ PATCH（`trace_text: next`, `trace_at`）→ GET verify：本次 entry 存在且 oldTrace 為原封前綴。verify 失敗（前綴被他寫破）→ 以最新值為新 oldTrace **重做一次**（entry 以 request_id 判斷是否已在）；仍失敗 → 回 `state:"unconfirmed"`（非 success、非 fail）。
3. **殘留風險登記**：Airtable 無條件更新；兩裝置同秒寫仍有理論 lost update。本卡接受此殘留（同一 TA、同一 record、前端 single-flight），在 plan §6.3 明記為 KNOWN_RESIDUAL；真串行化（Durable Object）＝未來 amendment，需 Perth 授權新 binding，**本卡不做**。

## R2｜結果不明（unconfirmed）與重試
- 前端 `POST` 回 `unconfirmed`、或 network／readback 超時 → 顯示 R6 的「結果不明」態；**Primary「再試一次」沿用同一 `request_id`**（因此安全，不重複）。
- 「確定寫失敗」（Worker 在 PATCH 前即回 4xx/5xx）才用卡 §2.3 失敗句「這一筆還沒記進去。剛才沒有保存成功，原卦沒有變。」
- 不得為配合文案刪除已寫紀錄。

## R3｜Worker 範圍：納入 `/history` strict read 與 `/log` deep_read allowlist
- `/history`：局部改用 `airtableFetchStrict`（或等效）；upstream 非 2xx／JSON 解析失敗 → 非成功回應（`state:"read_error"`），不得回 `records:[]`。保存輪詢（`waitForPersistedLog`）遇 read_error 只保持等待，E1 必驗。
- `/log`：owned record 回傳增量恰為 `deep_read_state`、`deep_read_output_json`；**不回** `deep_read_request_id`／`deep_read_entitlement_id`。
- **current schema（Hub 本日以 Airtable MCP 讀 owning store 表結構，非憑記憶）**：base `apptFfyVBYE4ygW3E` / `Divination_Log` `tblVyf8WfTQxvtpEg`：`trace_text` `fldrZzWVA0pS9gASk`（multilineText）、`trace_at` `fldysg0lBLZIyvSm7`（dateTime, Asia/Taipei）、`golden_seal` `fldXH6MZGcbhyc4ZG`／`golden_seal_time` `fldDzkTIZLTp76rpm`（不碰）、`deep_read_state` `fldXrCnEmHXWhNtCe`（singleSelect: pending／completed／failed；空＝尚未建立）、`deep_read_output_json` `fld3GmzxFhMAnRzTj`、`deep_read_request_id` `fldxdhAG9MjUWyprP`、`entry_type` `fldXW48ZTDcrwnA0k`（divination／mood／deepdive／fupan）、`line_user_id_raw` `fldqFGVohUrJFRYX9`、`qigua_time` `fldHxJQcy4q6cSb1g`。複盤 owning store：`Fupan_Reviews` `tbluAjG6q0Pn6uq4R`（`holder_id`、`state`、`source_gua_record_ids`、`offer_version`）。deep_read_output_json 的結果格式本場未取樣：以 masked 合成 fixture 施工，production 只做 escaped text 呈現（plan §7 已定）。

## R4｜deep_read 四態動作（無新付款、無新 trigger）
| deep_read_state | 四路第二項 | 點擊 |
|---|---|---|
| 空（未建立） | 顯示 | 既有 `?action=pay&src=deepdive`（未 entitled）／既有 entitled route；資格伺服端判 |
| completed 且 output 可讀 | 顯示 | 同頁展開結果（escaped text） |
| pending | 顯示 | 顯示 R6-P，不 trigger |
| failed／unknown／completed 缺結果 | 顯示 | 顯示 R6-F，不 trigger、不導購 |

## R5｜A3／F2 畫面裁定
- DOM／閱讀順序：原始卦與既有紀錄（含既有 trace、completed 深卜結果）在前，delayed 動作區在後；進 delayed 時 **focus＋scrollIntoView 到動作區**，原紀錄向上可讀，不折疊、不截斷、不縮字。
- F2 viewport：**380×640**（最小裝置基準）；「捲到動作區後」四路＋safe exit 一屏可見；比較卡預設收合。
- first 分支 DOM 不得建立四路／比較卡／三問／深卜 CTA（以真 renderer VM 斷言）。

## R6｜Hub 供稿的 state microcopy（v0.2 §9.1 U8 要求四態分開；屬 state 文案，非新產品文案；Owner 於 G UAT 一併過目）
```text
【R6-P｜深卜 pending】
這一卦的深卜還在進行中，完成後會在這裡看到。
[ 回這一卦 ]

【R6-F｜深卜 failed／unknown／缺結果】
這一卦的深卜目前讀不到結果。請稍後再回來看，或到「書僮客服」查一下。
[ 回這一卦 ]  [ 書僮客服 ]

【R6-U｜補記結果不明（unconfirmed）】
還沒能確認這一筆有沒有記進去。
[ 再試一次 ]  [ 先不記 ]        ← 再試一次＝同一 request_id
```
其餘一律沿卡 §2 exact；不得再自造 TA 句。

## R7｜比較卡在 fupan 隱藏時
只做**數量字**替換，其他 byte 不動：標題「這三個差在哪？」→「這兩個差在哪？」；尾句「三個都不是新的一卦。」→「兩個都不是新的一卦。」。複盤欄整欄不渲染、不留佔位。fupan live 後自動回三欄，字串由同一 gate 切換，非兩份常數。

## R8｜trace_text 組合格式（採 plan §6.1 提案）
- 僅非空回答：`「{三問原句}」` + LF + `{回答}`，各組以空行分隔；原句自卡 §2.3 機械擷取。
- 長度：含標籤計入既有 500 字元／4096 bytes 契約；超限 → 「記下來」disabled ＋ 僅數字計數 `{n}/500`（不加句子），不截斷。
- 列表卡「最近一次後續｜一句摘要」＝最後一個 entry 的第一個非空回答，CSS clamp 一行；stamp 行與 `---` 不入摘要。

## R9｜fupan runtime live ── **B3，交 Perth**
Hub 本場無 current runtime readback（複盤鏈 5500272 是否對 `Fupan_Reviews` 完整 create→result→readback live）。Perth 二擇一：(a) 現在判「未 live」→ 本卡 fupan 全隱藏（列表舊 banner 同 gate），②先上；(b) 提供 live 證據（execution id＋Fupan_Reviews 一筆 completed readback）→ 解除隱藏。未答＝(a)。

**R9 RESOLVED（Owner ruling 2026-09-03）＝(a)**：fresh runtime readback——Make 5500272 execution history＝0；`Fupan_Reviews` record count＝0，無 completed readback → `FUPAN_LIVE_PROVEN: NO`。施工：複盤入口全隱藏、列表舊 banner 同 gate 隱藏、比較卡只顯「後續／四鏡・深卜」、標題「這兩個差在哪？」、尾句「兩個都不是新的一卦。」、不留空欄／佔位；不阻 R1–R8。解除條件：5500272 真 execution id ＋ `Fupan_Reviews` completed owning-store readback，兩者齊備才翻 gate。

## 不核准／不變
- 不加 wrangler binding、不改 schema、不動 Make／Dify／Offer／六格 label／保存完成 state。
- `src=letter` 相容維持 first；不引入「隔幾小時自動轉 delayed」。
- 舊 `test_e25_stamp_v1_0.sh` 若綁舊覆寫 UI → 報 exact 衝突，不改測試迎合；由 Hub 決定廢止或升版。

## 交回格式
施工完成後照卡 §1.3 五項回報＋本核稿 R1–R8 逐條 evidence（檔:行號／測試輸出）；未 commit／未 push／未 deploy。Cowork PM 接 F；G 待 Owner。

<!-- HUB_REVIEW_SOURCE_END -->

## 12. 2026-09-03 本輪 terminal evidence（供 Perth 交回 Hub）

### 12.1 Result／exact state

- **PRODUCT_DELIVERABLE_PRODUCED / HUB_RETURN_READY**：R1–R8 實作已落獨立 worktree；R9 依 Owner 裁定維持 false。Writer 不自授 Hub 蓋章、Cowork F 或 Owner G。整卡不能標成全部 PASS。
- Repo／worktree：`D:\CBD_Lab_OS\001_mingge\worktrees\mingge-r2-delayed-return-plan-20260903`；detached HEAD 仍為 `f2bafbcbd1607b1595560ba1e6a4e07dc251a80e`。本輪開始直接 `git ls-remote https://github.com/perhaps8511-lab/mingge-line.git refs/heads/main` 得到同一 SHA，exit 0；前輪 pull 證據見 §2。
- 實作增量：保存完成仍進 first → 由②列表重開才進 delayed → 既有紀錄完整可讀、focus＋scroll 到三路動作區 → 三問補記 → Worker append＋verify → 前端獨立 GET 同筆才成功。明確 first URL 隔天重開仍 first；無時間猜測。
- exact touched screen：`index.html:415` list CSS、`:1885` copy、`:1967` banner gate、`:2047` 四欄列表、`:2062` list read/error；`log.html:200` action CSS、`:588` action/comparison、`:617` context、`:633` existing records、`:671` compose、`:709` readback、`:747` submit、`:769` deep state、`:807` 真 renderer。
- exact Worker：`workers/mingge-relay/worker.js:92` GET /history、`:155` GET /log、`:380` POST /trace、`:1059` request marker parser、`:1096` strict read helper；沒有新 route。**部署版本 id：NOT_DEPLOYED；live runtime readback：NOT_RUN。**
- Changed paths 恰為：`index.html`、`log.html`、`workers/mingge-relay/worker.js`、`tests/test_r2_delayed_return_v1_0.mjs`、`tests/check_r2_copy_bytes.mjs`、本 plan、`governance/STATUS_BOARD.md`、`governance/cards/DISPATCH_MINGGE_V1_2_RC1_SLICE_A_R2_DELAYED_RETURN_20260903.md`（來源 exact bytes）。原 checkout 未動；无 commit、push、deploy、Make／Dify／LINE console／schema／binding／Offer／六格 label 變更。

### 12.2 Hub R1–R8 逐條 evidence

| 裁定 | Result／可重現證據 |
|---|---|
| R1 append／idempotency／bounded repair | worker:380、:480 起 fresh owned record + UUIDv4 stamp + trace-only PATCH + GET verify；至多 2 PATCH。R2 suite 的 two IDs、same ID、different payload、one repair、single-flight 全 PASS；KNOWN_RESIDUAL 測試重現另一裝置稍後覆寫，不把該 PASS 誤讀成不丟資料保證。 |
| R2 unconfirmed／same-ID retry | log:709、:737、:747；Worker PATCH 前明確拒絕才 state failed。PATCH 後錯誤／POST response lost／readback 不見新段落 → R6-U；再試沿用原 UUID 與 payload。Worker echo 不足以宣稱已記。 |
| R3 strict read／最小 deep 欄位 | worker:92、:155、:1096；history non-2xx、bad JSON／shape fail closed；/log 增量恰為兩欄，不回 deep request／entitlement IDs。R2 suite 的 R3/E1 真 saving poll 先遇 502 read_error、保持兩個 inflight keys、1500ms 後 exact record 才清 keys；E1 59/59。 |
| R4 deep 四態 | log:624、:769；empty→既有路由；completed escaped result；pending／failed／unknown 零 trigger／零導購。entitled route 接受既有 plain text 回應；single-flight。晚到 trigger 回應不得取代已開啟且有未存文字的三問表單，負例 PASS。 |
| R5 reading order／380×640／first DOM | log:633、:807 與 r2Focus；VM first DOM 零 actions／comparison／textarea／deep CTA。真 browser synthetic 380×640 三路、四路完整可見＋safe exit；正式 F 仍待 Cowork。 |
| R6 state exact | copy checker 由保留的 Hub source 機械擷取 P／F／U 並對兩頁 constants 與 renderer 比對；99 PASS。客服沿 Rich Menu ⑥ exact message「書僮客服」，不附問題／trace；測試僅 mock，未傳送真 LINE 訊息。LINE 外／送訊失敗保留 R6-F 指引與返回，未造新 TA 文案。 |
| R7 gate／數量字 | log:588、:605；同一 fupanEligible 決定 action／比較欄／三或兩字；Worker:74 fupan false 經 /history 給兩頁。index:1967 舊 banner 先驗相同 live truth。false／undefined／count<3 均無欄／佔位；test-only true/count=3 才顯示複盤。 |
| R8 composition／length／summary | log:671、:676；只非空回答加 exact 題目標籤，500 JS chars／4096 bytes，禁截斷；數字 counter。index:2040 最後 entry 首個非空回答；列表 CSS 兩行 question／一行 summary。三問單題、全空、超限、cancel 零寫入、summary 排除 stamp／delimiter 測試 PASS。 |

R9 的 current owning-store／execution 判定由 Hub 附件供給；本席未重新操作 Make/Airtable。production source 唯一 `FUPAN_LIVE_PROVEN=false`。browser 的 four fixture 只覆寫測試 API response，未翻 production gate。

### 12.3 Card A–G 與 persistence truth

| 驗收 | 本輪結果 |
|---|---|
| A1–A5 | **LOCAL PASS**；R2 suite 真 renderer＋來源矩陣、owned unique count、read_error 不當 empty。 |
| B1–B3 | **PASS**；99 byte checks，card／Hub SHA、渲染字串、您→你突變負例、價格／禁詞均檢查；未修改舊測試。 |
| C1–C4 | **SYNTHETIC PASS**；真 Worker.fetch 串 mock owning store；synthetic log id `rec12345678901234`，非真 Airtable record。POST → trace-only PATCH → Worker GET → 前端 GET → 真 renderer 的已存 trace。連續兩 UUID、重送不追加、舊字句不冒充新段、六原欄及 golden seal 原值不變。真測試戶／已部署 readback NOT_RUN，不能用 UI screenshot 或 fixture 代替。 |
| D1–D2 | **LOCAL PASS**；表單／成功／失敗／不明／deep pending/error 有 Primary＋safe exit；選路區回②、列表回首頁；新事只帶 action=divine。 |
| E1 | **PASS 59/59**；另 R2/E1 read_error→等待→exact correlation 負例 PASS。 |
| E2 Node | **PASS**，各計數見下表。 |
| E2 shell | **FAIL（3 支各 1 FAIL 與固定 HEAD 完全同結果）**；005A 16/16。非 blanket green；exact drift 留交 Hub。 |
| E3 | **PASS**；git diff --check；獨立 untracked whitespace／source syntax／changed-path containment；index/log 寫前後均 LF，無 git add。 |
| F1–F2 | **PENDING_COWORK_PM**；writer browser supporting check 見 §12.5，未自代正式合成像素取樣或 PM acceptance。 |
| G1–G5 | **PENDING_OWNER**；未做 Owner 手機 UAT，未指示現在就操作尚未部署版本。 |

### 12.4 實際測試結果與舊測試衝突

所有 Node 命令在本 worktree 執行；以下 PASS 的 exit code 均 0。

| 命令（tests/ 下） | 結果 |
|---|---|
| node test_r2_delayed_return_v1_0.mjs | R2 PASS=64 FAIL=0；SYNTHETIC_VM_AND_MOCK_STORE_ONLY |
| node check_r2_copy_bytes.mjs | COPY_BYTE_PASS=99；CARD_SHA／HUB_SOURCE_SHA／RENDERED_COPY／NEGATIVE_CONTROL=PASS |
| node test_mingge_v12_rc1_product_loop_v1_0.mjs | PASS=59 FAIL=0 |
| node test_rm03_intent_split_v1_0.mjs | PASS=22 FAIL=0 |
| node test_rm03_artifact_data_wiring_v1_0.mjs | PASS=76 FAIL=0 |
| node test_gift_claim_truth_v1_0.mjs | PASS=27 FAIL=0 |
| node test_r1_divination_guidance_v1_0.mjs | PASS=29 FAIL=0 |
| node test_r1_press_release_behavior_v1_0.mjs | PASS=9 FAIL=0 |
| node test_security_fail_closed_v1_0.mjs | PASS=26 FAIL=0 |

Shell 首次在 sandbox 找不到 dirname／grep；該輸出為工具失敗，不採為 code 結果。經自動核准後以 Codex 的 unrestricted exec＋已安裝 Git Bash 重跑，**不是 Claude Code 執行，也不宣稱其補跑已完成**。命令為 PowerShell 設定本 process PATH 包含 `C:\Program Files\Git\usr\bin` 與 `...\bin`，再 `& 'C:\Program Files\Git\bin\bash.exe' tests/<name>.sh`。所有測試只用本機 fake token/mock；zero-quota 腳本的固定「API 驗證」echo 不代表本輪有 Make live 驗證。

| Shell | Working tree | 固定 HEAD baseline | exact drift／處置 |
|---|---|---|---|
| test_zero_quota_gate.sh | 12 PASS / 1 FAIL；exit 1 | 12 / 1；exit 1 | line 87 的「149 卡 M-092 A 案缺失或錯字」。未改 Offer。 |
| test_e086_checkout_mock_v1_0.sh | 15 PASS / 1 FAIL；exit 1 | 15 / 1；exit 1 | line 18 的 fail-honest copy count 需 3；同一 baseline drift。其 9-case plan matrix 與 worker matrix 均 PASS。 |
| test_lettertail_taskB.sh | 8 PASS / 1 FAIL；exit 1 | 8 / 1；exit 1 | line 49 的「跳轉目標不符或缺失」，旧 exact action=pay 字串與現役 src=deepdive 不合；未改測試。 |
| test_mingge_showcase_005a.sh | 16 PASS / 0 FAIL；exit 0 | 本輪無需追加 baseline | 現在全 PASS；不沿用卡載舊 4 FAIL 數字。 |
| test_e25_stamp_v1_0.sh（extra） | 28 PASS / 20 FAIL；exit 1 | 42 PASS / 6 FAIL；exit 1 | 6 個既存 UI failure：5 個舊金印文案 unique count＋V3 extractLet miss: stampState；新增 14 個 Worker 舊契約 failure，詳下。 |

Baseline 重現方法：逐檔 `git show HEAD:<path>` 保留 bytes 到單獨臨時 fixture root；同一原始 shell、同一 Node/Git Bash 跑 index/log/worker/pay-success/pay-failure 及指定測試依賴，沒有 git checkout／reset 原 worktree，也未修改 expected。

E25 新增 14 FAIL 明細：case1（200、traced=true、PATCH trace_text exact overwrite、trace_at）4 項；case2（403）；case4b（500 chars=200）；case13（no key=503）；case16（missing=404）；case17/18/19（GET network/status/JSON=502）；case20/21（PATCH network/status=502）；case22（non-divination=404）。舊 valid fixture 均未送必填 request_id，會先得到 400；並且 overwrite expectation、PATCH 後一律 502 與 Hub R1/R2 的 append／unconfirmed 契約直接衝突。新 R2 suite 使用 UUID 重驗 owner、entry type、limits、GET failure、post-PATCH uncertainty 等行為，全 PASS。依核稿交 Hub 決定 E25 廢止／升版，**本席不弱化舊測試或用舊契約改回 overwrite**。

### 12.5 Writer browser supporting check（非正式 F）

使用 browser skill、Codex in-app browser，loopback `127.0.0.1:41732`。harness 在記憶體讀實際 log.html，僅以 synthetic LIFF／API 取代外部連線，CSP connect-src self；未更改正式頁面或使用真帳戶。固定 380×640；完整合成原解讀（14 行）、舊 trace、escaped completed 結果在動作區之前。

| 已量測項目 | 證據 |
|---|---|
| three（production gate=false） | document.activeElement=delayedActions；三路 y=210.59–458.37；safe exit y=466.37–506.66，全部在 640 內；無水平 overflow；comparison open=false。 |
| four（test-only gate=true） | 四路 y=124.09–488.76；safe exit y=496.76–537.05，全部可见；comparison open=false。可見 screenshot 已檢查，沒有截斷 action text。 |
| 字級／行距 | actions 及比較卡主要 p/button/a computed font=17px、line=32.3px（1.9）；text color rgb(44,62,45)。**這是 computed style supporting evidence，不冒充 F1 合成像素對比量測。** |
| 真 UI 操作 | 展開比較卡→「事情有變了」→只填第二題→counter 23/500、Primary enabled→先不記回動作區；未 POST。 |
| first | context=first_completion：actions=0、details=0、textarea=0，僅既有完成文案、原卦與回首頁。 |
| read_error | 502 synthetic：只有 exact read_error、再試一次、回首頁；沒有四路／empty 誤報。 |

browser viewport 已 reset、agent-created tab 已關閉；loopback harness 已停止。正式 F 由 Cowork PM 按 BK15/BK16 的像素方法及實際畫面再驗；Owner G 等正式準備完成後執行。

### 12.6 Containment／hash／handoff

保存完成／recovery／120秒 poll 區間（index 的 `function normalizedTimestampMs` 到 `/* LIFF 初始化`）與 HEAD **byte 相同**，SHA-256 `abe6d8c1d4e65f03dae91d2db3302dd42f431f557f179aa53b511b8a8f0dd2d3`。build id／first URL／既有完成文案續由 E1 實驗證。沒有碰原卦演算法、payment/Offer、Make、Dify、Rich Menu 檔、wrangler 或資料 schema。

| resulting file | SHA-256 |
|---|---|
| index.html | b87375161a6607eebc0f40313554d3627ddc8fa911817d5f3ec20a9b1c7b599c |
| log.html | d60afae14a08873e02ceacdd25227971aaa626ef98fe890b8547a657c78e0dba |
| workers/mingge-relay/worker.js | 3aa732284fe7670910c3b11d4ac6439ac564b8515d96bf13c26b9497e53b69f3 |
| tests/test_r2_delayed_return_v1_0.mjs | f23a13e5021a759c3927d439a6b73552b3678ffa5f9a0b390bc1a470151e8edb |
| tests/check_r2_copy_bytes.mjs | 28b8cd504bfd778609b274ca89230784fa24dc71f7c51fc244ea24a95cc713e0 |

Reproducible defect：本 slice 本機新增路徑未留已知未修 defect；跨裝置後寫覆蓋為 §6.3 **KNOWN_RESIDUAL**；E2 baseline 3 FAIL／E25 20 FAIL 如 §12.4，不能報全綠。晚到深卜回應覆盖三問已修正並有回歸。總 trace field 容量未另臆造；Airtable 寫入被拒時走不明態，絕不截舊紀錄。

**交回 Hub 的 bounded action**：審 exact resulting files＋本 evidence，處置 E25 舊契約衝突與 baseline drift；Cowork PM 接 F；Owner G／代表 TA replay 尚未執行。沒有 Hub 收件證據，不宣稱已送達。送件依 Perth 轉貼通道，不尋找 Hub URL、不新建對話、不派 successor。後續上線／real-record readback 需要正式放行與指定 runtime／測試戶；本卡保留 **未 commit／未 push／未 deploy**。

Terminal：**LOCAL_IMPLEMENTATION_COMPLETE / HUB_RETURN_READY / ACCEPTANCE_NOT_CLOSED**。

## 13. Hub 蓋章／E25 廢止／同 worktree 單 commit

2026-09-03，Perth 本次明示：「Hub 蓋章 recs3nBslhXrd3nRM；E25 廢止移 archive；同 worktree 單 commit，不 push。」這是本次直接施工與 commit 授權；Hub record reference 由使用者提供，本席未另讀 Airtable record，不推定該列包含其他授權。

- §12「待 Hub 收件／處置 E25／未 commit」屬前輪 terminal snapshot；本節覆蓋這三項。其他 baseline drift、KNOWN_RESIDUAL、正式 F 待 Cowork、G 待 Owner、live readback NOT_RUN 仍照實保留；Hub 蓋章不代替尚未執行的驗收。
- 廢止 `tests/test_e25_stamp_v1_0.sh`，原檔移至 `tests/archive/test_e25_stamp_v1_0.sh`；SHA-256 前後均為 `9e0e92cce6489739187c49a62ebae49bc8faef6814fa6bc563230aeb768ddb03`。`tests/archive/README.md` 明記不屬現役測試集及原相對路徑僅歷史留存。
- 現役替代為 R2 行為與 copy checker；沒有修改 E25 assertions 取綠，也沒有更動 runtime 實作。現行 `.github` workflows 無 E25 呼叫，不需改 CI。
- 同一 worktree `D:\CBD_Lab_OS\001_mingge\worktrees\mingge-r2-delayed-return-plan-20260903`，parent 固定為 `f2bafbcbd1607b1595560ba1e6a4e07dc251a80e`；原 §12 的 8 個 changed paths 加上 E25 archive rename 與 archive README，打包為單一 local commit；逐檔 staging，不用 `git add -A`。
- Commit 前確認：R2 64/64、copy 99、E1 59/59；archive 與 parent E25 byte parity；runtime/test hashes 與 §12.6 相符；`git diff --check`／staged containment。Commit 後以 `git log -1`／`git status --short`／`git rev-list --count <parent>..HEAD` 回報唯一 commit 與 clean worktree。
- Commit message：`feat: add R2 delayed return and archive retired E25 test`；body 留 `Hub: recs3nBslhXrd3nRM`。commit SHA 以 Git 記錄與本次 final 回報為準，避免在同一 commit 內自引用尚未產生的 hash。
- Lifecycle 邊界：只新增本機 commit；**不 push／不 deploy**，不執行真資料寫入、不觸碰其他 checkout、不派 successor。
