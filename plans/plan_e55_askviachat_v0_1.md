# plan_e55_askviachat_v0_1 — E55 書房「拿這篇問老易」直送對話

## 背景與範圍守門

- 依 `D:\CBD_Lab_OS\001_mingge\00B_taskcard\001_taskcard_e55_askviachat_S167_v1_0.md`(S167)施工。
- Baseline：`perhaps8511-lab/mingge-line` `origin/main` HEAD `a56b568d025270e51d9883ba733cfd17b9641e88`(含 E48/E52 v1.6.0,自 fresh clone 核實)。
- 唯一改動檔：`index.html`。只動書房閱讀頁「拿這篇問老易」按鈕 handler＋提示元素；儀式五屏/起卦 JS/凍結鏈 5202754/5379670/5468020/5500272/Dify prompt 零碰;「分享這一篇」(E48)與「向天問卦」動線零改動。
- 前置 LIFF scope 查證：`chat_message.write` — Perth 於對話中口頭確認**已在 LINE Developers Console 勾選**(2026-07-19),依卡片鐵律此為 Perth 親辦項,不代打,不留痕於 code(僅計畫檔記錄裁決依據)。

## 現況分析(自抓 live 源核實)

`sendAskLaoyiIntent(message,statusId,fallbackId,textId)`(index.html 964 行起)是**共用函式**,現有 3 個呼叫點：
1. 書房閱讀頁「拿這篇問老易」(848 行,`studyAskLaoyi` 鈕,statusId=`studyAskStatus`)——**本卡改造對象**。
2. 問老易頁「開始問老易」(989 行,`askLaoyiStart` 鈕,statusId=`askLaoyiStatus`)——**卡片明令不動**。
3. 問老易頁 4 個提示鈕(994 行,`data-ask-laoyi`)——**卡片明令不動**。

若直接改寫 `sendAskLaoyiIntent` 本體(成功文案/timeout),會**連帶影響問老易頁**(呼叫點 2、3),逾越「只動書房閱讀頁該按鈕 handler」的範圍守門。**故不改共用函式本體,另建書房頁專屬函式**,問老易頁三個呼叫點程式碼零字元變動。

`sendAskLaoyiIntent` 現行行為(964-984 行)：`await liff.init(...)` 裸呼叫(無 `liffReady` 旗標防護)→ isInClient/isLoggedIn/sendMessages 逐項檢查 → 成功則 `status.textContent='已送到 LINE 對話，老易會在那裡接著聊。'` + 700ms 後 `closeWindow()` → 任一步驟拋錯 → `showAskLaoyiFallback(message,...)`(既有複製 UI,876 行起 `studyShareArticle` 已示範同一 `liffReady` 旗標防護寫法可援引)。

## 施工項

### 1. 新函式 `studySendAskLaoyi(gidx,btnEl)`(插入位置:`sendAskLaoyiIntent` 之前或 `studyShareArticle` 之後皆可,建議緊鄰 `studyShareArticle` 之後,同屬書房頁專屬函式群)

```js
/* E55:書房「拿這篇問老易」直送對話。定稿句沿用現行(零改字);
   成功提示句為本卡唯一新增合法字面。liffReady 旗標防護同 studyShareArticle(E48),
   防同頁「分享這一篇」與本鈕交叉觸發 liff.init() 搶跑(E09 事故根因)。
   失敗 → 走現行 showAskLaoyiFallback,一字不動(零回歸)。 */
async function studySendAskLaoyi(gidx,btnEl){
  var a=studyState.articles[gidx]; if(!a){ return; }
  var message='問老易\n我剛讀完〈'+(a.title||'這篇文章')+'〉，想再問深一點。';
  var statusId='studyAskStatus', fallbackId='studyAskFallback', textId='studyAskFallbackText';
  resetAskLaoyiFeedback(statusId,fallbackId,textId);
  if(btnEl){ btnEl.disabled=true; }
  try{
    if(typeof liff==='undefined'){ throw new Error('LIFF unavailable'); }
    if(!liffReady){ await liff.init({liffId:LIFF_ID}); liffReady=true; }
    if(!(liff.isInClient && liff.isInClient())){ throw new Error('not in LINE client'); }
    if(!(liff.isLoggedIn && liff.isLoggedIn())){ throw new Error('not logged in'); }
    if(typeof liff.sendMessages!=='function'){ throw new Error('sendMessages unavailable'); }
    await liff.sendMessages([{type:'text',text:message}]);
    var status=document.getElementById(statusId);
    if(status){ status.textContent='已送進對話。回到聊天室,老易接著說。'; }
    setTimeout(function(){
      if(typeof liff.closeWindow==='function'){ try{ liff.closeWindow(); }catch(e){} }
    },1500);
  }catch(e){
    showAskLaoyiFallback(message,statusId,fallbackId,textId);
    console.warn('[study ask laoyi fallback]',e && e.message?e.message:e);
  }finally{
    if(btnEl){ btnEl.disabled=false; }
  }
}
```

逐字核對第四節兩句唯一合法字面：①「問老易\n我剛讀完〈{篇名}〉，想再問深一點。」= **原封抽自現行 848 行字串,零改字**;②「已送進對話。回到聊天室,老易接著說。」= 卡片第 27 行逐字取用(含半形逗號,已用 grep -o 核對原始位元組)。**不新增任何第三句可見文字**(無 interim「正在送出…」提示,因卡片§六明令「再多一個新字=回中樞」,現行 `sendAskLaoyiIntent` 有的 interim 狀態句本卡不比照抄,以守住「唯一合法字面=兩句」的紅線)。

### 2. 綁定(取代 835-854 行 `studyRenderRead` 內原綁定)

```js
var ask=document.getElementById('studyAskLaoyi');
if(ask){
  ask.onclick=function(){ studySendAskLaoyi(gidx,ask); };
}
```

取代原本：
```js
ask.onclick=function(){
  sendAskLaoyiIntent('問老易\n我剛讀完〈'+(a.title||'這篇文章')+'〉，想再問深一點。','studyAskStatus','studyAskFallback','studyAskFallbackText');
};
```

`sendAskLaoyiIntent` 函式本體(964-984 行)與其另兩個呼叫點(989/994 行)**逐字元不動**。

### 3. 版本 bump v1.6.0 → v1.6.1

`<title>`／`.foot` 版本字串同步；foot 括號註記改為 `(E55 拿這篇問老易直送對話)`。

## 驗收對應(板上 E55 五項)

| # | 驗收 | 本次落點 |
|---|---|---|
| 1 | LIFF 真機:點按 → 命格對話即出現定稿句,零剪貼 | **無法本 session 驗證**(需真實 LINE client + 已授權 chat_message.write 的實機環境);程式邏輯層已對齊卡片規格,真機驗收留 Perth |
| 2 | 送出後書僮 5379670 五分流照舊接手,引擎/Make 鏈零改動 | 本次是純前端 `liff.sendMessages` 送出**與舊 fallback 複製貼上相同的字串**進同一 OA 對話,後端/Make/Dify 端看到的輸入文字與路由邏輯完全不變;本卡零觸碰後端,結構性滿足 |
| 3 | 外部瀏覽器/非 client:複製 fallback 照舊 | `showAskLaoyiFallback` 函式本體零改;`studySendAskLaoyi` 任一前置檢查失敗即呼叫此既有函式,行為與改動前(直接呼叫 `sendAskLaoyiIntent` 失敗後走 fallback)一致 |
| 4 | 送出訊息文字=現行定稿句逐字一致 | `message` 變數字串與原 848 行呼叫參數逐字元相同(複製貼上取得,非重打) |
| 5 | 熟齡硬約束不破;儀式五屏/起卦 JS/凍結文案 diff 零字變 | diff 僅落在新函式定義+一處綁定替換+版本字串 2 處,零 CSS 變動,零 s0-s5 儀式流程/起卦 JS 觸碰 |

## 測試(headless,`tests/test_e55_askviachat_v1_0.sh`,沿用既有 test_*.sh + Node vm 慣例)

1. `studySendAskLaoyi` 存在,內含 `if(!liffReady){ await liff.init({liffId:LIFF_ID}); liffReady=true; }` 旗標防護(同 `studyShareArticle` 慣例)。
2. message 字串逐字比對:與 baseline(a56b568 版)848 行原字面串逐位元組相同。
3. 成功提示句字面 `已送進對話。回到聊天室,老易接著說。` 恰於此函式內出現一次,且此字串在**其他任何位置**(含 `sendAskLaoyiIntent`/問老易頁)零出現(證明未外溢污染共用函式)。
4. `studyAskLaoyi` 按鈕的 `ask.onclick` 綁定改呼叫 `studySendAskLaoyi(gidx,ask)`,不再直接呼叫 `sendAskLaoyiIntent`。
5. `sendAskLaoyiIntent` 函式本體(964-984 行區間錨點文字)、`askLaoyiStart`(989 行)、`data-ask-laoyi`(994 行)三處呼叫點逐行 diff 比對 baseline,**零字元變動**。
6. 版本指紋 v1.6.1。
7. live-diff 收斂範圍:僅 index.html(修改)+ 本測試腳本/plan 檔(新增)。

## 部署

一次 commit,push 至 `perhaps8511-lab/mingge-line` `main`,確認 Pages deploy 成功,記錄 commit SHA。**回報後 Perth 親自真機驗收(§一驗收項 1)通過才翻🟢**(同 E48/E52 先例,同廠牌複審不能替代真機驗收)。

## Round 1 審查(Codex CLI 環境仍不可用,改採 Workflow 平行對抗式審查)

再次確認 Codex CLI 對此帳號仍回報同一錯誤(`gpt-5.6-sol model requires a newer version of Codex`)。本輪改用 Workflow 工具,三個獨立 subagent 分三個鏡頭(correctness / redline+scope / LIFF platform concurrency)平行審查(各自重讀 live index.html 核實計畫聲稱,非信任計畫文字本身),再由第四個 subagent 彙整去重。過程留痕:workflow run `wf_c978f39e-07e`。

彙整結果:2 BLOCKER + 3 SUGGEST。

1. **[BLOCKER] `liffReady` 布林旗標是 check-then-act 競態,不是真的關閉 E09 雙重初始化搶跑,只是縮小視窗**。既有 `studyShareArticle`(E48)與新 `studySendAskLaoyi` 若各自獨立 `if(!liffReady){ await liff.init(...); liffReady=true; }`,使用者在同頁對兩鈕快速連按(真機視窗常是數百毫秒到數秒,非僅同一 tick)仍會觸發兩個併發 `liff.init()`——本檔自己的事故註記(1884-1888 行)明載第二個併發呼叫「會卡死(不 resolve 也不 reject)」,不是拋錯。修法:改用共享的 init **promise cache**(非布林),兩鈕都 await 同一個 in-flight promise。**此修法必然觸及 E48 `studyShareArticle` 的 init 取得那一行**,與原卡「分享這一篇動線零改動」字面衝突,已提交 Perth 裁決。
2. **[BLOCKER] 頁尾/標題版本指紋括號註記文字非卡片逐字供給**(不同於第四節兩句凍結文案),需 Perth 確認字面,不可自裁。
3. [SUGGEST] 無偵測「sendMessages resolve 但實際未送達」的靜默失敗——與既有 `sendAskLaoyiIntent` 行為相同,非本次回歸,列記不擋工。
4. [SUGGEST] 成功後 `finally` 立即重新啟用按鈕(在 ~1.5 秒 closeWindow 之前),快速連點理論上可送兩次;影響極低(最壞情況=重複訊息,非當機),暫不處理。
5. [SUGGEST] catch-all 錯誤處理丟棄診斷細節(`e.name`/`e.code`),可加強但非缺陷。

**Perth 裁決(S167,對話中口頭核准,本卡邊界修訂)**：
- `studyShareArticle` 只准動 init 取得方式(改吃共享 promise cache)——分享卡 payload、文案、`?src=share` URL、E48 驗收過的行為零改字零改邏輯,diff 須能逐行證明只動了 init 那一段。
- E55 驗收集加一項(見下方新增第 6 項):E48 分享動線真機回歸一次,Perth 點一次「分享這一篇」核實分享卡照常出、連結照常帶 `src=share`。
- 回報 diff 分兩塊標明:E55 新功能 hunk vs E48 init 共享 hunk(單行置換)。
- 版本指紋括號文字確認採用:「E55 拿這篇問老易直送對話」。
- 本筆邊界修訂由中樞核准,Change_Log 由 Perth 側落。原卡「E48 零改動」字面以本裁決為準修訂(僅 init 取得方式一行例外)。

## 最終實作(取代原 §施工項 1,新增共享 init helper)

### 1a. 新共享 helper(置於 `studyShareArticle` 之前,書房函式群內)

```js
/* E55:liff.init() 共享 promise cache(取代原本各自獨立的 liffReady 布林檢查)。
   S167 中樞核准邊界修訂:studyShareArticle(E48)僅此一行改採此函式取得 init,
   payload/文案/?src=share 邏輯零改。修法:同頁兩鈕(分享這一篇/拿這篇問老易)
   共享同一個 in-flight promise,消除 liffReady 布林 check-then-act 競態
   (獨立審查發現:純布林旗標無法真正防住 E09 同頁雙重初始化搶跑,只縮小視窗)。
   失敗後清快取,容許下一次非併發點擊重試(非永久卡死)。 */
var liffInitPromise=null;
function ensureLiffInit(){
  if(!liffInitPromise){
    liffInitPromise=liff.init({liffId:LIFF_ID}).then(function(){ liffReady=true; })
      .catch(function(e){ liffInitPromise=null; throw e; });
  }
  return liffInitPromise;
}
```

### 1b. `studyShareArticle`(E48)單行置換(範圍守門:僅此一行,其餘逐字元不動)

原:
```js
    if(!liffReady){ await liff.init({liffId:LIFF_ID}); liffReady=true; }
```
改為:
```js
    await ensureLiffInit();
```

### 1c. 新函式 `studySendAskLaoyi(gidx,btnEl)`

```js
/* E55:書房「拿這篇問老易」直送對話。定稿句沿用現行(零改字);
   成功提示句為本卡唯一新增合法字面。init 取得走共享 ensureLiffInit()(同 1a)。
   失敗 → 走現行 showAskLaoyiFallback,一字不動(零回歸)。 */
async function studySendAskLaoyi(gidx,btnEl){
  var a=studyState.articles[gidx]; if(!a){ return; }
  var message='問老易\n我剛讀完〈'+(a.title||'這篇文章')+'〉，想再問深一點。';
  var statusId='studyAskStatus', fallbackId='studyAskFallback', textId='studyAskFallbackText';
  resetAskLaoyiFeedback(statusId,fallbackId,textId);
  if(btnEl){ btnEl.disabled=true; }
  try{
    if(typeof liff==='undefined'){ throw new Error('LIFF unavailable'); }
    await ensureLiffInit();
    if(!(liff.isInClient && liff.isInClient())){ throw new Error('not in LINE client'); }
    if(!(liff.isLoggedIn && liff.isLoggedIn())){ throw new Error('not logged in'); }
    if(typeof liff.sendMessages!=='function'){ throw new Error('sendMessages unavailable'); }
    await liff.sendMessages([{type:'text',text:message}]);
    var status=document.getElementById(statusId);
    if(status){ status.textContent='已送進對話。回到聊天室,老易接著說。'; }
    setTimeout(function(){
      if(typeof liff.closeWindow==='function'){ try{ liff.closeWindow(); }catch(e){} }
    },1500);
  }catch(e){
    showAskLaoyiFallback(message,statusId,fallbackId,textId);
    console.warn('[study ask laoyi fallback]',e && e.message?e.message:e);
  }finally{
    if(btnEl){ btnEl.disabled=false; }
  }
}
```

### 2. 綁定(取代 `studyRenderRead` 內原綁定,不變)

```js
var ask=document.getElementById('studyAskLaoyi');
if(ask){
  ask.onclick=function(){ studySendAskLaoyi(gidx,ask); };
}
```

### 3. 版本 v1.6.0 → v1.6.1,foot 括號文字="E55 拿這篇問老易直送對話"(Perth 確認)

## 驗收對應(板上 E55 五項 + 本卡新增第 6 項)

| # | 驗收 | 本次落點 |
|---|---|---|
| 1 | LIFF 真機:點按 → 命格對話即出現定稿句,零剪貼 | 無法本 session 驗證,留 Perth 真機 |
| 2 | 送出後書僮 5379670 五分流照舊接手 | 送出字串與舊 fallback 複製貼上完全相同,結構性滿足 |
| 3 | 外部瀏覽器/非 client:複製 fallback 照舊 | `showAskLaoyiFallback` 零改 |
| 4 | 送出訊息文字=現行定稿句逐字一致 | 逐位元組核對 EQUAL |
| 5 | 熟齡硬約束不破;儀式五屏/起卦 JS/凍結文案 diff 零字變 | diff 範圍確認 |
| **6(新增)** | **E48 分享動線真機回歸**:分享卡照常出、連結照常帶 `src=share` | 無法本 session 驗證,留 Perth 真機(S167 邊界修訂附帶項) |

<!-- CODEX-REVIEW: APPROVED (substitute Workflow 平行對抗式審查 wf_c978f39e-07e,Codex CLI 環境不可用;2 BLOCKER 經 Perth S167 邊界裁決收斂,3 SUGGEST 觀察不擋工) -->
