# Mingge Current-Main Baseline Security Scan

Date: 2026-08-30

Repository: `perhaps8511-lab/mingge-line`

Exact baseline: `6f3d5709b5e115dd26b01f792be1186fa8b06a6a`

Scope: repository tree/history metadata, GitHub metadata visible to the installed integration, and read-only Cloudflare Worker metadata. No live attack, secret test, deployment, or provider mutation was performed.

## Baseline truth

- Repository visibility: **public**.
- Root `SECURITY.md`: absent on baseline; added by this candidate.
- Current task/PR on baseline: no current security PR. Open PRs visible were historical Draft PRs #1 and #10.
- GitHub Pages: enabled. `deploy-pages.yml` runs on every push to `main` and uploads `path: '.'`.
- GitHub rulesets visible: none. Branch-protection read returned `403 Resource not accessible by integration`; protection status is **UNKNOWN**, not PASS.
- Security alert APIs were not available through the installed integration; secret-scanning, code-scanning, and Dependabot alert state are **UNKNOWN**.
- Current-main CI: deployment workflows only. No repository test/security CI existed on the baseline.
- Dependency manifests/lockfiles: none found. Dependency-vulnerability coverage is therefore limited to pinned workflow actions and the `npx wrangler` deployment command, not an application dependency graph.

## Findings

### F-01 — Quota gate fails open

- Severity: High; Confidence: High.
- Reachable path: verified LINE request → Airtable credential missing/read error/empty result → `allow: true` → Make webhook.
- Impact: paid/external work can proceed without an authoritative quota decision.
- Baseline evidence: `workers/mingge-relay/worker.js` `readQuotaGate()` and the main POST relay path.
- Candidate fix: strict Airtable read, `503 QUOTA_GATE_UNAVAILABLE` for unavailable truth, `402 QUOTA_REQUIRED` for missing/exhausted membership, and no Make call on every rejected path.

### F-02 — Rate-limiter exception fails open

- Severity: High; Confidence: High.
- Reachable path: verified LINE request → limiter `.limit()` exception → warning only → Dify fetch.
- Impact: a limiter outage can become unbounded paid AI calls.
- Baseline evidence: `/laoyi/chat` in `workers/mingge-relay/worker.js`.
- Candidate fix: missing binding, exception, and malformed limiter result all return `503 RATE_LIMITER_UNAVAILABLE`; only explicit `success: true` reaches Dify.

### F-03 — Raw Airtable error bodies enter logs

- Severity: Medium; Confidence: High.
- Impact: provider error bodies can become durable operational-log content.
- Candidate fix: replace raw bodies with fixed reason codes and HTTP status only.

### F-04 — Dify-shaped credential candidate remains in current tree

- Severity: potentially High; Confidence: Medium until the owning provider confirms what the value is.
- Evidence: `mingge_liff_pages_task.md:69` contains an `app-…` value with Dify credential shape. The value is intentionally not reproduced or tested.
- Current tree targeted scan: no high-confidence GitHub token, OpenAI-style key, exact Airtable PAT, private key block, or full Make hook candidate found; one Dify-shaped candidate found.
- History scan: incomplete; current tree already proves the candidate remains publicly readable.
- Required status:

```text
DIFY_KEY_INCIDENT_CLOSURE: UNKNOWN
OWNER_ACTION_REQUIRED: VERIFY_ROTATION_AND_OLD_KEY_REVOCATION
```

Deletion from the tree would not prove revocation. Provider evidence is required before closure.

### F-05 — GitHub Pages artifact is overbroad

- Severity: Medium; Confidence: High.
- Evidence: `.github/workflows/deploy-pages.yml` uploads repository root with `path: '.'`.
- Current impact: plans, tests, Worker source, and internal Markdown can enter the Pages artifact. The repository is already public, so this is not treated as proof of a new secret disclosure.
- Follow-up: publish an explicit `public/` or `dist/` allowlist artifact in a separately authorized Pages change. Not modified in this minimum work package.

## Verification coverage

- Worker syntax: `node --check`.
- Dynamic synthetic regression: authentication, wrong audience, Airtable credential/status/network/malformed cases, missing subscriber, exhausted quota, bounded free trial, subscriber, limiter missing/exception/malformed/exceeded/success, Dify key missing, unexpected fields, cross-user log denial, and duplicate unauthenticated payment-callback attempts.
- Every fail-closed dynamic case checks status/reason code, zero Make/Dify calls, and absence of test secrets/private bodies in logs.
- Existing Laoyi regression remains part of CI.
- No production request, Dify call, Make call, Airtable mutation, payment action, or deployment was performed.

## Scan verdict

The two confirmed fail-open paths and raw-body logging are fixed in the candidate and covered by tests. Repository security is **not** declared complete because the Dify incident closure, GitHub alert state, branch protection, and full history state remain unknown. No additional reproducible Critical finding was confirmed in the reviewed code paths.
