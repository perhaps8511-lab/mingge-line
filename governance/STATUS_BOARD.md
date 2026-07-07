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
| lettertail_cta ── 信箋尾深卜門 | 🟡 施工中(卡已存檔,任務A/B/C啟動) | governance/cards/mingge_task_dispatch_lettertail_cta_v1_0.md 已存檔 | 卡序第 2。**入口變更:Claude Code → Cowork,S150**(chat 設計師直裁核定,本卡起執行入口改由本 Cowork session 擔任)。任務A動凍結鏈5202754,施工前寫plan存governance/plans/。 |
| sitegov_lead ── 工地制+主理人自動化 | 🟡 部分開工(Task 1 最小件) | governance/STATUS_BOARD.md(本檔)已建 | 卡序第 3。Task 1 剩餘(MANIFEST.md 生成腳本)、Task 2(Stop Hook 加牙)、Task 3(試車骨架)、Task 4(晨報,chat 端代打)待 lettertail_cta 完工後續做。 |

---

## 紅燈邊清單

- 無

## DoD 距離(未完項數)

- routeB_fix:0 項(已收口 🟢)
- lettertail_cta:全數未開始(卡序第 2,下一張)
- sitegov_lead:Task 1 剩餘 + Task 2 + Task 3 + Task 4,共 4 大項未完成(卡序第 3)

## 更新紀錄

- 2026-07-07:routeB_fix 由「✅完工待deploy」升級為「🟢真機驗證通過」── 三樣證據(worker.js/index.html/tests/test_zero_quota_gate.sh)已於 origin/main 逐項核實,與 Perth 回報 9/9 PASS 一致。
- 2026-07-07:**入口變更:Claude Code → Cowork,S150**。lettertail_cta 卡由 chat 設計師直裁核定,執行入口改為本 Cowork session(非 Claude Code CLI)。卡檔已存 governance/cards/,開始執行任務 A/B/C。
