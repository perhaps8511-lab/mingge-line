# Global AI Operating Reference v2.1 — On Demand

> 只有角色 / Owner routing / formal review / dispute / evidence template 等情境才讀。  
> 本檔不是 task authority，不因存在而讓每個 task 走完整流程。

## 1｜角色詳表

| Role | 主要責任 | 不做 |
|---|---|---|
| Owner | product/value/scope、sensitive authority、human UAT、reserved irreversible action | routine 查證 / technical detail |
| Chat / Coordinator | product framing、content、admission routing、Owner interface | current repo WP 場內 PM / writer |
| Cowork PM | current WP dispatch/evidence/closeout/successor reconciliation | writer / 自授 scope |
| Writer | admitted scope implementation | task selection / scope change |
| Independent Reviewer | risk-triggered independent review | routine approval chain |
| GPT / external adjudicator | material architecture/product/safety/release disagreement | ordinary implementation approval |
| Admission authority | Owner or Owner-delegated standing authority with exact anchor | self-granting admission |

## 2｜Bounded preflight

對 mutation / formal review / closeout：

1. 已定什麼？
2. current implementation/runtime 怎麼跑？
3. 誰在碰同一 scope？

矛盾/空洞才擴 reconciliation；不做全局 archaeology。

## 3｜Admission authority

Ordinary successor does not equal automatic admission.

- every WP MUST record `admitted_by` + `admission_basis`
- Owner MAY establish a traceable standing delegation for ordinary successor admission
- without current delegation → Owner admission
- risk trigger / Product scope or Completion change / new authority / new external system → Owner admission
- PM / Chat routing role alone does not grant admission authority

## 4｜Owner routing test

送 Owner 前問：

1. 是 value/scope/sensitive authority/human UAT/reserved irreversible action 嗎？
2. current source 能自己查嗎？
3. ordinary technical choice 能由 evidence-owning seat 解嗎？

若 2=能 或 3=能 → 不上 Owner。

## 5｜Material technical escalation

只有兩個以上合理方案，且會造成不同：
- Product outcome
- data semantics
- authority boundary
- safety/privacy
- irreversible runtime/release consequence

才需要 external adjudication。

ordinary implementation choice 不用。

## 6｜Evidence receipt template

```yaml
work_performed:
base_sha:
head_sha:
changed_paths:
commands:
results:
exit_codes:
tests:
runtime_or_data_readback:
review:
  required:
  result:
limitations:
mutations_performed:
mutations_not_performed:
```

## 7｜STOP receipt

```yaml
verdict: HOLD
reason:
exact_coordinates:
hard_gate_or_failure_basis:
mutations_performed:
mutations_not_performed:
safest_next_action:
owner_decision_required: true | false
```

若非 explicit hard gate，應寫 concrete failure，而不是只寫「治理不完整」。

## 8｜Rule challenge

若某 acceptance / governance rule 照字面會逼出：
- 偽造 evidence
- 越權
- 手寫不該存在的 generated artifact
- 弱化 test/safety
- 明顯違反 current canonical truth

→ `CHALLENGE_THE_CRITERION`，不要為過 Gate 做錯事。

## 9｜一句話

> Reference 是工具箱，不是每場 checklist。
