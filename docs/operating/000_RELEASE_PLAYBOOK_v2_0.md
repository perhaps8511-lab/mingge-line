# Release & Activation Playbook v2.0 — On Demand

> 只有 merge / deploy / UAT / Activation / rollback 時讀。

## 1｜狀態分層

```text
Product Acceptance PASS
≠ WP CLOSED
≠ Merge
≠ Deploy
≠ Production Activation / LIVE
```

任一層不得冒充下一層。

## 2｜Release minimum

```yaml
release:
  product_objective:
  exact_source_revision:
  build_or_artifact:
  environment:
  runtime_target:
  data_or_schema_change:
  rollback:
  readback:
  user_visible_change:
  privacy_security_impact:
  payment_impact:
  independent_review:
  owner_gate:
```

## 3｜Hard gates

適用項 MUST：
- exact source / artifact
- correct target environment
- required tests PASS
- wrong-target ruled out
- migration/recovery when applicable
- no secret/private-data leakage
- runtime/config binding readback
- required independent review completed
- rollback/redeploy path
- no capability overclaim

## 4｜Deploy readback

Deploy 後至少：
- deployed revision
- route/binding
- readiness/health
- directly affected data path
- negative smoke when applicable

HTTP 200 單獨不夠。

## 5｜Owner UAT

只留需要人類體感的：
- LINE 入口
- primary flow
- copy/usability/trust
- release-specific critical behavior

可機讀的不要轉嫁 Owner 重驗。

## 6｜Activation

只有 applicable Owner authorization + exact production readback + required UAT/release evidence 才可宣稱 LIVE。

product_count 只由正式 Activation / Change_Log authority 改變。

## 7｜Rollback / incident

若 wrong revision / binding / severe regression / private-data leakage / payment integrity / safety regression：

1. contain
2. rollback / restore safe service
3. preserve evidence
4. root cause
5. 最後才更新 rule/casebook

## 8｜Review dedup

同 scope/evidence state 已 substantive review 且 material inputs 未變：
Activation 前只做 delta / readiness，不重審全文。

## 9｜一句話

> Release Gate 只確保正確版本、正確環境、可回退、可驗證地進 production。
