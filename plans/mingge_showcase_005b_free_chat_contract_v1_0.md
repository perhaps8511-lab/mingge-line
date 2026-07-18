# MINGGE-SHOWCASE-005B｜免費對話端到端收口契約 v1.0

狀態：`REPOSITORY IMPLEMENTED / EXTERNAL READBACK REQUIRED / NOT DEFAULT`

本檔只收口「問老易」免費對話，不改問卦額度、NT$149、付款、退款、問卦 Worker、完整內容批次或 21+15 最終回歸。

## 1. 已核對的正式證據

- GitHub `main` 基線：`65ff3e1764a8bb4411a308da947bd53e09d6bf7a`，即 PR #5 merge commit。
- LIFF ID：`2010192384-9AwjI8qH`；repository 現行 endpoint 為 GitHub Pages `index.html`。
- 舊 Rich Menu mapping 已經以 `https://liff.line.me/2010192384-9AwjI8qH` 開啟 LIFF；sealed-account UAT 顯示書房可讀，但 `sendMessages` 落入複製 fallback。
- LINE 官方契約：`liff.sendMessages()` 必須同時在聊天室開啟的 LIFF browser、具 `chat_message.write` scope，且不是從最近使用服務重開。005B 因此在送訊前讀 `liff.getContext()` 與 `liff.permission.query('chat_message.write')`，保留不含 user ID／token 的錯誤分類。
- Control Base 登記現役 Dify app 為「老易說易」prompt v1.1、Gemini 2.5 Flash；現行客服分流的正式設計為同一 LINE webhook router：易理題去老易說易、行政題去書僮。
- sealed-account UAT 實證：一般易理題可收到老易回答；書房文章舊格式 `問老易\n我剛讀完…` 無回答。因此 005B 只改訊息 contract，不改內容庫。

## 2. Repository 訊息 contract

### 一般入口

- Rich Menu 第 5 格固定送：`問老易`。
- 問老易頁的四個範例問題維持自然語句，不加控制前綴。

### 書房文章入口

舊格式（停用）：

```text
問老易
我剛讀完〈{title}〉，想再問深一點。
```

新格式（單行、自然易理題）：

```text
我剛讀完易經書房的〈{title}〉，想請老易再講深一點：這篇對我現在做事有什麼提醒？
```

標題會先折疊空白並限制 80 字。整條路徑只呼叫 LIFF `sendMessages`；不得 `fetch` 問卦 relay、不得 POST quota、不得顯示 NT$149。

## 3. Make 隔離路由 contract

目標 scenario：現役 LINE 客服／書僮 webhook router（正式資料曾記為 `命格_02_客服書僮鏈`／scenario `5379670`；執行前必須 live readback，不可只憑舊編號修改）。

只允許新增或確認下列 free-chat branch：

1. 接收 LINE `message.text`，保存 `replyToken` 與同一 event 的 `source.userId`；不查、不寫問卦額度。
2. 先回一則處理提示：`老易已收到，正翻書回您。`
3. 將文字正規化為單行；若以 `問老易` 開頭，僅剝掉開頭控制詞，不刪後文。
4. 下列任一條件送現役「老易說易」Dify app：
   - exact `問老易`；
   - 含 `《易經》`、`易經`、`卦辭`、`爻辭`、`易經書房`、`讀完`、`節氣信`；
   - 命中 005B 書房新格式。
5. 行政／帳務／退款／產品規則仍送書僮；問卦問題仍只遞既有向天問卦入口，不送免費聊天 branch。
6. Dify 最終文字用 LINE push 回同一 `source.userId`。Dify 失敗必須回可理解的失敗訊息，不可靜默。
7. 此 branch 禁止呼叫問卦 Worker、`Divination_Log` quota decrement、訂閱／付款 endpoint。

處理提示是 005B 功能提示，不是內容批次；最終回答仍由現役 Dify app 產生。完整內容掛載與 21+15 回歸維持後續獨立 gate。

## 4. 非預設 Rich Menu 候選

- 圖：`assets/richmenu_mingge_005b_2500x1686_v1_0.png`
- mapping：`plans/mingge_showcase_005b_rich_menu_mapping_v1_0.json`
- 尺寸：`2500×1686`
- bytes：`848532`
- SHA-256：`ed1e8dac2db5c8c35ed6cc5df3d9baf6f534c7751485d0104808f974d5876591`
- 六格逐字：向天問卦／我的卦記／訂閱方案／易經書房／問老易／書僮客服。
- 建立腳本只使用 per-user link endpoint，要求唯一 `SEALED_LINE_USER_ID`；不得呼叫 `/user/all/richmenu`，不得清除或替換 Default Rich Menu。
- rollback 只解除該 sealed account 的 per-user 綁定；候選 Rich Menu 保留，不自動刪除。

## 5. sealed-account 手機 UAT gate

先記錄手機「我的卦記」顯示的剩餘銅錢，再依序驗：

1. 點 Rich Menu「問老易」：LINE 對話立即出現使用者送出的 `問老易`，接著收到處理提示與最終回答。
2. 問一般題：`做事的人，可以怎麼學《易經》？`，須先有處理提示、再有老易回答。
3. 進易經書房開任一「節氣信」，點「拿這篇問老易」：不得複製貼上；LINE 對話出現單行新格式，先有處理提示、再有回答。
4. 再看「我的卦記」：銅錢數與步驟 0 相同。
5. 全程不得出現 NT$149、付款頁或問卦 zero-quota gate。
6. 若失敗，截圖頁面狀態；`data-ask-error` 只可能是 `not-liff-chat`、`chat-message-unavailable`、`chat-message-prompt`、`send-403` 或 `send-failed`，不得以「請再貼一次」代替根因。

以上六項全過才可把 005B 判為 PASS。仍不得設 Default、擴大使用者或 Production Activation。

## 6. External readback 邊界

Repository 不保存 LINE、Make 或 Dify credential。本執行環境也沒有可用的 LINE／Make／Dify connector，因此不得假稱已完成外部 mutation。外部執行必須使用受控 credential surface；不得要求 Owner 把 token、webhook 或 Dify key 貼進聊天。
