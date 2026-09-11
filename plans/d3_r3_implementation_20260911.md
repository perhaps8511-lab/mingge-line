# D3 r3 實作計畫｜命格 × 龍宮舍利

```yaml
plan_id: MINGGE-D3-R3-IMPL-20260911
dispatch_card: 00B_taskcard/MINGGE_CLAUDE_CODE_DISPATCH_CARD_D3_r3_20260911.md
directive: 00D_spec/mingge_d3_final_r3_20260911/06_CLAUDE_CODE_IMPLEMENTATION_DIRECTIVE_20260910.md
copy_of_record: 00D_spec/mingge_d3_final_r3_20260911/{02,03,04}_*.md（token 已清零，SHA256 驗證通過）
base_branch: main @ 3048c65
reuse_branch: feat/d3-longyun-experience-20260910（同一 base，18 組合成流程已 PASS，直接沿用其狀態機並改文案）
```

## 範圍判定（開卡三問已答）

- 定案面：D1-B/D2-B/D3-A/D4-C 已由 Owner 2026-09-11 拍板回填（02～04 已無 `[OWNER_DECISION:*]` token，SHA256 全驗證通過）。Product Basis 六檔不改。
- 運行面：repo `main` 現況 = `3048c65`，與既有候選分支 base 相同，無需 rebase。`/artifacts` 端點已存在且回真實 catalog truth（目前三個 SKU 皆 `needs_supplier` → 真實 empty）。無 `/eligibility`、`/activation` 對應端點。
- 碰撞面：open PR 僅 #25（payment-inbox-safety，DRAFT，明確排除不動）、#10、#1（無關舊 draft）。無人正在動 write set 內檔案。

## 發現的既有凍結衝突（本輪不自行裁決，寫入交付缺口清單）

1. `index.html` 既有 `renderZeroQuotaGate`／`ZERO_QUOTA_TEXT`（M-090/M-092「動能框」文案）已被 `tests/test_zero_quota_gate.sh` 逐字鎖定，且其 CTA 直接導向 `action=pay&src=zero`。這與 r3 doc04 R1-S00 `none` 態的新 exact copy（「要問這一卦，先選一個方案」→ R3-S02）逐字衝突。
2. 現行 `refreshEntryGateState` 在 `/history` fetch 失敗或 non-2xx 時 fail-open（`allow:true`，且 `hasSubscriber:false` 時不顯示任何 gate，直接放行起卦）；r3 doc04 `read_error` 態要求 fail-closed（只給「再試一次／問書僮／回首頁」，不得放行起卦或導向購買）。
3. 現行 subscriber 資料只有 `tier / trial_quota_remaining / monthly_quota_remaining / subscription_start`，無法可靠區分 `period_active` vs `single_available` vs `free_verified`（D4-C 3 次免費贈與尚無 owning-store 欄位）。

判定：以上三點涉及**已凍結、已測試的正式進卦閘門**與**金流鄰接行為**（fail-open/fail-closed 屬安全語意變更），非本輪工程細節可自行決定，故：
- **不動** `ZERO_QUOTA_TEXT`／`renderZeroQuotaGate`／既有 fail-open 邏輯，保留現有測試全綠。
- 本輪只在**全新、不與現有正式起卦閘門衝突**的介面（龍宮舍利公開頁、格③兩路、R6-LY 隨貨啟用旅程）落地 R1-S00 五態展示與 exact copy，其終點以**獨立 fixture 頁**（`assets/longyun-journey.js` 內 `eligibility` route）呈現，不改寫 `index.html` 既有起卦閘門程式碼。
- 交付時明列此衝突為「真正仍缺的資料清單」之首項，需 Owner／對抗席裁決 r3 exact copy 是否要覆蓋 M-092，以及 read_error fail-open→fail-closed 是否為刻意產品決策。

## 本輪落地清單（write set 內）

1. `longyun.html` + `assets/longyun.js` + `assets/longyun.css`／`longyun-original.css`：改字＝r3 exact copy
   - 首摺 H1「先看清一件收藏」（D2-B，取代「一件物」）
   - 來源聲明卡 `statement_scope` 補入合作方共同來源主體（D1-B，待核框架，不假造正式名稱）
   - §9 LP-S07／藏主權益＝Master v0.1 §3 逐字（取代目前的改寫版）
   - §10 送禮與隨貨啟用卡購買者說明、§12 blocked checkout、§13 FAQ 十題
2. `assets/longyun-journey.js`：
   - R1-S00 五態 exact copy + free_verified `n` 由 fixture 讀回（3/2/1/0，n=1 特殊句）
   - R6-LY-00／01／02 exact copy 與四態（active/deferred/declined/pending-read_error）按鈕
   - Flow 8/9 對照：新增「書僮」route 呈現 exact copy，作為⑥書僮 from_product context 的網頁等效示意（LINE 原生 quick reply 由 Make 端接線，不在本 repo write set）
3. 新增隨貨啟用卡數位稿：`activation-card-preview.html`（gift/self 切換，QR `[PLACEHOLDER:ACTIVATION_URL]`）＋ `plans/activation_card_print_spec_r3_20260911.md`（尺寸／出血／QR 位置／禁含私人資料）
4. `index.html`：入口連結（格③→龍宮舍利候選頁）沿用既有分支已加內容；另同步修正既有 `payRelicBranch`（非付款、資訊性）一句 D2-B 字面「一件物」→「一件收藏」，並同步更新 `tests/test_rm03_intent_split_v1_0.mjs`／`tests/test_mingge_v12_rc1_product_loop_v1_0.mjs` 對應斷言（非弱化驗收，逐字改為 r3 現行值）。**不改動起卦閘門／付款分支（`payMinggeBranch`／`renderZeroQuotaGate`）邏輯或文案**
5. `assets/typography.css` 套用（沿用既有分支既有內容，僅核對是否需更新）
6. 測試：搬移／改寫 `reports/mingge-d3-longyun-20260910/verify-journey.cjs` 為 repo 內 `tests/test_d3_longyun_journey_r3_v1_0.mjs`（Playwright，斷言 exact copy 逐字、零外部請求、380px/200% 無溢出）
7. `governance/`／traceability：記錄 r3 exact copy 對照與本輪已知缺口

## 驗證

- 逐字比對 exact copy（grep 關鍵句）
- Playwright journey 測試（沿用既有 18 組情境 + 新增 exact-copy 斷言）
- `node --check` 所有新增/修改 JS
- 手動核對 zero-payment：無 fetch、無 Payment_Orders、無 entitlement 寫入（本候選 CSP `connect-src 'none'` 維持不變）
- 380px 與 CSS zoom 2（等效 200%）無橫向溢出、無截字

## 不做

- 不改 `workers/mingge-relay/worker.js`（backend 不在 write set）
- 不改 `index.html` 既有起卦閘門／zero-quota 文案與邏輯
- 不合併／不動 PR #25
- 不建立任何 Payment_Orders／entitlement 寫入
- 不新增 Make/Dify 側 LINE 原生 quick reply 接線（記為缺口）

<!-- CODEX-REVIEW: BLOCKED-B1 codex-cli-unavailable
2026-09-11：codex exec 回報 "You've hit your usage limit"（額度至 2026-09-16 恢復），
無法完成互審循環。依 Skill 共通鐵律標記為 B1 工具限制，不冒充 APPROVED、不跳過此閘門。
本輪工程判斷（尤其「不動既有 zero-quota 閘門／fail-open 邏輯」一節）僅為 writer 單方判斷，
未經 Codex 交叉驗證，於交付報告中如實註記為 NOT_RUN。
-->

