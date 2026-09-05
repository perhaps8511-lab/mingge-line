# Governance Casebook v2.0 — Historical / On Demand

> 原判例完整保留作 provenance。  
> 不在一般 session 預載，不因案例存在自動產生 Gate。

| 判例 | 病 | 現行 invariant |
|---|---|---|
| S20260805「349 事件」 | Owner 憑記憶下 current-state 指令 | Truth over memory；衝突只停受影響 mutation |
| S20260809-1「三題誤送」 | 查證/技術題包成 Owner 拍板 | 可查證先查；ordinary technical 不上 Owner |
| S20260809-2「Phase Gate 誤設」 | uncertainty 一律變停工 Gate | Validation follows work |
| S20260809-3「盲眼任 PM」 | 無 repo 眼席位任 repo PM | evidence access 跟場內裁量對齊；AI 自評非 authority |
| S20260809-4「PM 自授 write authority」 | 「直接相關」當 write authority | relevance ≠ authority |
| S20260809-5「containment 自述失效」 | 文字自述取代機械 containment | `changed_paths ⊆ authorized_write_set` |
| S20260809-6「體驗層排擠」 | 治理/技術排擠 TA 體驗 | product-facing progress 以 real outcome/journey 驗收 |
| S20260810-1「製造裁決題」 | canonical 已可查仍重問 Owner | 已定 → drift correction |
| S20260810-2「判準帶病」 | 錯 acceptance 逼出荒謬動作 | challenge bad criterion |
| S20260810-3「開卡三問」 | stale/collision/freeze 未對齊 | bounded preflight |
| S20260812-1「Wrong-target green」 | 錯 Prompt/KB/runtime QA 全綠 | wrong target green = REJECT |
| S20260812-2「escaped completion defect」 | work 落地但 WP terminal/lease 未收 | Product outcome / WP closeout / Product completion 分層 |

## 使用規則

只有：
- 相似 failure 再現
- policy 修改
- incident / near-miss retrospective

才讀本檔。

新增 case 只有在「新 root cause 且現有 invariant 無法涵蓋」時 SHOULD 建。

重複案例 MUST NOT 自動升級 normative strength，也 MUST NOT 自動新增 Gate。

> 十個事故不等於十個 Gate。
