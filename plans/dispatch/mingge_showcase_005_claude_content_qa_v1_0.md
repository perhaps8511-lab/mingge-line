# MINGGE-SHOWCASE-005｜Claude Final Content QA Dispatch v1.0

> 執行角色：Claude（內容正確性、味道與必要重寫）
> Accountable agent：Codex（範圍、正本、routing、驗收與排程）
> 日期：2026-07-18
> 本卡只產內容 QA 與修訂稿，不授權 Dify／Airtable／Make／LINE mutation。

## ① WHY

Soft launch 的內容目標不是「資料很多」，而是：

1. 古典引用正確、歸屬清楚，不用模糊或過度絕對的說法換取氣勢。
2. 讀起來有老易的人味：沉穩、白話、留白、把難的講淺；不是百科、客服或斷言腔。
3. TA 即使不付費，也能在老易與易經書房得到真實收穫，願意長期回來。
4. 內容能同時服務前台閱讀與 RAG 檢索，且不污染客服／問卦邊界。

## ② Pinned inputs

以下為本輪唯一輸入；遇到同名或舊版，不自行混用：

| 用途 | 檔案 | SHA-256／狀態 |
|---|---|---|
| 聲線 gate | `001_spec_dg_voice_S165_v1_0.md` | `03156179fd1b43f73071dbf25c242e3f3058bdcd8d8c529595c8b9ea0b2a2308` |
| 老易迎新 KB | `001_product_kb2_31_reception_S166_v1_0.md` | `89cb1b9201ca78ab21b6efc790b6aeae8e4380c1bd126c22849b17de9cbb9710` |
| dg batch3 | `001_product_shufang_dugua_batch3_S166_v1_0.md` | `6a97134e3df27490af0553d78748c4c291a9cf0b00fb8d7ff205b1ad81149f62` |
| dg batch1 polish | `001_product_shufang_dugua_polish_b1_S166_v1_0.md` | candidate；不得覆寫舊檔 |
| 書房入門 | `001_product_shufang_rumen_batch1_S165_v1_0.md` | candidate |
| 接待規格 | `001_spec_kb2_reception_S165_v1_0.md` | supporting spec |

古典逐字真相源必須使用既定 `mingge_gua64_classics_v1_0.json`／`mingge_yaoci_lookup_v1_0.json`／明確公版來源。若手上沒有真相源，標 `BLOCKED-SOURCE`，不得憑記憶補字。

## ③ 本輪只審三個代表樣本包

先小樣、後批次，避免整批重工：

### Sample A｜老易迎新

從 `kb2-31` 精審並必要修訂 4 題：

- 沒讀古文是否看得懂；
- 基督徒／拜拜是否衝突；
- 與算命有何不同；
- 卜到「不好」的卦是否該怕。

這四題覆蓋：開門感、宗教邊界、品牌定位、恐懼／吉凶邊界。

### Sample B｜易經書房入門

從 `001_product_shufang_rumen_batch1_S165_v1_0.md` 選最適合第一次進書房的 1 篇，完成全文精審與必要修訂。選文理由需用一句話說明，不向 Owner 反問要選哪篇。

### Sample C｜讀卦隨筆

精審 `dg-20 老易讀卦—否`。它同時測試逆境內容是否不恐嚇、不雞湯、不下判決，並檢查 V1–V6 聲線。

三個樣本過 Owner 味道終審後，才可把同一修訂規則展開到其餘批次。

## ④ 必跑 QA gates

### G1｜古典與事實正確性（硬閘）

- 每段引文列出篇名／傳別／卦爻位置與核對來源。
- 分清「古典原句」「白話解釋」「命格／老易的立場」。
- 引文逐字或歸屬不確定即 `BLOCKED-SOURCE`；不可用「大意正確」放行。
- 特別查核：`五十以學易` 異文與出處、`善為易者不占` 的文本歸屬、宗教不衝突的論證界線。

### G2｜斷言強度與專業度

下列句型必須逐句判斷，不可因有感而放寬：

- 「千年來讀它的，多是做事的人」等歷史概括；
- 「不衝突」「它不碰您的信仰」等普遍宗教斷言；
- 將算命、占卜、學易做絕對二分的句子；
- 對創業、獲利、決策結果或心理安定的隱含承諾。

處理原則：能證明就補精確限定；不能證明就收斂為品牌立場或邀請式說法。

### G3｜品牌與安全邊界

- 不斷吉凶、不保證結果、不製造恐懼、不貶抑宗教或其他傳統。
- 一般易理可由老易回答；個人具體占問導向「向天問卦」；價格、額度、帳號、付款導向「書僮客服」。
- 老易不回答方案數字；書僮不代替老易講易理。

### G4｜老易聲線

- 使用 V1–V6 作 checklist：擺不評、短句留白、在場一筆、對面遞話、口說白話、落印收尾。
- 不模仿或指名在世作者的風格。任何新 production prompt/spec 都改寫成可觀察特質，例如「沉、緩、留白、短句、把難講淺」。
- 不為了「像老先生」堆古語；TA 35–65 歲可一次讀懂。

### G5｜RAG 可檢索性

- 一題／一篇一個完整語意塊；標題、TA 原話與回答不得被切散。
- 同一規則只留一個主錨；避免 prompt 與 KB 兩處互相漂移。
- 延伸閱讀只推薦確實存在、可達且已 QC 的內容；不虛構篇名。

## ⑤ 必交成果

### A. `qa_report_mingge_showcase_005_samples_v1_0.md`

每個樣本逐項列：

| 欄位 | 必填內容 |
|---|---|
| Verdict | `PASS`／`REVISE`／`BLOCKED-SOURCE` |
| 原句 | 精確定位，不貼整篇重複內容 |
| 問題類型 | 引文／歸屬／斷言／邊界／聲線／RAG |
| 證據 | 真相源或公版來源；無來源明寫無法核對 |
| 修訂原則 | 為何這樣改，不只給新句 |
| 回歸影響 | 是否需新增／改動 QA case |

### B. 三份 revised sample

- `sample_A_kb2_31_reception_revised_v1_0.md`
- `sample_B_shufang_rumen_revised_v1_0.md`
- `sample_C_dg20_pi_revised_v1_0.md`

即使原文 PASS，也交付標明「無修訂」的完整樣本，供 Owner 一次比較。

### C. `claude_batch_revision_rules_v1_0.md`

只整理三個樣本實際證明需要的共通規則；不要預先重寫全部檔案。每條規則包含：觸發條件、改法、不得改的內容、適用批次。

## ⑥ 封閉驗收

- [ ] 三個樣本 G1–G5 全有 verdict，無靜默略過。
- [ ] 所有古典引文可追到明確來源；不確定處維持 blocked，沒有猜寫。
- [ ] 宗教、算命、商業、吉凶相關絕對句已證明或收斂。
- [ ] V1–V6 可逐項勾選；沒有 named-style imitation。
- [ ] 行政／易理／個人占問 routing 三分清楚。
- [ ] 未碰 Dify、Airtable、Make、LINE，未刪除或覆寫任何舊版本。
- [ ] 沒有把全批重寫當成本輪成果。

## ⑦ 回報格式

1. `本次完成`：三個樣本各一句結果。
2. `本次卡住`：只列 `BLOCKED-SOURCE` 與所缺真相源，不丟技術選擇題給 Owner。
3. `建議批次範圍`：指出哪些檔案可依共通規則展開、哪些應維持不動。
4. `Owner 只需判斷`：三個 revised sample 是否「正確、有感、像老易」；其餘由 accountable agent 接回。

## 🔴 RED LINES

- 不調整價格、額度、付款／退款規則或產品承諾。
- 不改 routing、程式、Make scenario、Dify app/dataset 或 Airtable records。
- 不用無來源引文補強氣勢；不創造平行版本；不刪舊檔。
- 不把老易寫成算命師、心理師、宗教裁判或商業成功保證人。
