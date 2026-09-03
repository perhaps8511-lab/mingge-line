# DISPATCH｜Mingge RC1 Slice A ── ②「我的卦記」delayed-return state-first（successor execution）

```yaml
mode: PRODUCT_BUILD_AFTER_OWNER_ADOPTION（承 DISPATCH_MINGGE_V1_2_RC1_AFTER_ADOPTION_20260828 Slice A 第 5 項「延後回訪才顯示四路分流」；不另立 WP／治理卡）
project: Mingge
repo: perhaps8511-lab/mingge-line（GitHub Pages live: https://perhaps8511-lab.github.io/mingge-line/）
copy_source: MINGGE_CORE_TA_COPY_AND_CONTENT_ENRICHMENT_v0_2_20260902.md
copy_source_sha256: 3f29582c40fb1f6b13e2c3000dd9ad7cc380a88547d0816dbbc554cc26d8586c
adoption_anchor: Change_Log recfmGJLEFdsmCsUL（appt1DnAJo5lQmLIk / tblNiIhr9XGED4TBK，2026-09-03）
product_basis: MINGGE-PRODUCT-BASIS-PACK-v1_2-RC1-20260828（D-P02／D-J03／D-U04／R2-06／C-12）
entry_seat: Codex（bounded engineering slice）——理由：四路分流／比較卡／補記三問皆為前端 component 變更（index.html #page-log／log.html），非 Cowork 可免碼完成；Worker 若需新增 route 亦在此卡內
dispatcher: Claude Chat（hub）
first_priority: ② delayed-return 一個 slice；②完成＋runtime readback 後先 3–5 次 TA replay，PASS 才接④⑤（不一次施工全部內容）
payment_provider: NOT_SELECTED（real checkout EXCLUDED；深卜／複盤付款仍走既有 fail-honest 整備態）
```

---

## 0｜Hub fresh-read 結果（2026-09-03；工地開工第 0 步仍須 git pull 自抓 live 再核一次）

| 項 | 現況（來源） | 對本 slice 的意義 |
|---|---|---|
| ② 入口 | `index.html?action=log`（`pageMap.log='page-log'`；`initLogPage` 讀 relay `/history` 列表＋餘額） | 列表卡在 index.html #page-log；單則在 log.html |
| 保存完成 state | 已落地（build `20260829-save-complete-mobile-recovery-r1`；`.save-complete` 含 exact「已收進「我的卦記」」「事情有了變化，再回來補記就好。」「看這一卦」「回首頁」；`waitForPersistedLog`／`recoverInflightSave`；sessionStorage `mg_inflight_session_id`） | first_completion 已存在；本卡只做 delayed_return，且**保存完成的「看這一卦」不得落進四路分流** |
| 單則卦記 | log.html（既有：原始卦／信箋、四鏡·深卜 CTA `buildDeepdiveCtaHtml`、`handleDeepdiveClick` 非訂閱→`action=pay&src=deepdive`） | 四路分流與比較卡加在 log.html（或 index.html #page-log 詳情區，依現有結構擇一） |
| 補記後續 data truth | `Divination_Log.trace_text`（multilineText，E25「卦記蓋印(補後續)」，Worker `POST /trace` 伺服端寫入）＋ `trace_at`；`golden_seal`／`golden_seal_time`（`POST /log/seal`） | 「事情有變了」寫 trace_text；**不得覆蓋既有 trace_text**（append，帶時間戳分隔）；原始卦欄位零改動 |
| 深卜 data truth | `Divination_Log.deep_read_state`（pending／completed／failed）、`deep_read_output_json`、`deep_read_request_id`（idempotent）；deepdive chain 5468020 非同步 push | 「想把這一卦看深」：completed → 顯示結果（同卦記內）；未建立且未 entitled → 既有 `src=deepdive` 導 ③ fail-honest；不重新起卦 |
| 複盤 data truth | `Fupan_Reviews`（holder_id、state、`source_gua_record_ids` ≥3、offer_version=v1.2）；複盤鏈 5500272 是否 live 未在本場核實 | 「想回看這一路」：**只在 owned `entry_type=divination` ≥3 且複盤 runtime live 時顯示**；否則整路隱藏（Offer Copy Master §7：複盤未 live 不得公開） |
| 六格 label | `plans/mingge_showcase_005a_rich_menu_mapping_v1_0.json` 已符 RC1（test G-07 PASS） | 不動 |
| 凍結鏈 | Make 5202754 解卦鏈 🔴 零觸碰 | 本卡不碰 Make／Dify；Worker 只在必要時加 `/trace` append 語意 |

已知 pre-existing drift（非本卡回歸，勿修）：`test_lettertail_taskB.sh` 1 FAIL（log.html 跳轉字串）、`test_mingge_showcase_005a.sh` 4 FAIL（`sendAskLaoyiIntent`）——STATUS_BOARD 2026-08-20 已判 baseline drift。

---

## 1｜三件套

### 1.1 目標／動機
TA 隔一段時間回到「我的卦記」某一筆時，第一屏先問「這次回來，想做什麼？」再分四路；讓熟齡 TA 不經提示能分辨「後續／深卜／複盤」（R2-06、Closed Loop Audit C3）。剛保存完成（first_completion）不進此分流（D-P02、C-12）。

### 1.2 封閉驗收集（全部 PASS 才交回 Hub 蓋章）

**A｜state 分流（deterministic test，新增 `tests/test_r2_delayed_return_v1_0.mjs`，vm 實跑非字串比對）**
- A1 開單則卦記時，`gua_view_context` 由「來源」決定：來自保存完成的「看這一卦」（同一 `mg_inflight_session_id` 或 URL 明確 `ctx=first`）→ `first_completion`；來自 ② 列表／Rich Menu／延後回訪 → `delayed_return`。
- A2 `first_completion` 畫面：**不出現**四路選單、比較卡、補記三問；只給「看這一卦（已在此）」與「回首頁」語意（沿 D-U03）。
- A3 `delayed_return` 畫面：先原始卦＋既有紀錄（含已存在的 trace_text／deep_read 結果），再顯示 exact 四路（§2）。
- A4 四路顯示條件：事情有變了＝always；想把這一卦看深＝（deep_read_state=completed → 顯示結果）｜（未建立 → 顯示，點擊走既有 `src=deepdive` 路徑，不新增付款）；想回看這一路＝owned divination ≥3 **且** fupan runtime live，否則整項不渲染；問另一件新的事＝always → ①。
- A5 read_error ≠ empty：`/history` 或單則讀取失敗 → §2.4 read_error 文案，不得渲染四路、不得顯示「沒有卦記」。

**B｜exact copy（byte 比對；新增 `tests/check_r2_copy_bytes.mjs`，從本卡 §2 逐字擷取，禁手打）**
- B1 §2.1／2.2／2.3／2.4 全部 byte-exact；`您` 不得改成 `你`。
- B2 比較卡三欄逐字；「複盤」欄與四路第三項同步隱藏（fupan 未 live 時整欄不渲染，不留空格子）。
- B3 四路畫面與比較卡不得出現：價格數字、`龍運藏`、`靜坐`、`靜心`、`氣功`、`商品`、`半年方案`（N-16／G-08）。

**C｜補記後續 persistence／readback（假 token headless）**
- C1 「記下來」→ `POST /trace`（既有 route）→ Worker append 至 `trace_text`（既有內容保留，新增段落以 `\n---\n{ISO8601 +08:00}\n` 分隔）＋更新 `trace_at`；原始欄位（question_text／ben_gua／bian_gua／dong_yao／output_json／qigua_time）byte 不變。
- C2 成功判定必須 readback（GET 該筆後 trace_text 含剛送出文字）才顯示「已記在這一卦後面。」；write OK 但 readback 未見 → 顯示 §2.3 失敗態，不得顯示已記。
- C3 三問非必填，任一句非空即可送；三句皆空 → 按鈕不可用。
- C4 「先不記」→ 回這一卦（同頁 delayed_return 首屏），不寫任何資料。

**D｜safe return／contextual**
- D1 每屏一個 Primary＋safe exit；四路首屏 safe exit＝「回卦記」→ ② 列表；列表 safe exit＝「回首頁」（既有 liff close／Rich Menu）。
- D2 問另一件新的事 → `?action=divine`（或現有 ① 入口）；不預填、不帶舊所問。

**E｜回歸不退版**
- E1 `node tests/test_mingge_v12_rc1_product_loop_v1_0.mjs` 全 PASS（保存完成 state 不被觸碰）。
- E2 `node tests/test_rm03_intent_split_v1_0.mjs`、`test_rm03_artifact_data_wiring_v1_0.mjs`、`test_gift_claim_truth_v1_0.mjs`、`test_r1_*` 全 PASS；shell 四支：Codex sandbox B1 則由 Claude Code unrestricted shell 補跑，不得宣稱 PASS。
- E3 `git diff --check` PASS；CRLF：動 index.html／log.html 前先正規化，**禁 `git add -A`**。

**F｜熟齡可用性（第四道閘，Cowork PM 真實瀏覽器量測；不得轉嫁 Owner UAT）**
- F1 四路按鈕與比較卡主要文字 computed font-size ≥17px、line-height ≥1.9；對比以合成像素取樣（沿 BK15/BK16 v3.0 方法），≥4.5:1。
- F2 380px 寬：四路首屏無捲動即可見全部四路＋safe exit；比較卡預設收合。

**G｜📱 Owner 手機 UAT（三道之三；只讀，不改）**
- G1 新問一卦→保存→「看這一卦」：**看不到**四路選單。
- G2 關閉、隔天（或改開 ② 列表）再開同一卦：看到「這次回來，想做什麼？」四路。
- G3 點「事情有變了」→ 填一句 → 記下來 → 回到卦記看得到那一筆，且原卦文字未變。
- G4 「這三個差在哪？」展開能用自己的話說出三者差別。
- G5 fupan 未 live 時，四路只有三路，且不覺得少了什麼。

### 1.3 回報格式（Owner 指定；缺一項＝未完成）
```
exact touched runtime/screen：{檔名:行號範圍 / Worker route / 部署版本 id}
current → resulting TA flow：{一行前 → 一行後}
persistence/readback truth：{trace_text append 的 record id、readback 證據、first/delayed 判定依據}
acceptance result：A/B/C/D/E/F 逐項 PASS/FAIL＋測試檔與輸出；G 待 Owner
reproducible defect：{有：重現步驟／無：NONE}
Product Continuation Gate：見 §4
```
回報載體：STATUS_BOARD 一行（狀態＋證據）＋ ≤15 行摘要；未 commit／未 push／未 deploy 逐一明列。

---

## 2｜exact copy（逐字自 v0.2；Codex 只貼不寫）

### 2.1 延後回訪首屏（`SOURCE-BOUND｜RC1 D-U04 ＋ Copy Master §4`）
```text
這次回來，想做什麼？

- 事情有變了        補記事情後來的變化。
- 想把這一卦看深    從四個角度再看同一件事。
- 想回看這一路      把多筆卦記與後續放在一起；符合條件才顯示。
- 問另一件新的事    回到向天問卦。
```
safe exit label（PROPOSAL，v0.2 §5.4／§8.5 慣用字）：`回卦記`

### 2.2 「這三個差在哪？」比較卡（v0.2 §5.2；預設收合；不列價）
```text
補記後續
什麼時候用：事情有了新變化，或您已經做了決定
做什麼：把後來發生的事、您的決定、現在的卡點，記在原卦後面
不做什麼：不重新起卦；不改寫當時的原始卦
按鈕：事情有變了

四鏡・深卜
什麼時候用：已經問過一卦，還想知道其中的內在變化、相反角度與事情所在的階段
做什麼：不重新起卦，從互卦、綜卦、錯卦、序卦再看同一件事；結果留在原來的卦記裡
不做什麼：不重新起卦；不改寫原來的答案；不處理另一件事
按鈕：想把這一卦看深

複盤（fupan runtime live 才渲染）
什麼時候用：已經留下至少三筆卦記，想知道自己這一路怎麼走過來
做什麼：把至少三筆卦記與後續放在一起，整理事情如何演變、哪些選擇反覆出現
不做什麼：不重新起卦；不是把舊答案再說一次；不替您決定下一步
按鈕：想回看這一路

三個都不是新的一卦。想問另一件事，請回「向天問卦」。
```

### 2.3 補記後續（v0.2 §5.3）
```text
【標題】 事情有變了——補記一筆

後來發生什麼？
您做了什麼決定？
現在最卡的是什麼？

這一筆留在原卦後面，不會改寫當時的原始卦。

【Primary】 記下來
【Safe exit】先不記      → 回這一卦

【成功（readback PASS 後）】 已記在這一卦後面。   【CTA】回這一卦
【失敗（write 或 readback FAIL）】 這一筆還沒記進去。剛才沒有保存成功，原卦沒有變。   【Primary】再試一次   【Safe exit】先不記
```

### 2.4 ② empty／read_error（v0.2 §5.5）
```text
【empty｜真的沒有卦記】
您還沒有卦記。有一件掛心的事，就從「向天問卦」開始。
[ 向天問卦 ] [ 回首頁 ]

【read_error｜讀不到】
目前讀取失敗，不代表卦記不存在。請稍後再試。
[ 再試一次 ] [ 回首頁 ]
```

### 2.5 卦記列表卡（v0.2 §5.4；若既有列表已含同義四項可不動，只補「還沒有後續」）
```text
{所問摘要｜最多 2 行}
原始日期：{YYYY-MM-DD}
最近一次後續：{YYYY-MM-DD}｜{一句摘要}     ← 無後續時顯示：還沒有後續
[ 看這一卦 ]
```

---

## 3｜🔴 邊界

- 禁：Make 5202754／5468020／5500272 任何變更；Dify；LINE console；Rich Menu；Offer 文字與價格；六格 label；保存完成 state 文字；§2 之外任何 TA 可見字（新增字＝停手回 Hub）。
- 禁：把 first_completion 與 delayed_return 送同一首屏（C-12）；四路首屏或比較卡出現 upsell／商品／龍運藏／靜坐（N-16、G-08）。
- 禁：以前端 sessionStorage／localStorage 推定「已記錄」——只認 readback。
- 禁：git push／deploy／刪除（Perth 放行）；`git add -A`（CRLF）。
- N13／N16 文案與本卡無關，不得順手帶入。
- 卡住三分類：B1 工具限制／B2 缺憑證（relay 假 token 環境、Airtable 測試戶）／B3 需拍板（例：fupan runtime live 與否無法判定 → 隱藏處理並 ESCALATED，不猜）。
- 停手條件：runtime persistence truth 不明卻先寫 CTA；既有 UAT PASS 被 touched code regression；發現 trace_text 為單值且 Worker 不支援 append → 停手回報（B3），不得改成覆蓋。

---

## 4｜Product Continuation Gate（②終端後直接做，不停在「Slice A 完成」）

```
② terminal（§1.3 回報齊）→ Hub 蓋章（T0／N-16／C-12／readback 證據）→ Change_Log NRE
→ Owner 📱 UAT G1–G5 → 3–5 位代表 TA replay（Closed Loop Audit §9 任務 2、3）
   PASS 判準：不經提示說出四路差別；核心任務 ≤3 步；每任務最多一次回退；不覺得被 upsell
→ PASS → 起草下一張 successor：④ 易經書房（v0.2 §6 八篇＋D-U05）＋⑤ 問老易（v0.2 §7 入口／4 chips／engine handoff canonical）
→ FAIL → 變更單新卡回 ②，永不改工人手上的圖
```
下一張卡由 Hub 起草、標「待放行」；工地不預研④⑤。

---

## 5｜一句話開工指令（Perth 唯一搬運物）
「Codex：讀 SITE_DOSSIER → CHANGELOG → STATUS_BOARD → 本卡；git pull；先寫 governance/plans/plan_r2_delayed_return_v0_1.md（含 first/delayed 判定與 trace append 設計）交 Hub 核，過審再施工。未 commit／未 push。」

*— Slice A ②｜介面謙卑於源頭 · 只認 readback · 剛保存不分流 —*
