# Mingge Production Security Evidence Map

## Verdict and scope

- Verdict: **DEPLOYED AND READ BACK for PR #22 fail-closed controls; this is not a whole-product security claim**.
- Exact resulting main: `6ee4e861fb45444a193236f9dfceb8c384f538f0`.
- Merged PR: #22; reviewed head: `07c833e9b8adcd49cdbbff9aa1d6091eddd7c40c`.
- Worker SHA256: `f544ba80acd2f949cdeb8731ab9be04d7e769f6ff4f42d0ee68551cddf7cdb0d`.
- GitHub deployment workflow succeeded and Cloudflare serves version 36 at 100%.
- Safe route readback proved the deployed Worker is reachable and rejects an unauthenticated request before any paid downstream call.
- A valid authenticated LINE → limiter → Dify end-to-end UAT was not run.

## Evidence record

```yaml
repository:
  visibility: public
  main_sha: 6ee4e861fb45444a193236f9dfceb8c384f538f0
  pr: https://github.com/perhaps8511-lab/mingge-line/pull/22
  reviewed_head_sha: 07c833e9b8adcd49cdbbff9aa1d6091eddd7c40c
  worker_sha256: f544ba80acd2f949cdeb8731ab9be04d7e769f6ff4f42d0ee68551cddf7cdb0d
ci:
  security_regression:
    run_url: https://github.com/perhaps8511-lab/mingge-line/actions/runs/33289855161
    conclusion: SUCCESS
    tests:
      - node --check workers/mingge-relay/worker.js
      - 26 synthetic fail-closed and zero-downstream-call cases
      - 55 existing Laoyi route regression cases
  production_deploy:
    run_url: https://github.com/perhaps8511-lab/mingge-line/actions/runs/33299496569
    job_id: 99224798768
    event: workflow_dispatch
    head_branch: main
    head_sha: 6ee4e861fb45444a193236f9dfceb8c384f538f0
    conclusion: SUCCESS
    exact_worker_hash_step: SUCCESS
    cloudflare_token_step: SUCCESS
    deploy_step: SUCCESS
  dependency_or_security_scan: targeted repository baseline; GitHub alert APIs remain UNKNOWN
runtime:
  worker: mingge-relay
  route: https://mingge-relay.perhaps8511.workers.dev
  deployment_id: ab0b0792-00b1-4701-a2ff-3ae3e196a7d4
  deployed_revision: Cloudflare version 36 / 6e067473-b11a-4db2-acb8-ed54f2dd4eaa
  deployed_at: 2026-08-30T07:33:55Z
  deployment_source: wrangler
  traffic_percentage: 100
  compatibility_date: 2024-12-01
  workers_dev_enabled: true
  previews_enabled: true
  route_readback:
    get_laoyi_chat: HTTP_405
    unauthenticated_post_laoyi_chat: HTTP_401
    authenticated_dify_uat: NOT_RUN
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
  required_names: confirmed in Cloudflare; values not read
  dify_rotation_status: OWNER_CONFIRMED
  old_key_revocation: OWNER_CONFIRMED
  independently_read_provider_evidence: false
  dify_mcp_server: OWNER_CONFIRMED_DISABLED
data:
  identity_binding_proven: repository tests PASS; unauthenticated production rejection PASS
  cross_user_test: synthetic repository test PASS
cost_control:
  quota_fail_closed: DEPLOYED; synthetic zero-downstream-call tests PASS
  limiter_fail_closed: DEPLOYED; synthetic zero-downstream-call tests PASS
  unauthenticated_paid_downstream_block: production route readback PASS
  authenticated_live_dify_uat: NOT_RUN
payment:
  current_state: MOCK_OR_NOT_ACTIVATED
  activation_authority: OWNER_ONLY
unknowns:
  - GitHub secret scanning, code scanning and Dependabot alert API state
  - branch protection status
  - Make, Airtable and LINE provider-side controls
  - authenticated LINE-to-Dify live UAT
  - public Pages allowlisted artifact migration
  - removal of the revoked Dify-shaped candidate from the public current tree
```

## Production protection now active

### Quota and membership

- Missing Airtable key, 401/403/429/5xx, network failure, or malformed response returns `503 QUOTA_GATE_UNAVAILABLE`.
- Missing subscribers and exhausted quota return bounded `402 QUOTA_REQUIRED`.
- Free access requires an explicit positive bounded credit.
- Rejected quota paths do not call Make.

### AI rate limiting

- Missing rate-limiter binding, limiter exception, or malformed limiter result returns `503 RATE_LIMITER_UNAVAILABLE`.
- Explicit overage returns `429 RATE_LIMITED`.
- Only explicit limiter `success: true` can reach Dify.
- Missing `DIFY_LAOYI_KEY` returns 503.
- Rejected limiter paths do not call Dify.

### Identity, privacy, and logging

- LINE identity remains server-verified and audience-bound.
- Frontend-supplied identity, tier, quota, payment state, or entitlement is not authoritative.
- Private reads and writes remain subject-bound.
- Focused failure logs use fixed reason/status data without tokens, secrets, full questions, private records, full webhook URLs, or raw provider bodies.

## Known remaining items

### P1 — Public Pages artifact boundary

The Pages workflow still uploads repository root with `path: '.'`. Move to an allowlisted `public/` or `dist/` artifact in a separate authorized change.

### P1 — Revoked Dify-shaped current-tree candidate

Provider rotation and old-key revocation are Owner-confirmed. The public current-tree candidate should still be replaced with a non-secret placeholder in a separate small PR. Repository deletion does not replace provider revocation.

### P1 — GitHub protection and alerts

Branch protection and GitHub native security alert APIs remain `UNKNOWN`. The consolidated Sunday security check must continue to report inaccessible evidence as `UNKNOWN`, not zero alerts.

### P2 — Authenticated live Dify UAT

No valid LINE token or private question was used in this session. If separately authorized, perform one minimal test-account request and record only deployment/version, status, fixed reason code, and a non-sensitive request identifier.

## Operating boundary

- Production fail-closed code is active.
- The weekly security check remains read-only and cannot repair, merge, deploy, change secrets, or activate payments.
- Real payment, subscription, entitlement, refund, and fulfillment remain inactive and Owner-only.
