# mingge_task_dispatch_e25_frontend_v1_0

## ① 目標與動機(WHY)
- 一句話目標:在 `log.html`(卦記詳情頁)新增金印按鈕互動,`index.html`(卦記列表頁)新增金印徽章顯示,讓 TA 能在前端實際操作 E25 蓋章功能。
- 為什麼現在做:Worker 端 `POST /log/seal` 已過審並施工完成(`plan_e25_goldenseal_v0_1.md`,見 `workers/mingge-relay/worker.js`),前端是這條功能鏈最後一塊。
- 本卡源自已過審計畫:`plans/plan_e25_frontend_v0_1.md`(APPROVED r3)。

## Pinned Baseline(施工前必須重新驗證,不符即停工回報)
```
curl -fsSL -w "\nHTTP_STATUS:%{http_code}\n" https://raw.githubusercontent.com/perhaps8511-lab/mingge-line/main/index.html
curl -fsSL -w "\nHTTP_STATUS:%{http_code}\n" https://raw.githubusercontent.com/perhaps8511-lab/mingge-line/main/log.html
```
- 2026-07-05 記錄:
  - `index.html`:HTTP_STATUS 200,SHA-256 = `582efe21bb19dacc18c0cef9011c19a7d77c5cb87f048b9e50ac7fdd278e1b4`
  - `log.html`:HTTP_STATUS 200,SHA-256 = `2bf7bc84ec40e20e3d8c30987861779df5e0d05d2825e023d303294da0b87a7`
- 施工方動工前重新 curl 取得的 hash 若與上述不同,代表 Perth 或他人在計畫過審後又動過這兩個檔案,**必須停工回報**(B3 待拍板),不得逕自沿用舊計畫套用到新版本上。

## ② 驗收條件(封閉驗收集,對應計畫 §5)
- [ ] 功能代表 case:未蓋章卦記點「蓋金印」→ 按鈕 disabled(文字不變)→ 成功變「金印已落 <日期>」徽章,列表頁出現 `🔶`。
- [ ] 已蓋章直接顯示 case、5 種獨立失敗情境(ok:false/payload不合法/JSON parse fail/network reject/log_id缺失)、重複蓋章、`sealed_at`缺值、連打防護、重複掛載冪等性、列表頁無金印、文案正負面稽核、版本號、紅線(見計畫 §5 完整清單)。
- 機讀驗證指令、瀏覽器手動驗證步驟:完整比照計畫 §5,一步都不能省。

## ③ 回報格式(Claude 稽核唯一依據)
### 本次完成 / 本次卡住(B1工具限制|B2缺金鑰|B3待拍板,禁靜默遞延)
### 🔴 紅線自查(必填):是否觸碰 TA 文案/合規判斷/價格/刪除權限/真金鑰/凍結區?是否只用計畫 §1 定案的三句文案,無新增任何 TA 可見文字?Y/N
### 交回物:完整檔案(供逐行 diff;禁只給 diff 片段)—— 產出路徑:`log.html`、`index.html`(repo 根目錄,取代現役版本)
### 下一步預計

## 🔴 邊界(每次動工前重讀)
- 只施工計畫 §2、§3 涵蓋的內容;不碰 `renderDetail()`、`parseReading()`、起卦演算法、`gua_result`、`qigua_time`、LIFF 登入流程、`RELAY_URL` 賦值本身、既有兩個 fetch 呼叫、既有卡片點擊導頁邏輯。
- 交付物為**完整檔案**,**不部署**(不 `git push`、不碰 GitHub Pages)。完工後由 Perth 親自 push 到 `mingge-line` repo,那才是真正的部署動作。
- TA 可見文字**只准用計畫 §1 定案的三句**(`蓋金印` / `金印已落 <日期>` / `金印未落,請稍後再試`)+ 列表頁 emoji `🔶`(不搭文字),不得自創、不得分歧、不得因錯誤類型不同而變化措辭。
- 卡在遠端閘(基礎檔漂移、Worker 未上線)= 停 + 回報,禁自行繞道或用本機舊副本頂替。
- 下一步由派工卡定,不自由排程。
