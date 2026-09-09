# 命格原版網頁字體統一 · 本機候選

Owner 2026-09-10 指示：套用命格產品原版各頁，保留原有配色、版面及互動。此項是原版設計裁決的字體修訂，不採用 R1 卡片首頁，不影響金流 Draft PR #25。

涵蓋 `index.html`（進場、起卦、等待、書房、老易、卦記列表、方案等子頁）、`log.html`、`pay_success.html`、`pay_failure.html`。四頁在原樣式後引用同一份 `assets/typography.css`。

| 用途 | 統一設定 |
|---|---|
| 網頁文字 | Noto Sans TC → PingFang TC → Microsoft JhengHei → sans-serif；不指定新細明體／宋體作 fallback |
| 頁面標題 | 26px，行高 1.5 |
| 段落標題／卦名 | 20px，行高 1.6 |
| 內文／按鈕／輸入 | 17px，行高 1.9 |
| 日期／輔助說明 | 14px，行高 1.7 |

Logo 圖檔、入口「命格」品牌字樣尺寸（42px；既有小螢幕例外34px）、卦象與圖示尺寸保留。debug 程式碼區維持 monospace。不同裝置可能使用上述不同黑體；不新增第三方字型請求或嵌入未確認授權的字型檔。本機 Chrome platform font 回讀為 Noto Sans TC。

最小版面修正：原固定頁尾在放大後會與正文重疊，scene／LIFF 子頁留90px頁尾區；进場與起卦內容不足一屏時可以捲動。未變動色彩、背景、素材、動畫 keyframes、JavaScript、文案、金額或退款規則。

檢查：四份 HTML 去掉新增 stylesheet link 後，與 base `3048c65c17283bb3a72a0dc530f970419986aa11` 完全一致。合成資料離線瀏覽器驗證同意勾選、早放不成卦、滿環放開成卦及輸入；320×568／430×900 檢查橫向溢出、標題／段落字級及實際字型。原起卦 VM 9/9 通過。未重跑金流測試或宣稱正式 LINE／付款 UAT。

六格圖與 LINE Flex 由圖片／LINE 原生渲染，CSS 不能改其圖內字樣或客戶端字型；本候選保留其素材及既有原生呈現，不宣稱已修改。此為本機字體候選，未推送、合併或部署；金流 PR #25 的固定 HEAD 維持不變。
