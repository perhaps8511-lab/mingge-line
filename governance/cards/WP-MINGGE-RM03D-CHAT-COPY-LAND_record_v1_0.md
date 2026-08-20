# WP-MINGGE-RM03D-CHAT-COPY-LAND｜紀錄卡 v1.0

```yaml
wp_id: WP-MINGGE-RM03D-CHAT-COPY-LAND
class: byte_master_copy_landing
admitted_by: Owner (Perth, 2026-08-21 甲案裁決；Airtable 錨 recvPdxwu4i4CSLtx)
copy_source: Chat 定稿（合併發包 20260820 件1 + 件2 回覆）
writer: Cowork(PM) 逐字照貼 —— 只貼不寫
authorized_write_set:
  - index.html
  - tests/test_e086_checkout_mock_v1_0.sh        # 退費段逐字鎖同步
  - tests/test_rm03b_artifact_mock_v1_0.mjs      # P2 斷言同步
  - governance/STATUS_BOARD.md
  - governance/cards/WP-MINGGE-RM03D-CHAT-COPY-LAND_record_v1_0.md
forbidden: PAY_PLANS / CHECKOUT_MODE / 任何本卡未列之 TA 字串
```

## 一｜件1 BK12 退費段（Owner 甲案）

裁決：`NT$1,490 / 6 個月` = 一次付清六個月 entitlement，不自動續扣，禁 silent renewal。
Owner 於 2026-08-21 選定**甲案：保留 14 天鑑賞期二軌**（錨 `recvPdxwu4i4CSLtx`）。

**落地字串 sha256 = `8ac0e3d3bcef42b3be532d2100a362de130934edd5f8e1f60dea589cc9579e12`（334 bytes）**
與 Chat 交付原字串 sha256 **完全相同** → 逐位元組一致，零手打、零順手統一標點。

Byte 檢查（PM 執行）：
- `·` = **U+00B7** MIDDLE DOT ✓
- 全形標點僅 `、`(U+3001)×3、`。`(U+3002)×2，皆為 house-style 允許項；**零違規**
- 半形 `,`×8 `;`×3 `:`×1 ✓
- 「囊中銅錢」在段內（`check_rm03_copy_bytes` 硬斷言）✓
- `<strong>` 恰 2 對、結尾 `<br>` ✓
- 已移除「訂閱」「當期末」；未複述「7 工作天」；無阿拉伯數字 ✓
- 前後句（「付款在書房外頭辦…」／「—— 不催您、不限時、不打折…」）零字動 ✓

## 二｜件2 BK17 藏主期間（Chat 裁定：價帶標籤不對 TA 顯示）

```js
- var _artifactPriceBandLabels={'6000_14999':'主力'};
+ var _artifactHolderTermLabels={'6000_14999':'半年藏主','15000_plus':'兩年藏主'};
- function artifactMockBandLabel(band){ return _artifactPriceBandLabels[band]||band; }
+ function artifactMockHolderTerm(band){ return _artifactHolderTermLabels[band]||'這一項尚未取得'; }
- band.textContent=artifactMockBandLabel(item.price_band)+'｜6 個月';   ×2
+ band.textContent=artifactMockHolderTerm(item.price_band);              ×2
```

- `｜`(U+FF5C) 隨整行替換消滅 ✓
- **原 fallback `||band` 會把內部 key（如 `15000_plus`）洩給 TA** —— PM 一併改為 fail-honest `'這一項尚未取得'`（沿用 mock 面既有已核可字串，非新造文案；Chat 可否決）
- 函式與變數更名為 `HolderTerm`：原名 `BandLabel` 回傳藏主期間即語意漂移，機械更名、零 TA 影響
- **未自補藏主機制解釋句**（Chat 明示：不存在，需 Owner 供料另出）

## 三｜驗證

| 項 | 結果 |
|---|---|
| 落地字串 sha256 vs Chat 交付 | **identical** |
| byte-master `check_rm03_copy_bytes.mjs index.html` | **ALL PASS** |
| `test_rm03_intent_split_v1_0.mjs` | 21/21 |
| `test_rm03b_artifact_mock_v1_0.mjs`（P2 已改） | 23/23 |
| `test_bk15_bk16_relic_a11y_v1_0.mjs` | 11/11 |
| 🟢 `test_e086_checkout_mock_v1_0.sh`（含新退費逐字鎖） | **16/16 PASS** ← 長期 `NOT_RUN／B1` **本輪清除** |
| `test_zero_quota_gate.sh` | 11 PASS / 2 FAIL —— **改前改後相同**，非本 WP 造成 |

## 四｜第三道閘掃出的連動（本卡不修，登記）

**① `index.html:1747`「訂閱中，書房為您常開。」仍為 live TA 可見**
由 `/history` → `data.subscriber.tier==='subscriber'` 餵資料，**真實程式路徑**（非 L1406 那條死碼）。
件1 落地後，格③說「一次付清六個月、不自動續扣」，格②卻說「訂閱中」—— **跨格矛盾，TA 可見**。
屬 BK11 家族。**這是 TA 文案 = Chat 貨物**，需 Chat 補一句替換字串。→ 已請 Owner 轉單行追問。

**② `compliance_03 v0.6` 類別名「訂閱」→「一次付清型」為文件側後續**
Chat 明示不進本 WP。→ 觸發 `pk-retention-gate`「改裁決必回掃」：
`RULING-refund-window` 已變更，其錨定文件與所有引用點須重新掃描，確認無舊副本被當現行。
**登記為 pk-retention 待辦，不擋本卡。**

**③ 既有債**：`test_zero_quota_gate.sh` 兩條 FAIL（`402 body not standardized`／`readQuotaGate function missing`），疑為舊架構殘留斷言，另案。

## 五｜🔴 CRLF：shell 測試無法執行的真因

`tests/test_zero_quota_gate.sh` 工作目錄為 `w/crlf`（150 處），
在 bash 直接炸 `syntax error near unexpected token $'\r'` —— **腳本根本跑不起來**。
先前記為「Windows sandbox B1 擋下」的兩支 shell 回歸，**至少有一支的真因是 CRLF 而非 sandbox**。
本輪以 LF 正規化副本於 Linux 實跑才取得結果。

→ 這使 `.gitattributes` 從「早晚要做」升級為「**正在讓回歸測試沉默失效**」。建議提前開卡。

## 六｜未結項

- fresh-context 複核（writer ≠ reviewer）
- Chat 收口蓋章 + Airtable NRE 留痕
- `index.html:1747`「訂閱中」替換字串（Chat）

*— WP-MINGGE-RM03D-CHAT-COPY-LAND v1.0 · 2026-08-21 · Cowork(PM) —*
