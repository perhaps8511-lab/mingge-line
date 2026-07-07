# lettertail_taskB_plan_v1_0 — log.html 深卜 CTA 曝光補強 + index.html 複盤 banner gated-ii revert

> 對應卡:governance/cards/mingge_task_dispatch_lettertail_cta_v1_0.md 任務 B(+ 邊界條款 gated-ii revert)。
> 分工修正依 Perth 2026-07-07 裁決:任務 A(Make 5202754)交 chat 設計師 MCP 代打,本 plan 僅涵蓋任務 B(log.html + index.html 兩處純前端增量)。
> 基礎檔:本 plan 對照 `D:\mingge-line-clean`(乾淨 clone,已核實與 origin/main 內容零差異)當前版本撰寫,非舊夾記憶。
> 狀態:🟡 待審 —— 等 chat 設計師核章(Marker)才施工,本檔目前不含任何程式碼變更,純規格。

---

## 現況查證(先讀後寫,禁猜)

### log.html 現行邏輯(`buildDeepdiveCtaHtml`,約第 257-267 行)

```js
function buildDeepdiveCtaHtml(tierInfo) {
  const isSubscriber = tierInfo.ok && tierInfo.tier === "subscriber";
  const btnLabel = isSubscriber ? "四鏡深讀(訂閱含)" : "四鏡·深卜 200";
  return `
    <div class="section deepen-section">
      <div class="sec-title">往裡再讀四面？</div>
      <div class="deepen-sub">同一卦，不重卜、不換卦——互、綜、錯、序，四鏡合看。</div>
      <button class="deepen-btn" id="deepdiveBtn" type="button" data-mode="${isSubscriber ? "trigger" : "ready"}"${isSubscriber ? "" : " disabled"}>${btnLabel}</button>
      <div class="deepen-status" id="deepdiveStatus"></div>
    </div>`;
}
```

現況問題(對照卡上要求):
1. 文案雙軌:訂閱戶看到「四鏡深讀(訂閱含)」,非訂閱看到「四鏡·深卜 200」── 卡要求全站統一一個名字。
2. 非訂閱按鈕帶 `disabled` 屬性 ── 視覺上是「假按鈕」(看得到點不下去),違反卡上「禁假按鈕」。
3. CSS(`.deepen-section`/`.deepen-btn`,約第 124-133 行)是輕量文字按鈕,視覺重量遠低於本頁 `.gua-header`(卦頭區,深底金字漸層,padding 22px)或 `.question-block`(深色底 `var(--ink)`,圓角 10px,padding 12-16px)── 卡要求升級到與信箋卡(LINE Flex,深綠底 #2C3E2D、金字 #C9A84C)同視覺重量,但「沿用現有深色 token,不引新色票」,故用本頁既有 `--ink`(而非直接照搬 Flex 的 #2C3E2D)。
4. `handleDeepdiveClick`(約第 269-303 行)目前只處理 `data-mode==="trigger"` 分支;`ready`/非訂閱分支點擊直接 `return`(無行為)── 卡要求非訂閱點擊要進「200 單購誠實整備態:先解釋再跳轉」。

### index.html 現行邏輯(`buildFupanBannerHtml`,約第 631-650 行)

```js
if(!isSubscriber){
  return credits > 0 ? '<div class="fupan-banner">'+head+'</div>' : '';
}
```

現況問題:非訂閱戶若 `credits > 0`(還有免費/試用額度),複盤 banner 會顯示標題+副標(無輸入框/按鈕的「半截 teaser」)── 這是 S149 裁定要 revert 的「錯接②」(複盤對 free 隱藏,回 S92 gated-ii 凍結)。卡要求:非訂閱一律完全隱藏,不分 credits 多寡。

---

## 變更項目清單

### 變更 1 — log.html:`buildDeepdiveCtaHtml()` 函式(約第 257-267 行)

**改什麼**:
- 按鈕文案:全 tier 統一改為 `"四鏡·深卜 200"`,移除 `"四鏡深讀(訂閱含)"` 這個變體。
- 移除 `disabled` 屬性,兩種 tier 都可點擊。
- `data-mode` 保留區分:訂閱戶 `data-mode="trigger"`(走現行 `/trigger/deepdive`);非訂閱改 `data-mode="purchase"`(新增分支,取代原本無行為的 `ready`)。

**diff 預估**:約 4-6 行改動(return 樣板字串內的 class 屬性、按鈕文案、data-mode 值)。

### 變更 2 — log.html:`.deepen-section` / `.deepen-btn` CSS(約第 124-133 行)

**改什麼**:視覺重量比照 `.question-block`(既有深色 token `var(--ink)`)升級:
```css
.deepen-section{
  text-align:center;background:var(--ink);color:var(--paper);
  border-radius:10px;padding:20px 18px;margin:0 22px;
}
.deepen-sub{font-size:13px;color:var(--paper);opacity:.75;line-height:1.8;margin-bottom:16px;}
.deepen-btn{
  display:block;width:100%;background:var(--gold);color:#fff;
  border:none;border-radius:8px;
  padding:14px 20px;font-family:var(--serif);font-size:15px;letter-spacing:.1em;
  cursor:pointer;transition:.25s;font-weight:600;
}
.deepen-btn:hover{opacity:.85;}
.deepen-status{font-size:12px;color:var(--paper);opacity:.7;margin-top:10px;min-height:1.4em;}
```
(移除 `:disabled` 相關樣式,因按鈕不再 disabled;`.deepen-section` 外層 `.section` padding 由呼叫處已有,新增 `background`/`border-radius`/`margin` 讓它視覺上跳出,不是嵌在普通條列裡。)

**diff 預估**:約 10-14 行(既有 8 行 CSS 改寫/替換)。

### 變更 3 — log.html:`handleDeepdiveClick()` 函式(約第 269-303 行),新增非訂閱分支

**改什麼**:目前函式開頭 `if (btn.dataset.mode !== "trigger") { return; }` 直接擋掉非 trigger 情況。改為:

```js
async function handleDeepdiveClick(logId, token) {
  const btn = document.getElementById("deepdiveBtn");
  const statusEl = document.getElementById("deepdiveStatus");
  if (!btn) return;

  if (btn.dataset.mode === "purchase") {
    if (statusEl) statusEl.textContent = "深讀之門設在書房，這就帶你過去。";
    btn.disabled = true;
    setTimeout(() => { window.location.href = "./index.html?action=pay"; }, 1200);
    return;
  }

  // 以下為原 trigger(訂閱戶)分支,不動 —— subscriber 點擊直接進送出流程,無說明/無跳轉
  ...
}
```

**自查(律 2 / 誠實整備 E29-E30;設計師核章修訂一)**:
- 文案定案為卡上逐字句「深讀之門設在書房,這就帶你過去。」──**一字不改**,取代原草擬的「深卜為單卦 200 元加購,即將前往付款頁……」(該句因自寫 TA 字+ 「付款頁」名不符實,已被設計師駁回,不得使用)。
- 禁出現「付款/訂閱/解鎖」字樣 ── 定案文案已滿足此要求。
- 跳轉前顯示約 1.2 秒讓使用者讀到說明文字,再導向 `action=pay`(即格3 書房/方案頁,現行路徑),不是「點下去立刻消失跳轉」的假按鈕體感。
- subscriber 分支(`data-mode==="trigger"`)行為不變:點擊直接觸發 `/trigger/deepdive`,不經任何說明句、不跳轉。
- 沿用 `action=pay` 現有路由,不新建頁面/不新建 Make 場景,零觸碰任務 A 邊界。

**diff 預估**:約 8-10 行新增(新分支),原 trigger 分支邏輯零修改。

> 設計師核章修訂一(2026-07-07):上方程式碼區塊與自查文字已改為定案文案,取代原草擬版本。

### 變更 4 — index.html:`buildFupanBannerHtml()` 函式,`!isSubscriber` 分支(約第 636-638 行)

**改什麼**:
```js
if(!isSubscriber){
  return '';
}
```
(刪除 `credits > 0` 判斷與其產出的 teaser div,非訂閱一律回傳空字串,banner 完全不渲染。)

**diff 預估**:1 行改動,淨減少約 1-2 行(移除三元判斷)。

---

## 驗收怎麼跑

### DOM 斷言(比照 `tests/test_zero_quota_gate.sh` 既有寫法,建議新增 `tests/test_lettertail_taskB.sh` 或併入既有腳本擴充一段;是否新建腳本待審查時確認)

| # | 情境(tier) | 斷言 |
|---|---|---|
| 1 | 訂閱戶(subscriber) | log.html 渲染出的 `deepen-btn` 文字 = `"四鏡·深卜 200"`(非「四鏡深讀(訂閱含)」);`data-mode="trigger"`;無 `disabled` 屬性 |
| 2 | 非訂閱、有額度(free, credits>0) | 同上文案、同 `deepen-btn` 存在且**可點擊**(無 disabled);`data-mode="purchase"` |
| 3 | 非訂閱、無額度(free, credits=0) | `deepen-btn` 仍可見可點(卡要求「所有 tier 可見」,深卜 CTA 與起卦額度是兩件事,不因起卦額度歸零而隱藏深卜入口) |
| 4 | index.html:非訂閱、有額度 | `fupanBanner` 內容為空字串,DOM 上 `#fupanBanner` 底下無 `.fupan-banner` 元素 |
| 5 | index.html:非訂閱、無額度 | 同上,`#fupanBanner` 空 |
| 6 | index.html:訂閱戶(不論 recordsCount) | 行為不變(現有兩種 subscriber 分支零修改,回歸測試確認沒改壞) |
| 7(設計師核章修訂二新增) | 訂閱戶(subscriber)點擊 `deepdiveBtn` | 進入送出流程(`deepdiveStatus` 顯示「送出中……」→ 成功後「老易讀著了……」);`window.location.href` **不變化**(無跳轉);全程不出現「深讀之門設在書房」說明句(該句只屬於非訂閱分支) |

### 三 tier 情境全覆蓋(訂閱戶 / 非訂閱有額度 / 非訂閱無額度)交叉驗證 log.html 深卜 CTA + index.html 複盤 banner,共 6+1=7 條斷言,對應上表。

### 機讀輔助:點擊模擬(headless,鐵3)
- 情境 1 / 7(訂閱戶)點擊 → 驗證仍 fetch `${RELAY_URL}trigger/deepdive`(既有行為零變化),`deepdiveStatus` 進入送出流程文字,`window.location.href` 不變化、無跳轉。
- 情境 2/3(非訂閱)點擊 → 驗證 `window.location.href` 目標為 `./index.html?action=pay`,且點擊後約 1.2 秒內 `statusEl.textContent` 顯示定案句「深讀之門設在書房,這就帶你過去。」(非空白跳轉,且逐字比對禁出現「付款/訂閱/解鎖」字樣)。

---

## 邊界自查

- 零觸碰任務 A(Make scenario 5202754)、零觸碰 Worker `/trigger/deepdive` 路由本身(只是換個呼叫來源的文案/入口,呼叫方式不變)。
- TA 文案:引導句「往裡再讀四面？」與 sub 文案「同一卦,不重卜、不換卦——互、綜、錯、序,四鏡合看。」逐字保留不動(卡上僅要求改按鈕文案統一名稱,未要求改這兩句)。
- 非訂閱分支說明句已改為設計師逐字定案「深讀之門設在書房,這就帶你過去。」,禁出現「付款/訂閱/解鎖」字樣,一字不改。
- 按鈕文案全 tier 統一「四鏡·深卜 200」為 v0.3 全站唯一名,拍板定案,不再有「四鏡深讀(訂閱含)」變體。
- subscriber 點擊行為與說明句/跳轉邏輯完全隔離(`data-mode` 分流即邊界),不會誤觸非訂閱流程。
- 複盤 banner revert 是純邏輯(移除一個 if 分支的輸出),不涉及任何新文案。

---

## 核章紀錄

**狀態:✅ APPROVED**(設計師 2026-07-07 核章,附修訂一、修訂二,已於本檔對應段落改定;上方所有文案/程式碼片段均為核章後定案版本)。

<!-- CODEX-REVIEW: APPROVED —— 本 plan 走「chat 設計師審」替代流程(依 TOOLBOX.md 補充註記),非 codex exec。核章者:chat 設計師。日期:2026-07-07。附修訂一(TA 文案 RED LINE 更正)、修訂二(按鈕文案統一 + 補驗收斷言7)。 -->
