# MINGGE-SHOWCASE-005A｜5–10 分鐘手機 Showcase Runbook v1.0

狀態：`PRE-ACTIVATION`。這是 Owner 的唯一建議展示路徑；不做真實付款、不改額度、不使用 production bypass。

## 展示前必過條件

- 005A Draft PR 已 review、merge、deploy，並完成 sealed-account 手機 smoke test。
- Rich Menu 候選圖與 mapping 已另經 Owner 授權啟用；第 5 格手機可讀為「問老易」。
- Make 的 `問老易` intent 與 Dify 老易說易 app 已通過後續獨立 gate。
- 完整內容掛載與 `21+15` 回歸已通過；這三項都不包含在 005A repository-only Slice。
- Owner 手機至少有一筆既有卦記。Owner 即使零額度，以下主路徑仍不需付款。

## 唯一建議路徑（約 6–8 分鐘）

| 時間 | Owner 操作 | 手機會看到 | 安全邊界 |
|---|---|---|---|
| 0:00–0:40 | 從「命格易經卜卦」LINE OA 對話開場，展開 Rich Menu | 六格都有文字：向天問卦、我的卦記、訂閱方案、易經書房、問老易、書僮客服 | 先讓 TA 看懂全貌，不先碰 149 |
| 0:40–2:20 | 點「易經書房」，選一個分類，再開一篇文章 | 書房門面、文章列表、米白閱讀頁 | 免費；只走 `GET /study`，不扣問卦銅錢 |
| 2:20–3:10 | 在文章底部點「拿這篇問老易」 | 文章題目被帶回 LINE 對話；若無法直接送出，畫面提供可複製文字 | 不經問卦 Worker POST；不出現 149 |
| 3:10–5:20 | 在 LINE 接著問一個易理問題 | 老易以易理對話回應，並可引回下一篇書房內容 | 只聊《易經》學問；不替人斷定吉凶，不扣銅錢 |
| 5:20–6:20 | 回 Rich Menu，點「我的卦記」 | 既有卦名、日期、問題與信箋入口 | 只讀既有紀錄；不需新起卦 |
| 6:20–7:20 | 回 Rich Menu，收尾說明「免費書房與老易對話可持續回來」 | 再次看見六格入口 | 到此即完成零付款、零改額度的完整可見路徑 |

## 可安全展示

- Rich Menu 六格與文字。
- 易經書房門面、分類、文章列表、閱讀頁。
- 「拿這篇問老易」與「問老易」免費對話。
- Owner 既有「我的卦記」。
- 「訂閱方案」頁的方案文字可作靜態說明，但主路徑不必進入。

## 必須避開

- Owner 零額度時，不從「向天問卦」開始，也不承諾能完成新一卦。
- 不點 NT$149 CTA、不真實付款、不示範退款或對帳。
- 不修改／重設 Owner 或來賓額度，不新增 bypass。
- 不在未完成 Dify 掛載及 `21+15` 回歸前，把老易回答當成正式 Showcase evidence。
- 不在未取得 Owner 授權前切換 Rich Menu、Merge 或 Deploy。

## 新加入的來賓

新加入 LINE OA 的人，在完成現行同意與建檔後，依現行 E40 規則應取得 3 枚免費問卦銅錢；書房與問老易則不受這 3 枚限制。但正式邀請來賓自行試用前，仍須先完成 Rich Menu、Make/Dify、內容掛載與 sealed-account UAT，不能只憑 repository 變更宣告可用。

## 異常時的單一路徑

- 「拿這篇問老易」沒有自動回到 LINE：複製畫面已備好的文字，回 OA 對話貼上；不要改額度或改走問卦 Worker。
- 書房顯示暫時無法開門：停止該段，展示既有卦記；不現場改 Worker、Make、Dify 或 Airtable。
- 老易未回覆：停止對話段，記錄時間與畫面，交給後續 Make/Dify gate；不臨場重接 production。

## Owner 最後只需做什麼

在所有後續 gate PASS 後，Owner 只需用自己的手機看一次 Rich Menu 預覽、走一次以上 6–8 分鐘路徑，確認名稱與內容感受；技術 routing、測試、rollback 與部署證據由 execution agent 負責整理，不把技術選擇題交給 Owner。
