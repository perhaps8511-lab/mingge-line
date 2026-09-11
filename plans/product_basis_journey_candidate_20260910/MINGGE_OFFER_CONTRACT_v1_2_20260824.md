# MINGGE｜Offer Contract v1.2

```yaml
document_id: MINGGE-OFFER-CONTRACT-v1.2
filename: MINGGE_OFFER_CONTRACT_v1_2_20260824.md
owner: Perth
adopted_at: 2026-08-24
project: Mingge / 命格
document_class: owner_adopted_product_basis_offer_amendment_and_contract
supersedes: MINGGE-OFFER-CONTRACT-v1.1
amends:
  pack_id: MINGGE-PRODUCT-BASIS-PACK-v1_1-20260817
  adoption_anchor: reccwLGV2fK3ta4xr
  clauses:
    - MINGGE_TA_EXPERIENCE_PRODUCT_SPEC_v1_1 MG-RM-02 / MG-RM-03
    - MINGGE_DATA_RUNTIME_ENTITLEMENT_CONTRACT_v1_1 §2 / §6 / §8
precedence_rule: CLAUSE_SPECIFIC_OWNER_AMENDMENT
precedence_detail: >
  本版是 Owner 對上述商業 offer、期間與 entitlement 條款的精確修正；
  在這些具名條款內以本版為 current truth。Product Basis Pack 其餘產品定位、
  journey、UI、acceptance、data ownership 與安全邊界全部維持，不由本版擴張或改寫。
canonical_effect: current Product Basis offer and entitlement truth for product, copy, and implementation
owner_decision_summary: >
  基礎問卦、四鏡·深卜與複盤分開定義；命格半年方案與各期間藏主採同一套
  期間權益。三個月、六個月、二十四個月的每一個有效月權益相同，差別只有期間。
  不再使用方案深卜 2 次或藏主深卜 1 / 3 / 12 次之固定 quota。
does_not_authorize:
  - repo / runtime / Make / Dify / LINE / payment / schema mutation
  - merge / deploy / UAT / Activation
```

> **一句話定案**
>
> **單買按次；期間方案按時間。期間內每一個月使用同一套完整權益，不發放月額度、不累積次數，只有有效多久的差別。**

---

# 0｜本版取代的舊規則

以下 v1.1 規則自本版生效後，僅作歷史版本，不再作為新 offer 的 current truth：

- `plan_1490_6m` 四鏡·深卜 ×2；
- `3000_5999` 藏主四鏡·深卜 ×1；
- `6000_14999` 藏主四鏡·深卜 ×3；
- `15000_plus` 藏主四鏡·深卜 ×12；
- `3000_5999` 以 90 天表達期間。

本版改為：

- 每筆符合條件的卦記，可完成一次四鏡·深卜；
- 符合複盤條件時，可建立新的複盤；
- 藏主第一價帶改為自啟用日起 **3 個月**，與 6 個月、24 個月採相同月制語意。

---

# 1｜三項產品定義

## 1.1｜基礎問卦

```yaml
offer_id: single_149
price_twd: 149
entitlement_type: one_shot
included: formal_divination ×1
```

- TA 針對一件新的、明確的事情正式起卦。
- 產出正式卦象與解讀，保存為一筆可回看的卦記。
- 同一問題的後續，優先回到原卦記、深卜或複盤，不鼓勵因焦慮反覆重起同題。
- 卦記可保留後續、回音與蓋印；既有內容不因後續 entitlement 到期而刪除。

## 1.2｜四鏡·深卜

```yaml
offer_id: deepen_200
price_twd: 200
entitlement_type: one_shot_same_gua
included: four_lens_deep_read ×1
```

- 前提是一筆已完成、屬於該 holder 的正式卦記。
- 不重新起卦，不改寫原始卦。
- 以互卦、綜卦、錯卦、序卦四個視角深化同一件事。
- 每筆原卦完成一次完整四鏡·深卜；結果 link 回原卦記。

## 1.3｜複盤

```yaml
offer_id: fupan_399
price_twd: 399
entitlement_type: one_shot_cross_gua
minimum_distinct_gua_records: 3
renewal_condition: new_gua_or_new_followup_since_previous_fupan
included: cross_gua_decision_review ×1
```

- 複盤不是重新起卦，也不是重貼舊答案。
- 它跨越至少 3 筆不同卦記及其後續，整理事情如何演變、反覆出現的決策模式、已改變與仍未完成之處。
- 上一次複盤後，至少有一筆新卦或一筆新的後續／回音，才形成下一次新複盤的產品內容。
- 不把複盤包裝成「驗準」、「命中」或命運結果證明。

---

# 2｜期間型共同權益單元

所有期間型 offer 使用同一套權益：

```yaml
period_rights_unit:
  base_gua_access: normal_personal_use
  public_numeric_cap: none
  deep_read_access: one_completed_deep_read_per_eligible_gua_record
  historical_gua_eligible: true
  fupan_access:
    minimum_distinct_gua_records: 3
    repeat_when: new_gua_or_new_followup_since_previous_fupan
  records_after_expiry: retained_readable
  monthly_allowance_bucket: none
  monthly_reset: none
  carryover: not_applicable
```

精確語意：

1. 每一個有效月的產品權益完全相同，沒有第一個月較多、最後一個月較少。
2. 這不是「每月發幾次」的點數包，因此沒有月額度、歸零或結轉。
3. 期間內，TA 有新的事情可以正式問卦，不另逐次計費；不對外公布月／日 numeric cap。
4. 期間內，holder 自己既有或新建立、尚未完成深卜的卦記，都可以完成一次四鏡·深卜。
5. 累積至少 3 筆不同卦記後可複盤；有新卦或新後續時可再次複盤。
6. 到期後停止新增期間服務，但既有卦記、深卜、複盤、後續與蓋印仍可回看。
7. 到期後若要新增深卜或複盤，可分別購買 `deepen_200` 或 `fupan_399`。

---

# 3｜命格半年方案

| offer_id | 價格 | 期間 | included entitlement |
|---|---:|---:|---|
| `plan_1490_6m` | NT$1,490 | 自付款確認日起 6 個月 | 完整 `period_rights_unit` |

## 3.1｜TA 得到什麼

- 半年內，有新的事情可以問，不另收 NT$149。
- 自己既有或新建立的卦記，每一卦都可完成一次四鏡·深卜，不另收 NT$200。
- 累積至少 3 筆卦記後可複盤；有新卦或新後續時可再複盤，不另收 NT$399。
- 所有已產生內容到期後仍在。

## 3.2｜不是什麼

- 不是每月 10 卦；「每月 10 卦」從未是 Owner ruling。
- 不是深卜 2 次包。
- 不是「無限起卦」的宣傳承諾。
- 不是鼓勵對同一焦慮反覆重問；同題應回到原卦記、深卜或複盤。

---

# 4｜龍宮舍利 Offer（藏主）

## 4.1｜價格帶與期間

| price_band | Mingge 實品售價 | 藏主期間 | 每一有效月的權益 |
|---|---:|---:|---|
| `3000_5999` | NT$3,000–5,999 | 自 holder 啟用日起 3 個月 | 完整 `period_rights_unit` |
| `6000_14999` | NT$6,000–14,999 | 自 holder 啟用日起 6 個月 | 完整 `period_rights_unit` |
| `15000_plus` | NT$15,000 以上 | 自 holder 啟用日起 24 個月 | 完整 `period_rights_unit` |

三個價帶的產品差異只有：

- 龍宮舍利實品本身；
- 藏主權益維持 3、6 或 24 個月。

三者每一個有效月的數位權益內容相同，不因價帶不同而給不同種類或不同月配額。

## 4.2｜半年藏主與 1490 的關係

`plan_1490_6m` 與 `6000_14999` 半年藏主的**數位使用權益完全相同**。

- 1490 是純命格半年方案，不需購買信物。
- 半年藏主是購買實品後，由 holder 自行啟用的藏主關係。
- 龍宮舍利價格由該件實品、來源、材質、品相與可追溯資料支撐，不以數位權益灌高商品價值。

## 4.3｜Activation

```yaml
artifact_entitlement_starts_at: holder_activation_at
duration_values: [3_months, 6_months, 24_months]
```

- 不從付款日、出貨日或物流推估日開始。
- 自買自用由 holder 完成啟用；送禮由收禮者自行啟用。
- buyer 不得因此讀取 holder 的私人卦記或複盤。
- 若 holder 已有有效的 1490 方案，可自行決定何時啟用藏主權益；未啟用前不倒數。
- 兩筆 entitlement 各自保留 source lineage，不因同時存在而產生雙倍次數；本版沒有次數 bucket。

---

# 5｜Fair-use 與同題反覆使用

```yaml
fair_use: yes
normal_personal_use: included
public_numeric_cap: none
anomaly_action: human_review_first
same_question_behavior: return_to_existing_gua_or_deep_read_or_fupan
obvious_automation_or_attack: security_rate_limit_allowed
```

- fair-use 是異常與自動化攻擊保護，不是隱形 entitlement quota。
- 不得對 TA 說「額度用完」。
- 同一問題短期反覆詢問時，產品應協助回看原卦、補記後續、深卜或複盤，而不是把「期間內不逐次計費」做成反覆重起的誘因。

---

# 6｜到期、退款與既有內容

- 期間到期後：停止新增期間型問卦、深卜與複盤；所有既有內容保留。
- full refund 經 payment/refund truth 確認後：對應 entitlement → `revoked`；既有內容不刪除、不回寫。
- 單買 `deepen_200` 或 `fupan_399` 是獨立 purchase entitlement，不因另一個期間型 offer 到期而消失。
- `fupan_399` 正式開賣前，退款資格與交付後狀態須由 `compliance_03` 補齊；本契約不發明法律條款。

---

# 7｜Offer 版本與已購權益

- 每筆 order 保存 `offer_id` + `offer_version`。
- v1.2 適用於生效後的新 offer；不得以新版減損既有已購權益。
- 若既有 v1.1 entitlement 尚在有效期，Owner 可選擇升級至 v1.2；不得以技術方便為由縮減。

---

# 8｜商品價格與實品事實

- 命格端實品售價依 Owner 已定 pricing rule：對應 SKU 的 Pinkoi price 採集確認後，方可落為實值。
- 不得為使商品落入某價帶而人工調價。
- 實品來源、材質、品相、尺寸、數量、保養、認證與照片權利仍由 `MINGGE_ARTIFACT_SOURCE_BRIEF` owning；本契約不虛構。
- 不使用招財、改運、治病、助眠、能量更強等不可證實承諾。
- 不以卦象、焦慮或負面情境推薦龍宮舍利。

---

# 9｜上線事實邊界

本檔定義的是正式產品與 entitlement truth，不等於所有功能已經 live。

- 基礎問卦、卦記、後續、蓋印及四鏡·深卜：依 runtime fresh read 判斷是否可公開。
- 複盤：只有在可建立、保存、回看且 entitlement 判定實際可用後，才可放入 live 銷售承諾。
- 未完成前可以建 UI 結構與標記 upcoming，但不得把尚未存在的功能寫成現在已包含。

---

# 10｜TA-facing 核心說法

```text
單買按次；想持續使用，就用期間方案。

半年方案與藏主使用的是同一套期間權益：
新的事情可以問；自己的每一筆卦記都能往下深看；
累積卦記後，可以把一路的變化放在一起複盤。

三個月、半年、兩年，每一個有效月享有相同權益，差別只有陪伴多久。
```

禁止使用：

- 無限、吃到飽、隨便問；
- 深卜額度、每月配額、用完加購（期間有效時）；
- 保證準、驗準、命中、改運；
- 買龍宮舍利即可招財／改善健康／提升能量。

---

# 11｜一句話鐵律

> **基礎問卦是一件新問題；深卜是同一卦的完整深化；複盤是跨卦的決策軌跡。期間方案讓這三件事在有效時間內自然接續，而不是把它們拆成一袋次數。**
