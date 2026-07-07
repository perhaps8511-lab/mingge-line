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

---

## 紅燈邊清單

- 無

## DoD 距離(未完項數)

- routeB_fix:0 項(已收口 🟢)
- lettertail_cta:任務B 0 項(完工,待 push);任務A 不計入本 session DoD(已移交 chat 設計師);任務C(headless驗收)待補
- sitegov_lead:Task 1 剩餘 + Task 2 + Task 3 + Task 4,共 4 大項未完成(卡序第 3)

## 更新紀錄

- 2026-07-07:routeB_fix 由「✅完工待deploy」升級為「🟢真機驗證通過」── 三樣證據(worker.js/index.html/tests/test_zero_quota_gate.sh)已於 origin/main 逐項核實,與 Perth 回報 9/9 PASS 一致。
- 2026-07-07:**入口變更:Claude Code → Cowork,S150**。lettertail_cta 卡由 chat 設計師直裁核定,執行入口改為本 Cowork session(非 Claude Code CLI)。卡檔已存 governance/cards/,開始執行任務 A/B/C。
- 2026-07-07:**工地遷址**至乾淨 clone(`D:\mingge-line-clean`),舊夾封存唯讀。STATUS_BOARD 從舊夾複製延續。
- 2026-07-07:**任務A 分工移交**:Perth 裁定 Make scenario 5202754 改由 chat 設計師 MCP 代打,本 session 不做、不碰、不等它。
- 2026-07-07:**任務B 完工**,commit c48349f(本機,未 push),9/9 PASS,plan 設計師核章 APPROVED。
