# Mingge Security Operations Baseline

Date: 2026-08-30  
Repository: `perhaps8511-lab/mingge-line`  
Purpose: a concise, queryable record of Mingge's implemented security protections, operating policy, release evidence, and recurring maintenance.

This document never records secret values, LINE tokens, full webhook URLs, personal data, payment data, or private conversation content.

## 1. Current exact state

```yaml
repository:
  visibility: public
  main_sha: 6ee4e861fb45444a193236f9dfceb8c384f538f0
  merged_pr: https://github.com/perhaps8511-lab/mingge-line/pull/22
  reviewed_head_sha: 07c833e9b8adcd49cdbbff9aa1d6091eddd7c40c
  worker_sha256: f544ba80acd2f949cdeb8731ab9be04d7e769f6ff4f42d0ee68551cddf7cdb0d
ci:
  security_regression_run: https://github.com/perhaps8511-lab/mingge-line/actions/runs/33289855161
  conclusion: SUCCESS
  fail_closed_cases: 26
  existing_laoyi_route_cases: 55
runtime:
  worker: mingge-relay
  approved_main_deployment: PASS
  github_actions_run: https://github.com/perhaps8511-lab/mingge-line/actions/runs/33299496569
  github_actions_job: 99224798768
  deployment_id: ab0b0792-00b1-4701-a2ff-3ae3e196a7d4
  version_id: 6e067473-b11a-4db2-acb8-ed54f2dd4eaa
  version_number: 36
  deployed_at: 2026-08-30T07:33:55Z
  deployment_source: wrangler
  traffic_percentage: 100
  previous_deployment_id: f7ee05fa-ca36-463c-b084-6ec1e36a6990
  route_readback:
    get_laoyi_chat: HTTP_405
    unauthenticated_post_laoyi_chat: HTTP_401
    authenticated_dify_uat: NOT_RUN
secrets:
  dify_new_key_rotation: OWNER_CONFIRMED
  old_key_revocation: OWNER_CONFIRMED
  storage: CLOUDFLARE_SECRET_BINDING_ONLY
  values_recorded: false
mcp:
  dify_mcp_server: OWNER_CONFIRMED_DISABLED
payment:
  current_state: MOCK_OR_NOT_ACTIVATED
  activation_authority: OWNER_ONLY
```

Production deployment is proven for exact main `6ee4e861fb45444a193236f9dfceb8c384f538f0`: GitHub workflow `33299496569` succeeded, Cloudflare serves version 36 at 100%, all nine approved binding names/types remain present, `GET /laoyi/chat` returns 405, and an unauthenticated POST returns 401 before any paid downstream call. A valid authenticated Dify UAT was not run.

## 2. Implemented runtime protections

| Boundary | Enforced behavior |
|---|---|
| LINE identity | Missing, invalid, expired, or wrong-audience token is rejected. The server-verified LINE subject is authoritative. |
| Quota truth | Missing Airtable credentials, 401/403/429/5xx, network failure, or malformed response returns `503 QUOTA_GATE_UNAVAILABLE`. |
| Membership | A missing subscriber is not an implicit free allowance; it returns bounded `402 QUOTA_REQUIRED`. |
| Free trial | Allowed only when the owning data store returns an explicit positive bounded credit. |
| AI limiter | Missing binding, exception, or malformed limiter result returns `503 RATE_LIMITER_UNAVAILABLE`. |
| Explicit overage | Returns `429 RATE_LIMITED`. |
| Dify credential | Missing `DIFY_LAOYI_KEY` returns 503 and does not call Dify. |
| Paid downstream calls | Make/Dify are not called when authentication, quota, or limiter gates reject the request. |
| Cross-user data | Private reads/writes remain bound to the verified server-side LINE identity. |
| Logging | Fixed reason codes and status values only; no token, secret, full question, raw provider body, private record, or payment data. |

The primary security rule is fail-closed: unknown, unavailable, malformed, unauthorized, rate-limited, or failed control-plane truth is never treated as permission.

## 3. Repository and CI protections

Root `SECURITY.md` defines:

- protected identity, private data, paid AI/Make usage, secrets, payment, entitlement, and fulfillment truth;
- LINE/LIFF/Worker/Make/Airtable/Dify/payment trust boundaries;
- fail-closed requirements;
- Owner-only operations;
- security review triggers;
- incident and secret-exposure handling;
- production evidence locations.

The `Security Regression` workflow runs on relevant pull requests that change the Worker, security tests, policy, or evidence files. It performs:

1. Worker syntax validation;
2. 26 synthetic fail-closed and zero-downstream-call cases;
3. 55 existing Laoyi route regression cases.

A failed security check blocks the related release candidate. It does not authorize automatic repair, merge, deployment, secret changes, or payment activation.

## 4. Security-triggered changes

Run focused security regression when a change touches:

- LINE login, token verification, audience, or identity binding;
- webhook/Make forwarding or signatures;
- Airtable member, quota, divination, or private data;
- Dify/AI calls, rate limits, quotas, or cost controls;
- Cloudflare Worker code, bindings, secrets, routes, or deployment workflow;
- payment, subscription, entitlement, refund, or fulfillment;
- GitHub Pages/public artifact scope;
- dependencies or third-party packages.

Changes outside these triggers continue normal product delivery without a full security rescan.

## 5. Owner-only operations

Explicit Owner authority remains required for:

- merge and production deployment;
- production activation;
- repository visibility or branch-protection changes;
- secret creation, rotation, revocation, or replacement;
- Cloudflare, Make, Dify, LINE, Airtable, or Railway mutations;
- payment, subscription, entitlement, refund, or fulfillment actions;
- acceptance of a reproducible Critical/High risk.

## 6. Release evidence flow

```text
Security-triggered PR
→ exact-head Security Regression
→ Owner merge/deploy authorization
→ exact resulting main SHA
→ manual production deployment
→ Cloudflare deployed version/deployment/binding-name readback
→ route/runtime verification
→ Production Evidence Map update
```

Only exact, traceable evidence may be recorded. Missing evidence is `UNKNOWN`, never `PASS`.

## 7. Recurring weekly maintenance

Canonical automation:

```yaml
title: MindNexus 資安週檢
schedule: Sunday 08:00
timezone: Asia/Taipei
mode: READ_ONLY
repositories:
  - perhaps8511-lab/mingge-line
  - perhaps8511-lab/sanmus2-line-ai-pool
runtime:
  - Mingge Cloudflare deployment/version/binding names only
  - SanMus Railway deployed revision/status/variable names only
```

The duplicate Monday GitHub security automation was paused on 2026-08-30.

The weekly check reviews only:

1. new or unresolved GitHub security alerts;
2. failed security workflows;
3. changes to authentication, secrets, private data, AI cost, public publishing, or payment boundaries;
4. approved GitHub SHA versus deployed Cloudflare/Railway revision;
5. stale or missing release evidence;
6. new, worsened, unresolved, or expired evidence compared with the previous week.

Decision rule:

- Critical/High: block only the affected release and propose one bounded repair package.
- Medium/Low: place in follow-up; do not block product delivery.
- No material change: report `本週無新增重大資安訊號`.
- Unreadable evidence: report `UNKNOWN` or `not_verified`.

The weekly task never changes code, alerts, workflows, infrastructure, secrets, or payments.

## 8. Known remaining items

These are not falsely reported as complete:

- authenticated LINE → limiter → Dify end-to-end UAT is `NOT_RUN`; deployment and unauthenticated fail-closed route readback are proven;
- GitHub Pages still publishes from repository root `path: '.'`; move to an allowlisted `public/` or `dist/` artifact in a separate authorized change;
- a revoked Dify-shaped candidate remains in the public current tree and should be replaced with a non-secret placeholder in a separate small PR;
- branch protection and some GitHub alert APIs remain `UNKNOWN`;
- payment remains inactive.

## 9. Canonical query locations

- Policy: `/SECURITY.md`
- Baseline scan: `/security/BASELINE_SECURITY_SCAN_20260830.md`
- Production evidence: `/security/PRODUCTION_EVIDENCE_MAP_20260830.md`
- Operations baseline: `/security/MINGGE_SECURITY_OPERATIONS_20260830.md`
- Security CI: `/.github/workflows/security-regression.yml`
- Production deploy workflow: `/.github/workflows/deploy-mingge-relay.yml`
