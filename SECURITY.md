# Mingge Security Policy

This repository is public. Do not commit or paste any secret, private LINE identity, divination text, payment payload, or full Make webhook URL here.

## Protected assets and trust boundaries

Mingge protects four things first: authenticated identity, private Decision Memory, paid AI/Make usage, and payment or entitlement truth.

The trust path is:

1. LIFF sends a LINE access token to the Cloudflare Worker.
2. The Worker verifies the token with LINE and requires the expected `LINE_CHANNEL_ID`.
3. Only the verified LINE subject may be used for Airtable reads/writes, quota checks, rate-limit keys, Make forwarding, and Dify calls.
4. Airtable is the current member/quota and divination-record store. Dify is a paid AI upstream. Make is an external side-effect boundary.
5. Payment is not activated by this policy or by repository code alone. Provider callback, payment, order, entitlement, refund, and fulfillment claims require owning-store and runtime evidence.

CORS is a browser-origin control, not authentication or authorization. Frontend-supplied `line_user_id`, tier, quota, payment state, or entitlement is never trusted.

## Non-negotiable controls

- Authentication fails closed on missing, invalid, expired, or wrong-audience LINE tokens.
- Private reads and writes are subject-bound. Cross-user records return no private content.
- Quota and entitlement reads distinguish a true empty result from a read failure. Missing credentials, permission errors, 429/5xx, network errors, and malformed responses return a stable 503 error and do not call Make, Dify, or payment services.
- A missing subscriber is not an implicit free trial. A free trial is valid only when the owning store returns an explicit positive bounded credit.
- `/laoyi/chat` calls Dify only after verified LINE identity and an explicit rate-limiter result of `success: true`. Missing binding, exception, or malformed result returns `503 RATE_LIMITER_UNAVAILABLE`; an explicit limit rejection returns `429 RATE_LIMITED`.
- Logs use fixed reason codes and status numbers. Do not log access tokens, secret values, full questions, private records, payment data, full webhook URLs, or raw upstream bodies.
- Secrets are runtime bindings only. Approved names currently include `AIRTABLE_API_KEY`, `DIFY_LAOYI_KEY`, LINE secrets/tokens, Make hook bindings, Cloudflare credentials, and future payment signing keys. Values never enter Git, PRs, Issues, Project Sources, test fixtures, or evidence reports.
- Tests use synthetic subjects, tokens, records, and payment identifiers only.

## Payment boundary

Real payment remains Owner-only and is not activated by this repository policy. Before any live payment release, evidence must prove callback signature verification, event idempotency, legal state transitions, exact amount/currency/order/user binding, duplicate and timeout handling, fail-closed verification, and verified-payment-only entitlement writes. Production activation also requires exact deployment/runtime readback and Owner approval.

## Public publishing

Only approved public HTML, CSS, JavaScript, images, and public data may enter a Pages artifact. Internal plans, tests, Worker source, reports, configuration, source maps, and secrets are not public-site assets. The Pages workflow must eventually publish from an explicit allowlisted `public/` or `dist/` artifact; repository visibility or publishing changes are Owner decisions.

## Owner-only operations

The following require explicit Owner authority: merge, deploy, Production Activation, repository visibility or branch-protection changes, secret creation/rotation/revocation, Cloudflare/Make/Dify/LINE/Airtable mutation, and any payment, refund, subscription, entitlement, or fulfillment mutation.

## When to run security review

Run the focused security regression when a change touches LINE authentication, identity binding, Airtable/private data, Make forwarding, Dify/AI usage, quota/rate limits, Worker bindings or deployment, GitHub Pages publishing, dependencies, or payment/entitlement/refund/fulfillment. Otherwise continue product work without a full rescan.

The required regression is:

```bash
node --check workers/mingge-relay/worker.js
node tests/test_security_fail_closed_v1_0.mjs
bash tests/test_e56_laoyi_center_v1_0.sh
```

## Incident reporting and evidence

If a secret may have leaked, stop using the exposed credential, do not paste it into chat or an Issue, and notify the Owner through a private channel with the affected system, approximate time, exposure location, and non-sensitive evidence. Revocation/rotation must occur in the owning provider. Closure requires evidence that the old key is revoked and the replacement is active; deletion from the current tree alone is insufficient.

Production evidence is recorded in `security/PRODUCTION_EVIDENCE_MAP_20260830.md`. Repository baseline findings are recorded in `security/BASELINE_SECURITY_SCAN_20260830.md`. Missing evidence is `UNKNOWN`, never PASS.
