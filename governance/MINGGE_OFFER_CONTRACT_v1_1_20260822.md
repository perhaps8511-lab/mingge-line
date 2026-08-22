# MINGGE｜Offer Contract v1.1

```yaml
document_id: MINGGE-OFFER-CONTRACT-v1.1
filename: MINGGE_OFFER_CONTRACT_v1_1_20260822.md
owner: Perth
created_at: 2026-08-22
project: Mingge / 命格
document_class: owner_adopted_subordinate_offer_contract
subordinate_to:
  pack_id: MINGGE-PRODUCT-BASIS-PACK-v1_1-20260817
  adoption_anchor: reccwLGV2fK3ta4xr
  clauses: MINGGE_DATA_RUNTIME_ENTITLEMENT_CONTRACT_v1_1 §6 / §8
precedence_rule: PRODUCT_BASIS_IS_SUPERIOR
precedence_detail: >
  本檔補齊 Product Basis 明文要求「正式 implementation 前需由 offer contract 明確」之 offer truth。
  本檔不是第七份 Product Basis。若本檔與 Product Basis 衝突,一律以 Product Basis 為上位;
  不得以本檔反向修改 Product Basis。
source_of_numbers: >
  本檔數字來源為 2026-08-16《運好氣-龍運藏 × 命格》BD 完整方案,經 Owner 於 2026-08-22 逐項確認。
  這是把已存在於商業方案、但尚未落入 implementation contract 的 offer truth 收回確認,
  不是重新發明產品。
basis_parity_check:
  performed_at: 2026-08-22
  method: sha256sum vs SHA256SUMS.txt
  result: 6/6 PASS
version_history:
  v1_0_20260822: Owner 逐項確認 O-1~O-13,補齊 canon offer 留白
  v1_1_20260822: 首批 SKU 定價與狀態落實;artifact truth 分離為獨立 brief;新增稀缺呈現禁令
scope_boundary:
  this_contract_owns: offer_id / offer_version / Mingge 售價 / price_band / duration /
    included_entitlements / buyer_holder / activation / expiry / refund-state semantics / fair-use
  this_contract_does_not_own: 商品實體事實(來源/材質/品相/尺寸/一物一件/保養/認證卡/known-unknown/photo rights)
  artifact_truth_lives_in: MINGGE_ARTIFACT_SOURCE_BRIEF(獨立檔,本檔僅以 SKU ID 引用)
  rationale: >
    offer 是商業承諾(可公開、會改版、綁 order);artifact 是實體事實(部分不可公開、隨供應商回覆更新)。
    混為一檔會使「改一件商品的品相」被迫動 offer contract。兩者互相 reference,不互相內嵌。
canonical_effect: offer truth binding for implementation
does_not_authorize:
  - repo / runtime / Make / Dify / LINE / payment / schema mutation
  - merge / deploy / UAT / Activation
```

> **一句話**
>
> **買了什麼 = offer;因此取得哪些期間與次數 = entitlement;錢、訂單、持有人、履約、退款各有自己的真相源。它們可以互相引用,不得互相冒充。**

---

# 0｜三層語意分離

```yaml
offer:        買了什麼(SKU / 價格 / 版本)
entitlement:  因此取得哪些期間型或次數型權益(綁 holder)
truth_domains: payment / order / holder / fulfillment / refund 各自 owning store
```

**禁止**:以單一 `subscription` 模型承載所有期間型 entitlement。
**禁止**:以單一 `status` 或 `paid=true` 推導 entitlement / fulfillment / notification 全部成立。

---

# 1｜數位 Offer

| offer_id | 價格 | 期間 | included entitlements |
|---|---|---|---|
| `single_149` | NT$149 | 單次 | 基礎問卦 ×1 |
| `deepen_200` | +NT$200 | 同卦單次 | 四鏡·深卜 ×1(同卦加購) |
| `plan_1490_6m` | NT$1,490 | 6 個月 | 基礎問卦:期間內正常個人使用,不另計費,**無對外 numeric cap**;四鏡·深卜 ×2 |

**O-6 / O-7 裁定紀錄**
- 基礎問卦 **不設對 TA 公開的月/日上限**。
- 「每月 10 卦」**非 Owner ruling**——來源為價格分析(1490 若只賣一個月,約需問 10 次才接近 149 單次價),不得作為 entitlement 條文引用。此為具名更正。
- 深卜 2 次用畢後,依 `deepen_200` 另行加購。

---

# 2｜龍宮舍利 Offer(藏主)

| price_band | 藏主期間 | included 深卜 | 基礎問卦 |
|---|---|---|---|
| `3000_5999` | 90 天 | 1 次 | 期間內正常個人使用,不另計費,無 numeric cap |
| `6000_14999` | 6 個月 | 3 次 | 同上 |
| `15000_plus` | 24 個月 | 12 次 | 同上 |

**設計意圖(不得於實作中被優化掉)**
藏主是一段**期間型關係**,不是「送幾次深卜」。低邊際成本的基礎問卦維持關係感,高邊際成本的深卜才做 quota。

**O-1**:藏主 entitlement 與 `plan_1490_6m` 為**不同 entitlement source**,不互相冒充、不合併計算。

---

# 3｜Activation 與計時(O-1 / ①)

```yaml
artifact_entitlement_starts_at: holder_activation_at
```

- 藏主 entitlement 的 `starts_at` = **holder activation event**,不從付款日、不從出貨日起算。
- `activation_source` 必須為可辨識事件之一:
  - `delivery_confirmed_self_purchase`(第一波自買自用)
  - `recipient_activated`(送禮;由收禮人自行完成)
  - `support_verified`(⑥書僮協助確認)
- **buyer ≠ holder 時**:不因 buyer 已付款或商品已寄達 buyer 而提前起算 holder 的權益。
- **禁止**:物流無可靠 delivered truth 時,以「出貨後 N 日視為到貨」硬猜。應走 holder explicit activation 或 support confirmation。

數位 offer 之 `starts_at` 依付款確認日,與本節實體規則不同軌。

---

# 4｜Offer 版本與既有權益(O-2 / ②)

- 每筆 order 必須保存 `offer_id` + `offer_version`。
- 該次購買所取得之 entitlement / included benefits / 期間,**依購買當下版本履行至該筆 entitlement 終止**。
- 後續重新購買或新一期,適用當時之 current `offer_version`。
- **新版不得靜默改動既有已購權益**(grandfather purchased entitlement;不 grandfather 未來所有購買)。
- 法規或退款規則更新另由 compliance 處理;本檔不假裝商業版本可凌駕法規。

---

# 5｜Included 深卜額度的到期(O-3 / ③)

- `plan_1490_6m` 內含 2 次、90 天藏主 1 次、半年藏主 3 次、兩年藏主 12 次——**隨其 source entitlement 到期,不結轉**。
- 到期前應納入 expiry notification / reminder。
- **單獨付款 `deepen_200` 購得之深卜為另一筆 purchase entitlement**,具自己的 source lineage,**不得因半年方案或藏主到期而被吃掉**。

---

# 6｜退款成立後的 entitlement 狀態(O-4 / ④)

本檔只釘「退款完成後的狀態變化」;**退款資格**歸 `compliance_03` / consumer-rights。

- full refund 經 payment/refund truth 確認成立後:該筆 entitlement → `revoked`,尚未使用之未來權益停止。
- 已發生的卦、深卜、Decision Memory **不回寫、不刪除、不假裝從未發生**。
- 已消耗權益只留 audit / consumption lineage,**不做追回**。
- 「已使用多少是否影響退款金額」由 `compliance_03` 決定,本檔不先發明計算公式。
- `payment_state = refunded` 與 `entitlement_state = revoked` 為兩條獨立 state axis,不得互相冒充。

---

# 7｜Fair-use Guard(O-13)

```yaml
fair_use: YES
public_numeric_cap: NONE
normal_personal_use: INCLUDED
anomaly_action: HUMAN_REVIEW_FIRST
entitlement_on_trigger: PRESERVE
TA_message: FAIL_HONEST, 不得稱「額度用完」
obvious_automation_or_attack: SECURITY_RATE_LIMIT_ALLOWED
exact_threshold: INTERNAL_CONFIG, NOT_PRODUCT_PROMISE
```

- fair-use guard 是 **abuse / anomaly protection**,不是另一種隱形 entitlement quota。
- 觸發時**不得扣除或作廢既有 entitlement**。
- 觸發後第一處置為 soft intervention → 書僮/真人確認,不直接判定違規。
- **不得對 TA 說「額度已用完」**——本產品未宣告該額度。
- 明顯 automation / bot burst / 技術攻擊另由 security/runtime rate limit 硬性節流;**該項屬系統保護,與 Product fair-use entitlement 為兩件事,不得混同**。
- exact daily count / burst threshold 為可調 internal runtime parameter,依實測成本與誤判率校準,**不寫入本契約**。

TA-facing 文案由 Chat 定稿,語意須滿足:偵測到與平常不同的使用情況 → 請書僮協助確認 → 既有方案權益未因此被吃掉。

---

# 8｜Buyer / Holder 與送禮(O-11 / O-5)

- **資料模型現在就必須支援 `buyer_id ≠ holder_id`**,不得延後。
- 第一波封閉內測:UAT 範圍限「自買自用」,**不將 gift activation 納入首輪測試變數**。
- 正式對外 release 前,必須完成「收禮者自行 activation」。
- **O-5**:`plan_1490_6m` 與藏主 entitlement 可並存,各有自己的 `starts_at` / `expires_at`;購買其一**不自動延長另一個**。已購之深卜額度不得被吃掉,須保留 source lineage。實際消耗順序依 expiry 排序,屬 ordinary technical choice,由工程決定。

---

# 9｜首批 SKU 與定價

## 9.1 Owner pricing rule

```yaml
pricing_rule: >
  Owner 裁定(2026-08-22):命格售價與 Pinkoi 同價。
  僅於該 SKU 之 Pinkoi price 已採集後,方可落為實值。
  不得為使商品落入某價帶而人工調價。
  intake 層只記 Pinkoi source fact;由本契約依 pricing_rule 轉為 Mingge offer price。
```

## 9.2 首批狀態

```yaml
first_batch:
  XTVSSPvA:
    price_mingge_twd: 6000
    price_band: 6000_14999
    artifact_entitlement: { duration: 6_months, included_deep_read: 3 }
    status: FIRST_BATCH_CANDIDATE
  agmh9hhJ:
    price_mingge_twd: 6800
    price_band: 6000_14999
    artifact_entitlement: { duration: 6_months, included_deep_read: 3 }
    status: FIRST_BATCH_CANDIDATE
  S9j544BD: { price_mingge_twd: null, price_band: null, status: PENDING_INTAKE }
  nEY9ZuMu: { price_mingge_twd: null, price_band: null, status: PENDING_INTAKE }
  rgyvSAHB: { price_mingge_twd: null, price_band: null, status: PENDING_INTAKE }
  2nF8b4vJ:
    status: RESERVE_NOT_FIRST_BATCH
    reasons:
      - Pinkoi 價 NT$2,880 低於 Basis 最低價帶 NT$3,000
      - repo 現況標記 DELISTED
      - 混搭材質(龍宮舍利/葡萄石/白水晶/橄欖石),商品 truth 較純品複雜
      - 首批目的為打通真商品全鏈,不為邊緣品建價帶例外
    ruling: 不改 Product Basis、不為 NT$2,880 建例外價帶、不人工抬價至 NT$3,000
```

**首批目前為:2 件確定、3 件待採集、1 件 RESERVE。**
「六件」是工作名單,不是已就緒庫存;下游不得將其視為六件可售。
待 `MINGGE_ARTIFACT_DATA_INTAKE_PINKOI_BATCH02` 完成並與 Batch01 合併後,方決定正式首批名單。

## 9.3 尚未定案(阻斷條件)

```yaml
inventory_model:
  status: PENDING_SUPPLIER_PER_SKU
  values: unique_item | multi_quantity
  rule: >
    不得因整批屬舊收藏即推定每件為一物一件;不得因 Pinkoi 顯示「剩最後 N 件」推定。
    unique_item → qty 1,方可宣稱「您看到的就是收到的這一件」。
    multi_quantity → 不得宣稱一物一件,並須說明實際個體是否與照片完全相同。
    禁止:一邊宣稱一物一件,一邊自 qty > 1 隨機出貨。
  blocking: inventory_model 未定前,商品頁不得出現任何「這一件」語意
inventory_truth_owner: commerce 後台(非 Mingge 自建庫存引擎;Pinkoi availability 不作庫存真相)
artifact_binding_gate: >
  price_mingge_twd 未落實值前,不得將該 SKU 綁定至 90d / 6m / 24m 藏主 entitlement。
```

## 9.4 稀缺的誠實呈現(G-04 延伸)

供應商已確認:現有商品來自長年既有收藏,**無穩定再進貨管道**,售完後未必能再取得。

```yaml
scarcity_presentation:
  allowed: 誠實陳述「現有收藏售完後,未必能再取得相同物件」
  forbidden_copy: [最後機會, 錯過不再, 限時, 倒數]
  forbidden_ui: [庫存倒數, 數量閃動, 限時計時器, 任何壓迫式稀缺設計]
  rule: 稀缺是商品事實,不得轉為 urgency tactic
```

# 10｜內測金流語意(O-7 / ⑦)

```yaml
beta_reimbursement != payment_refund
```

- ECPay 該筆為**正常 real payment truth**,不得因私下返款而改寫。
- Owner 私下轉回之款項**不是系統 refund**,不得將 `payment_state` 改為 `refunded`——那是偽造 payment truth。
- entitlement **保留**,視為 beta tester courtesy。
- order / analytics 必須具 `beta_test` / `owner_uat` 內部識別,避免此批污染營收、conversion、LTV 樣本。
- 若要測試退款流程,**必須另以正式 ECPay refund / reversal path 實測**,不得以私下轉帳冒充 refund evidence(G6)。

---

# 11｜Contract Skeleton（實作必備欄位）

```yaml
offer_id:
offer_version:
source_type:
price:
currency:
duration:
included_entitlements:
holder_id:
buyer_id:
activation_state:
activation_source:
starts_at:
expires_at:
usage_remaining:
state:
order_ref:
payment_ref:
refund_ref:
```

payment / entitlement / order / fulfillment / refund 各有自己的 truth;不得以一個 status 互相冒充。

---

# 12｜Unit Economics 觀察項（不改本契約）

`15000_plus` 為唯一「一次收費 × 24 個月基礎問卦無 numeric cap」組合。

- 本版**不改**該 offer 設計。
- 另於 AI cost routing / usage telemetry 觀察 `AI cost per holder / month / offer_version`。
- 若實測證明成本結構有問題,由 Owner 修改**未來 offer_version**;既有已購者不被追溯改權益(§4)。

---

# 13｜已知不在本契約內

- 退款資格與金額計算 → `compliance_03 v1.0` + 法務
- 實體商品退換貨規則(與數位分軌)→ 同上
- callback idempotency / 驗簽 → engineering hard requirement(G7),非 Owner 商業裁決
- 六件商品之五層商品文案 → Chat 貨物,待 supplier facts
- exact fair-use threshold → internal runtime config
- 商品實體事實 / 供應商來源 / 保養 / 認證卡 / photo rights → `MINGGE_ARTIFACT_SOURCE_BRIEF`(獨立檔)

---

# 14｜一句話鐵律

> **Offer 是承諾,entitlement 是履行,payment 是事實。三者各自留痕,任何一個都不得替另外兩個發言。**
