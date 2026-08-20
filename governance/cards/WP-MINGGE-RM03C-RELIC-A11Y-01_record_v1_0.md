# WP-MINGGE-RM03C-RELIC-A11Y-01｜紀錄卡 v1.0

```yaml
wp_id: WP-MINGGE-RM03C-RELIC-A11Y-01
class: bounded_style_fix
admitted_by: Owner (Perth, 2026-08-20,「依你的建議，現在修」)
baseline_ref: perhaps8511-lab/mingge-line @ 08b4622 (main, PR #12 merged)
primary_surface_ref: MG-RM-03
writer: Cowork(PM) 直接施作 —— 純樣式、零 TA 文案、零邏輯
reviewer: 待 fresh-context 複核
authorized_write_set:
  - index.html   # 僅 <style> 區塊，3 行
  - tests/test_bk15_bk16_relic_a11y_v1_0.mjs   # 新檔
  - governance/STATUS_BOARD.md
  - governance/cards/WP-MINGGE-RM03C-RELIC-A11Y-01_record_v1_0.md
forbidden: PAY_PLANS / CHECKOUT_MODE / 任何 TA 可見字串 / 任何 JS 邏輯
```

## 〇｜為什麼開這張

RM03B merge 後我(Cowork)以真實瀏覽器跑 production walkthrough，發現三項自動測試驗不到的缺陷。
BK17(藏主期間標籤)屬 Chat 貨物，不在本卡。本卡只收 BK15 / BK16 兩項純樣式缺陷。

## 一｜BK15 — safe exit 幾乎隱形（RM03 引入的回歸）

- 現象：`#payRelicBack`「回首屏,換一邊看看」在 production 幾乎不可見。
- 量測：`color:var(--moss)` = `#2C3E2D`，對實測背景 `rgb(7,11,7)` 對比 **1.73:1**（WCAG AA 需 4.5:1）；`font-size:13px`（Basis UI Spec §0 要求 ≥17px）。
- 歸屬：`pay-back-link` 於 RM03 前出現 **0 次**、RM03 後 **5 次** → 本次引入，非既有技術債。
- 影響面：Screen Contract 18 欄之 `safe_exit`。看不見的 safe exit 等同不存在。
- 修法：改用既有 token `--jade`(#7a9a72) = **6.31:1** ✅、字級 17px。**未新造顏色**。

## 二｜BK16 — 句5 實際 14.5px，BK10 的修補從未生效

- `#payRelicBranch{font-size:17px}`（BK10 所加）只作用於**容器**。
- `.lp-body p{font-size:14.5px}` **直接命中 `<p>`** —— 直接宣告永遠勝過繼承。
- 故 BK10 宣稱的「relic-branch text raised to 17px」對句5**從未生效**，且無人察覺。
- 修法：新增 `#payRelicBranch p{font-size:17px;line-height:1.9;}`，沿用 repo 內既有先例 `.laoyi-hall .lp-body p{font-size:17px;line-height:1.9;}`。

## 三｜落地 diff（實得）

```
@@ -533,2 +533,3 @@
   #payRelicBranch{line-height:1.9;}
+  #payRelicBranch p{font-size:17px;line-height:1.9;}

@@ -552,5 +553,5 @@
   .pay-back-link{
-    display:block;margin:18px auto 0;background:transparent;color:var(--moss);
+    display:block;margin:18px auto 0;background:transparent;color:var(--jade);
     border:0;border-bottom:1px solid rgba(184,134,11,.42);padding:8px 4px;
-    font-family:inherit;font-size:13px;letter-spacing:.12em;cursor:pointer;}
+    font-family:inherit;font-size:17px;letter-spacing:.12em;cursor:pointer;}
```

`git diff --ignore-cr-at-eol --stat` = `index.html | 5 +++--`（1 檔，3 增 2 刪）。
變更行含中文字元數 = **0** → TA 文案零變動。

## 四｜驗證

| 項 | 方法 | 結果 |
|---|---|---|
| 修法有效性 | production 瀏覽器注入實測，量 computed style | 13→17px；1.73→**6.31:1**；無水平溢出 |
| 新回歸 `test_bk15_bk16_relic_a11y_v1_0.mjs` | M | **8/8 PASS** |
| 新回歸對修復前版本 | 反向驗證 | **5 FAIL / exit 1** ← 證明是真閘 |
| byte-master `check_rm03_copy_bytes.mjs index.html` | E | **ALL PASS** |
| `test_rm03_intent_split_v1_0.mjs` | M | **21/21 PASS** |
| `test_rm03b_artifact_mock_v1_0.mjs` | M | **23/23 PASS** |

## 五｜方法論：新增第四道閘

BK15/BK16/BK17 通過了 23/23 + 21/21 + byte-master + **三輪 fresh-context 複審** + 雙閘 containment，全數漏網。
原因：三者皆非「字串對不對」的問題 —— 分別是**顏色對比**、**CSS 層疊優先權**、**語意歧義**，grep 無能為力。

> **第四道閘**：TA 可見面若有新增或修改，必須以真實瀏覽器跑一次 walkthrough，
> 量測 computed style（字級、行高、對比），並確認語意無撞義。
> 此閘由 Cowork(PM) 自行執行，**不得轉嫁為 Owner 的手動 UAT**。

延伸鐵則：任何「提高字級／改顏色」類修補，**必須附機械斷言證明其生效**。
BK10 未附，故默默失效。本卡之 `test_bk15_bk16_relic_a11y_v1_0.mjs` 即為此類斷言之樣板。

## 六｜未結項

- fresh-context 複核（writer ≠ reviewer）
- Chat 收口蓋章 + Airtable NRE 留痕（RM03/RM03B 亦同，尚未補）
- BK17（藏主期間標籤缺失、「半年藏主」→「6 個月」用詞漂移、與 1490(6 個月) 撞義）→ Chat 貨物，另案

*— WP-MINGGE-RM03C-RELIC-A11Y-01 · 2026-08-20 · Cowork(PM) —*
