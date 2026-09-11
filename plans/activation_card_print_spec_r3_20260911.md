# 隨貨啟用卡・印製規格（草案）D3 r3

```yaml
doc_id: MINGGE-ACTIVATION-CARD-PRINT-SPEC-R3-20260911
copy_source: 00D_spec/mingge_d3_final_r3_20260911/03_MINGGE_LONGGONG_COPY_CANDIDATE_v0_2_20260910.md §10
digital_draft: activation-card-preview.html
status: DRAFT（尺寸與工藝待正式供應商核對；文案為 exact copy，不可自行改寫）
```

## 版本

- **gift（送禮版）**：首句「有人為您留下了一件收藏。」
- **self（自用版）**：首句「您留下了一件收藏。」
- 其餘正文、QR 位置、隱私規則兩版相同：
  - 「命格：一件掛心的事，用一卦看清楚。」
  - 「這件龍宮舍利附有一段命格的使用時間。是否使用、何時開始，都由您自己決定。」
  - 「掃描 QR Code，查看這件收藏與啟用說明」

## 尺寸與出血（草案，待供應商核對）

| 項目 | 數值 | 備註 |
|---|---|---|
| 成品尺寸 | 148mm × 105mm（A6 橫式） | 常見隨貨卡尺寸；正式模切規格待供應商確認 |
| 出血 | 3mm 四邊 | 印刷標準值；若供應商模切機台不同需另核對 |
| 安全邊界 | 5mm 四邊 | 文字與 QR 不得落在安全邊界外 |
| QR 尺寸 | ≥ 20mm × 20mm | 需可用一般手機相機在 15–20cm 距離清楚掃描；正式尺寸依印刷材質、印刷解析度覆核 |

## QR 內容政策

- 本輪固定為 `[PLACEHOLDER:ACTIVATION_URL]`，不得替換為任何真實或測試用領取連結。
- 正式上線時，QR 指向的 claim reference 必須：
  - opaque、不可推導、限用途；
  - 不含私人卦記、付款資料、買家或收禮者身分、可重用 token；
  - 入口頁只驗 claim 參考有效性，不讀私人資料（對應 R6-LY-00）。

## 資料禁區（卡面與卡背）

不得印出：訂單編號、姓名、電話、地址、付款資訊、任何可反查買家或收禮者身分的欄位。命格既有配色、Logo 使用規範沿用既有品牌規範，不另創版面語言。

## 材質、工藝、供應商

未確認，不得升格為正式事實：紙質、磅數、燙金／打凸、油覆膜、供應商、單價、交期均待正式核定。

## 對應驗收

- 00B_taskcard/MINGGE_CLAUDE_CODE_DISPATCH_CARD_D3_r3_20260911.md §2（write set：隨貨卡數位稿與印製規格）、§4（驗收）。
- directive `06_CLAUDE_CODE_IMPLEMENTATION_DIRECTIVE_20260910.md` §1、§4。

## 真正仍缺的資料（不得自行假造）

1. 正式供應商模切尺寸、材質、印刷工藝與單價。
2. 正式 claim reference 產生與驗證機制（owning store 尚未建置，見 `plans/d3_r3_implementation_20260911.md`「既有凍結衝突」第 3 點）。
3. 正式印刷檔案（本 HTML 數位稿僅供版面核對，非印刷用檔）。

<!-- CODEX-REVIEW: BLOCKED-B1 codex-cli-unavailable
2026-09-11：同一 session 內 codex exec 已回報額度用盡（見 plans/d3_r3_implementation_20260911.md 同日記錄），
不重複呼叫。本文件所有數值標示「待核」者均為草案，未經交叉驗證，交付時列入缺口清單。
-->
