---
name: codex-review
description: >
  Cross-model review:把實作計畫(plans/*.md)送 Codex CLI 審查,來回辯論至共識,
  通過後在檔尾蓋 APPROVED Marker。被 Stop Hook 攔下、或使用者說「送審/互審/codex review」時啟動。
  也可反向使用:review Codex 交回的程式碼(mode=code)。
---

# Codex Review Skill v1.0

## 模式 A:Plan 審查(預設;Stop Hook 觸發即此模式)

對每一份缺 Marker 的 plans/*.md,跑以下循環(上限 5 輪,防無限燒):

1. **送審**:
   codex exec "你是資深後端架構審稿人。嚴格審查以下實作計畫,找出:遺漏的 corner case、
   邊界條件、錯誤處理缺口、資料契約矛盾、與驗收標準不符之處。逐條列出,每條標
   [BLOCKER](不改不能過)或 [SUGGEST](建議)。若無問題,回覆 VERDICT: APPROVED。
   計畫全文:$(cat <計畫檔路徑>)"
2. **裁決每一條 feedback**(🔴 共識制核心,禁放水禁裝死):
   - 同意 → 改計畫,記錄「第 N 輪:採納 <條目>」。
   - 不同意 → 寫明理由,下一輪回傳給 Codex:「上輪你提出 X,我方立場:<理由>。請明確表態:被說服(撤回)或堅持(說明為何仍是 BLOCKER)。」
   - 🔴 禁止:為了收工假裝問題不存在、或未答辯就靜默忽略任一 [BLOCKER]。
3. **收斂判定**:Codex 回覆 VERDICT: APPROVED 且無未決 [BLOCKER] → 過;
   到第 5 輪仍有未決 [BLOCKER] → 停,把爭點原文整理成「待 Perth 拍板清單」寫入計畫檔尾,標 `<!-- CODEX-REVIEW: ESCALATED -->`,不蓋 APPROVED、不硬過。
4. **蓋章**:在計畫檔最後一行 append Marker(格式見 Marker 規格),然後正常收工。

## 模式 B:Code 審查(反向;Perth 說「review Codex 交回的 code」時)

輸入:派工卡路徑 + Codex 交回的完整檔案。
1. 先讀派工卡的「驗收條件」與「任務範圍」。
2. 對交回檔跑 diff(vs live 源/GitHub main;🔴 依 §6-8之一:基礎檔必為 live 源,禁本機舊副本)。
3. 三查:① 範圍守門 — 任何範圍外變動 = 攔下不放行;② 驗收條件逐條對 PASS/FAIL;
   ③ 紅線掃描 — token/金鑰/硬編碼 endpoint/TA 文案變動(TA 文案 = Codex 紅線區,出現即攔)。
4. 產一頁 review 報告:PASS 項 / 攔下項(附行號)/ 退回 Codex 的修正指令原文。

## 共通鐵律
- 每輪 Codex 呼叫用 `codex exec`(非互動模式),完整輸出存 `plans/review_logs/<計畫名>_r<N>.txt` 留證。
- 本 Skill 不載入命格/SanMus 憲法,不做味道/合規判斷 — 那是 Claude chat 的活(RED LINE)。
  審查中發現疑似 TA 文案/合規爭點 → 一律標 ESCALATED 交回 chat,不自裁。
- Codex CLI 不可用(未安裝/額度盡)→ 標 `<!-- CODEX-REVIEW: BLOCKED-B1 codex-cli-unavailable -->`,
  回報而非硬過(卡住三分類 B1)。
