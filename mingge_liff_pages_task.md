# 命格 LIFF 四頁建置任務包(格2 三區 + 格3/4/5)

> 自足文件。Claude Code 讀這份 + 同資料夾的 `index.html`(現有進場儀式檔,需要你去 `/mnt/project/index.html` 或 Perth 給的 repo 抓)即可動工。
> 產出於 2026-07-02,命格 BU。所有 Airtable base/table/field ID、Make webhook payload 皆為**本次直接查證的真實值**(非憑記憶推測)——查證方式與來源列在每節「佐證」處,供覆核。

---

## 0. 全域路由(index.html 要加的東西)

現況:`index.html` 全檔案**零處**讀取 `URLSearchParams` 或 `?action=`,所有入口一律落在起卦首頁。要加:

```js
const params = new URLSearchParams(window.location.search);
const action = params.get('action'); // divine | log | pay | study | about
// action=divine 或空值 → 現有起卦首頁邏輯(不動)
// action=log    → 渲染格2「我的卦記」hub(見§1)
// action=pay    → 渲染格3「訂閱方案」(見§2)
// action=study  → 渲染格4「易經書房」(見§3)
// action=about  → 渲染格5「老易介紹」(見§4)
```
四個新頁可以是同一個 `index.html` 內的條件渲染區塊,也可以拆成獨立 html(各自 liff.init 同一個 LIFF_ID `2010192384-9AwjI8qH`)——哪種好由 Claude Code 判斷現有程式碼結構,兩種都行,不強制。

---

## 1. 格2「我的卦記」= 回看 hub(三區)

**真相源**:`mingge_richmenu_6grid_copy_v0_6.md` §格2(S121 定案,配置A)。三區共用同一張 `Divination_Log`。

### 資料表(已查證)
- Base:`CBD_Lab_命格` `apptFfyVBYE4ygW3E`
- 表:`Divination_Log` `tblVyf8WfTQxvtpEg`
- 求問者判定用 `line_user_id_raw`(singleLineText,原始 LINE userId,不透過 link 查詢,避免 0-bundle 斷鏈——這是既有複盤鏈 5500272 的查詢方式,沿用同一套)
- 會員狀態表:`Subscribers` `tbljXninuBm76D9nf`,關鍵欄位:`subscriber_tier`(free/subscriber)、`trial_quota_remaining`、`monthly_quota_remaining`、`quota_reset_date`

### 區① 歷史卦例
- **查詢**:`Divination_Log` filter `line_user_id_raw = {當前LIFF使用者的userId}`,依 `created_at` 倒序,`entry_type = "divination"`(排除 `mood` 心情卦,§v0.6 已定義兩型)。
- **每筆顯示**:`question_text`(當時所問)、`ben_gua`/`bian_gua`(本卦變卦)、`dong_yao`(動爻)、`qigua_time`。
- **餘額顯示(分層,依 copy v0.6)**:
  - `Subscribers.subscriber_tier = "free"` → 顯示「尚餘 {`trial_quota_remaining` + `monthly_quota_remaining`} 枚問卦銅錢」
  - `subscriber_tier = "subscriber"` → 顯示「訂閱中,書房為您常開(有效至 {`subscription_start`+週期換算的到期日})」,**不顯次數**
- 🔴 **卜法料注意(承 S120,copy v0.6 已提醒)**:歷史區要讀的是「主卜卦」軌跡;`entry_type` 欄位可用來排除深卜/複盤產生的衍生記錄(`entry_type` 現有值:`divination`/`mood`;深卜/複盤寫入時另有 `deepdive`/`fupan` 標記,見下方 §2 佐證的 module 9 寫入樣本)——**這three-way 篩選要在 Claude Code 實作時對照 Divination_Log 實際存量資料再校一次**,現有 schema 沒有專門的「主卜卦 vs 深卜/複盤」旗標欄位,可能要新增或用 `entry_type` 枚舉值判斷,這點請 Claude Code 建置時先 dump 一批真實資料看 `entry_type` 實際填了哪些值再定篩選邏輯,不要憑本文件推測值域。

### 區② 對任一過往卦・四鏡深卜(+200)
- **行為**:歷史卦例列表裡,每筆旁邊一個「深卜這一卦」按鈕 → 呼叫 Make webhook 觸發 `命格_06_深卜鏈`(scenario 5468020,hookId 2490537)。
- **真實 payload 契約**(已查證 Make blueprint 的 sample data,非猜測):
  ```json
  {
    "ben_gua": "乾為天",
    "session_id": "唯一值,建議 deepdive-{timestamp}-{隨機}",
    "line_user_id": "U...(LIFF 拿到的真實 userId)",
    "question_text": "沿用該筆歷史卦例當時的 question_text,或讓TA重新輸入一句"
  }
  ```
- **這條鏈是非同步 push**:呼叫後鏈會自己跑 Worker(`mingge-gua-derive`)算四鏡 → Dify v4.4 → **直接 push 四鏡 Flex 卡回 LINE 聊天室**,**不是**同步回傳內容給 LIFF 頁面渲染。所以 LIFF 頁面這端只需要:呼叫成功後顯示「老易已收到,為你把這一卦往裡再讀四鏡,請回 LINE 聊天室查看」,然後可以讓 TA 關閉 LIFF 視窗。
- 🔴 **誠實缺口,不是我漏做,是這段真的還沒接**:**+200 的收費動作,在這條 Make 鏈裡完全不存在**——我查過整條 blueprint,沒有任何金流/扣款/quota 檢查模組。也就是說,目前技術上「挑任一過往卦深卜」這個入口一旦做出來,**任何人都能免費觸發**,沒有 +200 的收費閘,也沒有封頂 349 的檢查。這件事**必須先解決付款/授權邏輯**才能上線,不能只做 UI。可能做法(待 Perth 拍板,我不擅自選):
  - (a) LIFF 頁面先跳 Oen 收 200 元,收款成功回拋才觸發 webhook(仿現有 149 單卜金流模式)
  - (b) 先記帳後補收(不建議,現金流風險)
  - (c) 訂閱戶(`subscriber_tier=subscriber`)直接免費用(如果 1490 訂閱本來就含深卜額度——**這點 BP v3.0 沒寫清楚,深卜 200 是否訂閱戶免費,需 Perth 確認**,copy v0.6 原文只講「同一卦再讀互綜錯序,+200」沒特別排除訂閱戶,BP v3.0 Slide 12 表格也把深卜列為獨立加購項、沒寫訂閱戶豁免)

### 區③ 問道・複盤(1490,gated-ii)
- **顯示條件**:`Subscribers.subscriber_tier = "subscriber"` **才顯示這一區**,非訂閱戶完全看不到(gated-ii,守 earned 模型)。
- **真實 payload 契約**(已查證 Make blueprint 5500272,hookId 2505301):
  ```json
  {
    "line_user_id": "U...",
    "current_question": "TA 這次想問的、眼前的決定(自由輸入一句)"
  }
  ```
- **鏈內部邏輯(已查證)**:用 `line_user_id_raw` 撈 `Divination_Log` 最近 **6 筆**、聚合成決策軌跡文字,送進 Dify(app-gJFNCzz61eyUajwBUAsiaVdo,即 v1.7.1 引擎)→ 一樣是 **push 純文字信到 LINE**,非同步回 LIFF。
- 🔴 **另一個誠實缺口**:這條 Make 鏈**內部完全沒有 tier 檢查**——它信任呼叫端(不會擋非訂閱戶)。目前設計等於**只靠 LIFF 前端「gated-ii 不顯示按鈕」來擋**,如果有人繞過前端直接打 webhook,後端不會攔。這在正式上線前是一個真實的權限漏洞,建議 Claude Code 在 Worker 層(或 Make 鏈最前面加一個 Airtable 查 `Subscribers.subscriber_tier` 的 Router 分支)補一道後端檢查,不要只靠前端隱藏按鈕。這不是我謹慎過頭,是目前 blueprint 真的這樣寫,查證見上方 module 列表(webhook 直接進 search records,無 router 判斷 tier)。
- **最小歷史筆數**:規格文件(`mingge_fupan_chain_v0_1.md`)寫明複盤要 ≥2 筆歷史才有意義,但**目前 Make 鏈本身也沒做這個檢查**,不足 2 筆一樣會硬跑(送 0-1 筆軌跡給 Dify,結果品質不可預期)。建議 LIFF 頁面自己先數一下歷史筆數,<2 筆時直接前端擋下,顯示「複盤要先有幾次卜卦的軌跡可連,先去問道幾次再回來複盤」(這句文案 `mingge_fupan_chain_v0_1.md` §5 已經寫好,直接用)。

---

## 2. 格3「訂閱方案」

**內容已在 `mingge_richmenu_6grid_copy_v0_6.md` §格3 完整定案**,靜態頁,文字整段照抄即可(免費3枚銅錢/149單卦/深卜200封頂349/1490訂閱,含退費規則段落)。**唯一要接的技術動作**是「付款」按鈕跳轉 Oen 外部結帳頁——Oen 串接現況見 Build_Nodes MG-\$.1/MG-\$.2,**金流本身不在這次四頁任務範圍內**,格3頁面只需要放一個外連結,連結目標由 Perth 提供現成的 Oen checkout URL(還沒有的話先放 placeholder,不要虛構一個網址)。

---

## 3. 格4「易經書房」

**資料表(已查證)**:`ShufangContent` `tblbzhwwmBDfAKQAs`,欄位含 `content_type`/`title`/`persona`/`ta_type`/`jieqi_node`/`status`/`qc_passed`/`body`。

- **查詢邏輯**:`status = "published"`(或表內實際的已發布值,請 Claude Code 先 list 幾筆實際資料確認 status 欄位的真實列舉值,不要用我推測的字串)且 `qc_passed = true`。
- **7月精簡版**(copy v0.6 §格4 備註):28 篇裡先上一個小子集,子集怎麼選是內容排程問題,不是技術問題,**排哪幾篇由 Perth/Claude(內容判斷)決定,Claude Code 只需要做「讀 status=published 的內容」這個技術查詢**,不要自己判斷該顯示哪幾篇。
- 分類(copy v0.6):① 易經是什麼(白話)② 六十四卦淺說 ③ 卦象與商業時節 ④ 老易讀卦隨筆——`content_type` 欄位大概率對應這個分類,一樣請 Claude Code 先讀幾筆實際資料核對值域。

---

## 4. 格5「老易介紹」

**純靜態頁**,文案已在 `mingge_richmenu_6grid_copy_v0_6.md` §格5 定案(草案標記 T0,若 `S92 onboarding C` 已有定稿版本則以那份為準——**這句話是原文件自己寫的但注,Claude Code 不用理會這個「若有」判斷,直接用 v0.6 這版文字,若 Perth 手上有更定稿的版本會另外給**)。無互動、無串接,單向閱讀頁,做完就是完工。

---

## 5. 總體待 Perth 拍板清單(這份任務包裡所有「不擅自做主」的地方,集中列在這裡方便你一次看完)

| # | 缺口 | 影響 | 建議 |
|---|---|---|---|
| 1 | 深卜 200 沒有收費閘 | 區②一旦做出來等於免費開放深卜 | 決定用 (a) 先收費後觸發 / (c) 訂閱戶豁免,其一 |
| 2 | 訂閱戶是否深卜 200 免費 | 影響區②收費邏輯與 UI 文案 | BP v3.0 與 copy v0.6 都沒寫清楚,請明確裁決 |
| 3 | 複盤鏈無後端 tier 檢查 | 技術上任何人繞過前端都能觸發複盤 | 上線前建議補 Worker/Make 層驗證,不只靠前端隱藏 |
| 4 | ~~Divination_Log 無「主卜卦 vs 深卜/複盤」專屬篩選欄位~~ **已查證解決** | — | `entry_type` 實際值域已抓到:`divination`(真實卜卦)/`deepdive`(深卜寫入)。**沒有 `fupan` 值**——複盤鏈 5500272 的 blueprint 裡根本沒有寫回 Divination_Log 的模組,複盤是完全不落地的動作(見新增缺口⑦)。區①篩選用 `entry_type = "divination"` 即可乾淨排除深卜記錄。⚠️ 附帶發現:目前該表 58 筆裡有大量 `session_id` 開頭 `deepdive-test-...` 的測試假資料,真正上線後這批建議清掉,免得日後統計/複盤撈歷史誤入測試噪音 |
| 5 | 格3 Oen checkout 網址 | 沒有就先放 placeholder | Perth 提供現成連結 |
| 6 | ~~格4 ShufangContent 的 status/content_type 實際列舉值~~ **已查證解決** | — | 28 筆全查:`qc_passed` 全數 `true`、`status` 全數「QC通過」,篩選用 `qc_passed=true` 即可。⚠️ 附帶發現:`content_type` 實際值是「人際小文」/「時節問候」/「節氣信」三種,**跟 copy v0.6 寫的「①易經是什麼②六十四卦淺說③卦象與商業時節④老易讀卦隨筆」四分類對不上**,現有 28 篇是另一套分類體系。上線前要嘛內容重分類、要嘛 copy v0.6 四分類說法更新,兩者現在是兩張皮 |
| 7 | **新增發現**:複盤完全不留痕 | TA 做過幾次複盤、問了什麼,現行架構完全不記錄,無法留證、無法算複盤使用率這個關鍵留存指標 | 建議在 5500272 尾端仿 5468020 的 module 9 模式,補一個 `ActionCreateRecord` 寫回 Divination_Log(`entry_type` 建議新增 `fupan` 選項) |

## 6. 缺口 1/2/3 具體解法(2026-07-02 補,含一個更早的關鍵前置發現)

### 🔴 6-0. 動工前必看:金流回拋鏈本身踩在化石表上,這個不修,下面全部白做

設計收費閘之前,我去查了現役 `命格_04_金流回拋鏈`(scenario 5375310)實際寫回哪張表,結果發現一個**比深卜收費閘本身更急的既有問題**:

> **已解決 (S135)** — S135 把金流鍵改寫進 Subscribers，E10/E11 收費閘直接查 Subscribers，Member_Access 現為空表（0筆），不需另立同步任務。

- 這條金流鏈開通會員權限時,寫的是 `appfQm6On0Wp9LtL9`(命格金流庫)裡的 **`Member_Access`** 表(`tblmtwmBRfZFW1806`),`member_tier` 欄位值域寫死 `free/pro/ultra`——這是 **S96 pk-retention-gate 定價回掃時已經棄用的舊三層方案**。
- 但**真正的會員 SSOT**,依 `mingge_closeout_S123_v1_0.md`(§A-2,已明文查證)是 `apptFfyVBYE4ygW3E` 的 **`Subscribers`** 表,`subscriber_tier` 值域是新的 `free/subscriber`。
- **`Member_Access` 跟 `Subscribers` 是兩張沒有互相同步的表**,而且這個落差 S123 收尾時就已經寫成待辦(§B-4「G-4 金流庫 base 確認」),**擱到現在還沒解**。

意思是:**如果現在直接在金流回拋鏈的 `plan` switch 裡加 `deepen200`/`sub1490`,只是在一張過時的表上疊床架屋**,我這輪查 §1 區①③ 用的 `Subscribers.subscriber_tier` 判斷,跟金流鏈實際寫入的 `Member_Access.member_tier` 完全是兩套系統各自表述,深卜/複盤的權限判斷會跟金流開通結果對不起來。

**這個要先修,不是深卜功能的一部分,是全站金流的地基問題,建議獨立列一個任務,不要跟四頁 LIFF 建置綁在一起做**(範圍會爆炸)。下面 §6-1~6-3 的設計,我先假設這個地基已經修好、金流鏈正確寫入 `Subscribers`,再往上蓋。

---

### 6-1. 缺口1+2:深卜 200 收費閘(含訂閱戶免費判斷)

**LIFF 端(區②「深卜這一卦」按鈕邏輯)**:
```js
// 頁面載入時已經查過 Subscribers(區①算餘額本來就要查),存成 currentUser.subscriber_tier
async function onDeepdiveClick(pastRecord) {
  if (currentUser.subscriber_tier === 'subscriber') {
    // 訂閱戶:直接觸發,不經金流
    await triggerDeepdive(pastRecord);
  } else {
    // 免費/單次戶:先跳 Oen 收 200,成功回拋後才觸發
    redirectToOenCheckout({
      amount: 200,
      plan: 'deepen200',                 // 金流回拋鏈 §6-0 修好後,switch 要新增這個值
      line_user_id: currentUser.userId,
      custom_id: `deepen_${pastRecord.session_id}_${Date.now()}`,  // 回拋比對用
      return_meta: {                     // 回拋成功後要能重建這個 payload 打 5468020
        ben_gua: pastRecord.ben_gua,
        source_session_id: pastRecord.session_id,
        question_text: pastRecord.question_text
      }
    });
  }
}

function triggerDeepdive({ben_gua, question_text}) {
  fetch('https://hook.us2.make.com/xxxxx' /* webhook 2490537 對應網址,Perth既有給 */, {
    method: 'POST',
    body: JSON.stringify({
      ben_gua,
      session_id: `deepen-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      line_user_id: currentUser.userId,
      question_text
    })
  });
  showToast('老易已收到,為你把這一卦往裡再讀四鏡,請回 LINE 聊天室查看');
}
```

**Make 端(金流回拋鏈 5375310,§6-0 修好後要加的東西)**:
1. `plan` switch(module 6/10/11 那三處 switch 語句)新增一個分支 `deepen200`:
   - **不改 `subscriber_tier`**(深卜是加購,不是升級會員層級)
   - 改成寫一筆**購買事件記錄**(現有結構沒有這張表,需新增,或沿用 `Payment_Orders` 表本身的 `plan`/`amount` 欄位當作購買紀錄即可,不用另建新表——`Payment_Orders` 本來就逐筆留證了)
   - 回拋成功後,**用 `return_meta` 裡的 `ben_gua`/`source_session_id`/`question_text` 組 payload,直接呼叫 webhook 2490537**(等於金流鏈尾端多一個 HTTP 模組,呼叫深卜鏈)
2. 封頂 349 的檢查(copy v0.6 §格3 提過「只露 200,封頂 349,禁 349/加/再付」——這句話原意應該是「深卜只收一次 200,不會疊加到 349」,不是「深卜有兩種價格」,**這句話本身有點語意不清,建議跟 Perth 確認 349 到底是什麼**,我不確定它是否對應到另一個功能,任務書裡先不假設)

---

### 6-2. 缺口3:複盤鏈補後端 tier 檢查

**Make 端(`命格_05_複盤鏈` 5500272,在現有 module 1 webhook 後面插一段)**:
```
[新增] module 1.5:Airtable Search Records
  base: apptFfyVBYE4ygW3E
  table: Subscribers (tbljXninuBm76D9nf)
  formula: {line_user_id} = "{{1.line_user_id}}"

[新增] module 1.6:Router
  路徑A(通過):{{1.5.subscriber_tier}} = "subscriber" → 照現有流程繼續(接回原 module 2 撈歷史)
  路徑B(擋下):{{1.5.subscriber_tier}} ≠ "subscriber" 或查無此人
    → push 一句話到 LINE:「複盤是 1490 訂閱戶的專屬功能,若您已訂閱但看到此訊息,請聯繫客服核對帳號」
    → 流程結束,不進 Dify(省 token,也是真正的權限閘)
```
這是半天工程量,不是重建,純粹在現有鏈最前面插一個 Search + Router。

**同時補回 §5 提過的第 7 個缺口(複盤不留痕)**:在 module 6(現有 push LINE 那步)後面,比照 5468020 的 module 9 寫法,加一個 `ActionCreateRecord` 寫回 `Divination_Log`,`entry_type` 建議新增 `fupan` 選項。

---

### 6-3. 最小歷史筆數檢查(複盤 §1 區③ 提過的次要缺口,一併解)

LIFF 頁面在顯示「問道・複盤」按鈕前,自己算一下 `Divination_Log` 裡 `entry_type="divination"` 的筆數,**<2 筆時按鈕改灰階不可點**,文案用 `mingge_fupan_chain_v0_1.md` §5 現成那句:「複盤要先有幾次卜卦的軌跡可連,先去問道幾次再回來複盤。」——不用等 Make 鏈那邊擋,前端先擋掉大部分無效呼叫,Make 那邊的 tier 檢查(§6-2)當最後一道防線。

---
*— §6 補於 2026-07-02,同場次追加 · 核心發現:金流地基(Member_Access vs Subscribers 分裂)須先修,深卜/複盤收費閘才立得住 —*
*— 命格 LIFF 四頁任務包 · 2026-07-02 · 格2三區+格3/4/5 · 所有 Airtable/Make 契約皆已查證非憑記憶 —*
