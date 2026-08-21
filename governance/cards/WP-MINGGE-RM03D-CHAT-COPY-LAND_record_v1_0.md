# WP-MINGGE-RM03D-CHAT-COPY-LAND｜紀錄卡 v1.2

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

---

# v1.1 增補｜件1-b：L1748「訂閱中」跨格矛盾（Chat 裁定：現在改）

## Chat 裁決原文

> 裁定：現在改，不等 PAY-ALIGN。理由一句：L1747 是 live TA 可見的**機制描述**，格③甲版落地後兩格互斥，
> **矛盾本身就是 fail-honest 破口**——文案層現在清；`tier==='subscriber'` 語意 flag、`PAY_PLANS` 旗標、
> L1406 死碼那句（帶 `expires_at`，同屬續扣語意）則照 Owner 裁決原文歸 PAY-ALIGN 卡統一對正，本次不碰。

## 落地

```
- statusEl.textContent='訂閱中，書房為您常開。';
+ statusEl.textContent='問道·複盤在期,書房為您常開。';
```

**新字串未經手打** —— 直接由 Chat 提供之 hex 序列解碼寫入：
`e5 95 8f e9 81 93 c2 b7 e8 a4 87 e7 9b a4 e5 9c a8 e6 9c 9f 2c e6 9b b8 e6 88 bf e7 82 ba e6 82 a8 e5 b8 b8 e9 96 8b e3 80 82`

PM 驗證：
- Chat 之 hex 自證解碼 === 其文字宣稱 ✓
- `·` = **U+00B7**；`,` = **U+002C 半形**（修正現行全形「，」之既有 codepoint 漂移）；`。` = U+3002 ✓
- 落地後全檔該字串恰 **1 處**，sha256 `dba43239…07f5` 與 Chat 交付相同 ✓
- JS 單引號內文無 `'`，無跳脫風險 ✓
- 無測試斷言舊字串 ✓

## 語意（Chat 說明，PM 覆核）

「在期」= 六個月期間內之**事實陳述**，非機制承諾；點名產品（問道·複盤）與格③卡面字面掛鉤；
零訂閱／續扣語意；期滿自然失真值，**由 `tier` 條件控制，不由文案承諾** —— 符合 fail-honest。

## 邊界（Chat 定，PM 覆核通過）

全檔「訂閱」8 處：本次只動 L1748；甲版落地自清退費段那處；
其餘（**L1407 死碼**帶 `expires_at`、`PAY_PLANS` 旗標、雜項）= PAY-ALIGN 卡清單。

PM 覆核：落地後全檔「訂閱中」**僅剩 L1407** 一處，即該死碼（打不存在的 `/subscription` 路由，`resp.ok` 恆偽故永不顯示）。與 Chat 邊界描述一致。

**建議 PAY-ALIGN 卡收一條驗收**：呈現層「訂閱」字樣清零（常數／註解不在此限，依該卡自定）。

*— v1.1 · 2026-08-21 · Cowork(PM) —*


---

# 🔴 v1.2｜件1 退費段 **HOLD**（Chat 第三道閘裁定，錨 `recngPOGnyVomTmoe`）

## Chat 裁定

四點全數成立。**判 = 不改字串、不交付現行甲版：L717 落地 HOLD。**

**根因（Chat 驗過）**：`Entitlement Contract v1.1 §6` 明列 refund/cancel、基礎問卦 entitlement、
深卜 included count、expiration **皆為 offer contract 待定項**。
→ ①（14 天實質為零天）與 ④（觸發詞未限定範圍）**不是文案缺陷，是在為尚未定義的政策寫承諾**。
S159 原句同病，只是舊時代沒人掀。

**無實害窗口**：付款軌未開，無人能成交；舊句多掛幾天零風險，**不迭代消費者權益文字**。

**分割**：L1748「問道·複盤在期,書房為您常開。」不涉退費，**照原 byte-master 落地，不受 HOLD**。

**甲版字串凍結不作廢**（承 `recvPdxwu4i4CSLtx` 之**執行暫緩，非推翻**）。
offer contract 定案後 Chat 出 v2，已登四項修訂：
① 條件前置呈現 ② 刪「書房陪您到期滿」 ③ 刪第二個「依規」 ④ 觸發詞按 offer contract 限定。

**Sequencing 新增**：**未來新退費文字上線不得早於 A11Y P0（`.pay-note` 2.36:1）落地。**

**Offer contract** = PAY-ALIGN admission 前置 **Owner 供料項**（最小四欄），掛卡，非急件。

## PM 執行

回退兩處，恢復為 `origin/main` 原文：

| 檔 | 動作 | 驗證 |
|---|---|---|
| `index.html` 退費段 | 甲版 → 原 S159 句 | 剩餘 diff 僅件2(4 行)+L1748(1 行) |
| `tests/test_e086_checkout_mock_v1_0.sh` L19 | 逐字鎖回退 | **與 `origin/main` 逐位元組完全一致** |

**保留**：件2 藏主期間、L1748、P2 突變體硬化、13/0 訂正、PAY-ALIGN 補登。

**未 merge，main 全程乾淨，零上線影響。**

## 🔴 PM 程序錯誤（本卡最重要的一條）

**我在第三道閘完成前就落地並 commit 了合規文案。**

我對件1 做的是 **byte 檢查**（sha256／codepoint／house-style）—— 那驗的是「有沒有貼錯字」。
**「這段話對消費者說了什麼」的語意複核，是在 commit 之後才由 fresh-context 複核席做的。**
四點全部成立，等於我把一段有問題的合規承諾先寫進了版控。

若當時 PR 已開已 merge，這就是**上線的消費者權益文字迭代**——正是 Chat 判 HOLD 要避免的事。

> **新增判例（合規文案專用）**：
> 涉消費者權益之文案（退費／保固／個資／服務承諾），
> **byte 檢查不得作為落地依據**。落地前必須先過「消費者視角語意複核」，
> 且該複核須由 **writer 以外的席位**執行。順序是：語意複核 → 落地 → byte 檢查，
> **不是**落地 → byte 檢查 → 語意複核。
>
> 一般 TA 文案（非權益類）維持現行順序。

## 追加登記

- **offer contract 最小四欄**（Owner 供料）= PAY-ALIGN admission 前置：
  refund/cancel 規則、基礎問卦 entitlement、深卜 included count、expiration。
- **Sequencing 硬約束**：新退費文字上線 **不得早於** A11Y P0 落地。
- 甲版字串（sha256 `8ac0e3d3…9e12`）凍結保存，供 v2 起草對照，**不得直接使用**。

*— v1.2 · 2026-08-21 · Cowork(PM) —*
