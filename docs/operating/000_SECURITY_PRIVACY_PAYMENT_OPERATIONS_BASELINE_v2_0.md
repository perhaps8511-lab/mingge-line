# Security · Privacy · Payment · Operations Baseline v2.0 — On Demand Hard Boundary

> Task 觸及對應領域時讀；普通 UI / copy / local bug 不必整份載入。

## 1｜Secrets & access

- secret/token/credential MUST NOT 進 repo、prompt、receipt、general log。
- 權限 SHOULD minimum necessary。
- tool 可見 MUST NOT 推定 write authority。
- rotation / permission change 是 explicit mutation，SHOULD 有 impact + recovery。
- production / test credentials SHOULD 分離。

## 2｜LINE identity & private data

- raw LINE user ID 只在必要 ingress/provider interaction 使用。
- private read SHOULD subject-bound / pseudonymous。
- client-supplied session id 不足以單獨授權 private-data read。
- health/chat/report data MUST NOT 進 public analytics / general logs。
- logs SHOULD 優先 route/error/revision/correlation/sanitized counts。

## 3｜Consent / purpose / retention

private/health data：
- purpose/scope 明確
- consent / lawful basis 依 adopted contract
- retention/delete/withdraw 定義
- UI success ≠ store write
- persistence claim 依 acceptance 有 readback

新增 data purpose 不是普通 copy change。

## 4｜External AI providers

使用 model / Dify / Make / external AI 前：
- exact app/workflow/model/prompt/KB identity
- current route/binding readback
- provider storage/training/region boundary（若 contract 要求）
- data sent only minimum necessary
- wrong target green = REJECT

## 5｜Schema / migration

Material schema change：
- exact migration
- compatibility strategy
- rollback/recovery
- no destructive data loss without explicit authority
- production readback

additive / nullable / reversible SHOULD 優先。

## 6｜Payment / commerce

只有正式 commerce authority 才進 payment path。

Hard requirements：
- test/live mode 明確分離
- server-side order/payment truth
- webhook authenticity verification
- idempotency / duplicate handling
- amount/currency/order binding
- success/failure/pending 狀態可區分
- refund/cancel/subscription semantics 有 authority
- provider reconciliation 可 readback
- secrets 不進 client/repo/log
- 不自行儲存完整 card credential
- checkout/payment activation 需 Owner explicit gate

未建立 commerce basis：
`NO PAYMENT MUTATION`

## 7｜Operations / maintenance

Production capability SHOULD 有適用的：
- health/readiness signal
- actionable error logging without private payload
- deploy revision identification
- rollback/redeploy path
- critical dependency failure behavior
- backup/recovery according to owning store policy

維護核心是「能偵測、能定位、能回退」，不是 dashboard 數量。

## 8｜Incident

真正 incident：
1. contain
2. preserve evidence
3. restore safe service
4. root cause
5. 最後才更新 governance

## 9｜一句話

> 資安、隱私、金流、維護守的是實害與可恢復性，不是文件完美度。
