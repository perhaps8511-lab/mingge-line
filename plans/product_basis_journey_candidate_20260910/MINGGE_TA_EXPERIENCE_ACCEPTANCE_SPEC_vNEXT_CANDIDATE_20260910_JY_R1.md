# Mingge 命格 × 龍宮舍利 Acceptance Master

```yaml
pack_id: MINGGE-PRODUCT-BASIS-vNEXT-CANDIDATE-20260909
status: OWNER_ADOPTION_CANDIDATE
canonical_effect: none_until_owner_explicit_adoption
runtime_claim: NONE
mutation_authority: NONE
owner: Perth
version: vNEXT_CANDIDATE
```

本檔為完整整合候選稿，不是要求施工者逐層套用舊 delta。來源、採用證據與具名修訂由 Index 綁定；六件之外的來源附件不是第七份 Product Basis。

## A01 方法與本輪適用性

所有條目回指Product P01–P19；無上游規則不得作blocker。原G/R/C/N ID保留；LP為公開入口與新增truth判準，OF為Offer parity，CT為採用內容保留。這是產品驗收定義，本輪文档review不是實作PASS。

E=來源／文件核對，M=機械或確定性行為檢查，D=owning store讀回，R=exact runtime binding，U=真機／真人controlled UAT。預演只可記SIMULATED／DESIGN_CHECK；所有正式D/R/U本輪NOT_RUN。

正式保存需write→readback→close/reopen→second read；wrong app/model/prompt/KB/route結果拒絕。付款、訂單、啟用、物流及退款需各自D/R；不能用UI或合成fixture證明。引用舊PASS必附原證據及未失效範圍，不因新session重測。

## A02 Product Traceability 全量表

| Acceptance ID | Product rule | Scope／evidence |
|---|---|---|
| G-01 | P02 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| G-02 | P10 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| G-03 | P03 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| G-04 | P03 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| G-05 | P15 | FUTURE_GATED實際交易／私密／啟用部分：E+M+D+R+U；預演只模擬 |
| G-06 | P16 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R1-01 | P04 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R1-02 | P04 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R1-03 | P04 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R1-04 | P04 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R2-01 | P05 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R2-02 | P05 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R2-03 | P05 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R2-04 | P05 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R2-05 | P05 | FUTURE_GATED實際交易／私密／啟用部分：E+M+D+R+U；預演只模擬 |
| R3-01 | P09 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R3-02 | P06 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R3-03 | P11 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R3-04 | P06 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R3-05 | P03 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R3-06 | P16 | FUTURE_GATED實際交易／私密／啟用部分：E+M+D+R+U；預演只模擬 |
| R3-07 | P16 | FUTURE_GATED實際交易／私密／啟用部分：E+M+D+R+U；預演只模擬 |
| R4-01 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R4-02 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R4-03 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R4-04 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R4-05 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R5-01 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R5-02 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R5-03 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R5-04 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R5-05 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R5-06 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R6-01 | P16 | FUTURE_GATED實際交易／私密／啟用部分：E+M+D+R+U；預演只模擬 |
| R6-02 | P16 | FUTURE_GATED實際交易／私密／啟用部分：E+M+D+R+U；預演只模擬 |
| R6-03 | P16 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R6-04 | P16 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-01 | P03 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-02 | P03 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-03 | P09 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-04 | P09 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-05 | P03 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-06 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-07 | P03 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-08 | P16 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-09 | P15 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-10 | P11 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-11 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-12 | P19 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| G-07 | P02 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| G-08 | P01 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| G-09 | P16 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| G-10 | P10 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R1-05 | P04 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R2-06 | P05 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R3-08 | P09 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R3-09 | P13 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R3-10 | P13 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R3-11 | P13 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R3-12 | P13 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R3-13 | P09 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R3-14 | P14 | FUTURE_GATED實際交易／私密／啟用部分：E+M+D+R+U；預演只模擬 |
| R3-15 | P15 | FUTURE_GATED實際交易／私密／啟用部分：E+M+D+R+U；預演只模擬 |
| R4-06 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R5-07 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R6-05 | P16 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| R6-06 | P15 | FUTURE_GATED實際交易／私密／啟用部分：E+M+D+R+U；預演只模擬 |
| N-13 | P13 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-14 | P13 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-15 | P13 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-16 | P04 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-17 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-18 | P10 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-19 | P06 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-20 | P18 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-21 | P04 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-22 | P11 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| N-23 | P15 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| C-01 | P04 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| C-02 | P05 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| C-03 | P03 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| C-04 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| C-05 | P03 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| C-06 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| C-07 | P03 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| C-08 | P16 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| C-09 | P16 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| C-10 | P05 | FUTURE_GATED實際交易／私密／啟用部分：E+M+D+R+U；預演只模擬 |
| C-11 | P04 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| C-12 | P05 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| C-13 | P13 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| C-14 | P15 | FUTURE_GATED實際交易／私密／啟用部分：E+M+D+R+U；預演只模擬 |
| C-15 | P16 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| C-16 | P09 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| C-17 | P12 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| C-18 | P14 | FUTURE_GATED實際交易／私密／啟用部分：E+M+D+R+U；預演只模擬 |
| C-19 | P09 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| C-20 | P15 | FUTURE_GATED實際交易／私密／啟用部分：E+M+D+R+U；預演只模擬 |
| LP-01 | P09 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| LP-02 | P09 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| LP-03 | P09 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| LP-04 | P11 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| LP-05 | P12 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| LP-06 | P12 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| LP-07 | P03 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| LP-08 | P16 | FUTURE_GATED實際交易／私密／啟用部分：E+M+D+R+U；預演只模擬 |
| LP-09 | P16 | FUTURE_GATED實際交易／私密／啟用部分：E+M+D+R+U；預演只模擬 |
| LP-10 | P15 | FUTURE_GATED實際交易／私密／啟用部分：E+M+D+R+U；預演只模擬 |
| LP-11 | P03 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| LP-12 | P13 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| LP-13 | P07 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| LP-14 | P14 | FUTURE_GATED實際交易／私密／啟用部分：E+M+D+R+U；預演只模擬 |
| LP-15 | P14 | FUTURE_GATED實際交易／私密／啟用部分：E+M+D+R+U；預演只模擬 |
| LP-16 | P12 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| LP-17 | P04 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| LP-18 | P16 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| LP-19 | P04 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| LP-20 | P15 | FUTURE_GATED實際交易／私密／啟用部分：E+M+D+R+U；預演只模擬 |
| LP-21 | P17 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| OF-01 | P06 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| OF-02 | P06 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| OF-03 | P06 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| OF-04 | P06 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| CT-01 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| CT-02 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |
| CT-03 | P08 | TARGET：E+U；涉資料追加D、runtime追加R、確定性規則追加M |

## A03 完整判準

### G-01 Primary Surface Identity

Product：P02。

六格恰為：
`MG-RM-01…06`，名稱與 Product Spec 一致；不得多第七格或用舊格③「訂閱方案」當 target identity。

### G-02 Five-second comprehension

Product：P10。

任一格首屏 5 秒內可回答：
- 我在哪；
- 可以做什麼；
- 不能做什麼；
- 下一步。

### G-03 No product-position drift

Product：P03。

①②④⑤⑥不得因格③ re-anchor 被改造成 commerce funnel。
FAIL：
- ①結果頁主動掛舍利；
- ②卦記變訂單歷史；
- ④文章預設導 checkout；
- ⑤變商品推薦；
- ⑥拿人生解釋代替訂單真相。

### G-04 Autonomy / no pressure

Product：P03。

不得：
- 恐嚇；
- 倒數；
- 「不買就錯過命運」；
- 負面卦象促銷；
- 把焦慮當轉換訊號。

### G-05 Buyer / Holder separation

Product：P15。

若實體商品包含藏主 entitlement：
- buyer 可與 holder 不同；
- 收禮者可自行啟用；
- 私人卦記不因付款者不同而被混讀。

### G-06 Fail-honest

Product：P16。

讀不到、付款 pending、entitlement 未入帳、物流未知、AI 無新增內容時，都不得假裝成功或完整。

### R1-01 唯一正式起卦

Product：P04。

任何正式新卦只能由 ①進入。
⑤不得偷偷建立新正式卦。

### R1-02 卦象完整交付

Product：P04。

一卦完成至少能對到：
- 所問；
- 卦象／必要結構；
- 可理解解讀；
- 可保存的卦記 reference。

### R1-03 No Commerce Leakage

Product：P04。

卦象結果：
- zero automatic SKU recommendation；
- zero「此卦適合某顆舍利」；
- zero 因負面／危機語意觸發商品。

### R1-04 Content quality

Product：P04。

TARGET 解讀至少能做到：
- 易經本體可追；
- 非 generic chicken soup；
- 生活化轉譯不破壞卦義；
- 不以「準不準」作唯一價值。

### R2-01 Decision Memory

Product：P05。

卦記必須能回看自己的歷史，而不是一次性結果列表。

### R2-02 Continuity

Product：P05。

關閉／重開後仍可讀同一使用者的既有紀錄（若 current data contract 宣稱 persistence）。

### R2-03 Deep-read / Fupan separation

Product：P05。

深卜、回音、落款、里程碑、複盤各自標示來源與時間，不得把後來生成的內容冒充當時原始卦記。

### R2-04 Commerce isolation

Product：P05。

order/payment/refund/price 不得成為 Decision Memory 內容真相。

### R2-05 Optional artifact linkage

Product：P05。

若使用者主動把一件信物連到某段卦記：
- linkage 必須 explicit；
- 可解除；
- 不得推導「卦象推薦」；
- commerce data 仍住 commerce truth store。

### R3-01 Intent-first first screen

Product：P09。

首層先分：
- 繼續使用命格；
- 看龍宮舍利。

不得第一屏平鋪全部價格與 SKU。

### R3-02 Pure Mingge path

Product：P06。

不買信物仍可理解純命格Offer v1.2；149／200／399／1490依資格與live狀態顯示及開賣，不因實體未開放阻斷純命格設計。

### R3-03 Artifact path

Product：P11。

實體商品頁至少具：
- 實品資料；
- 來源／材質；
- 可追溯資料；
- 已知／未知；
- 保養；
- 價格；
- 藏主權益；
- 退換／售後入口。

### R3-04 Price architecture

Product：P06。

- 3,000–5,999 不得包裝成「入門系列」；
- 6,000–14,999 為主力區間；
- 15,000+ 為典藏／送禮；
- 不以「能量強弱」定價。

### R3-05 No divination recommender

Product：P03。

任何商品選擇不得由卦象結果自動計算。

### R3-06 Payment truth split

Product：P16。

任何 payment implementation 必須分開：
- payment state；
- entitlement state；
- notification / UI state。
不得用一個「成功」畫面合併。

### R3-07 Order / entitlement ownership

Product：P16。

order、buyer、holder、entitlement、fulfillment 各自有明確 owner/store。

### R4-01 Preserve positioning

Product：P08。

書房仍是「翻」的生活化內容留存區，不變成第二個問卦／客服／商城。

### R4-02 Content pillars

Product：P08。

TARGET 至少可容納：
- 易經 × 日常選擇；
- 易經 × 人際與處世；
- 易經 × 工作／家庭／人生轉折；
- 節氣／時序；
- 信物文化與來源透明。

### R4-03 Teach before sell

Product：P08。

一般文章不得直接 checkout。
只有明確信物意圖才可導 ③。

### R4-04 IP / source discipline

Product：P08。

古典公版可直接引；當代學者內容不得長段逐字搬用，需原創重述。

### R4-05 Life-context quality

Product：P08。

生活化不是 generic advice；每篇須仍能辨識其易經／文化根據。

### R5-01 Identity trust

Product：P08。

首層可回答：
- 老易是誰；
- 怎麼讀易；
- 相信什麼；
- 不做什麼。

### R5-02 Learning QA

Product：P08。

可回答易經概念、卦義、文章、既有卦象的知識面問題，但不得建立新正式卦。

### R5-03 64 Gua depth

Product：P08。

代表性 64 卦測試至少能在需要時提供：
- 卦義；
- 卦辭／爻辭脈絡；
- 結構／象義；
- 生活化例子；
- 必要時比較其他卦。

### R5-04 Anti-repeat

Product：P08。

同一 conversation follow-up：
- 不得全文重播上一輪；
- 每次至少一種 delta：
  - simpler_explanation
  - life_example
  - classical_depth
  - comparative_explanation
  - direct_answer_to_new_angle

### R5-05 No fake novelty

Product：P08。

若沒有新資訊可補，應明說已回答過哪一層，再提供另一種深化方式；不得假裝「新答案」但內容實質重複。

### R5-06 No sales recommender

Product：P08。

不得回答「哪件舍利與我命定適配」；商品事實導③／④。

### R6-01 Support truth surface

Product：P16。

會員／付款／訂單／物流／退款／退換／藏主 entitlement／送禮啟用，必須來自 owning truth source。

### R6-02 Read error ≠ empty

Product：P16。

讀不到不得說「沒有訂單／沒有權益」。

### R6-03 No life interpretation

Product：P16。

訂單／退款問題不得轉⑤做人生命解釋。

### R6-04 Correct handoff

Product：P16。

- 商品／方案 → ③
- 易經學習 → ⑤
- 完成客服後 → 回原流程

### N-01 負例

Product：P03。

卦象結果推薦 SKU → FAIL。

### N-02 負例

Product：P03。

焦慮／危機語意觸發高價商品 → FAIL。

### N-03 負例

Product：P09。

格③把六個價格一次平鋪 → FAIL。

### N-04 負例

Product：P09。

沒有信物仍無法購買命格方案 → FAIL。

### N-05 負例

Product：P03。

④文章直接 checkout → FAIL。

### N-06 負例

Product：P08。

⑤第二輪回答與第一輪高度重複、沒有 delta → FAIL。

### N-07 負例

Product：P03。

⑤建立新正式卦 → FAIL。

### N-08 負例

Product：P16。

⑥訂單 read error 被顯示為「沒有訂單」→ FAIL。

### N-09 負例

Product：P15。

buyer／holder 混成同一身份 → FAIL。

### N-10 負例

Product：P11。

商品效果宣稱改運／招財／療癒／健康改善 → FAIL。

### N-11 負例

Product：P08。

當代著作大段逐字搬進 KB/answer → FAIL。

### N-12 負例

Product：P19。

current implementation 與 Product Basis 不同時，以 current code 反改 acceptance → FAIL。

### G-07 Natural-language six-grid comprehension

Product：P02。

5 秒內，TA 能用自己的話分辨：

- 問一件新的事；
- 回看、補記已有的事；
- 看方案或龍宮舍利；
- 自己讀一篇；
- 把看不懂的問懂；
- 查權益、訂單與售後。

`MG-RM-05` TA-facing display 為「問老易」，canonical role 仍為老易介紹＋老易說易。

### G-08 No meditation scope drift

Product：P01。

六格及 touched screens 不得新增靜坐、靜心、氣功或第七格。

### G-09 State-aware CTA honesty

Product：P16。

同一 screen 在 empty／open／pending／read_error 或 explicit-save／auto-save 狀態下，CTA 必須對應 true state。按鈕不得暗示不存在的商品、保存、付款、訂單或權益。

### G-10 Semantic ownership / anti-repeat

Product：P10。

同一完整產品理念不得在連續兩屏重播。下一屏必須提供新的 Product Job、資料或決策；否則 `MERGE / CUT / MOVE`。

### R1-05 Result handoff and persistence truth

Product：P04。

- 結果頁只有交付＋保存／查看＋退出。
- 顯式保存與自動保存只能擇一。
- 確定未寫入時，顯式保存的退出必須明說不會進卦記；若寫入／讀回不明，改用U04 unconfirmed文案，不斷言未保存。
- 顯示「已保存」須有 write／readback。
- 不得同屏顯示深卜、複盤、方案、商品或靜心。

### R2-06 First completion ≠ delayed return

Product：P05。

- 保存完成後只確認已留下，允許看本卦或離開。
- 隔一段時間回到單則卦記，才顯示「事情有變／同卦深看／跨卦回看／新問題」。
- 測試者不經提示能說出四條路差別。

### R3-08 Owned guide page

Product：P09。

正式龍運藏入口、列表與詳情都在 owner-controlled page。Pinkoi URL、舊標題、舊 copy、tags、redirect、iframe 不進 TA-facing production flow。

### R3-09 Zero-SKU content closure

Product：P13。

`artifact_catalog_state=empty` 時：

- 龍運藏入口 Primary CTA 是「先認識龍宮舍利」；
- 不顯示「看看現有手鍊」或假商品卡；
- TA 可完成知識內容並安全回命格；
- 不形成 dead end。

### R3-10 Publication gate: pending vs disclosed unknown

Product：P13。

商品公開必須 all pass：

- photo rights cleared + owned hosting；
- inventory model confirmed；
- price confirmed and Offer binding complete；
- required basic facts confirmed；
- disclosed unknowns 有 evidence ref；
- care／after-sales 達 current publish rule。

`pending_source` 不得公開成「尚待確認」；公開第 3 層只允許 evidence-bound `disclosed_unknown`。

### R3-11 Pinkoi reference only

Product：P13。

Pinkoi 只供 source extraction／layout reference；不得作 inventory、photo-rights、material、provenance、checkout、order 或 entitlement truth。

### R3-12 First-batch honesty

Product：P13。

XTVSSPvA／agmh9hhJ／S9j544BD為舊工作候選，不等於available；本期類型可含手鍊、鍊墜／鍊子，逐件publication gate，不自行給低於最低價帶的商品藏主權益。

### R3-13 No mandatory culture course

Product：P09。

catalog open 時，使用者可直接看手鍊；知識頁是可選路徑，不是購買前強制長文。

### R3-14 Provider-neutral future checkout

Product：P14。

Provider 未 admitted 時不顯示「立即購買」。上線後 payment／order／holder／entitlement 各讀 owning truth。

### R3-15 Buyer / Holder dual-seat

Product：P15。

送禮路徑必須：

- buyer 付款前理解權益屬 recipient；
- holder 自己看清並 explicit 啟用；
- holder 可延後、拒絕或求助；
- buyer 無 private Decision Memory／usage read；
- entitlement starts_at 不早於 holder activation。

任一弱勢席 🔴 → 送禮旅程 FAIL。

### R4-06 Read, not ask

Product：P08。

④首屏讓 TA 理解「自己讀一篇」；不變成第二個 QA、問卦或商城。

### R5-07 Ask to understand

Product：P08。

⑤ display label 與首屏讓 TA 理解「把看不懂的問懂」；新個人決策回①；每輪至少一個可辨識 delta。

### R6-05 Contextual return

Product：P16。

客服完成後回原商品、checkout、啟用、方案、同一卦記或文章；只有無 context 才回首頁。

### R6-06 Holder activation truth

Product：P15。

顯示商品、期間、holder自主起算、隱私、現在／稍後／不接受／求助。未驗explicit activation及entitlement readback不得active；未啟用不從付款或寄達倒數。

### N-13 負例

Product：P13。

TA-facing production 出現 Pinkoi redirect／checkout／legacy copy → FAIL。

### N-14 負例

Product：P13。

以 Pinkoi 或類似 SKU 回填未確認材質、來源、品相、照片、庫存 → FAIL。

### N-15 負例

Product：P13。

0 published SKU 時仍顯示商品卡、價格或可購買狀態 → FAIL。

### N-16 負例

Product：P04。

結果頁出現商品、方案、深卜、複盤或靜心 immediate upsell → FAIL。

### N-17 負例

Product：P08。

④與⑤在 5 秒測試中多數 TA 無法分辨 → FAIL。

### N-18 負例

Product：P10。

連續兩屏完整重播同一語意，下一屏無新任務／新資料 → FAIL。

### N-19 負例

Product：P06。

吊飾低於 current 最低價帶卻自動取得藏主期間 → FAIL。

### N-20 負例

Product：P18。

5ml 檀香保養油被描述為能量、療效、淨化、純精油或 entitlement → FAIL。

### N-21 負例

Product：P04。

顯式保存 screen 使用「稍後再看」但實際未保存 → FAIL。

### N-22 負例

Product：P11。

`pending_source` 以「我們不知道」公開，掩蓋資料尚未收齊 → FAIL。

### N-23 負例

Product：P15。

buyer 可看到 holder 卦記／使用紀錄，或 holder 未同意即啟用 → FAIL。

### C-01 ①結果 → ②

Product：P04。

本人結果保存／查看；不帶商品。

### C-02 ②新問題 → ①

Product：P05。

本人明確選另一件新事。

### C-03 ②主動商業意圖 → ③

Product：P03。

非卦象／焦慮觸發；未確認免費量不造第9卜觸發。

### C-04 ④文章 → ⑤

Product：P08。

帶article context問懂後可回原文。

### C-05 ④實品意圖 → ③

Product：P03。

使用者明確選擇，文章不直checkout。

### C-06 ⑤新決策 → ①

Product：P08。

只handoff，不在⑤起卦；不重播engine句。

### C-07 ⑤商品事實 → ③／④

Product：P03。

實品走③、文化走④，不推薦。

### C-08 ③交易售後 → ⑥

Product：P16。

按本人資格讀truth。

### C-09 ⑥商業／學習 → ③／⑤

Product：P16。

依意圖正確分流。

### C-10 信物 ↔ ②可選關聯

Product：P05。

FUTURE_GATED；explicit、可解除、commerce隔離。

### C-11 結果 → 保存確認

Product：P04。

保存真相成立、無immediate upsell。

### C-12 首次完成／延後回訪

Product：P05。

不同context，不以點下一頁假造延後。

### C-13 ③ → catalog/content

Product：P13。

empty/open/read_error各自CTA。

### C-14 購買 → buyer/holder

Product：P15。

雙席分離，holder自選啟用。

### C-15 ⑥ → 原任務

Product：P16。

保留最小context並重新授權。

### C-16 公域 → 公開頁 → 商品

Product：P09。

不先問卦、不先加LINE、不強制文化課。

### C-17 公開頁／商品 → 來源卡

Product：P12。

區分批次／SKU與簽名狀態，能回原商品。

### C-18 商品 → checkout → 狀態

Product：P14。

ready且live才付款；payment/order/entitlement分別核對。

### C-19 公域商品 → 詢問 → 原商品

Product：P09。

自願LINE；另可公開客服，無私人memory。

### C-20 paid → holder自主啟用

Product：P15。

本人claim／退款資格／active readback，不從付款起算。

### LP-01 公域直入

Product：P09。

未登入陌生客從source link直入LP-S01→LP-S05；不用經①，商品已published時看得到實品與價格。

### LP-02 不先問卦

Product：P09。

直接購物路徑零正式起卦、零所問輸入前置；啟用不要求先買問卦。

### LP-03 不先加LINE

Product：P09。

無LINE身分可看商品與價格，亦可抵達live checkout；LINE為自願詢問，非解鎖價格。

### LP-04 四類證據

Product：P11。

詳情及來源卡明確分collector／supplier／third-party／unknown；每個assertion能回到適用證據範圍。

### LP-05 未簽不親簽

Product：P12。

signature=pending/sample_only/unknown時不顯已親簽；用帶簽名圖樣的樣稿做負例仍應被拒。

### LP-06 卡不變科學證書

Product：P12。

卡片、印章、QR不被UI包裝成材質鑑定、真品、能量或功效保證。

### LP-07 public不建卦

Product：P03。

公開頁所有導航不建立正式卦；自願回LINE後仍須由①正式開始。

### LP-08 public不讀私密

Product：P16。

匿名、改record_ref及不同buyer皆無private Decision Memory讀寫權；無私密資料進URL／analytics。

### LP-09 付款與權益分離

Product：P16。

合成paid＋activation未開始不顯active；正式需payment/order/entitlement各自owning證據。

### LP-10 雙席同意

Product：P15。

buyer≠holder時buyer只能看本人交易；holder可延後拒絕；自用亦無預勾。

### LP-11 負面不賣貨

Product：P03。

負面卦象、焦慮、危機、私人所問均零SKU trigger，危機不以商務前置。

### LP-12 真稀缺無壓迫

Product：P13。

僅有已核補貨現況；無倒數、最後機會、數量閃動或錯過命運。

### LP-13 複盤live gate

Product：P07。

能力非live時不販售／列現在已含複盤；TARGET預演可有明示模擬，不減損已採用Offer。

### LP-14 MoR與route gate

Product：P14。

MoR/provider/environment/route/政策或履約任一未核時無有效checkout；approved但未live仍不付款。

### LP-15 藍新申請中

Product：P14。

approval=pending/conditional/rejected/unknown不得因UI顯成功或已有EPG文案而標可付。

### LP-16 卡片一致性

Product：P12。

姓名、issuer、日期、SKU/batch適用、勾選scope、簽署證據、用印、QR目的地逐項一致才公開該聲明；SKU碼不能將batch勾選升格。

### LP-17 保存不確定

Product：P04。

write成功＋readback失敗、write timeout兩負例均unconfirmed，不宣稱已保存／未保存；查核不得重複寫同筆。

### LP-18 公域售後與回原路

Product：P16。

匿名可找到公開客服；本人訂單查詢另驗身份；LINE點擊不算訊息送達；支援結束回同商品或安全首頁。

### LP-19 歡迎保存語意

Product：P04。

explicit或不明保存狀態不先保證每次所問一定留存；結果交付及真實保存要求仍在。

### LP-20 啟用重試與拒讀

Product：P15。

重複啟用不多發／重算期間；錯holder、失效claim、confirmed full refund拒絕，paid保留與退款truth不被覆寫。

### LP-21 歸因truth

Product：P17。

沒有source保留unknown；點LINE僅link_clicked；purchase/activation事件需owning證據，無私人所問或raw identity。

### OF-01 價格期間parity

Product：P06。

四offer ID/149/200/399/1490與3/6/24個月逐值相符；低於3000不自造藏主期間。

### OF-02 四鏡與期間

Product：P06。

歷史本人卦亦eligible、每卦完整深卜一次、無月bucket/reset/carryover、無固定1/3/12或2次quota。

### OF-03 複盤條件

Product：P06。

2筆不同卦不可複盤；3筆＋權益可；再次無新卦／後續不可，有新內容才可；非live不開賣。

### OF-04 起算及保留

Product：P06。

半年從付款確認、實體從holder啟用；到期及full refund後已產生內容可讀，退款僅撤銷對應來源；獨立單買不連帶消失。

### CT-01 採用內容保留

Product：P08。

十二問法／六組改寫／八篇starter全文沿來源；不把舊題域限制寫回產品，不大段搬當代作品。

### CT-02 例外不解除

Product：P08。

核心文案v0.2已採用仍保留N13/N16不公開例外，未核句不冒充已核。

### CT-03 四chips與handoff

Product：P08。

四顆visible chips；新角度非第五顆；engine handoff及fallback不同時出現。

## A04 完成判準與報告

本輪：六件一致、所有ID有Product anchor、所有cross-edge與Journey一致、Offer逐值相符、來源未知不冒充完成；候選保持OWNER_ADOPTION_CANDIDATE。
預演：六格與公開入口可完整點閱、八篇非空殼、成功/失敗/空/未知/雙席情境可切換，外框全程標合成；不做真實checkout、LINE、runtime、資料寫入或部署。UAT未跑不標PASS。
正式產品：以採用後適用範圍＋既有completion contract及正式授權判斷；未admitted項可N/A但必寫原因，不能刪criterion換綠。Required target不能用future gate永久跳過。Product Acceptance PASS ≠ WP Closed ≠ LIVE。

每筆結果保存acceptance_id、Product anchor、screen、journey、source revision、actor、time、exact locator、performed action、expected/actual、PASS/FAIL/NOT_RUN/N/A、limitations及失效條件。獨立review依專案要求由非writer完成；本輪作者bounded review不冒充獨立審查。


## JY-20260910｜Owner 具名採用之旅程缺口修訂

本節為本轮有限施工的候選整合；審計文件只是輸入，未整體採用。保留原版設計、共用 Noto Sans TC 黑體與 26/20/17 字級；100% 為審閱預設。原文未受影響條目與有效證據保留；本節與舊文矛盾時，僅本輪具名範圍依本節及 Owner 指令。六件仍非正式 runtime／發布採用，所有 owning-store、真人 UAT 與部署驗收均未完成。

不採用額度用盡單一路徑、首卦免費、第 N 次收費、送驗、上架通知、回訪提醒、節氣廣播或到期提醒。免費數量未核不阻擋五態候選。照片及來源卡留白，不新增鑑定、親簽、材質、庫存、折扣、退換承諾。
### JY-A 增量驗收（原 126 條未升格）

|ID|候選驗收|路由|
|---|---|---|
|JY-01|隨貨卡不含實際 token，逐件期間未核不填數|parcel|
|JY-02|未驗證或未同意或期間未核不得啟用|activate-consent|
|JY-03|買家不能代同意／讀紀錄|gift-buyer|
|JY-04|稍後與不接受不啟用；pending 不偽稱撤销|later|
|JY-05|提交後 pending；只有確認後成功|activation-result|
|JY-06|失效／已領取／待確認都有查詢及求助|activation-result|
|JY-07|成功提供問一件事與已有來源全文閱讀|read|
|JY-08|期間／單次／免費／無權益／read_error 五態|eligibility|
|JY-09|期間無額度用完；read_error 無購買入口|eligibility|
|JY-10|完整 Offer 權益、起算／到期／送禮|rights|
|JY-11|空目錄來源／返回／詢問，無上架通知|catalog|
|JY-12|手機 100% 正常尺寸、200% 明確區分、無外連|all|

新增 12 個候選檢查，不代表原 126 條或真人理解度通過。實際結果見 journey-verification.json；正式驗證、金流、安全、owning-store write/readback、跨次回訪和真人 UAT 均 NOT_RUN。
