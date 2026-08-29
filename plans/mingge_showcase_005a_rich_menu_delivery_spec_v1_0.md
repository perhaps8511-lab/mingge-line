# MINGGE-SHOWCASE-005A｜Rich Menu mapping 與壓縮交付規格 v1.0

狀態：`REPOSITORY-ONLY / NOT ACTIVATED`

本文件只凍結候選圖與六格 action 的交付契約。它不授權建立、上傳、綁定或切換 LINE Rich Menu。

## 1. 正式視覺來源與輸出

- 視覺基底：Owner 提供的 `Mix_ Rich Menu v3 底圖 + richmenu_image_labeled.png`。
- 正式來源證據：`plans/mingge_showcase_005_content_canonical_manifest_v1_0.md` 已記錄 SHA-256、`1376×768`、`1,963,606 bytes`，並裁決「不可直接上傳」。
- 六格 display label／副標以 adopted Product Basis v1.2 RC1 為準；本 Slice 只更新 repository candidate，不做 LINE mutation。
- 候選輸出檔名：`richmenu_mingge_005a_2500x1686_v1_0.png`。
- 候選輸出必須是 `2500×1686`、小於 `900,000 bytes`，保留文字可讀性、六格分隔線與外框。
- 原圖比例與 `2500×1686` 不同；不得直接非等比拉伸。應以原設計元素重排至標準畫布，再輸出 PNG-8／最佳化 PNG。若 PNG 無法在手機保住文字且低於門檻，才改用高品質 JPEG，並重新檢查細線與字緣。
- 不覆寫 Owner 原圖；候選圖須另存，記錄 SHA-256、像素與 bytes。

## 2. 六格 routing 契約

機讀 mapping：`plans/mingge_showcase_005a_rich_menu_mapping_v1_0.json`。

| 格 | Display label | 副標 | action | 免費／限制 |
|---|---|---|---|---|
| 1 | 向天問卦 | 問一件新的事 | LIFF 主入口 | 受現行額度 gate；零額度顯示 NT$149 路標，不付款 |
| 2 | 我的卦記 | 回看、補記已有的事 | `action=log` | 可看既有卦記；不重設額度 |
| 3 | 方案・信物 | 看方案或龍宮舍利 | `action=pay` | Intent split；正式金流未串接，不付款 |
| 4 | 易經書房 | 自己讀一篇 | `action=study` | 免費；只做現行 `GET /study` |
| 5 | 問老易 | 把看不懂的問懂 | LINE message：`問老易` | 免費；由後續 Make intent route 接 Dify，不得進問卦 Worker POST |
| 6 | 書僮客服 | 查權益、訂單與售後 | LINE message：`書僮客服` | 客服對話；不得誤送問卦 Worker |

## 3. 命中區

畫布分成上、下各 `843px`；欄寬依序為 `834 / 833 / 833px`。六區完整覆蓋 `2500×1686`，不得重疊或留縫。

## 4. 上線前獨立 gate

1. Design／Owner 看候選圖的手機預覽，確認六格文字與品牌氣質。
2. 驗證候選圖 exact dimensions、bytes 與 SHA-256。
3. 以 LINE 後台預覽確認命中區未偏移。
4. Make 建立／確認 `問老易` 與 `書僮客服` intent；`問老易` 不得消耗問卦銅錢。
5. Dify 完整內容掛載及 `21+15` 回歸另行通過。
6. 取得 Owner 明確授權後，才可執行 LINE Rich Menu mutation、Deploy 或 Production Activation。

## 5. Rollback

- Repository：revert 005A commit，即可移除候選 mapping 與頁面回流路標。
- LINE：本 Slice 不做任何 mutation，因此目前沒有 LINE 側 rollback 動作。
- 後續若啟用：切回前一個 Rich Menu ID；不得刪除舊 menu，直到新 menu 完成 sealed-account UAT。
