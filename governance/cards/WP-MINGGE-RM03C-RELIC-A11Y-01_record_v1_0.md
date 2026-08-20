# WP-MINGGE-RM03C-RELIC-A11Y-01｜紀錄卡 v1.2

```yaml
wp_id: WP-MINGGE-RM03C-RELIC-A11Y-01
class: bounded_style_fix
admitted_by: Owner (Perth, 2026-08-20,「依你的建議，現在修」)
baseline_ref: perhaps8511-lab/mingge-line @ 08b4622 (main, PR #12 merged)
primary_surface_ref: MG-RM-03
writer: Cowork(PM) 直接施作 —— 純樣式、零 TA 文案、零邏輯
reviewer: fresh-context 複核已執行(2026-08-20) — 判 MERGE WITH FIXES，三項全中，已於 v1.1 修正
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

---

# 🔴 v1.1 訂正 — v1.0 的頭條數字是錯的

fresh-context 複核席(writer≠reviewer)對 commit `1677da4` 提出三項，**經 PM 以像素取樣獨立複驗，三項全部成立**。

## 訂正一｜背景色量錯，`--jade` 其實 FAIL AA

v1.0 宣稱背景 = `#070b07`、`--jade` 對比 **6.31:1 AA PASS**。**錯。**

`#070b07` 是 `body`/`.cosmos` 的**宣告值**，是 `getComputedStyle(body).backgroundColor` 的回傳值 ——
但 `.cosmos .glow`(140vmax radial-gradient) 與 `.cosmos .glow2`(60vmax，opacity 動畫 .5→.85)
疊在其上，**合成後的實際像素遠亮於宣告值**。

對 production 截圖【按鈕所在座標】取樣像素(x 690-880 / y 340-352 與 382-394，取較亮者=最差情境)：

| 量法 | 背景 | `--jade` 對比 | 判定 |
|---|---|---|---|
| v1.0：宣告值 | `rgb(7,11,7)` | 6.31:1 | ❌ 假的 |
| v1.1：**合成像素** | **`rgb(52,57,34)`** | **3.81:1** | **FAIL AA** |

修前 `--moss` 對合成背景僅 **1.05:1**(v1.0 說 1.73:1 也偏樂觀) —— 病情比 v1.0 診斷的更重。

**最諷刺處**：v1.0 §五自訂「第四道閘：用真實瀏覽器量 computed style」，
而 PM 正是**用錯誤的方法執行了自己剛訂的規矩** —— computed style 給的是宣告值，不是合成像素。

**修法**：改用 `--rice-deep`(#ece5d6)。對合成背景 **9.54:1**；渲染畫面實際取樣 **12.42:1**。
Owner 於 2026-08-20 在四個 token 中選定此案(另三案：`--line` 7.74、`--gold-lit` 6.57、`--gold-soft` 4.61 餘裕過薄)。

## 訂正二｜測試把錯誤背景硬寫進去，會永遠認證這個失敗

`test_bk15_bk16_relic_a11y_v1_0.mjs` v1.0 的 `BACKDROP='#070b07'` 是**載重性錯誤**：
它印出「6.31:1 AA PASS」，而實際渲染是 3.81:1(FAIL)。
**一道認證了不合格修法的閘，比沒有閘更危險。**

v2.0 修正：`BACKDROP='#343922'`(實測像素)，並新增
① 明列 `--moss`/`--moss-soft`/`--moss-2`/`--jade` 為已知不合格 token；
② `opacity` 稀釋偵測；
③ 反陷阱斷言，禁止把判準換回宣告值；
④ `GLOW_GUARD` — glow 層若被移除則強制回來重新取樣。

## 訂正三｜`#payRelicBranch p` 範圍過寬，並非「僅句5」

`#artifactMockList` / `#artifactMockDetail` 是 `#payRelicBranch` 的子元素，
renderer 於 `index.html` L1457/1462/1465/1524/1526 以 `createElement('p')` 動態產生
價格、價帶與五個 detail slot —— **全部被 v1.0 的規則掃到**，
由 14.5px/lh 2.3 悄悄變成 17px/lh 1.9。這是未申報的 RM03B mock 面視覺變更。

**修法**：收窄為 `#payRelicLiveMessage{font-size:17px;line-height:1.9;}`，只命中句5。

## v1.1 落地 diff（在 `1677da4` 之上）

```
-  #payRelicBranch p{font-size:17px;line-height:1.9;}
+  #payRelicLiveMessage{font-size:17px;line-height:1.9;}
-    display:block;margin:18px auto 0;background:transparent;color:var(--jade);
+    display:block;margin:18px auto 0;background:transparent;color:var(--rice-deep);
```

## v1.1 驗證

| 項 | 結果 |
|---|---|
| 測試 v2.0 | **13/13 PASS** |
| 測試 v2.0 對 `1677da4`（v1.0 修法） | **5 FAIL** ← 抓得到自己上一版的錯 |
| 渲染像素實測對比 | **12.42:1** |
| byte-master / RM03 / RM03B | ALL PASS / 21-21 / 23-23 |
| 真實 diff | `index.html` 2 增 2 刪 |

## 🔴 方法論訂正 — 第四道閘的執行方式(v1.0 寫得不夠精確，導致自己踩雷)

> 量對比色**必須取樣渲染後的合成像素**，
> **不得**使用 `getComputedStyle(el).backgroundColor` —— 那是宣告值，
> 會忽略疊在其上的 gradient / overlay / 動畫層。
> 作法：截圖 → 對「該元素實際座標」取樣像素眾數 → 取最差(最亮背景)情境計算。

延伸：**任何把數字寫死進測試的常數，必須註明它的取得方法**，
且該方法本身要能被質疑。v1.0 的註解寫「production 量得」，聽起來像實測，
實際上量的是宣告值 —— 註解為真但誤導，複核席才是抓到它的唯一防線。

## 🔴 CRLF 危害升級：不是一次性，是每次 git 操作都復發

Claude Code 為驗證而執行 `git stash` / `stash pop` 後，`index.html` 由 `w/lf` 變回 `w/crlf`(2,566 處)。
→ **每一次 checkout/stash/merge 都會重新汙染工作目錄。**
本輪 PM 的編輯腳本因內建 `assert CRLF==0` 而中止，未寫入錯誤內容(守衛生效)。
**未決**：repo 仍無 `.gitattributes`。永久解需獨立一張卡(全樹 renormalize，會與在途分支衝突)，
在此之前，**每次動 `index.html` 前必先正規化，且永遠禁止 `git add -A`**。

*— v1.1 · 2026-08-20 · Cowork(PM)，經 fresh-context 複核訂正 —*


---

# 🔴 v1.2 訂正 — 第二輪 fresh-context 複核：v1.1 的閘不是閘

v1.1 的兩行 CSS 是對的且安全，但**保護它的那道閘四個突變體全綠**。複核席指出、PM 逐一實跑驗證後全部成立。

## 一｜v2.0 測試的四個致命缺陷

| 突變體 | v2.0 行為 | 病因 |
|---|---|---|
| **m1** 把 `<p id="payRelicLiveMessage">` 改名，CSS 不動 | **13/13 全綠** | 句5 靜默掉回 14.5px —— **這正是 BK10 的失效類型**，而閘從未斷言目標元素存在 |
| **m2** `BACKDROP` 改回 `'#070B07'`（大寫繞過） | **13/13 全綠** | 所謂「反陷阱」是恆真式，且**從不讀 `index.html`**，只是同檔字面值的自我比對 |
| **m3** glow2 `rgba(...,.18)` → `.6`，背景大變 | **13/13 全綠** | `GLOW_GUARD` 只驗「選擇器存在」，抓不到 gradient 數值變動 |
| **m4** `.lp-body p` 升到 17px（**=符合規格 §0**） | **12/1 變紅** | 斷言寫成 `.lp-body p < 17px` → **閘禁止規格** |

## 二｜v3.0 對策與實跑驗證

| 突變體 | v2.0 | **v3.0** |
|---|---|---|
| m1 目標元素改名 | 13/13 綠 | **1 FAIL** ← 新增 `id="payRelicLiveMessage"` 存在斷言 |
| m2 BACKDROP 改回宣告值 | 13/13 綠 | **1 FAIL** ← 新增**不變量**：疊加層只會加亮，故合成背景必然亮於 `.cosmos` 宣告底色 |
| m3 glow2 數值變動 | 13/13 綠 | **1 FAIL** ← `BG_FINGERPRINT` 對 `.cosmos` + `.glow` + `.glow2` + `@keyframes pulseGlow` 全段雜湊 |
| m4 `.lp-body p` 升 17px | 12/1 紅 | **0 FAIL** ← 改為條件式：`.lp-body p` 自己合規時本閘讓路 |
| m5 顏色改回 `--jade` | — | **2 FAIL** |

v3.0 本體 **11/11 PASS**。

## 三｜BACKDROP 取嚴：谷值 → 峰值

v1.1 宣稱取「較亮者=最差情境」，**是假的** —— 只比了同一瞬間的上下兩帶，從未跨 `@keyframes pulseGlow`（7s，opacity .5→.85 + scale 1→1.12）。

兩路獨立推導：

| 路徑 | 方法 | 結果 |
|---|---|---|
| A（PM） | production 凍結 glow2 於峰值後截圖取樣像素 | `rgb(52,56,31)` |
| B（複核席） | 由 gradient stops 以 premultiplied-alpha 解析合成 | `rgb(57,62,34)` |

**採用 B（較亮=較嚴）**。`--rice-deep` 在此仍為 **8.88:1 PASS**，修法不受影響。

## 🔴 四｜我給 Owner 的選項表裡有一個是不合格的

v1.1 §訂正一列出四個候選 token，其中 **`--gold-soft` 標為 4.61:1「剛好過線但餘裕薄」** ——
取嚴後實為 **4.29:1，FAIL AA**。若 Owner 當時選了它，這道「修正後的閘」會再一次認證一個不合格修法。

**教訓**：候選方案表本身也必須用最差情境計算，不能用當下量到的那一個瞬間值。

## 🔴 五｜同一畫面上另有六處未揭露的 AA 失敗（本卡不修，另案）

v1.1 在測試裡把 `--jade` 列為「FAIL AA」黑名單，**卻放著同一頁四條 jade 規則繼續失敗且完全未揭露**。這是不一致。

對合成背景 `#393e22`（最差情境）：

| 位置 | token | 對比 | 判定 |
|---|---|---|---|
| `.pc-status`（**誠實整備態狀態行**，沿 T7 判例） | `--jade` | **3.55:1** | FAIL |
| `.lp-body p.pay-note` | `--jade` @ opacity .65 | **2.36:1** | FAIL（最嚴重） |
| `.pay-ctx`（`?src=` 四態語境行） | `--jade` | **3.55:1** | FAIL |
| `.pay-sub-active` | `--jade` | **3.55:1** | FAIL |
| `.pc-status.pc-ok` | `--gold-soft` | **4.29:1** | FAIL |
| `#page-pay .lp-header .lp-sub` | `--gold-soft` | **4.29:1** | FAIL |

**不在本卡修**：這六處涵蓋格③大部分次要文字，改動會實質改變「書房」的視覺調性 —— 那是設計決定，需 Owner 拍板，不是 bounded style fix。

**登記後繼（未建卡）**：`WP-MINGGE-A11Y-CONTRAST-SWEEP-01`
開卡前 Owner 需答：① 是否接受整體提亮（會讓格③次要文字明顯變亮）② `.pay-note` 的 `opacity:.65` 是刻意的低調設計還是無意的稀釋 ③ 是否全站掃描而非只掃格③。

## 六｜方法論再訂正

> **「證明修法有效」與「證明閘有效」是兩件事。**
> v1.0/v1.1 只做了前者（測試對修復前版本會紅），那只證明它**抓得到已知的舊錯**，
> 不證明它**擋得住新錯**。閘必須以**突變體測試**驗證：
> 刻意注入該閘聲稱要防的每一類錯誤，確認它變紅。
>
> 且：**閘不得禁止規格。** 若「正確的做法」會讓閘變紅，錯的是閘。

*— v1.2 · 2026-08-20 · Cowork(PM)，經第二輪 fresh-context 複核訂正 —*
