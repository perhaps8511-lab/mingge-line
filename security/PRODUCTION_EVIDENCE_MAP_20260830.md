# Mingge Production Security Evidence Map

## Verdict and scope

- Verdict: **BLOCKED for a new security-readiness claim; current production was not changed by this work**.
- Repository baseline: `6f3d5709b5e115dd26b01f792be1186fa8b06a6a`.
- Candidate branch: `codex/mingge-security-fail-closed-20260830`.
- Candidate head / Draft PR / CI: to be filled from terminal GitHub evidence after commit.
- Reviewed: Worker identity/quota/rate-limit paths, tests, workflows, public publishing boundary, GitHub metadata, and Cloudflare metadata/binding names.
- Not proved: Dify key revocation, Make/Airtable/LINE provider settings, GitHub security alerts, branch protection, route response, Railway state, payment provider state, or whole-product security.

## Evidence record

```yaml
repository:
  visibility: public
  main_sha: 6f3d5709b5e115dd26b01f792be1186fa8b06a6a
  pr: PENDING
  reviewed_head_sha: PENDING
ci:
  run_url: PENDING
  tests:
    - node --check workers/mingge-relay/worker.js
    - node tests/test_security_fail_closed_v1_0.mjs
    - bash tests/test_e56_laoyi_center_v1_0.sh
  dependency_or_security_scan: targeted repository baseline; alert APIs UNKNOWN
runtime:
  worker: mingge-relay
  deployed_revision: Cloudflare version 35 / ff2d0dc0-bdcc-4d6e-9950-537463cc48c5
  deployment_id: f7ee05fa-ca36-463c-b084-6ec1e36a6990
  deployed_at: 2026-08-29T03:20:09Z
  deployment_source: wrangler
  route_readback: UNKNOWN
  workers_dev_enabled: true
  previews_enabled: true
  bindings_names_only:
    - AIRTABLE_API_KEY
    - DIFY_LAOYI_KEY
    - HOOK_DEEPDIVE
    - HOOK_FALSETOKEN
    - HOOK_FUPAN
    - LAOYI_RATE_LIMITER
    - MAKE_ROUTEA_WEBHOOK_URL
    - MAKE_WEBHOOK_URL
    - SHARED_SECRET
secrets:
  required_names: names confirmed in Cloudflare; values not read
  rotation_status: UNKNOWN
  old_key_revocation_proven: false
data:
  identity_binding_proven: repository tests only
  cross_user_test: synthetic repository test PASS
cost_control:
  quota_fail_closed: candidate tests PASS; production NOT DEPLOYED
  limiter_fail_closed: candidate tests PASS; production NOT DEPLOYED
payment:
  current_state: MOCK_OR_NOT_ACTIVATED
  activation_authority: OWNER_ONLY
unknowns:
  - Dify incident closure and old-key revocation
  - GitHub secret/code/Dependabot alert state
  - branch protection status
  - exact route readback
  - Make, Airtable, LINE and Railway provider-side controls
```

Cloudflare readback confirmed that the active deployment is 100% version 35 and that the expected secret/rate-limit binding names exist. It does not prove secret values, rotation, route behavior, or that this candidate is deployed.

## Prioritized evidence checklist

### P0 — Dify credential incident closure

- Expected control: exposed key revoked; replacement active only in the owning provider and Cloudflare secret binding.
- Current evidence: a Dify-shaped value remains in the public current tree; Cloudflare confirms a binding name only.
- Status: **UNKNOWN / Needs Production Check**.
- Pass condition: private Dify evidence confirms old-key revocation and rotation without exposing either value.
- Owner: Owner in Dify/Cloudflare approved interfaces.

### P0 — Paid downstream fail-closed behavior

- Expected control: unavailable quota/limiter truth cannot call Make or Dify.
- Current evidence: candidate synthetic tests PASS; production still runs the pre-candidate deployment.
- Status: **Needs Production Check after separately authorized merge/deploy**.
- Pass condition: exact candidate SHA passes CI, is explicitly merged/deployed, and runtime readback plus safe synthetic UAT proves the same 503/429 behavior and zero paid downstream calls.
- Owner: Codex for repository/CI; Owner for merge/deploy authorization; Cowork for bounded runtime UAT if authorized.

### P1 — Public Pages artifact boundary

- Expected control: allowlisted `public/` or `dist/` artifact with manifest failure on unexpected files.
- Current evidence: root `path: '.'` publishes on main pushes.
- Status: **Needs Test / separate change**.
- Pass condition: explicit artifact directory and allowlist manifest pass without deploying from this security PR.

### P1 — GitHub protection and alerts

- Expected control: PR-only main, one required CI check, secret scanning/push protection when supported, minimal workflow permissions.
- Current evidence: no visible rulesets; branch protection and alerts are inaccessible to the integration.
- Status: **UNKNOWN**.
- Pass condition: Owner-visible GitHub settings evidence without changing settings in this session.

## External side effects and controls

- Make forwarding: quota gate required for non-consent events; candidate fail-closed only, not deployed.
- Dify: verified LINE identity plus explicit limiter success; candidate fail-closed only, not deployed.
- Cloudflare deployment: manual workflow with exact Worker SHA check; no deployment performed.
- GitHub Pages: automatic on `main`; no main mutation or Pages deployment performed.
- Payment/entitlement/refund/fulfillment: not activated; Owner-only.

## Next actions

1. Finish Draft PR and exact-head CI evidence.
2. Owner privately verifies Dify rotation and old-key revocation; do not paste the value into GitHub or chat.
3. Only after review: separate authorization for merge/deploy/runtime UAT. Pages allowlisting remains a separate non-blocking hardening change unless a new secret exposure is confirmed.
