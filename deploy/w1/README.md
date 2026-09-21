# W1 staging last mile

Target project 929a5f5f-94dc-41d8-8efb-ee07e69ce53e / mingge-backend-staging.
Environment 3e2dfd38-3296-4b38-b9de-b8d42eb03c0a is named production by Railway default, but is the isolated staging environment documented in MAKE_EXIT_P1_DELIVERY_20260911 section 2. No actual production activation is authorized.
New API service: 6619ddc3-4f66-4c5d-b780-11373430d189.

The original 14_ZERO_JUDGMENT_OPS_SHEET instructions are superseded for W1 by these corrections:
1. UI is already implemented and served by the W1 backend. W1_UI_ORIGIN is the generated and read-back domain https://mingge-w1-staging-api-production.up.railway.app. W1_API_ORIGIN is the same origin. Authenticated LINE Console readback on 2026-09-21 identifies new Mingge Staging Login channel 2011686320 and LIFF 2011686320-a0IuCIix, scope profile, with this exact endpoint. LINE_CHANNEL_ID is 2011686320 (access-token audience), NOT Messaging API channel 2011684999. The latter is the observed Mingge for staging bot. Production Login channel 2010192384 is not used.
2. No second Postgres is needed. New W1 schema shares the existing isolated staging instance via W1_DATABASE_URL=${{api.DATABASE_URL}}. Existing schemas/services remain unchanged; no public DB proxy. Only W1 migrations/seed are included in predeploy.
3. Railway up does not allocate a domain. Domain was explicitly created against the new service with target port 8080 and read back. Package/upload from the allowlisted root; never upload only backend because pinned prompts are outside it.
4. All secret inputs use hidden UI/secure store or subprocess stdin. CLI outputs containing variable values are captured only in process memory. No --kv output or command-line secret arguments. Receipts contain only identifiers, names and public-key fingerprints. Do not paste secrets in chat.
5. Cloudflare code+bindings are uploaded as an undeployed version; workers.dev and previews remain disabled. Required LINE bindings are completed in a new version, inheriting the existing staging private-key binding, then validated before ONE explicit deployment. No sequential secret put commands that deploy partial configurations. Backend receives only the matching public key and kid; private key stays only in Cloudflare secret storage.

Use backend/scripts/w1-package.py from a clean exact branch HEAD to create a new allowlisted build directory. Its Dockerfile runs only W1, and the explicit service settings in service-settings.json run W1 migrations before health check. Current Railway connector rejects railway.json as deprecated; upload did not apply its settings. Apply and read back these exact new-service settings through the authenticated update_service connector before deployment. W1_BUILD.json binds the deployed artifact to source_revision. Neither legacy server nor old migrations nor secrets enter the artifact.

Public health proves process/schema/pinned artifacts can boot, not LINE, provider, PAT or W1 product acceptance. Missing credentials keep the corresponding capabilities unavailable. Staging provider configuration remains NOT_CONFIGURED until a dedicated credential plus explicit supported runtime settings and separate budget are supplied.

The staging-only /w1-qa.html tool runs the frozen 125 synthetic inputs through the existing authenticated endpoints. Its imported suite must match the pinned SHA256 before parsing; the LINE token is never exported in the results. It stops on unknown outcomes without automatic resubmission. Owner enrollment is still required. Completing 125 requests is not mechanical/semantic acceptance; results must be scored against the frozen X-1 rules. This page does not read legacy history. Results follow the configured staging LINE push path to the authenticated Owner.

Authoritative command semantics checked against:
- https://docs.railway.com/cli/variable
- https://docs.railway.com/config-as-code/reference
- https://developers.cloudflare.com/workers/configuration/multipart-upload-metadata/
- https://developers.line.biz/en/reference/liff-server/
