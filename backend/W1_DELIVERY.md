# W1 staging delivery

Delivery state: READY_TO_PUSH (local branch handoff only). W1 exit acceptance: NOT_COMPLETE.
No main push, deployment, production activation, Dify/Make mutation, payment, key rotation, replay or backfill is included.

## Authority
Contract v0.4 SHA256 f4fef807f372dbd69eba81e9889f8f5b308fde3789759ac4b0e159ac5f054bd9.
Plan v5 SHA256 fde0b7338b30759e5622a7f78c35938e5e1ba152dc218a432534e6fd1782887e.
Owner bounded rulings in this task supersede only the specific clauses below.

## Implemented boundary
New backend entry: `npm run w1:start` from backend, exclusively W1_ENVIRONMENT=staging and W1_DATABASE_URL. Existing server/worker/migrations and production site are untouched. Explicit `npm run w1:migrate` creates only W1 schema/JTI and seeds 384 rows, verifies 1152 fields; no automatic legacy migration on boot. Repository root must remain available because pinned prompts live outside backend.

Worker validates LINE LIFF access token audience and profile, or raw webhook HMAC, then signs Ed25519 subject token (120 seconds, unique jti, request binding). API rejects body/query identities and requires Owner enrollment. Private key only Worker secret, public key only backend environment. Backend JTI store atomically rejects replay. CORS is not authentication.

Owner enrollment uses an expiring server-configured one-use enrollment code after verified LINE login. Quota, expiry, revoke and audit are implemented. No orders or production entitlements are synthesized. Verified identities live only in subject-bound owning storage, never receipts/general logs. UI clears the enrollment input immediately and does not persist it.

Normal: server deterministic lookup -> reserve transaction -> job -> at most two generations when consistency fails -> charge classification -> confirm/release -> commit/readback -> LINE push. Complete six-section delivery charges one; SR and all no-delivery paths charge zero. Claim older than 720 seconds becomes generation_unknown, releases reserve and alerts; no automatic model replay. Already saved letter can be repushed with the same LINE retry key, no model/extra charge. Unknown send state is never claimed delivered.

SAFETY_BYPASS separates safety from entitlement. Clear self-harm rules use the exact v34 standard without model, with adopted imminent-emergency prefix when matched. Optional dedicated classifier accepts only two boolean JSON fields, never a letter. It has its own W1_SAFETY_* budget ledger, 6 calls/minute/subject, conservative 90-percent budget stop, <=512 output tokens, active Owner grant, and request-content idempotency. Pending/unknown classification is not replayed. It can never call normal generation on zero quota. Safety SR passes the same consistency gate plus strict crisis/self_harm, SR-only, hotline and no-commerce checks. Neither entitlements nor test_grants rows change. Deterministic rules are a subset, not proof of comprehensive semantic recognition; enable and validate the separate classifier before claiming full crisis acceptance. No configured model means no paid model calls.

## Bounded rulings
- Gemini evidence is requested_config plus fingerprint, provider_acceptance (HTTP/model/API/finishReason), applied_config_readback=NOT_RETURNED / UNVERIFIABLE_BY_PROVIDER_RESPONSE when unavailable. Accepted request does not prove applied settings. Unexpressible thinking/safety controls reject adapter registration.
- Generation failure exact copy: 這次沒能完成信箋，抱歉讓你等了。這是服務出了問題，和卦象的吉凶無關。這次不計入問卦次數。
- Save uncertainty exact copy: 目前無法確認是否已保存。請先保留本頁內容，稍後再查一次。
- No W2 replay button, free-redelivery promise, or automatic future make-up promise.
- LN-22/LN-26/LN-27/LN-30 are KNOWN_BASELINE_EXCEPTION_REPLAY_ONLY, historical v34 crisis output missing 1925, replay_charge=0, current_runtime_acceptance=NOT_WAIVED. Runtime missing hotline still fails, retries once at most, then NO DELIVERY/zero charge/audit.
- A11 is ENGINEERING_CANDIDATE, alert only. NEXT statistics do not block delivery or determine charge.

## Read-through
C1 dedicated data.records:read PAT, C2 active Owner grant, C3 no persistence/cache/log, C4 verified-subject-only GET, C5 sensitive-data gate timing evidence. All require PASS and an actual evidence reference in deployment configuration; missing any -> NEEDS_BOUNDED_CHANGE. Credential fingerprint binding is not scope proof. AIRTABLE_LEGACY_READ_PAT must never be replaced by a writable PAT. live C1 NOT_RUN / BLOCKED_BY_READONLY_PAT. API can continue returning new records while legacy reads are unavailable. Legacy maxRecords=50 is preserved. Dedupe source id then nonempty session id. Ed25519 bridge chosen over backend revalidating LINE access token. Only sanitized legacy field allowlist is returned; no legacy writes/caches/logs.

## Acceptance evidence and remaining live work
| Item | Local evidence | Remaining status |
|---|---|---|
| A1 | Browser synthetic LINE/provider, real PostgreSQL engine: long press, save/readback, close/reopen | NOT_RUN staging Owner/mobile |
| A2 W1 subset | Save confirmation, charge, neutral altText, failure/unknown/slow states and repush API tests | NOT_RUN actual LINE/push/inbox |
| A3 | Exact prompt SHA enforced at runtime | NOT_RUN deployed manifest |
| A4 | Frozen125 offline charge replay, no charge deltas; four exceptions explicitly listed | NOT_RUN new-provider125 + semantic judge; never claimed A4 PASS |
| A5 | Signature/JTI/subject isolation/conflicting request negative tests | NOT_RUN deployed ingress |
| A6 | Synthetic marker and sanitized-log tests; queue stores identifiers only | NOT_RUN platform telemetry scan |
| A7 | Transaction lifecycle/last coin and safety immutability, disk reopen | NOT_RUN multi-connection PostgreSQL contention |
| A8 | 384 rows/1152 fields match pinned X2 candidate/RAG source | NOT_RUN live DB; O7 edition still CANDIDATE_EDITION_UNVERIFIED |
| A9 | Out of scope | W2 |
| A10 | Out of scope | W3 |
| A11 | 74 NEXT denominator, engineering warning stats in CHARGE_REPLAY | Advisory only |
| A12 | GZ,J5,J2,J3,J4,J1,J6,ZY,NEXT | NOT_RUN real LINE rendering |
| A13 | C1-C5 fail-closed/subject/no-store negative tests | NOT_RUN readonly PAT scope and real read-through |
| A14 | One UI disclaimer source, full green/yellow/history, no SR disclaimer | NOT_RUN Owner device |

PGlite executes PostgreSQL SQL but uses a single connection; transaction tests serialize connections. It is not a claim about concurrent production PostgreSQL. Browser screenshots contain only synthetic content. The staging page preserves single-press algorithm, typography tokens and palette; pixel parity with the original complete site has not been established. No Owner-preview completion is claimed.

## Reproduction
From backend: `npm ci`, `npm run w1:test`. From repository root: `node --check workers/mingge-w1-staging/worker.js`.
Offline: `python backend/scripts/w1-regression.py --cli-root <verified X1 path> --out <report.json>`.
Browser: set W1_PLAYWRIGHT_MODULE and W1_CHROME_EXECUTABLE to installed tools; run `node backend/scripts/w1-ui-smoke.mjs <output-folder>`.
Live125 adapter: `backend/scripts/w1-backend-regression.py --help`. Requires explicit --approved-live, reviewed manifest SHA, budget and conservative request cost including retries and safety classification; access token read only from process environment. It uses X1 frozen scorer and separate ledger, never alters X1 or frozen fixtures. Live semantic review is still required separately.

## Deployment handoff
Do not push main: existing workflow publishes site from main and is outside W1. Push this work branch only through an authorized account; CI is not deployment or acceptance. Build from repository root with `npm ci --prefix backend`; API start `npm run w1:start --prefix backend`. Explicit migrate from root with `npm run w1:migrate --prefix backend` using isolated staging DB. Deploy only new worker `mingge-w1-staging`, not production relay. The existing `mingge-relay-staging` was read and secret-write capability checked, but was not deployed/modified. No old worker replacement is part of this handoff.

New staging keypair must be generated in trusted provisioning memory. Private PKCS8 base64 is sent directly to Cloudflare secret W1_SUBJECT_PRIVATE_KEY_PKCS8, never file/stdout/receipt. Public SPKI PEM goes to Railway W1_SUBJECT_PUBLIC_KEY. Share kid in both environments; receipt contains only kid, public SHA256 fingerprint, target and setting names. If injection fails, discard transient private key and mark NOT_RUN; do not reuse production keys. Existing attempted Cloudflare secret write was denied; subsequent secret names readback remained empty. No private key value was emitted or saved. This handoff contains no injected keypair.

Railway read found project mingge-backend-staging whose environment is named production; that name does not authorize production actions. Verify the exact staging project/service/DB before any injection. Only environment variable names were inspected. No Railway writes occurred. Migration, secret injection, deploy, runtime readback, PAT scope and Owner UAT remain NOT_RUN.

Rollback for unactivated W1: stop only the new service/worker or point its isolated staging deployment to previous artifact. Preserve W1 owning-store rows/audit; no destructive schema rollback, token rotation, Dify/Make rollback or production cutover.
