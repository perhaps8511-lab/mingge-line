# 命格原版網頁字體統一 · 本機候選

Owner 2026-09-10 指示：套用命格產品原版各頁，保留原有配色、版面及互動。此項是原版設計裁決的字體修訂，不採用 R1 卡片首頁，不影響金流 Draft PR #25。

涵蓋 `index.html`（進場、起卦、等待、書房、老易、卦記列表、方案等子頁）、`log.html`、`pay_success.html`、`pay_failure.html`。四頁在原樣式後引用同一份 `assets/typography.css`。

Owner 同日補充「新網頁也請一致」：本規範持續適用於後續新增的命格網頁、子頁及元件。新頁優先引用共用 stylesheet；新元件以 `--mg-font` 及四個字級 tokens 定義文字角色，不複製另一套數值。跨技術框架時亦沿用相同字型備援及級距。新增頁驗收需檢查實際 computed style、窄螢幕溢出及觸控可用性；固定頁尾的90px避讓僅用於有此頁尾的版面，不強加於其他新頁。

| 用途 | 統一設定 |
|---|---|
| 網頁文字 | Noto Sans TC → PingFang TC → Microsoft JhengHei → sans-serif；不指定新細明體／宋體作 fallback |
| 頁面標題 | 26px，行高 1.5 |
| 段落標題／卦名 | 20px，行高 1.6 |
| 內文／按鈕／輸入 | 17px，行高 1.9 |
| 非必要輔助資訊／日期 | 14px，行高 1.7；付款、權益、同意、錯誤與操作說明至少17px |

Logo 圖檔、入口「命格」品牌字樣尺寸（42px；既有小螢幕例外34px）、卦象與圖示尺寸保留。debug 程式碼區維持 monospace。不同裝置可能使用上述不同黑體；不新增第三方字型請求或嵌入未確認授權的字型檔。本機 Chrome platform font 回讀為 Noto Sans TC。

最小版面修正：原固定頁尾在放大後會與正文重疊，scene／LIFF 子頁留90px頁尾區；进場與起卦內容不足一屏時可以捲動。未變動色彩、背景、素材、動畫 keyframes、JavaScript、文案、金額或退款規則。

檢查：四份 HTML 去掉新增 stylesheet link 後，與 base `3048c65c17283bb3a72a0dc530f970419986aa11` 完全一致。合成資料離線瀏覽器驗證同意勾選、早放不成卦、滿環放開成卦及輸入；320×568／430×900 檢查橫向溢出、標題／段落字級及實際字型。原起卦 VM 9/9 通過。未重跑金流測試或宣稱正式 LINE／付款 UAT。

六格圖與 LINE Flex 由圖片／LINE 原生渲染，CSS 不能改其圖內字樣或客戶端字型；本候選保留其素材及既有原生呈現，不宣稱已修改。此為本機字體候選，未推送、合併或部署；金流 PR #25 的固定 HEAD 維持不變。


## 實際套用補修（2026-09-10）
- 共用 CSS 已實際套用 index.html（進場、凝神、起卦、結果、等待、方案、書房、老易、卦記列表，含既有 R2 新元件）、log.html、pay_success.html、pay_failure.html。
- 本次新增 letter-template-preview.html：從既有合成信箋預覽沿用結構／配色，引用同一 assets/typography.css。原 LINE 原生 Flex 不受網頁 CSS 控制；未宣稱已更動 LINE。
- 必要資訊提升為17px：同意／法律告知、放開起卦說明、收件／錯誤／處理狀態、訂單資訊、操作標籤及按鈕。日期與非必要品牌頁尾可14px。
- Noto Sans TC 使用實際平台字型回讀驗證，不只檢查 CSS 名稱；字型不可用時依序 PingFang TC、Microsoft JhengHei、sans-serif，無新細明體備援。此版本不另下載第三方字型。
- 長訂單字串允許換行；200%等效窄視窗隱藏重複裝飾頁尾、保留捲動。Logo、卦象及 JavaScript／動畫不變。
- 本機審閱與驗證在 D:/CBD_Lab_OS/reports/mingge-typography-20260910/；200%採430×900實體畫面對應215×450 CSS viewport及2倍像素密度的等效排版測試，非真人手機／LINE UAT。
- 本次是獨立字體提交，不改金流 PR #25；不推送、不部署。
