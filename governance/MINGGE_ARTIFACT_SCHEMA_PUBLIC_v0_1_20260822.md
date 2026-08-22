# MINGGE｜Artifact Schema（Public Reference）v0.1

```yaml
document_id: MINGGE-ARTIFACT-SCHEMA-PUBLIC-v0.1
filename: MINGGE_ARTIFACT_SCHEMA_PUBLIC_v0_1_20260822.md
created_at: 2026-08-22
document_class: sanitized_public_reference
purpose: 供 repo 施工端引用之欄位結構與規則；不含供應商私有內容
full_source:
  location: owning source（本機 canon 層，不進 public repo）
  document: MINGGE_ARTIFACT_SOURCE_BRIEF_v0_1_20260822.md
  note: 商品實體事實、供應商來源敘述、訪談題、取得管道等留 owning source
sibling: MINGGE_OFFER_CONTRACT_v1_1_20260822.md（offer / 價格 / entitlement truth）
```

> 本檔只回答:**artifact 資料長什麼樣、哪些欄位不得猜、哪些規則是硬的。**
> 不回答:這批貨從哪來、供應商說了什麼。

---

# 1｜Artifact 欄位（每件必備）

```yaml
artifact_id:
sku_source_ref:            # 來源平台 SKU 識別碼
title_mingge:              # 正式品名；未定稿一律 NEEDS_CHAT
actual_photos: []          # 須為自有託管且已取得授權之資產
price_mingge_twd:          # 未落實值前為 null
price_band:                # 3000_5999 | 6000_14999 | 15000_plus | null
inventory_model:           # unique_item | multi_quantity | PENDING_SUPPLIER
availability:
dimensions:
weight:
material_claim:
source_provenance:
traceability:
known_facts:
unknowns:
condition:
care:
cultural_use_context:
claims_prohibited: []
photo_rights:              # 未取得授權前為 NEEDS_SUPPLIER
collector_entitlement:     # 依 OFFER_CONTRACT §2，由 price_band 決定
```

缺資料欄位標 `NEEDS_SUPPLIER`；**不得以空字串或推測值填充**。

---

# 2｜硬規則

```yaml
no_guess:
  rule: 沒有資料的欄位不得猜，不得以來源平台文案回填

inventory_semantics:
  unique_item: qty 1；方可呈現「您看到的就是收到的這一件」
  multi_quantity: 不得宣稱一物一件；須說明實際個體是否與照片完全相同
  forbidden:
    - 一邊宣稱一物一件，一邊自 qty > 1 隨機出貨
    - 以來源平台顯示之「剩最後 N 件」推定 unique vs multi
    - 以來源平台 availability 作為 commerce inventory truth

claims:
  prohibited_effect_terms:
    [招財, 開運, 改運, 治療, 療癒, 排毒, 睡眠改善, 健康改善, 血液循環,
     磁場, 正磁場, 能量, 保護圈, 貴人, 桃花, 獨一無二]
  unverified_factual_claims:
    rule: >
      非效果類但未經查證之來源／現況／形成敘述，須獨立標記，
      不混入效果紅線；未取得 provenance 前不得作為商品頁事實，
      包括以「文化敘事」包裝。

authentication_boundary:
  rule: 供應商公司認證卡代表其自身背書；無第三方實驗室鑑定時，不得包裝成第三方科學鑑定證書

photo_rights:
  blocking: true
  rule: 未取得授權且未自有託管前，不得用於商品頁

scarcity_presentation:
  allowed: 誠實陳述現有庫存售完後未必能再取得
  forbidden_copy: [最後機會, 錯過不再, 限時, 倒數]
  forbidden_ui: [庫存倒數, 數量閃動, 限時計時器]
  basis: Acceptance G-04（無壓迫）
```

---

# 3｜上架阻斷條件

以下任一為真，該 SKU 不得上架:

```yaml
blocking_conditions:
  - photo_rights != CLEARED
  - inventory_model == PENDING_SUPPLIER      # 「這一件」語意不可寫
  - price_mingge_twd == null                 # 無法綁定藏主檔次
  - 商品頁五層之第 3 層（我們不知道什麼）為空
```

---

# 4｜五層商品頁結構

| 層 | 內容 |
|---|---|
| 1 | 這是一件什麼物：實拍、尺寸、重量、型態、色澤、雕工、品相 |
| 2 | 我們知道什麼：來源、材質、可追溯資料、保養與保存 |
| 3 | 我們不知道什麼：無第三方檢測或無法確認的部分，直接說 |
| 4 | 適合什麼情境：收藏、送禮、供佛／儀式、個人信物 |
| 5 | 不承諾什麼：不保證療癒、財運、改命、健康改善或特定結果 |

文案定稿權為 Chat；本檔只定結構與阻斷條件。

---

# 5｜Truth ownership

```yaml
artifact_facts:  owning source（本機 canon 層）
offer_price:     MINGGE_OFFER_CONTRACT_v1_1
inventory/order/fulfillment: commerce 後台（不在 Mingge 自建）
payment:         payment provider / ledger
entitlement:     entitlement store keyed to holder
```

不得以一個 status 代表其他 domain 已完成。
