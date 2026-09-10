# Mingge 命格 × 龍宮舍利 Product Basis Index

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

## I01 版本與採用狀態

保留vNEXT_CANDIDATE命名。現已取得v1.1正式adoption＋9/3維持RC1的後續採用紀錄及已採用核心文案；原RC1單獨adoption記錄未取得，本輪不另編造正式遞增版號或採用anchor。候選基於v1.1＋RC1＋Offer v1.2＋核心文案v0.2＋9/9開場與Final BD整合。

本包狀態OWNER_ADOPTION_CANDIDATE，不覆蓋D槽canon、repo、Airtable或runtime，不代表已交付預演HTML。可交Codex先做隔離產品預演；預演作為Owner採用的審閱材料，不必先把候選冒充正式採用。

## I02 六件Exact Binding

| Role | File | SHA256 |
|---|---|---|
| P | [MINGGE_TA_EXPERIENCE_PRODUCT_SPEC_vNEXT_CANDIDATE_20260910_JY_R1.md](MINGGE_TA_EXPERIENCE_PRODUCT_SPEC_vNEXT_CANDIDATE_20260910_JY_R1.md) | c18749cbc4d07aa6eaa6beac03e3563352d8fa148f2300080813b8e7ac072322 |
| A | [MINGGE_TA_EXPERIENCE_ACCEPTANCE_SPEC_vNEXT_CANDIDATE_20260910_JY_R1.md](MINGGE_TA_EXPERIENCE_ACCEPTANCE_SPEC_vNEXT_CANDIDATE_20260910_JY_R1.md) | fa490024ef40513e49380e67f099262be6130e8a8e84460d2b06bb579d0e96d4 |
| U | [MINGGE_UI_INTERACTION_SCREEN_SPEC_vNEXT_CANDIDATE_20260910_JY_R1.md](MINGGE_UI_INTERACTION_SCREEN_SPEC_vNEXT_CANDIDATE_20260910_JY_R1.md) | 8f95bfcb8305a19d9378c8990645e459458fc645539732c7e1f6a141ed057c0c |
| J | [MINGGE_TA_JOURNEY_STATE_CONTRACT_vNEXT_CANDIDATE_20260910_JY_R1.md](MINGGE_TA_JOURNEY_STATE_CONTRACT_vNEXT_CANDIDATE_20260910_JY_R1.md) | fb1851770aed113fe22dfdeeaae2e9bb7b76118f4add440e9d0613a573fbe379 |
| D | [MINGGE_DATA_RUNTIME_ENTITLEMENT_CONTRACT_vNEXT_CANDIDATE_20260910_JY_R1.md](MINGGE_DATA_RUNTIME_ENTITLEMENT_CONTRACT_vNEXT_CANDIDATE_20260910_JY_R1.md) | 796ee3a95657c8b086ee66295ddab556cea8f6f4310dcf024fedc61213cd9af3 |
| I | MINGGE_PRODUCT_BASIS_INDEX_vNEXT_CANDIDATE_20260910_JY_R1.md | 自身hash見外層SHA256SUMS.txt，不內嵌self-hash |


## I03 來源效力與條款優先序

已採用current truth仍由其adoption及具名amendment決定。本候選若被採用，五份Master為整合後產品讀取面，無須再把五份舊delta逐層套用；Offer v1.2與未衝突核心exact copy作下位來源保留，衝突僅依下列具名修訂。未採用前，本包無canonical effect。

| 來源／條款 | 整合裁決 | 新位置 |
|---|---|---|
| v1.1六格與核心工作 | KEEP | P01–P05/P08/P16 |
| RC1 D-P01–11、D-U、D-J、D-D | 保存分流、五格角色、owned guide、雙席、truth全部保留；public新入口與商品型態具名擴充 | P02/P04/P05/P09–P18 |
| Offer v1.2全條款 | 149/200/399/1490、同period rights、3/6/24月、不同起算、到期保留 | P06/P07、D05、OF-01–04 |
| 核心文案v0.2、Airtable recfmGJLEFdsmCsUL | 沿已採用十二問法、八篇、四chips、handoff、N13/N16例外 | P08/U06/CT-01–03 |
| 核心文案§4.5/4.6/4.7 | write未知或readback失敗不能說未保存；新增unconfirmed | P04/D08/U04/LP-17 |
| 核心文案§2.2保存保證句 | 未證明自動保存時不放該保證句 | U04/LP-19 |
| 核心文案§8.2實體paid與§8.3送達句 | paid不自動開通藏主；未送達不說已送達 | P15/P16/U04/LP-18 |
| v1.1 Acceptance C-03「第9卜」例子 | current免費數量未核，不以該歷史例子新建數量trigger；主動商業意圖保留 | C-03/P03/P06 |
| 舊三手鍊working set／v1.1 private-domain-first | 不將三件candidate等同可售；第一期含手鍊及鍊墜、public direct合法 | P01/P09/R3-12/LP-01–03 |
| Landing draft「藍新核准後可付」 | 還需MoR/route/store/政策/live證據，不能只有approved | P14/D07/LP-14–15 |
| Landing draft行高1.7 | 沿較上位原UI≥1.9 | U01 |
| 聲明卡圖樣 | 樣稿、簽名／日期／issuer／scope逐項驗，不認證功效 | P12/D04/LP-16 |

## I04 Primary Surface Binding

LINE_RICH_MENU恰MG-RM-01…06；第五格顯示「問老易」、角色仍老易介紹＋說易。MG-PUB-LY是公開商務信任surface，並非第七Rich Menu。LP七個區段不是新增七格；六件之外沒有第七份Product Basis。

## I05 Acceptance與Completion

完整126個criterion在Acceptance A02逐條回指P01–P19；31個screen、20條C-edge由U03/J09綁定。traceability.json是機械對照附件，不另有產品規則。

既有未失效PASS保留，不在本輪重跑或升格。正式目標所需條目按已admitted範圍驗；payment/order/holder/entitlement、optional link的既有FUTURE_GATED界線保留。公開頁和新文案需採用及相應實作後驗；所有D/R/U本輪NOT_RUN。

本輪bounded review檢查文件閉合、來源parity與具名衝突；非writer獨立review在Codex交接中要求完成，不能由本輪作者冒充。Owner先看預演再採用，不為ordinary choice逐步停等。

## I06 正式上線前最小缺口

來源與卡樣稿、SKU權利／facts／care、MoR／route／售後、N13/N16及live能力狀態詳SOURCE_REGISTER。這些限定公開／交易動作，不阻六件候選或合成預演。沒有供應商資料不造事實，也不把較舊0 published快照寫成今天runtime。

## I07 交付與下一個有限成果

包外層含bounded review、來源register、Codex handoff、traceability、SHA256SUMS；Supporting Sources含Offer與完整已採用核心文案。交給Codex做單一離線HTML，手機可讀、完整交互、多情境、合成資料、不接backend不部署。Codex需先做獨立bounded review及普通確定性修正，再完成預演和一批檢查；遇Product裁決衝突才停受影響部分。

採用後如進正式工程，仍依session授權與專案界線；本包不自授權merge、deploy、商品上架、付款或Activation。


## JY-20260910｜Owner 具名採用之旅程缺口修訂

本節為本轮有限施工的候選整合；審計文件只是輸入，未整體採用。保留原版設計、共用 Noto Sans TC 黑體與 26/20/17 字級；100% 為審閱預設。原文未受影響條目與有效證據保留；本節與舊文矛盾時，僅本輪具名範圍依本節及 Owner 指令。六件仍非正式 runtime／發布採用，所有 owning-store、真人 UAT 與部署驗收均未完成。

不採用額度用盡單一路徑、首卦免費、第 N 次收費、送驗、上架通知、回訪提醒、節氣廣播或到期提醒。免費數量未核不阻擋五態候選。照片及來源卡留白，不新增鑑定、親簽、材質、庫存、折扣、退換承諾。
### JY-I 綁定與來源
原 126 criteria／31 screen／20 C-edge 為保留基準；JY 增量為 12 checks、14 routes 與明列 transitions，分開統計。見 journey-traceability.json；原 traceability 歷史不回填本輪 PASS。源 Offer v1.2 及 Core v0.2 保持原 bytes。

本輪檔案為 20260910_JY_R1，I02 已重算五件 SHA，Index 自身見 SHA256SUMS.txt。實作在 assets/longyun-journey.js 與原 longyun.js 的有限整合；不修改原起卦 script 或金流 PR。
