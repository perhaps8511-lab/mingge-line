# TOOLBOX ── 工地設備盤點

> 鐵律:任何新工具入 repo,必在本表加一行。開工讀序:CHANGELOG → 本檔(TOOLBOX)→ SITE_DOSSIER → 現行卡 → STATUS_BOARD。

| 名稱 | 用途 | 怎麼呼叫 | 狀態 |
|---|---|---|---|
| `.claude/hooks/codex-review-gate.sh` | Stop Hook 守衛:Claude Code 收工前掃 `plans/` 內近 4 小時修改過、檔尾缺 `<!-- CODEX-REVIEW: APPROVED` Marker 的計畫檔,有則攔下(exit 2)逼跑互審。 | 不手動呼叫,由 `.claude/settings.json` 掛在 Claude Code 的 Stop hook 事件自動觸發。 | 🟡 待驗(本 session 是 Cowork,非 Claude Code CLI,不會觸發此 hook;且下游依賴 `codex exec`,Cowork 環境未裝 Codex CLI,需在 Claude Code CLI 環境實測) |
| `.claude/settings.json` | Hook 註冊設定:把 `codex-review-gate.sh` 掛進 Stop 事件。 | 不手動呼叫,Claude Code 啟動時自動讀取。 | ✅ 已驗(格式正確,已在 E25 施工中實際掛勾運作,見 `plans/review_logs/`) |
| `.claude/skills/codex-review/SKILL.md` | Codex 互審 Skill,兩模式:模式A 審 `plans/*.md` 實作計畫(找 corner case/邊界/資料契約矛盾,逐條 BLOCKER/SUGGEST,5 輪收斂);模式B 反向審 Codex 交回的程式碼(範圍守門+驗收條件+紅線掃描)。 | 手動:被 Stop Hook 攔下時自動指示啟動,或使用者說「送審/互審/codex review」;核心呼叫 `codex exec`。 | 🟡 待驗(同上,依賴 Codex CLI,本 Cowork session 無法執行;E25 曾在 Claude Code CLI 環境下用過,見下方 plans/review_logs 已驗紀錄) |
| `tests/test_zero_quota_gate.sh` | 歸零路(routeB_fix)三段試車腳本:段①DOM 驗態B動能框門結構,段②Worker 402 標準 body 驗證,段③ Route B execution/文案驗證(此段需 Make API token,手動或 CI)。 | `bash tests/test_zero_quota_gate.sh` | ✅ 已驗(routeB_fix 收官時實測 9/9 PASS,見 STATUS_BOARD routeB_fix 行) |
| `plans/` + `plans/review_logs/` | 實作計畫檔存放處(`codex-review-gate.sh` 的掃描目標)+ 每輪 Codex 互審完整輸出存證(`<計畫名>_r<N>.txt`)。 | 新計畫存 `plans/<name>.md`;互審紀錄存 `plans/review_logs/`。 | ✅ 已驗(E25 前端/金印兩份計畫都跑過完整互審循環,r1-r3 紀錄齊全) |
| `.github/workflows/deploy-pages.yml` | GitHub Pages 自動部署:push main 或手動 workflow_dispatch 觸發,`actions/deploy-pages@v4` 部署整個 repo 根目錄為靜態站。 | git push 到 main(自動)或 GitHub Actions 頁手動 dispatch。 | ✅ 已驗(既有上線管道之一,與 Cloudflare Worker 為前後端雙軌部署) |
| `CLAUDE.md` | ── | ── | ⬜ 不存在(盤點確認缺項,repo 根目錄無此檔) |

## 盤點缺項備註

- `CLAUDE.md` 不存在:若未來需要專案層級的 Claude 指令說明檔,屬待判清單(B3),不擅自新建。
- 本次盤點範圍限定 `.claude/hooks/`、`.claude/skills/`、`tests/`、`plans/`、`CLAUDE.md` 五處,未含 Cowork/chat 端可用的外部 MCP 工具(Make、Airtable 等)—— 這些不屬「repo 內設備」,如需盤點另立清單。

## 補充註記(Perth 核可後追加)

- **codex exec:本環境不可用(B1)** ── Cowork 的施工 = 自己動手;Codex 工人僅存在於 Claude Code 管線。互審替代:你的 plan 交 chat 設計師審。
- **CLAUDE.md:查證更正** ── 依 Perth 指示原本要「舊夾本機搬入」,但實查:舊夾 `D:\20260702 Begining\mingge-line`(mounted 唯讀)根目錄、全倉庫檔案樹、以及 git 全歷史(`git log --all -- CLAUDE.md`)都掃過,**這份檔案不存在於舊夾,也不存在於任何 git 歷史 commit**。原先「原件只在舊夾本機」的前提查無實據,不是「搆不到」的 B1,是「兩邊都沒有」的事實落差,先攤開不硬套結論。若你手邊另有這份檔案(例如本機其他路徑、雲端草稿),麻煩補傳;沒有的話這行就從「待搬遷」改列「待新建(B3,需你或設計師定稿內容,不可由我杜撰專案指令)」。§11 搬遷清單第一項先保留位置,狀態改標「查無實體,待確認」。
