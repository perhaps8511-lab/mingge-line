# MINGGE-SHOWCASE-005｜Showcase 手機可見路徑 Final Blueprint v1.0

> 日期：2026-07-18（Asia/Taipei）
> Release Stage：`SOFT_LAUNCH_READINESS`
> Showcase target：2026-07-20
> Schedule Health：**Amber**（入口層尚未完成正式手機 UAT；核心問卦、卦記與書房既有能力可用）
> Pinned main：`8957c1d4e36f3be20e9147187048f1b108037f22`
> 本文件只定義最小收口方案；不授權 Merge、Deploy 或任何外部系統 mutation。

## 1. 一句話結果

唯一建議的 Showcase 是以一個自然加入 LINE OA、仍有免費銅錢的 sealed account，從**有字的 Rich Menu**進入：

`易經書房 → 問老易 → 向天問卦 → 我的卦記`

全程不付款、不重設額度、不使用 production bypass。這條路徑同時展示「免費可長期回來」與「需要時才問一卦」兩種價值。

## 2. 本輪正式裁定

1. Rich Menu 視覺不重做；保留深綠、金線、六格構圖與五個既有名稱。
2. 第 5 格由「老易介紹」改為**「問老易」**。簡介不刪除，改成第一次對話的開場，而不是一個沒有下一步的靜態終點。
3. 「問老易」是免費《易經》學問對話，不得消耗問卦銅錢，也不得經過現行問卦 Worker 的 POST quota gate。
4. 行政、價格、帳號與付款問題交給「書僮客服」；個人具體決策或占問導回「向天問卦」。
5. 「易經書房」與「問老易」構成免費回訪循環；「向天問卦」與「我的卦記」構成問卦／保存循環。
6. 2026-07-20 不展示真實付款；「訂閱方案」可保留在選單，但主持人不點入金流、不宣稱金流已完成。

## 3. Rich Menu 六格 SSOT

| 格位 | 正式標籤 | 手機動作 | TA 看到什麼 | 額度／金流邊界 |
|---|---|---|---|---|
| 1 | 向天問卦 | 開啟現行 LIFF 問卦入口 | 進場儀式、提問、起卦、讀卦 | 新朋友自然取得 3 枚；零額度會看到 NT$149 門，不繞過 |
| 2 | 我的卦記 | 開啟 `index.html?action=log` | 已完成卦記、讀卦文字、保存時間 | 可讀既有紀錄；不因零額度隱藏 |
| 3 | 訂閱方案 | 開啟 `index.html?action=pay` | 方案與 NT$149 說明 | Showcase 不付款；不得暗示正式金流已串妥 |
| 4 | 易經書房 | 開啟 `index.html?action=study` | 書房門面、分類、文章列表、閱讀頁 | 免費；現行 `GET /study` 不經 POST quota gate，只回傳 `qc_passed=1` |
| 5 | 問老易 | 向 LINE 對話送出固定意圖，進 Make → Dify 老易說易 | 老易簡介、建議問法、自由易理問答 | 免費；不得扣銅錢、不得觸發 NT$149 gate |
| 6 | 書僮客服 | 向 LINE 對話送出客服意圖 | 使用方式、額度、價格、帳號／服務說明 | 不回答易理內容；不做付款、退款或對帳 mutation |

### 第 5 格第一次開場

第一次點「問老易」時，老易先用 2–3 句自我介紹，再提供四個可直接問的方向：

- 我沒讀過古文，也能讀《易經》嗎？
- 卦不是好壞，那要怎麼看？
- 做事的人，可以怎麼學《易經》？
- 我剛讀完一篇書房文章，想再問深一點。

這段開場由 `kb2-31` 內容支撐；不可把行政 FAQ 或個人占問混進老易回答。

## 4. 兩個 Journey Loop

### 免費信任／黏著循環（主循環）

`易經書房看一篇 → 拿這篇問老易 → 老易回答並推薦下一篇 → 回書房`

目的：即使 TA 不付費，也能每次得到一個可理解、可帶走、可再回來追問的收穫。

### 問卦／保存循環（產品循環）

`向天問卦 → 老易讀卦 → 我的卦記 → 日後回看`

目的：展示 NT$149 單卦產品的價值位置，但在 Showcase 使用自然免費額度，不進付款流程。

## 5. 唯一建議 Showcase 路徑（5–10 分鐘）

### 事前條件

- 使用一個自然加入 OA、完成雙同意、仍有至少 1 枚免費銅錢的 sealed account。
- 彩排先完成一筆卦記，並確認帳戶仍有至少 1 枚；不人工修改或重設額度。
- 正式 Rich Menu 已顯示六個標籤，第 5 格已接上免費「問老易」。
- 手機網路正常；另備一張既有已完成卦記作為非 mutation 備援證據。

### 主持順序與手機可見畫面

| 時間 | Owner 操作 | 手機可見畫面 | 主持重點 |
|---|---|---|---|
| 0:00–0:40 | 打開 LINE OA | 六格有字 Rich Menu | 先說清楚：這裡不只問卦，也能免費讀、免費聊易理 |
| 0:40–2:10 | 點「易經書房」→ 選一篇文章 | 書房門面、分類、列表、完整文章 | 「不必問卦也能進來坐」；內容需為 `qc_passed=1` |
| 2:10–3:40 | 回 LINE，點「問老易」並問一題易理問題 | 老易開場、易理回答、延伸閱讀提示 | 不扣銅錢、不出現 149、不回答行政或替人斷吉凶 |
| 3:40–6:50 | 點「向天問卦」→ 使用事前準備的短問題完成一卦 | 提問區、起卦過程、讀卦結果 | 使用自然免費額度；不進付款 |
| 6:50–8:20 | 回 Rich Menu 點「我的卦記」 | 卦記文字與保存時間 | 關閉重開後仍可讀，證明不是一次性畫面 |
| 8:20–9:00 | 回到 Rich Menu 收尾 | 六個清楚入口 | 收在「平時讀與聊；要緊時再問一卦」 |

### 必須避開

- Owner 目前零額度的手機直接做「新起一卦」。
- 「問一卦 149」之後的真實付款、退款、對帳或付款後 Journey。
- 尚未 `qc_passed=1` 的書房內容。
- 用管理員、密鑰、手動改 Airtable 或 production bypass 來製造可展示狀態。
- 把一般易理聊天送進問卦 Worker POST；該 POST 對零額度帳戶會回 `402`。

## 6. 零額度與新朋友的答案

- **新加入 LINE OA 的人可以自己點、自己用**：完成現行雙同意與建檔後，依 E40 現行設計自然取得 3 枚免費問卦銅錢；可自行使用書房、問老易與最多三次問卦。
- **Owner 的零額度手機仍可展示免費價值**：可看易經書房、問老易、看既有卦記；只是不能再起新卦。
- **完整不付款 Showcase 可行**：用自然加入的 sealed account，不改額度，即可走完書房、老易對話、一次問卦與卦記保存。

## 7. Repository 修正判定

**需要，但只需要 bounded implementation；不碰問卦演算法與 quota。**

### Repo 內最小變更

1. `index.html`：把格 5 的靜態終點改造成可被「問老易」導流的開場／返回路標；保留既有老易簡介內容，不把它刪掉。
2. `index.html` 書房閱讀頁：把現行只有「向天問卦」的尾部路標，補成免費優先的「拿這篇問老易」與次要「向天問卦」；需有非 LINE／傳訊失敗的安全 fallback。
3. 新增機讀測試，鎖住：書房與問老易不走 quota POST、現行問卦 gate 不變、六格標籤／路由一致。

### Repo 外、但上線必需的 bounded 動作（均需另行授權）

1. 將 Rich Menu 圖重新輸出為官方限制內檔案；目前附件 PNG 為 1376×768、1,963,606 bytes，不能直接上傳。目標檔 `<900 KB`，保留 rollback 餘裕。
2. 新建 Rich Menu、沿用既有六區 hit area、上傳有字圖片、設為 default；保留舊 Rich Menu ID 供 rollback。
3. Make 新增／確認「問老易」專用 intent route，接現役 Dify 老易說易 app；不得送入問卦 Worker POST。
4. Dify 掛載內容前先完成 Claude QA 與既有 21-case + 接待組 15-case 回歸。

### 明文不改

- 額度、價格、起卦演算法、問卦 Worker quota gate、Secret。
- 正式付款、退款、對帳與付款後 Journey。
- 既有 3 枚免費銅錢規則。

### 已知 baseline test drift（不是 TA 功能失敗）

2026-07-18 在 pinned main 重跑：

- `tests/test_zero_quota_gate.sh`：9/9 PASS。
- `tests/test_e25_stamp_v1_0.sh`：69/69 PASS。
- `tests/test_lettertail_taskB.sh`：9/9 PASS。
- `tests/test_e40_giftfix_v1_0.sh`：功能矩陣 6/6 PASS，但 1 個舊 DOM 位置斷言失敗。

失敗原因已定位：測試仍要求 `entryGiftEntry` 位於 `#s1`，但 commit `4308191` 已明確把它移到 `#s0` 首屏（scope 後、consent 前），現行 main 也確實在 `#s0`。下一個 repo slice 應只修正這個過期斷言並鎖住新位置；不得為了讓舊測試過而把 TA 畫面移回去。

## 8. 封閉驗收集

| Case | 驗收結果 |
|---|---|
| RM-01 | 手機 Rich Menu 六格皆有可讀文字；第 5 格為「問老易」 |
| RM-02 | 六個 hit area 與文字一致，無錯格；舊 Rich Menu ID 可回切 |
| FREE-01 | zero-credit 帳戶可開書房、讀 `qc_passed=1` 文章，不見 149 gate |
| FREE-02 | zero-credit 帳戶可問一般易理問題；銅錢前後不變，不見 149 gate |
| BOUND-01 | 個人具體占問被引向「向天問卦」；行政問題被引向「書僮客服」 |
| PAID-01 | zero-credit 帳戶進「向天問卦」仍看到現行 NT$149 gate；無 bypass |
| NEW-01 | 新 sealed account 完成雙同意後自然有 3 枚，無人工調額 |
| LOG-01 | 完成一卦後「我的卦記」顯示文字與保存時間；關閉重開仍在 |
| KB-01 | 既有老易 21-case + 接待組 R-01～R-15 全 PASS |
| REG-01 | 現行 repository tests 全 PASS；變更未碰價格、quota、演算法或 Worker |

任何一項失敗，不得宣告 Showcase Ready。

## 9. Rollout／Rollback

1. 先完成 repo branch、tests、Draft PR；不 Merge。
2. Claude 內容 QA 完成後，才允許 Dify 隔離回歸。
3. 外部 mutation 依序為：Make/Dify 隔離驗證 → Rich Menu 建立但不設 default → sealed-account 點擊測試 → 設 default。
4. Rollback：Rich Menu 回切舊 ID；Make 關閉新 intent route；repo revert 單一 bounded commit。不得用改額度當 rollback。

## 10. 唯一 Blocker 與下一切片

### 唯一 Blocker

**正式 TA 入口層尚未接通**：手機上仍是無字 Rich Menu，而「老易說易」雖有內容／引擎，尚沒有一條經驗證、且不耗問卦額度的正式入口。

### 下一個 timeboxed slice（60–90 分鐘）

`MINGGE-SHOWCASE-005A｜Repo bounded implementation`：

1. 以本 Blueprint 為 SSOT 修改 `index.html` 的格 5 與書房尾部路標。
2. 新增 mock／DOM／routing 測試，證明免費路徑不碰 quota gate。
3. 修正 E40 過期 DOM 位置斷言，讓 repository baseline 重新全綠；不改 E40 功能。
4. 產生壓縮規格與 Rich Menu mapping manifest；不執行 LINE mutation。
5. Commit 到本 branch，必要時開 Draft PR；不 Merge、不 Deploy。

## 11. Owner 最後只需做什麼

1. 看一次 Rich Menu 手機預覽，確認「問老易」這個名稱與整體味道。
2. 看 Claude 完成的三個代表樣本，確認內容「正確、有感、像老易」。
3. 在外部 mutation 前各給一次明確放行：Make/Dify 隔離掛載、LINE Rich Menu 切換。
4. 指定一個自然加入、仍有免費額度的 sealed account 做彩排與 7/20 展示。

Owner 不需要選 routing、quota 或測試方案；技術實作依本 Blueprint 執行。
