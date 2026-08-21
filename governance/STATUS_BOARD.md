# STATUS_BOARD ── 試車報表(Vehicle Table)

> 每站(邊)一行 🟢🟡🔴 + 證據(execution id / commit / 測試時間)。
> 本檔為留痕用途,非生成物(sitegov 卡完整版之後由 scripts/gen_manifest.mjs 讀 Airtable 生成 MANIFEST.md;
> 本檔本身在 sitegov Task 1 全件完成前先手動維護)。

---

## 留痕註記(本次提前理由)

- 2026-07-07:Task 1 最小件提前於卡序執行。理由:需要落點記錄 routeB_fix 狀態,避免證據流失。
  sitegov 卡其餘任務(Task 1 剩餘/Task 2 Stop Hook/Task 3 試車骨架/Task 4 晨報)仍照卡序排第 3,
  待 lettertail_cta 卡完成後才續做。

---

## 站台清單

| 站(邊) | 狀態 | 證據 | 備註 |
|---|---|---|---|
| routeB_fix ── 歸零路修復(Task 0→A→B→C→D) | 🟢 真機驗證通過 | commits: 0071a64(Worker live→repo同步)/103fd93(402標準化+態B門)/91cd8a7(試車腳本)/4be5a71(wrangler.toml)已 push 至 origin/main;Worker mingge-relay 部署版本 01aab5ba-c2de-4a7d-93fe-5d2aded890c7;測試結果 9/9 PASS | 工地管理員(本 session)於 2026-07-07 逐項驗證 origin/main 三樣證據:①`workers/mingge-relay/worker.js` 第453-454行 `readQuotaGate()` + `{gate:"zero_quota",credits:0,next:"door_149"}` 402 body ✅ ②`index.html` 第355/360/1116行 `.gate-door` CSS + `<a ...class="gate-door">問一卦 149</a>` 連結 ✅ ③`tests/test_zero_quota_gate.sh` 存在,內含段①DOM驗證/段②402 body驗證/段③Route B文案驗證,腳本自報 9 PASS / 0 FAIL,與 Perth 回報一致 ✅。三樣齊,routeB_fix 收口。 |
| lettertail_cta ── 信箋尾深卜門(任務B) | 🟡 施工完成,待 Perth 放行 push | commit c48349f(本機,未 push);tests/test_lettertail_taskB.sh 9/9 PASS | 任務B(log.html 深卜CTA曝光補強 + index.html 複盤banner gated-ii revert)已完工:①`buildDeepdiveCtaHtml` 按鈕文案全tier統一「四鏡·深卜200」②`.deepen-section`/`.deepen-btn` CSS 升級為信箋卡同視覺重量(沿用`--ink`/`--gold`)③`handleDeepdiveClick` 新增非訂閱`purchase`分支,定案文案「深讀之門設在書房，這就帶你過去。」1.2秒後導向`action=pay`④`buildFupanBannerHtml` 非subscriber一律回傳空字串。plan 已由 chat 設計師核章 APPROVED(附修訂一TA文案更正、修訂二補驗收斷言7)。 |
| lettertail_cta ── 信箋尾深卜門(任務A) | ⬜ 分工移交,不歸本 session | — | Perth 裁定:任務A(Make scenario 5202754 信箋尾增量)改由 chat 設計師 MCP 代打,本 Cowork session 不做、不碰、不等它。 |
| sitegov_lead ── 工地制+主理人自動化 | 🟡 部分開工(Task 1 最小件) | governance/STATUS_BOARD.md(本檔)已建 | 卡序第 3。Task 1 剩餘(MANIFEST.md 生成腳本)、Task 2(Stop Hook 加牙)、Task 3(試車骨架)、Task 4(晨報,chat 端代打)待 lettertail_cta 完工後續做。 |
| E56 老易學習中心(格5兩態LIFF問答+relay直連+單向帶話+字級一致) | 🟢 後端已通,main 已 push,待 Perth 體感閘真機+rate limit | commit 4f12b1a 已 push 至 origin/main;feature/e56-laoyi-center 與 origin 同步;plans/plan_e56_laoyi_center_v0_1.md(Codex 模式A r1-r4 APPROVED + Perth #6/#17/#13 拍板 + 模式B codeB r1-r3 APPROVED);tests/test_e56_laoyi_center_v1_0.sh 42/42 PASS(本 session 重跑覆核) | Claude Code(本 session)依卡 001_taskcard_e56_laoyi_center_S20260721_v1_1 施工:C1 index.html #page-about 重寫為門廳/問答室兩態(S1-S7逐字話術)+書房「拿這篇問老易」改走 content_id deep link;C2 worker.js 新增 POST /laoyi/chat(LINE token驗證→Dify app-gQwG4 blocking,timeout+回應驗證+stateless);C3 常駐「店務找書僮」入口+確認預覽+liff.sendMessages原句交接;C4 #page-log副標字級補17px。施工中發現並修正 CSS 顯隱死碼(codeB r2 blocker,`.laoyi-view{display:none}`與`.laoyi-room{display:flex}`同特異度互蓋)。真機驗證(本機static server+Browser自動化,`action=ask`不觸發LIFF OAuth重導)七項通過。**2026-07-21 backend-first 順序收官**:`wrangler deploy` mingge-relay Version `3761da34-fc5c-4b48-9344-148cc5725169`(rollback 點:前版 `cadf198f-8455-4310-9cd1-abd95758f763`);中樞 9-case 直打 Dify 紅線回歸(Make 5720382)全數正確落表;Perth 貼 `DIFY_LAOYI_KEY` 完成,`wrangler secret list` 確認落地;main push 完成,index 老易面連同已通的後端一併上 live。**待辦**:Perth 真機體感閘(含刁鑽 CJK,順便驗 relay 整合)→ Cloudflare Rate Limiting Rule(上線前硬閘,Perth 已拍板未設)→ 翻🟢。QA test-auth bypass:中樞裁定「不動」,等 Perth 明確放行才動工(方案已備於 chat 回報,未落 code)。 |

---

## 紅燈邊清單

- 無

## DoD 距離(未完項數)

- routeB_fix:0 項(已收口 🟢)
- lettertail_cta:任務B 0 項(完工,待 push);任務A 不計入本 session DoD(已移交 chat 設計師);任務C(headless驗收)待補
- sitegov_lead:Task 1 剩餘 + Task 2 + Task 3 + Task 4,共 4 大項未完成(卡序第 3)
- E56 老易學習中心:施工+雙模式互審(Codex模式A/B)+headless驗收皆完工,待 Perth push 放行 + 貼 DIFY_LAOYI_KEY(B2)+ Cloudflare Rate Limiting Rule(上線前硬閘)

## 更新紀錄

- 2026-07-07:routeB_fix 由「✅完工待deploy」升級為「🟢真機驗證通過」── 三樣證據(worker.js/index.html/tests/test_zero_quota_gate.sh)已於 origin/main 逐項核實,與 Perth 回報 9/9 PASS 一致。
- 2026-07-07:**入口變更:Claude Code → Cowork,S150**。lettertail_cta 卡由 chat 設計師直裁核定,執行入口改為本 Cowork session(非 Claude Code CLI)。卡檔已存 governance/cards/,開始執行任務 A/B/C。
- 2026-07-07:**工地遷址**至乾淨 clone(`D:\mingge-line-clean`),舊夾封存唯讀。STATUS_BOARD 從舊夾複製延續。
- 2026-07-07:**任務A 分工移交**:Perth 裁定 Make scenario 5202754 改由 chat 設計師 MCP 代打,本 session 不做、不碰、不等它。
- 2026-07-07:**任務B 完工**,commit c48349f(本機,未 push),9/9 PASS,plan 設計師核章 APPROVED。
- 2026-07-21:**E56 老易學習中心施工完工**(入口:Claude Code CLI)。C1-C4 全數完成,Codex 模式A互審(plan)四輪+模式B互審(code)三輪皆 APPROVED,42/42 headless 測試通過,真機瀏覽器驗證七項通過。B1 記錄:本機 `codex-windows-sandbox-setup.exe` 缺件,Codex 自身讀檔自證工具在本環境不可用(內容互審不受影響,已改走貼文+stdin 管線繞過)。待 Perth push 放行。
- 2026-07-21:**backend-first 順序啟動**(中樞裁定,Perth 已同意)。Claude Code 重跑 42/42 覆核 PASS,`wrangler deploy` mingge-relay(Version `3761da34-fc5c-4b48-9344-148cc5725169`,前版 `cadf198f-8455-4310-9cd1-abd95758f763`),curl 驗 `/laoyi/chat` 路由存在(401,非 404)。main 仍領先 origin/main 1 commit未 push(依裁定順序,等 DIFY_LAOYI_KEY 貼鑰+中樞 9-case 紅線回歸過關後才 push main)。
- 2026-08-20 06:59 +08:00：WP-MINGGE-RM03-INTENT-SPLIT-01 A1-A4／R302-a-d／B1-B2／N-03／N-04／C1-C7 施工自驗 PASS（Codex；`node tests/test_rm03_intent_split_v1_0.mjs`，PASS=14 FAIL=0；證據 `index.html:681`, `index.html:686`, `index.html:706`, `index.html:1342`）。
- 2026-08-20 06:59 +08:00：WP-MINGGE-RM03-INTENT-SPLIT-01 六句 byte-master 逐字落地 6/6 PASS，但 canonical verifier 最末 `囊中銅錢` 全檔禁詞與 BK5 A 保留退費段互斥，總結果 1 FAIL（Codex；`node tests/check_rm03_copy_bytes.mjs index.html`；證據 `tests/check_rm03_copy_bytes.mjs:43`, `index.html:702`；B3 ESCALATED）。
- 2026-08-20 06:59 +08:00：WP-MINGGE-RM03-INTENT-SPLIT-01 C8 四支既有 shell 回歸 NOT_RUN（Codex；Git Bash 兩入口皆於測試啟動前 `CreateFileMapping ... Win32 error 5`，exit 256；B1 ESCALATED）。
- 2026-08-20 07:XX +08:00：WP-MINGGE-RM03-INTENT-SPLIT-01 C8 由 Claude Code 於 unrestricted shell 補跑（Codex sandbox 之 B1 於此環境不受影響）：`test_zero_quota_gate.sh` 13/13 PASS；`test_e086_checkout_mock_v1_0.sh`（含 AMD-02 L18 新斷言）25/25 PASS；`test_lettertail_taskB.sh` 8/9，唯一 FAIL（`log.html` 跳轉目標字串比對）與 `test_mingge_showcase_005a.sh` 4 FAIL（`sendAskLaoyiIntent` 相關），兩者皆已核對 `log.html` 與該函式區塊逐位元組與 `git show HEAD` 相同（未被本 WP 觸碰），判定為 baseline 既有、與本 WP 無關的 pre-existing drift，非本 WP 回歸（Claude Code）。
- 2026-08-20 07:XX +08:00：WP-MINGGE-RM03-INTENT-SPLIT-01 byte-verifier 1 FAIL 複核：`囊中銅錢` 全檔僅 2 處——`index.html:702`（退費段，BK5 A 裁定 byte-identical 保留）與 `index.html:1944`（`PAY_PLANS.planPack399.name` JS 常數，§3.2 明文禁動）；verifier 之「全檔禁詞」斷言未區分呈現層與受保護常數，屬 script 本身粒度不足，非本 WP 產生的新缺陷；6/6 句子逐字落地與全部 codepoint facts 皆 PASS（Claude Code 獨立複驗）。
- 2026-08-20 07:XX +08:00：WP-MINGGE-RM03-INTENT-SPLIT-01 機械 QA：兩支新增 Node 測試 syntax PASS、`git diff --check` PASS、AMD-02 僅 L18 diff 且原 L19 byte-equivalent PASS；未 commit／未 push／未 deploy（Codex）。
- 2026-08-20 07:09 +08:00：WP-MINGGE-RM03-INTENT-SPLIT-01 fresh-context review defect 已修正：offer click／Enter／Space 現會加入獨立 `.pc-status--activated` 可見強調態並聚焦既有 fail-honest 下一步；`node tests/test_rm03_intent_split_v1_0.mjs` 15/15 PASS（含新增 R302-c/R302-d behavior 斷言），byte-master 六句仍 6/6 exact（verifier 總結果仍僅既有 protected-region 粒度誤報 1 FAIL）；未 commit／未 push／未 deploy（Codex；證據 `index.html:521`, `index.html:1364`, `tests/test_rm03_intent_split_v1_0.mjs:22`）。
- 2026-08-20：WP-MINGGE-RM03-INTENT-SPLIT-01 v2.8 BK6–BK9 修正完成：返回鍵句 7／頁尾次要樣式、初訪免費卡還原、深卜 200 live bytes 還原、1490 卡粗體邊界修正；`test_rm03_intent_split_v1_0.mjs` 21/21 PASS，byte-master 6/6 落地 PASS（verifier 仍僅既有 BK5-A／protected constant 粒度誤報 1 FAIL）；未 commit／未 push／未 deploy（Codex）。
- 2026-08-20：WP-MINGGE-RM03-INTENT-SPLIT-01 第二輪 fresh-context 互審：BK6–BK9 本體全數 PASS，containment 第二道（`git diff origin/main -- index.html`，Claude Code 逐行核對）78 行全部可溯源；抓到卡 §2.2 R302-b 舊措辭與 §0.15 打架（卡文件本身，非程式碼缺陷）。Cowork 已同步 §2.2 措辭至 v2.9，並將 `check_rm03_copy_bytes.mjs` 升版 v2.0（七句＋399 分層檢查＋句6 去標籤比對＋BK7/8/9 還原斷言）內嵌卡 §0.10。Claude Code 從卡逐字擷取（非手打）覆蓋 `tests/check_rm03_copy_bytes.mjs`，`node tests/check_rm03_copy_bytes.mjs index.html` 獨立重跑 `ALL PASS`（A/B/C/D 四段共 30 項全過，含 BK7/BK8/BK9 還原檢查、399 分層檢查）；未 commit／未 push／未 deploy（Claude Code）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B G1 PASS——無 `artifactmock=1` 時保留 byte-master 句 5，mock 初始化只受新 flag 控制（Codex；`index.html:723`, `index.html:1384`；`test_rm03b_artifact_mock_v1_0.mjs`）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B G1b PASS——列表、詳情、mock checkout 頂端與每張商品卡皆使用 exact 全形線 badge（Codex；`index.html:725`, `index.html:730`, `index.html:1436`, `index.html:1487`, `index.html:1510`）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B G1c PASS——資料檔落 exact 防化石 `_warning`，render title 未寫入資料 title 欄（Codex；`data/artifacts_placeholder.json:2`）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B G2 PASS——獨立 `artifactCheckoutAllowed()` 只允許全 `VERIFIED`；本批 `PLACEHOLDER` 選購只呼叫既有 `openPayMock()`，成功／失敗 payload 動作隱藏（Codex；`index.html:1416`, `index.html:1481`）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B G3 PASS——`2nF8b4vJ` 以 `DELISTED` 留檔並在 render filter 排除（Codex；`data/artifacts_placeholder.json:35`, `index.html:1506`）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B D1 PASS——詳情頁五槽依卡片 exact 順序建立（Codex；`data/artifacts_placeholder.json:11`, `index.html:1414`）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B D2 PASS——五槽空值保留並顯示 exact `這一項尚未取得`（Codex；`index.html:1451`）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B D3 PASS——兩商品圖使用 ID 對應 `1080x0` 大圖來源，無 `800x0` thumbnail（Codex；`index.html:1421`）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B D4 PASS——artifact markup／render code／JSON 的八個 redline 詞皆零出現（Codex；`tests/test_rm03b_artifact_mock_v1_0.mjs:34`）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B D5 PASS——artifact markup／render code／JSON 的「獨一無二」零出現（Codex；`tests/test_rm03b_artifact_mock_v1_0.mjs:35`）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B P1 PASS——兩筆呈現資料皆為 `6000_14999`，artifact 呈現層無「入門系列」（Codex；`data/artifacts_placeholder.json:9`, `data/artifacts_placeholder.json:24`）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B P2 PASS——主力帶在列表與詳情均顯示 6 個月（Codex；`index.html:1459`, `index.html:1520`）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B P3 PASS——Pinkoi 值只標「示範價」；兩筆 `price_mingge_twd` 均為 null（Codex；`index.html:1456`, `data/artifacts_placeholder.json:8`, `data/artifacts_placeholder.json:23`）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B T1 PASS——`#payIntentMingge`／`#payIntentRelic` 皆明定 17px（Codex；`index.html:532`）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B T2 PASS——龍宮舍利分支主要文字繼承明定 17px（Codex；`index.html:532`）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B T3 PASS——`.pc-status` line-height 由 1.85 調為 1.9（Codex；`index.html:516`）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B T4 PASS——`#pay*Back` 未升為 17px，維持既有次要樣式（Codex；`tests/test_rm03b_artifact_mock_v1_0.mjs:44`）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B N-01／N-03 PASS——無卦象導 SKU；首屏仍零價格；既有 RM03 suite 21/21 PASS（Codex；`node tests/test_rm03b_artifact_mock_v1_0.mjs` 22/22；`node tests/test_rm03_intent_split_v1_0.mjs` 21/21）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B byte/protected regression PASS——byte-master verifier `ALL PASS`，E086 function matrix 9/9 PASS，inline script syntax與 `git diff --check` PASS（Codex）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B 指定 shell regression NOT_RUN／B1——兩支 Bash 均於腳本啟動前被 Windows sandbox `CreateFileMapping ... Win32 error 5` 擋下，exit 256；未宣稱 PASS，待 dispatcher unrestricted shell 補跑（Codex；`test_zero_quota_gate.sh`, `test_e086_checkout_mock_v1_0.sh`）。
- 2026-08-20 12:00 +08:00：WP-MINGGE-RM03B 防化石收官——`mock_copy_status: NON_CANONICAL_THROWAWAY`；真品上架須整檔捨棄重寫，不得沿用 mock 文案；未 commit／未 push／未 deploy（Codex；`governance/plans/WP-MINGGE-RM03B-ARTIFACT-MOCK_plan_v1_0.md`, `data/artifacts_placeholder.json:2`）。
- 2026-08-20：WP-MINGGE-RM03B review defect 修正——列表與詳情的 `6000_14999` 內部 price-band key 改以人類可讀標籤顯示為 `主力｜6 個月`，未改動資料 key（Codex）。
- 2026-08-20：WP-MINGGE-RM03B G1 persistence defect 修正——`isArtifactMockViewer()` 改為只讀當次 URL／`liff.state`，不再寫入或回讀 `sessionStorage`；新增 prior-match/no-flag regression（Codex）。
- 2026-08-20：WP-MINGGE-RM03B G1 persistence regression 補強——同一 VM context 先以 `?artifactmock=1` 驗證 true，再移除 flag 驗證 false；test-only，未改 production function（Codex）。
- 2026-08-20：WP-MINGGE-RM03C-RELIC-A11Y-01 落地——BK15 `.pay-back-link` 由 `--moss`/13px 改為 `--jade`/17px（對比 1.73:1 → 6.31:1，WCAG AA PASS）；BK16 新增 `#payRelicBranch p{font-size:17px;line-height:1.9;}` 使 BK10 之 17px 對句5真正生效（原被 `.lp-body p` 直接宣告勝出而失效）。純樣式，TA 文案零變動（byte-master `ALL PASS`）。新增回歸 `tests/test_bk15_bk16_relic_a11y_v1_0.mjs` 8/8 PASS，且對修復前版本 5 FAIL 反向驗證通過（Cowork PM；`index.html:534,554,556`）。
- 2026-08-20：治理方法論新增第四道閘——TA 可見面變更必須以真實瀏覽器 walkthrough 量測 computed style（字級/行高/對比）並確認語意無撞義；由 Cowork(PM) 執行，不得轉嫁為 Owner 手動 UAT。任何「提高字級／改顏色」類修補須附機械斷言證明生效（BK10 未附故默默失效）（Cowork PM；`governance/cards/WP-MINGGE-RM03C-RELIC-A11Y-01_record_v1_0.md` §五）。
- 2026-08-20：WP-MINGGE-RM03C v1.1 訂正（fresh-context 複核抓出，PM 像素取樣複驗成立）——① v1.0 宣稱之「`--jade` 6.31:1 AA PASS」為誤：`#070b07` 僅為 body/.cosmos 宣告值，`.cosmos .glow`/`.glow2` 疊加後實際合成像素為 `rgb(52,57,34)`，`--jade` 實測僅 **3.81:1 FAIL AA**；改用 `--rice-deep` = 9.54:1（渲染像素實測 12.42:1），Owner 於四個 token 中選定。② 測試 `BACKDROP` 硬寫錯值會永遠認證此失敗，升 v2.0 並加反陷阱斷言與 GLOW_GUARD。③ `#payRelicBranch p` 範圍過寬，誤中 `#artifactMockList`/`#artifactMockDetail` 內 renderer 動態 `<p>`（L1457/1462/1465/1524/1526），收窄為 `#payRelicLiveMessage`（Cowork PM；`index.html:534,554`, `tests/test_bk15_bk16_relic_a11y_v1_0.mjs`）。
- 2026-08-20：治理方法論訂正——第四道閘量對比色**必須取樣渲染後合成像素**，不得用 `getComputedStyle().backgroundColor`（宣告值會忽略疊加的 gradient/overlay/動畫層）；任何寫死進測試的常數必須註明取得方法且該方法本身可被質疑（Cowork PM；`governance/cards/WP-MINGGE-RM03C-RELIC-A11Y-01_record_v1_0.md` v1.1 訂正段）。
- 2026-08-20：🔴 CRLF 危害升級——`git stash`/`stash pop` 後 `index.html` 由 `w/lf` 復發為 `w/crlf`（2,566 處），證實**每次 checkout/stash/merge 都會重新汙染**，非一次性事故。repo 仍無 `.gitattributes`；永久解需獨立卡（全樹 renormalize，會與在途分支衝突）。在此之前：動 `index.html` 前必先正規化，且**永遠禁止 `git add -A`**（Cowork PM）。
- 2026-08-20：WP-MINGGE-RM03C v1.2 訂正（第二輪 fresh-context 複核，PM 以突變體實跑驗證全部成立）——v1.1 的兩行 CSS 正確且安全，但保護它的測試 v2.0 有四個突變體全綠：m1 目標元素改名致句5 靜默失效（=BK10 同一失效類型，閘從未斷言元素存在）／m2「反陷阱」為恆真式且從不讀 index.html／m3 GLOW_GUARD 僅驗選擇器存在，抓不到 gradient 數值變動／m4 斷言 `.lp-body p < 17px` 導致「把它改成合規」反而讓閘變紅（閘禁止規格）。升 v3.0：新增元素存在斷言、背景全段雜湊 BG_FINGERPRINT、「合成背景必亮於宣告底色」不變量、m4 改條件式讓路。v3.0 本體 11/11，五個突變體行為全部正確（Cowork PM；`tests/test_bk15_bk16_relic_a11y_v1_0.mjs`）。
- 2026-08-20：BACKDROP 取嚴——v1.1 宣稱取「最差情境」為假（只比同一瞬間上下兩帶，未跨 `@keyframes pulseGlow` 7s / opacity .5→.85 / scale 1→1.12）。兩路獨立推導：PM 凍結峰值截圖取樣 `rgb(52,56,31)`、複核席解析合成 `rgb(57,62,34)`，採較嚴者 `#393e22`。`--rice-deep` 在此仍 8.88:1 PASS，修法不受影響（Cowork PM）。
- 2026-08-20：🔴 選項表本身有錯——v1.1 給 Owner 的四個候選 token 中，`--gold-soft` 標為 4.61:1「剛好過線」，取嚴後實為 **4.29:1 FAIL AA**。若 Owner 選了它，修正後的閘會再次認證不合格修法。教訓：候選方案表必須以最差情境計算（Cowork PM）。
- 2026-08-20：🔴 格③另有六處未揭露 AA 失敗，登記後繼 `WP-MINGGE-A11Y-CONTRAST-SWEEP-01`（未建卡）——對 `#393e22`：`.pc-status`（誠實整備態狀態行，沿 T7 判例）3.55:1／`.lp-body p.pay-note`（jade@op.65）**2.36:1**／`.pay-ctx` 3.55:1／`.pay-sub-active` 3.55:1／`.pc-status.pc-ok` 4.29:1／`#page-pay .lp-header .lp-sub` 4.29:1。本卡不修：涵蓋格③大部分次要文字，改動實質改變視覺調性，需 Owner 拍板（Cowork PM；`index.html:477,481-485,511-513,515-517,535`）。
- 2026-08-20：治理方法論再訂正——「證明修法有效」≠「證明閘有效」。測試對修復前版本會紅，只證明它抓得到已知舊錯，不證明擋得住新錯。閘必須以**突變體測試**驗證：注入該閘聲稱要防的每一類錯誤並確認變紅。且**閘不得禁止規格**——若正確做法會讓閘變紅，錯的是閘（Cowork PM；`governance/cards/WP-MINGGE-RM03C-RELIC-A11Y-01_record_v1_0.md` v1.2 §六）。
- 2026-08-21：WP-MINGGE-RM03D-CHAT-COPY-LAND 落地——件1 BK12 退費段依 Owner 甲案（保留 14 天鑑賞期二軌，錨 recvPdxwu4i4CSLtx）整行替換，落地字串 sha256 `8ac0e3d3…9e12`(334B) 與 Chat 交付**逐位元組相同**；`·`=U+00B7、house-style 零違規、「囊中銅錢」在段內、前後凍結句零字動。件2 BK17 價帶標籤依 Chat 裁定不對 TA 顯示，`_artifactHolderTermLabels` 改回傳「半年藏主／兩年藏主」，`｜6 個月` 消滅；原 fallback `||band` 會洩內部 key 給 TA，一併改為 fail-honest（Cowork PM；`index.html`, `tests/test_e086_checkout_mock_v1_0.sh:19`, `tests/test_rm03b_artifact_mock_v1_0.mjs` P2）。
- 2026-08-21：🟢 `test_e086_checkout_mock_v1_0.sh` **16/16 PASS**——長期記為 `NOT_RUN／B1`（Windows sandbox `CreateFileMapping Win32 error 5`）之 shell 回歸，本輪於 Linux 實跑通過，且已含新退費逐字鎖。B1 項目清除（Cowork PM）。
- 2026-08-21：🔴 CRLF 危害再升級——`tests/test_zero_quota_gate.sh` 工作目錄為 `w/crlf`（150 處），bash 直接炸 `syntax error near unexpected token $'\r'`，**腳本根本無法執行**。先前記為「sandbox B1 擋下」的 shell 回歸，至少一支真因是 CRLF 而非 sandbox。`.gitattributes` 由「早晚要做」升級為「正在讓回歸測試沉默失效」，建議提前開卡。該支以 LF 副本實跑得 **13 PASS / 0 FAIL**（工作目錄與 origin/main 皆同），無既有失敗（Cowork PM）。
- 2026-08-21：🔴 第三道閘掃出跨格矛盾，登記未修——`index.html:1747`「訂閱中，書房為您常開。」由 `/history` → `subscriber.tier` 餵資料，為 live TA 可見（非 L1406 死碼）。件1 落地後格③稱「一次付清六個月、不自動續扣」、格②仍稱「訂閱中」。屬 BK11 家族且為 TA 文案=Chat 貨物，已請 Owner 轉單行追問（Cowork PM）。
- 2026-08-21：pk-retention 待辦——`RULING-refund-window` 已變更（訂閱→一次付清型），`compliance_03 v0.6` 類別名為文件側後續（Chat 明示不進本 WP）。依「改裁決必回掃」，其錨定文件與所有引用點須重新掃描確認無舊副本被當現行（Cowork PM）。
- 2026-08-21：WP-MINGGE-RM03D v1.1 增補——件1-b：Chat 裁定 L1748「訂閱中，書房為您常開。」現在改、不等 PAY-ALIGN（理由：live TA 可見之機制描述，甲版落地後與格③互斥，矛盾本身即 fail-honest 破口）。替換為「問道·複盤在期,書房為您常開。」，**未經手打**，由 Chat 提供之 hex 序列解碼寫入；`·`=U+00B7、`,`=U+002C（修正現行全形「，」既有漂移）、`。`=U+3002；落地後全檔恰 1 處，sha256 `dba43239…07f5` 與交付相同。邊界：全檔「訂閱中」僅餘 L1407 死碼（打不存在之 `/subscription`，`resp.ok` 恆偽），照 Chat 裁定歸 PAY-ALIGN；建議該卡收驗收「呈現層『訂閱』字樣清零」（Cowork PM；`index.html:1748`）。
- 2026-08-21：🔴 **PM 自我訂正——前一條曾誤記 `test_zero_quota_gate.sh` 為「11 PASS / 2 FAIL，兩條既有 FAIL 另案」，該記載為假**。真因：PM 的臨時 harness 只複製了 `index.html`，未複製 `workers/mingge-relay/worker.js`，而該腳本以 `$(dirname "$0")/../` 同時解析兩者；補齊後實得 **13 PASS / 0 FAIL**。原記載已就地更正，幽靈待辦（`402 body not standardized`／`readQuotaGate function missing`）撤銷——**該二缺陷不存在**。教訓：回報他人程式的失敗前，必先確認自己的 harness 完整，否則等同捏造缺陷（由 fresh-context 複核抓出）（Cowork PM）。
- 2026-08-21：BK17 測試 P2 突變體硬化——原 P2 僅為原始碼子字串複述，三個突變體全綠（M1 fallback 改回 `||band`／M2 刪 `body.appendChild(band)`／M3 於賦值後串接 raw key）。重寫為：fallback 須位於 `artifactMockHolderTerm` 函式體內、兩視圖皆須 append band 元素、賦值須恰為函式回傳不得串接、raw key 不得進 `textContent`。三突變體現全數變紅（M1 2紅／M2 1紅／M3 1紅），本體 23/23。落實 2026-08-20「閘必須以突變體測試驗證」判例（Cowork PM；`tests/test_rm03b_artifact_mock_v1_0.mjs` P2）。
- 2026-08-21：PAY-ALIGN scope 補登——`PAY_PLANS.planFupan1490.name='問道·複盤|1490(月)'` 與甲版退費段「一次付清六個月」互斥，先前僅登記於專案記憶、未入 repo 治理記錄，今補登。**可及性覆核：非 live** —— `initPayCheckoutCards()` 於 `!isCheckoutTestViewer()` 時直接 return，1490 卡無 click listener；artifact 結帳路徑呼叫 `openPayMock('planSingle149')` 且隨即以 artifact 標題／價格覆寫 `payMockSub`，故 `(月)` 僅在 `?paytest=1` 下可見，與 L1407 死碼同閘位（Cowork PM；`index.html:1546,1489,1498-1499,2101`）。
- 2026-08-21：登記未修（fresh-context 複核指出，PM 覆核成立）——① L1748 新落地字串「問道·複盤在期,書房為您常開。」**無測試逐字鎖**（同輪的退費段有）。② `'15000_plus':'兩年藏主'` 目前無資料可及，屬前置備料非現行呈現。③ `.lp-body p.pay-note`（承載退費合規文字）對比 **2.36:1**，本輪加重了該區塊的條款內容卻未一併處理，屬 `WP-MINGGE-A11Y-CONTRAST-SWEEP-01` P0（Cowork PM）。
