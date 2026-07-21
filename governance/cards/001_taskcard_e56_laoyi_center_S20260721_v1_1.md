# 001_taskcard_e56_laoyi_center_S20260721_v1_1 · E56 老易學習中心施工卡【發包版·取代 v1_0】

> 2026-07-21 · 中樞 S-20260721-Hub 出卡 · **Perth 已放行發包＋話術 7 句終審全過（本卡話術＝定稿，逐字貼裝禁改字）**
> 執行：Claude Code（唯一 writer）· 互審：Codex CLI（讀本卡→寫 plan→審至 APPROVED→施工→反向互審→交回；Codex 不通則 Gemini 2.5 Flash）
> 板證：Journey_Edges E56 recCQsIVDnItKqLP9／E57 recIcclxRzKVxx4zV＋Change_Log rec0fhVhxgAl74EAW·recl6dVQuYb9xqQlG
> P0 前置三項已完（話術包終審過／relay 盤點過／QA 5 題已入庫）——本卡直接進施工。

## 一、目標動機

給老易一個自己的面。老易＝TA 學習交流中心（答卦理/文章/易經），現寄生書僮客服鏈 5379670＝架構錯位。本卡建「格5 兩態 LIFF 問答面 → relay 新路由 → 老易說易 app-gQwG4 直連」，完全繞開客服鏈。這同時是 E55「拿這篇問老易」的前置、與 Phase 2 HeyGen 的既成軌道（屆時只換表現層）。快跟項：不擋 8/1 軟啟動，但驗收過即補上。

## 二、施工範圍（repo: mingge-line）

**C1 格5 兩態（index.html）**
- 門廳態：沉用 live index.html 現行格5 介紹段（code 真相源自抓，禁重寫）＋定稿 S1 收口段＋兩按鈕。show-once：首訪見門廳，再訪直達問答室（localStorage 鍵建議 `mg_laoyi_hall_seen`，實作可議）。
- 問答室態：純文字對話流（禁 Flex 化回答）。開場句：空手進用 S2；帶 `?content_id=` 進用 S3（篇名由書房前端既有文章資料組裝；deep link 繞過門廳）。
- 熟齡硬約束（E47 五條）：內文≥17px、行高≥1.9、目標動作≤3步、段落≤4行、按鈕字不縮。
- 25 輪軟收束：前端計數配合引擎既有 rail，收尾補按鈕〔回書房〕〔起一卦〕。

**C2 relay 新路由（workers/mingge-relay/worker.js）**
- `POST /laoyi/chat`：照既有七路由同款「驗 LINE access token（api.line.me /v2/profile）→ 持鑰轉發」模式 → Dify app-gQwG4 chat-messages（blocking）。
- 金鑰＝Worker env（`DIFY_LAOYI_KEY`，**Perth 親貼 wrangler secret，永不入檔入 repo**——缺鑰時以佔位變數施工＋標註 B2，禁硬編）。
- conversation_id 僅存頁面記憶體（session 內多輪）；**不落任何持久層**＝stateless 鐵則（不接卦記/Divination_Log，明文不做）。

**C3 E57 單向帶話（index.html）**
- 問答室常駐次要入口「店務找書僮」＋引擎收束店務題時顯示 S5 引路；按〔交給書僮〕→ `liff.sendMessages` 以 TA 名義把其原句送進 OA → 顯示 S6 成功提示。書僮鏈 5379670 照舊接手，**零改動**。
- 個人決策題收束＝S4 原則：前端零句，引擎講（Patch C 既有），前端只在該類回覆下補〔心中默念此問，起一卦〕按鈕（判斷方式由 plan 提，最薄可行即可）。

**C4 併批 polish**：「卦記」字級一致（E47 殘項，比照全站基準）。

## 三、話術定稿（Perth 終審過 2026-07-21，逐字貼裝）

- **S1 門廳收口**：「老易這裡。這一進是問學的地方——易經的道理、卦的意思、書房裡的文章，都可以問。但有三件事老夫不做：不替你占、不替你斷、不談店務帳目。占卦是天的事，店務找書僮。想清楚了，就進來坐。」按鈕〔向老易請教〕〔先逛書房〕
- **S2 開場（空手）**：「坐。今日想問哪一卦、哪一篇、哪一句？」
- **S3 開場（帶篇）**：「你帶來的是〈{篇名}〉。文中何處讓你停下了？」
- **S4 決策題收束**：前端零句（引擎講），補按鈕〔心中默念此問，起一卦〕
- **S5 引路**：「這是店務，老夫不管帳——書僮就在門外。你這一問，我替你帶到他案上。」按鈕〔交給書僮〕
- **S6 送出成功**：「已送到書僮案上。回到聊天室，書僮接著答。」
- **S7 placeholder**：「請教老易——卦、文章、易經都可問」；收尾按鈕〔回書房〕〔起一卦〕

## 四、驗收條件（過完才交回）

1. 格5 首訪見門廳、再訪直達問答室；`?content_id=` deep link 繞門廳、S3 正確帶篇名。
2. 問答室經 relay 直連 app-gQwG4 有問有答；前端無任何真實端點/金鑰；5379670 與 5202754 diff＝零。
3. 客服題按鈕 sendMessages 原句進 OA、S6 顯示、書僮照舊接手（真機）。
4. E47 五條全過＋卦記字級一致；25 輪收尾行為正確。
5. 對話不跨 session 留存（重開 LIFF＝全新對話）。
6. headless 測試腳本（tests/ 慣例）附斷言；**新鏈 20-case＋5 偽裝題回歸＝中樞後續跑（V1 硬閘，非本卡範圍但上線以此為準）**。

## 五、回報格式（build-evidence rule）

remote SHA（exact-head，push 後 origin/main）｜互審輪次與結果｜測試腳本路徑＋PASS 數｜rollback 點（前一 SHA＋Worker 部署版本）｜B1/B2/B3 卡住即標分類回報，禁靜默 DEFER。

## 六、禁碰邊界

Make 5379670／5202754｜老易說易 Dify prompt 與 KB（動＝回歸觸發＋Perth 核）｜任何持久化 TA 對話的設計｜金鑰入檔。

---
*發包 2026-07-21 · 家：00B_taskcard · rollback：git revert＋Worker 版本回滾；5379670 sb_orig／5202754 bp_orig · 善為易者不占*
