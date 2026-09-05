# Work Package Contract v2.1 — On Demand

> 只在 admission / dispatch / closeout 時讀。

## 1｜WP purpose

WP 是 bounded execution unit，不是產品本身。

必須能回答：
- 關哪一個 current required acceptance？
- 誰可以改什麼？
- 做到什麼就停？
- 如何證明？
- 失敗怎麼回退？

## 2｜Minimum packet

```yaml
work_package:
  id:
  product_objective_id:
  product_completion_anchor:
  product_basis_refs: []
  acceptance_ids: []
  objective:
  roles:
    pm:
    writer:
  admission:
    admitted_by:
    admission_basis:
  scope:
    allowed_paths_or_systems: []
    forbidden_paths_or_systems: []
    allowed_actions: []
  runtime_target:
    required: true | false
    exact_identity:
    revision:
    route_or_binding:
    readback_at:
  tests:
    required: []
  evidence:
    required: []
  rollback:
  review_requirement:
    required: false
    trigger:
    reviewer:
  stop_conditions: []
  exit_contract:
    terminal_writeback:
    lease_or_lock_release:
```

只填 current WP 真正需要的欄位；N/A 不等於要建立補件流程。

## 3｜Admission authority

Every WP MUST record `admitted_by` + `admission_basis`.

Admission authority MUST NOT be inferred from PM / Coordinator role, tool access, the work being "ordinary", or `PRODUCT_CONTINUES`.

### Ordinary successor

A successor may use an Owner standing delegation only when all are true:

- it directly closes named remaining required acceptance;
- it does not change Product scope / Completion meaning;
- it does not trigger §4 independent-review risk;
- it does not introduce new external system / schema / payment / sensitive-data authority;
- its write/action scope stays inside systems explicitly covered by that standing delegation.

Admission may then be performed by:
1. Owner; or
2. the exact seat named in a current, traceable Owner standing delegation.

If no current standing delegation exists, MUST return to Owner for admission. PM / Chat MUST NOT self-admit.

### Owner-required admission

MUST require Owner admission when any of these apply:

- Product / Completion / scope change;
- risk-triggered review category;
- new authority or new external system;
- payment / destructive schema-data / sensitive-data authority;
- parallel WP not explicitly covered by a standing delegation.

Owner MAY admit parallel WPs when each has named acceptance and disjoint write/runtime scope.

GO 前另 MUST 明確：
- Product / Acceptance mapping
- authority / write scope
- wrong target ruled out
- destructive / external rollback
- review requirement

GO 後 ordinary uncertainty 不新增 STOP；場內 fresh-read 自解。

## 4｜Review requirement

default `required=false`

只有 material：
- health/medical/legal semantics
- privacy/security
- irreversible schema/data
- external AI runtime binding
- cross-domain architecture
- Completion/Acceptance meaning
- release/Activation

才 true。

## 5｜Correction

current acceptance finding → 同 WP minimum correction，除非 scope 必須擴張。

hygiene → 不阻 current WP、不自動另開卡。

不設固定 correction 次數或 governance PR quota。

## 6｜Closeout

```yaml
work_package_id:
base:
head_or_artifact:
changed_scope:
acceptance:
  passed: []
  failed: []
tests:
runtime_or_data_readback:
review:
  required:
  result:
terminal_writeback:
lease_or_lock_released:
limitations:
verdict: WP_CLOSED | CLOSEOUT_INCOMPLETE
```

## 7｜After closeout

```text
WP closed
→ Product Completion Contract

all required satisfied
→ IDLE_AT_BOUNDARY

remaining required
→ exactly one successor candidate
→ admission
```

不要把 closeout receipt 當 roadmap。

## 8｜一句話

> 一張 WP 只做一件直接必要的事，而且第一次把這一小塊做完整。
