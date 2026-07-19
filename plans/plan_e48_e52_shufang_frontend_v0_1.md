# plan_e48_e52_shufang_frontend_v0_1 — E48 書房分享卡 + E52 讀卦隨筆第四分類 tab

## 背景與範圍守門

- 依派工卡 `001_taskcard_e48_e52_shufang_frontend_S163_v1_0.md`(Drive)重建施工(S163 原始交付物於 GitHub/本機/Drive 均查無實體，經 Perth 2026-07-19 確認：baseline 自抓 live main，收官附 remote SHA)。
- Baseline：`perhaps8511-lab/mingge-line` `origin/main` HEAD `65ff3e1764a8bb4411a308da947bd53e09d6bf7a`（fresh clone，非本機舊副本）。
- 唯一改動檔：`index.html`。禁碰凍結區（起卦演算法/gua_result/qigua_time +08:00/墨綠金美學/金色符號環/Dify prompt/lao_yi 命名）、禁動卦問/信箋/卦記/四鏡任何頁面。
- OA 加好友短鏈（Perth 2026-07-19 提供，公開連結非機密）：`https://lin.ee/pWlYLBe`

## 工項 A｜E52 第四分類 tab「讀卦隨筆」

現況分析：`STUDY_CATS`（行 745）驅動兩件事 —— ① `studyRenderCover()` 用它跑迴圈產生分類籤，`if(!arr||!arr.length){return;}` 已保證空分類零出現（既有 E42 驗收②行為）；② `initStudyPage()` 用它把 relay 回傳的 `content_type` 分組進 `studyState.byCat`。兩處邏輯皆用陣列驅動、對分類名稱無寫死分支。

**變更**：`STUDY_CATS` 陣列末端加入 `'讀卦隨筆'`，共一行、零其他程式碼變動。

驗收對應：
- A1：一旦 relay `/study` 回傳 `content_type=讀卦隨筆` 且 `qc_passed=true` 的篇目（Perth 終審後），該分類自動掛籤、可點入列表與閱讀頁 —— 沿用既有三層渲染，零新程式碼。
- A2：現況全數 dg 篇 `qc_passed=false`（Airtable 現狀），relay 不會回傳（比照現行三分類的 qc 閘），`byCat['讀卦隨筆']` 為空陣列 → 既有「空籤零出現」邏輯生效，tab 不顯示、不壞版、不拋錯。
- A3：三既有分類的渲染函式、DOM、CSS 全未變動 → 逐行 diff 可證零回歸。
- A4：沿用既有三層導覽/字級/行距，零新樣式。

## 工項 B｜E48 書房分享卡

### B-1 新增常數

在 `RELAY_URL`（行 1425）常數區塊新增：
```js
const OA_ADD_FRIEND_URL = "https://lin.ee/pWlYLBe";  // E48 書房分享卡 · OA 加好友短鏈（Perth 2026-07-19 提供）
```

### B-2 分享文案組字（逐字模板，禁改寫）

派工卡凍結模板：
```
【易經書房】{篇名}

{該篇古典引文一句}

—— 易經書房 · 命格
{加好友連結}?src=share
```

引文抽取：重用既有 `STUDY_QUOTE_RE`（行 747，已用於 `studyParagraph` 標記古典引文的同一份白名單正則），逐段（`body.split('\n')`）掃描，回傳第一個命中的引文（含書名號/引號本身）。抽不到 → 回傳空字串，呼叫端整行省略（含省略後多餘的空行，維持格式不壞）。

```js
function studyShareQuote(body){
  var lines=(body||'').split('\n');
  for(var i=0;i<lines.length;i++){
    var m=lines[i].match(STUDY_QUOTE_RE);
    if(m){ return m[1]; }
  }
  return '';
}
function studyBuildShareText(a){
  var lines=['【易經書房】'+(a.title||''),''];
  var quote=studyShareQuote(a.body);
  if(quote){ lines.push(quote); lines.push(''); }
  lines.push('—— 易經書房 · 命格');
  lines.push(OA_ADD_FRIEND_URL+'?src=share');
  return lines.join('\n');
}
```

### B-3 分享動作（技術選型：LIFF 優先、URL fallback）

```js
async function studyShareArticle(gidx){
  var a=studyState.articles[gidx]; if(!a){ return; }
  var text=studyBuildShareText(a);
  try{
    if(typeof liff==='undefined'){ throw new Error('LIFF unavailable'); }
    await liff.init({liffId:LIFF_ID});
    if(!(liff.isInClient && liff.isInClient())){ throw new Error('not in LINE client'); }
    if(typeof liff.shareTargetPicker!=='function'){ throw new Error('shareTargetPicker unavailable'); }
    await liff.shareTargetPicker([{type:'text',text:text}]);
  }catch(e){
    var url='https://line.me/R/share?text='+encodeURIComponent(text);
    try{ window.open(url,'_blank'); }catch(_){ location.href=url; }
    console.warn('[study share fallback]',e && e.message?e.message:e);
  }
}
```

`liff.shareTargetPicker` 使用者取消時 resolve 為 `null`（非錯誤），本函式不視為失敗、不觸發 fallback（fallback 僅在 API 不可用/丟例外時觸發）。

### B-4 HTML：閱讀頁尾新增按鈕

`#studyRead` 的 `.study-signpost`（行 663-682）內，路標句（`<p>讀到一處…</p>`）之後、`.ask-actions` 內既有兩鈕（`拿這篇問老易` / `向天問卦`）之後追加第三鈕，沿用既有 `.ask-secondary` class（零新 CSS，字級/行距與既有鈕一致，滿足 E47 硬約束＋B5 不動既有排版）：
```html
<button type="button" class="ask-secondary" id="studyShareBtn">分享這一篇</button>
```

### B-5 綁定

`studyRenderRead(gidx,from)` 內，比照既有 `ask.onclick` 綁定模式，追加：
```js
var shareBtn=document.getElementById('studyShareBtn');
if(shareBtn){ shareBtn.onclick=function(){ studyShareArticle(gidx); }; }
```

### 驗收對應

- B1（結構性排除）：新增的 HTML/JS 僅落在 `#page-study` → `#studyRead` → `.study-signpost` 內；`#page-log`（卦記）、`#page-about`（問老易/信箋類）、深卜/四鏡（不在本檔內，另頁）皆未觸碰 → grep `studyShareBtn`/`OA_ADD_FRIEND_URL` 僅命中 study 區塊，零跨頁滲出。
- B2：任選一篇有引文的書房文章（現行 28 篇 rj/jq 系列多數含古典引文）點擊分享 → 文案＝篇名+引文+品牌行+連結，連結帶 `?src=share`。
- B3：`wh` 系列（時節問候，無卦引）：`studyShareQuote` 逐段掃描 `STUDY_MARK` 白名單無命中 → 回傳空字串 → 引文行與其後空行一併省略，格式維持「標題/空行/品牌行/連結」四行、不壞版。
- B4：`src=share` 觀測落點屬既有 E30 五來源 share 語境 + E39 觀測欄機制，兩者皆為 LINE 平台 follow-webhook / 後端事件層，不在 `index.html` 範圍內；本次改動僅負責讓分享出去的連結正確帶 `?src=share` 後綴，滿足「wiring」義務。B4 的「結構性限制 WARN」（LINE 平台對 OA 加好友→日後開 LIFF 無保證傳遞 src 狀態）為 S166 卡已載明的平台限制，非本次施工可解，Perth 保留否決權。
- B5：新按鈕僅**追加**於 `.ask-actions` 現有兩鈕之後，未刪改既有任何元素/樣式/DOM 順序 → diff 佐證零位移。

## 版本指紋同步

`<title>`（行 6）與 `.foot`（行 739）版本字串由 `v1.5.1` bump 為 `v1.6.0`，footer 括號註記由 `(E30/E46 書房的來法五卡)` 改為 `(E48/E52 書房分享卡+讀卦隨筆)`。理由：E35 教訓 —— 指紋不 bump 會變成無法區分部署前後的化石版本號。

## 測試（headless，取代原卡 A1-A4/B1-B5 逐項 + 既有回歸）

以 Node 內建 `assert` 撰寫 `tests/test_e48_e52_shufang.js`，靜態解析 `index.html`：

1. STUDY_CATS 含四分類、順序 `['節氣信','人際小文','時節問候','讀卦隨筆']`。
2. `OA_ADD_FRIEND_URL` 常數存在且值為 `https://lin.ee/pWlYLBe`。
3. `studyShareBtn` 僅出現在 `#page-study` 區塊內（用字串索引比對 `#page-study`/`#page-log`/`#page-about` 邊界），`#page-log`、`#page-about` 內容零命中 `studyShareBtn`/`分享這一篇`/`OA_ADD_FRIEND_URL`。
4. 模擬 `studyBuildShareText`/`studyShareQuote` 邏輯（以同一份 regex 抽出函式原始碼並 `new Function` 執行，或以 Node 直接 require 邏輯片段）跑：
   - 一篇含古典引文的既有 rj/jq 篇章 body → 輸出含引文行 + `?src=share` 連結。
   - 一篇 wh 純問候 body（零卦引）→ 輸出零引文行、格式四行、零壞版（無連續三個以上換行、結尾為連結）。
5. `.foot`/`<title>` 版本字串 = `v1.6.0`。
6. 既有三分類（節氣信/人際小文/時節問候）相關函式（`studyRenderCover`/`studyRenderList`/`studyRenderRead`/CSS class `.study-tag`/`.study-card`/`.sr-body`）逐行 diff 比對 baseline（65ff3e1 版 index.html），確認零變動（僅 STUDY_CATS 陣列/常數區/`.ask-actions` 新增/版本字串 4 處變動，其餘全等）。

## 部署

一次 commit（訊息含 E48+E52），push 至 `perhaps8511-lab/mingge-line` `main`，確認 GitHub Pages deploy 成功，記錄 commit SHA 與 Pages run 結果。

## Round 1 審查(Codex CLI 環境不可用,替代作法見下)

Codex CLI 在本機環境對此帳號回報 `model X is not supported when using Codex with a ChatGPT account`(已試 gpt-5.6-sol/gpt-5-codex/gpt-5/gpt-5.1/gpt-5.1-codex/o3/o4-mini 共 7 種模型名,皆同一錯誤;非額度或安裝問題,是帳號層模型白名單限制)。依 Skill 鐵律本應標 `BLOCKED-B1 codex-cli-unavailable` 停手回報。Perth 已在對話中裁示改採「獨立 subagent 對抗式審查」替代 Codex 互審,本回合以此為準,並在最終回報中向 Perth 揭露此替代事實。

獨立 reviewer(無本對話上下文,自行讀取 fresh clone 的 index.html + worker.js + 既有 plans/plan_e42_shufang_v0_1.md 交叉核實)回報 2 BLOCKER + 6 SUGGEST：

1. **[BLOCKER] window.open fallback 在最常見失敗路徑(非 LINE 環境)靜默失效**：`await liff.init()`/`await liff.shareTargetPicker()` 之後才呼叫的 `window.open()` 已脫離使用者手勢(user gesture)同步鏈，行動版瀏覽器/webview 常見靜默擋下且不拋錯，`try/catch` 永遠不會走到 fallback 的 fallback。**採納**：改用與全檔既有慣例一致的 `location.href=url`(同步賦值不拋錯，檔內既有跨頁導覽 4 處皆用此手法)，砍掉 `window.open`。
2. **[BLOCKER] 新 liff.init() 呼叫未依既有慣例做 liffReady 旗標防護**：檔尾 1842-1846 行明載 E09 事故根因 —— 同頁面兩個 `liff.init()` 呼叫「搶跑」(race)時第二個呼叫會卡死不 resolve 不 reject。既有 `recoverLiffToken()`(1713-1716 行)已用 `if(!liffReady){ await liff.init(...); liffReady=true; }` 這個既有全域旗標(1551 行 `let liffReady=false,...`)防護；原計畫的 `studyShareArticle` 直接裸呼叫 `liff.init()`，未查旗標，在同頁面新增了第二個獨立觸發點(既有「拿這篇問老易」鈕之外)。**採納**：`studyShareArticle` 改用同一顆 `liffReady` 旗標防護，並在呼叫期間 disable 分享鈕本身(防同鈕快速連點觸發搶跑，做法比照既有送出鈕 1674-1675 行 disable 慣例)。跨鈕(分享×拿這篇問老易 兩鈕互踩)的搶跑窗口極窄(需兩鈕在同一 tick 內先後點擊、皆早於各自 await 解析)，且修既有 `sendAskLaoyiIntent` 不在本卡範圍(該函式為共用邏輯，跨頁使用，改它需額外回歸驗證，逾越「僅動 index.html 兩工項範圍」的範圍守門)——本次僅將新增程式碼收斂到最安全寫法，殘餘的極窄跨鈕競態風險在回報中向 Perth 揭露，不隱匿。
3. [SUGGEST] worker.js 第 147 行 `filterByFormula: {qc_passed}=1` **已證實** relay `/study` 端點本就伺服端過濾 `qc_passed`，A2 假設成立(非未驗證臆測，修正計畫敘述為「已核 worker.js 源碼證實」)。**採納**，更新 A2 佐證。
4. [SUGGEST] B4 原敘述「沿用既有 E30 五來源」用詞失準(`_payCtxMap` 只認 zero/deepdive/fupan，與 OA 加好友歸因無關，`src=share` 是本次新約定的參數值，非既有機制之重用)。**採納**，改為誠實敘述：僅負責把 `?src=share` 正確帶上，伺服端如何歸因/落 E39 觀測欄不在 index.html 範圍。
5. [SUGGEST] `.study-signpost` 精確行號應為 669-680(非 663-682，後者是整個 `#studyRead` 範圍)。**採納**，僅為文件精確度修正，不影響程式碼。
6. [SUGGEST] 標題/引文無長度上限，可能拉長 fallback URL。**不採納**：S163 模板逐字凍結禁改寫，現有內容庫標題/引文實測皆短(≤20 字/含引文≤30 字內)，人為截斷凍結文案風險大於長 URL 的邊際風險，留待真機若真出現超長篇再議。
7. [SUGGEST] 用 `liff.isApiAvailable('shareTargetPicker')` 取代 `typeof` 檢查，較貼合 LINE 官方文件寫法。**採納**。
8. [SUGGEST] 測試檔命名應循既有 `tests/test_*.sh`(既有 5 支測試皆 shell + Node vm 慣例，非 `.js`)。**採納**，改寫測試段落見下。

## 最終實作（取代原 B-2/B-3/B-4/B-5，已納入 round 1 修正）

```js
/* E48 書房分享卡:引文抽取(重用 STUDY_QUOTE_RE)+ 文案組字(逐字模板,禁改寫)*/
function studyShareQuote(body){
  var lines=(body||'').split('\n');
  for(var i=0;i<lines.length;i++){
    var m=lines[i].match(STUDY_QUOTE_RE);
    if(m){ return m[1]; }
  }
  return '';
}
function studyBuildShareText(a){
  var lines=['【易經書房】'+(a.title||''),''];
  var quote=studyShareQuote(a.body);
  if(quote){ lines.push(quote); lines.push(''); }
  lines.push('—— 易經書房 · 命格');
  lines.push(OA_ADD_FRIEND_URL+'?src=share');
  return lines.join('\n');
}
/* LIFF 優先(liffReady 旗標防護,同既有 recoverLiffToken 慣例,防 E09 同頁雙重初始化搶跑)
   fallback = location.href(同步賦值不拋錯,同既有跨頁導覽慣例;不用 window.open,
   避免 await 之後脫離使用者手勢鏈被行動瀏覽器靜默擋下卻不拋錯) */
async function studyShareArticle(gidx,btnEl){
  var a=studyState.articles[gidx]; if(!a){ return; }
  var text=studyBuildShareText(a);
  if(btnEl){ btnEl.disabled=true; }
  try{
    if(typeof liff==='undefined'){ throw new Error('LIFF unavailable'); }
    if(!liffReady){ await liff.init({liffId:LIFF_ID}); liffReady=true; }
    if(!(liff.isInClient && liff.isInClient())){ throw new Error('not in LINE client'); }
    if(!(liff.isApiAvailable && liff.isApiAvailable('shareTargetPicker'))){ throw new Error('shareTargetPicker unavailable'); }
    await liff.shareTargetPicker([{type:'text',text:text}]);
  }catch(e){
    location.href='https://line.me/R/share?text='+encodeURIComponent(text);
    console.warn('[study share fallback]',e && e.message?e.message:e);
  }finally{
    if(btnEl){ btnEl.disabled=false; }
  }
}
```

HTML(`#studyRead` 的 `.study-signpost`,669-680 行,`.ask-actions` 內既有兩鈕之後追加第三鈕):
```html
<button type="button" class="ask-secondary" id="studyShareBtn">分享這一篇</button>
```

綁定(`studyRenderRead(gidx,from)` 內,比照既有 `ask.onclick` 綁定模式追加):
```js
var shareBtn=document.getElementById('studyShareBtn');
if(shareBtn){ shareBtn.onclick=function(){ studyShareArticle(gidx,shareBtn); }; }
```

<!-- CODEX-REVIEW: APPROVED (substitute independent adversarial subagent review, Codex CLI unavailable in this environment — see Round 1 note above; 2 BLOCKER resolved, 6 SUGGEST triaged) -->
