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
