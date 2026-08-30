import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workerSource = await readFile(new URL("../workers/mingge-relay/worker.js", import.meta.url), "utf8");
const workerModule = await import(`data:text/javascript;base64,${Buffer.from(workerSource).toString("base64")}`);
const worker = workerModule.default;

const LINE_CHANNEL_ID = "2010192384";
const TEST_TOKEN = "test-access-token-private";
const TEST_DIFY_KEY = "test-dify-key-private";
const TEST_QUERY = "private question content";
const RAW_UPSTREAM_BODY = "RAW_UPSTREAM_PRIVATE_BODY";
const MAKE_URL = "https://make.test/opaque-hook";

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeMock(config = {}) {
  const calls = {
    total: 0,
    lineVerify: 0,
    lineProfile: 0,
    airtable: 0,
    make: 0,
    dify: 0,
    other: 0,
  };

  const mockFetch = async (input) => {
    calls.total += 1;
    const url = typeof input === "string" ? input : input.url;

    if (url.startsWith("https://api.line.me/oauth2/v2.1/verify")) {
      calls.lineVerify += 1;
      if (config.verifyStatus && config.verifyStatus !== 200) {
        return jsonResponse({ error: "invalid" }, config.verifyStatus);
      }
      return jsonResponse({ client_id: config.verifyClientId || LINE_CHANNEL_ID });
    }

    if (url === "https://api.line.me/v2/profile") {
      calls.lineProfile += 1;
      if (config.profileStatus && config.profileStatus !== 200) {
        return jsonResponse({ error: "invalid" }, config.profileStatus);
      }
      return jsonResponse({ userId: config.userId || "U_test_subject", displayName: "Test User" });
    }

    if (url.startsWith("https://api.airtable.com/")) {
      calls.airtable += 1;
      if (config.airtableThrow) throw new Error("controlled-airtable-network-error");
      if (config.airtableStatus && config.airtableStatus !== 200) {
        return new Response(RAW_UPSTREAM_BODY, { status: config.airtableStatus });
      }
      if (config.airtableMalformedJson) {
        return new Response("{not-json", { status: 200, headers: { "Content-Type": "application/json" } });
      }
      if (config.airtableBody !== undefined) return jsonResponse(config.airtableBody);
      return jsonResponse({ records: [] });
    }

    if (url === MAKE_URL) {
      calls.make += 1;
      return new Response("accepted", { status: 202 });
    }

    if (url === "https://api.dify.ai/v1/chat-messages") {
      calls.dify += 1;
      return jsonResponse(config.difyBody || { answer: "bounded answer", conversation_id: "conv_1" });
    }

    calls.other += 1;
    throw new Error(`Unexpected fetch target: ${new URL(url).origin}`);
  };

  return { calls, mockFetch };
}

async function exercise({ path = "/", method = "POST", body, token = TEST_TOKEN, env = {}, config = {} }) {
  const { calls, mockFetch } = makeMock(config);
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token !== null) headers["X-Line-AccessToken"] = token;
  const request = new Request(`https://relay.test${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const logs = [];
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  globalThis.fetch = mockFetch;
  console.log = (...args) => logs.push(args.map((arg) => {
    if (typeof arg === "string") return arg;
    try { return JSON.stringify(arg); } catch { return "[unserializable]"; }
  }).join(" "));
  try {
    const response = await worker.fetch(request, env);
    let responseBody;
    const responseText = await response.text();
    try { responseBody = JSON.parse(responseText); } catch { responseBody = responseText; }
    return { status: response.status, body: responseBody, calls, logs };
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
  }
}

function assertNoSensitiveLogs(result) {
  const joined = result.logs.join("\n");
  for (const forbidden of [TEST_TOKEN, TEST_DIFY_KEY, TEST_QUERY, RAW_UPSTREAM_BODY]) {
    assert.equal(joined.includes(forbidden), false, `log leaked forbidden test value: ${forbidden}`);
  }
}

function assertNoPaidDownstream(result) {
  assert.equal(result.calls.make, 0, "Make must not be called");
  assert.equal(result.calls.dify, 0, "Dify must not be called");
}

const cases = [];
function test(name, fn) { cases.push({ name, fn }); }

const baseQuotaEnv = { AIRTABLE_API_KEY: "test-airtable-key-private", MAKE_WEBHOOK_URL: MAKE_URL };
const quotaPayload = { event: "divination_requested", question: "test only" };

test("LINE token missing rejects before all downstream calls", async () => {
  const result = await exercise({ body: quotaPayload, token: null, env: baseQuotaEnv });
  assert.equal(result.status, 401);
  assert.equal(result.calls.total, 0);
  assertNoPaidDownstream(result);
  assertNoSensitiveLogs(result);
});

test("invalid LINE token rejects before Airtable and Make", async () => {
  const result = await exercise({ body: quotaPayload, env: baseQuotaEnv, config: { verifyStatus: 401 } });
  assert.equal(result.status, 401);
  assert.equal(result.calls.airtable, 0);
  assertNoPaidDownstream(result);
  assertNoSensitiveLogs(result);
});

test("wrong LINE audience rejects before profile, Airtable and Make", async () => {
  const result = await exercise({ body: quotaPayload, env: baseQuotaEnv, config: { verifyClientId: "wrong-channel" } });
  assert.equal(result.status, 401);
  assert.equal(result.calls.lineProfile, 0);
  assert.equal(result.calls.airtable, 0);
  assertNoPaidDownstream(result);
  assertNoSensitiveLogs(result);
});

test("AIRTABLE_API_KEY missing returns QUOTA_GATE_UNAVAILABLE", async () => {
  const result = await exercise({ body: quotaPayload, env: { MAKE_WEBHOOK_URL: MAKE_URL } });
  assert.equal(result.status, 503);
  assert.equal(result.body.code, "QUOTA_GATE_UNAVAILABLE");
  assert.equal(result.calls.airtable, 0);
  assertNoPaidDownstream(result);
  assertNoSensitiveLogs(result);
});

for (const status of [401, 403, 429, 500, 503]) {
  test(`Airtable ${status} returns QUOTA_GATE_UNAVAILABLE`, async () => {
    const result = await exercise({ body: quotaPayload, env: baseQuotaEnv, config: { airtableStatus: status } });
    assert.equal(result.status, 503);
    assert.equal(result.body.code, "QUOTA_GATE_UNAVAILABLE");
    assertNoPaidDownstream(result);
    assertNoSensitiveLogs(result);
  });
}

test("Airtable network error returns QUOTA_GATE_UNAVAILABLE", async () => {
  const result = await exercise({ body: quotaPayload, env: baseQuotaEnv, config: { airtableThrow: true } });
  assert.equal(result.status, 503);
  assert.equal(result.body.code, "QUOTA_GATE_UNAVAILABLE");
  assertNoPaidDownstream(result);
  assertNoSensitiveLogs(result);
});

for (const malformed of [{}, { records: "not-an-array" }]) {
  test("Airtable malformed body returns QUOTA_GATE_UNAVAILABLE", async () => {
    const result = await exercise({ body: quotaPayload, env: baseQuotaEnv, config: { airtableBody: malformed } });
    assert.equal(result.status, 503);
    assert.equal(result.body.code, "QUOTA_GATE_UNAVAILABLE");
    assertNoPaidDownstream(result);
    assertNoSensitiveLogs(result);
  });
}

test("Airtable invalid JSON returns QUOTA_GATE_UNAVAILABLE", async () => {
  const result = await exercise({ body: quotaPayload, env: baseQuotaEnv, config: { airtableMalformedJson: true } });
  assert.equal(result.status, 503);
  assert.equal(result.body.code, "QUOTA_GATE_UNAVAILABLE");
  assertNoPaidDownstream(result);
  assertNoSensitiveLogs(result);
});

test("subscriber record missing returns bounded 402 and does not call Make", async () => {
  const result = await exercise({ body: quotaPayload, env: baseQuotaEnv, config: { airtableBody: { records: [] } } });
  assert.equal(result.status, 402);
  assert.equal(result.body.code, "QUOTA_REQUIRED");
  assertNoPaidDownstream(result);
  assertNoSensitiveLogs(result);
});

test("quota exhausted returns bounded 402 and does not call Make", async () => {
  const records = [{ fields: { subscriber_tier: "free", trial_quota_remaining: 0, monthly_quota_remaining: 0 } }];
  const result = await exercise({ body: quotaPayload, env: baseQuotaEnv, config: { airtableBody: { records } } });
  assert.equal(result.status, 402);
  assert.equal(result.body.code, "QUOTA_REQUIRED");
  assertNoPaidDownstream(result);
  assertNoSensitiveLogs(result);
});

test("valid bounded free trial calls Make exactly once", async () => {
  const records = [{ fields: { subscriber_tier: "free", trial_quota_remaining: 1, monthly_quota_remaining: 0 } }];
  const result = await exercise({ body: quotaPayload, env: baseQuotaEnv, config: { airtableBody: { records } } });
  assert.equal(result.status, 202);
  assert.equal(result.calls.make, 1);
  assert.equal(result.calls.dify, 0);
  assertNoSensitiveLogs(result);
});

test("valid subscriber calls Make exactly once", async () => {
  const records = [{ fields: { subscriber_tier: "subscriber", trial_quota_remaining: 0, monthly_quota_remaining: 0 } }];
  const result = await exercise({ body: quotaPayload, env: baseQuotaEnv, config: { airtableBody: { records } } });
  assert.equal(result.status, 202);
  assert.equal(result.calls.make, 1);
  assert.equal(result.calls.dify, 0);
  assertNoSensitiveLogs(result);
});

const baseLaoyiEnv = {
  DIFY_LAOYI_KEY: TEST_DIFY_KEY,
  LAOYI_RATE_LIMITER: { limit: async () => ({ success: true }) },
};
const laoyiPayload = { query: TEST_QUERY };

test("laoyi unexpected request field rejects before limiter and Dify", async () => {
  let limiterCalls = 0;
  const env = { ...baseLaoyiEnv, LAOYI_RATE_LIMITER: { limit: async () => { limiterCalls += 1; return { success: true }; } } };
  const result = await exercise({ path: "/laoyi/chat", body: { ...laoyiPayload, line_user_id: "forged" }, env });
  assert.equal(result.status, 400);
  assert.equal(result.body.code, "BAD_FIELD");
  assert.equal(limiterCalls, 0);
  assertNoPaidDownstream(result);
  assertNoSensitiveLogs(result);
});

test("DIFY_LAOYI_KEY missing returns 503 without limiter or Dify", async () => {
  let limiterCalls = 0;
  const env = { LAOYI_RATE_LIMITER: { limit: async () => { limiterCalls += 1; return { success: true }; } } };
  const result = await exercise({ path: "/laoyi/chat", body: laoyiPayload, env });
  assert.equal(result.status, 503);
  assert.equal(result.body.code, "NOT_CONFIGURED");
  assert.equal(limiterCalls, 0);
  assertNoPaidDownstream(result);
  assertNoSensitiveLogs(result);
});

test("rate limiter binding missing returns RATE_LIMITER_UNAVAILABLE", async () => {
  const result = await exercise({ path: "/laoyi/chat", body: laoyiPayload, env: { DIFY_LAOYI_KEY: TEST_DIFY_KEY } });
  assert.equal(result.status, 503);
  assert.equal(result.body.code, "RATE_LIMITER_UNAVAILABLE");
  assertNoPaidDownstream(result);
  assertNoSensitiveLogs(result);
});

test("rate limiter exception returns RATE_LIMITER_UNAVAILABLE", async () => {
  const env = { DIFY_LAOYI_KEY: TEST_DIFY_KEY, LAOYI_RATE_LIMITER: { limit: async () => { throw new Error("controlled limiter failure"); } } };
  const result = await exercise({ path: "/laoyi/chat", body: laoyiPayload, env });
  assert.equal(result.status, 503);
  assert.equal(result.body.code, "RATE_LIMITER_UNAVAILABLE");
  assertNoPaidDownstream(result);
  assertNoSensitiveLogs(result);
});

test("rate limiter malformed result returns RATE_LIMITER_UNAVAILABLE", async () => {
  const env = { DIFY_LAOYI_KEY: TEST_DIFY_KEY, LAOYI_RATE_LIMITER: { limit: async () => ({}) } };
  const result = await exercise({ path: "/laoyi/chat", body: laoyiPayload, env });
  assert.equal(result.status, 503);
  assert.equal(result.body.code, "RATE_LIMITER_UNAVAILABLE");
  assertNoPaidDownstream(result);
  assertNoSensitiveLogs(result);
});

test("rate limit exceeded returns 429 without Dify", async () => {
  const env = { DIFY_LAOYI_KEY: TEST_DIFY_KEY, LAOYI_RATE_LIMITER: { limit: async () => ({ success: false }) } };
  const result = await exercise({ path: "/laoyi/chat", body: laoyiPayload, env });
  assert.equal(result.status, 429);
  assert.equal(result.body.code, "RATE_LIMITED");
  assertNoPaidDownstream(result);
  assertNoSensitiveLogs(result);
});

test("explicit rate-limit success calls Dify exactly once", async () => {
  const result = await exercise({ path: "/laoyi/chat", body: laoyiPayload, env: baseLaoyiEnv });
  assert.equal(result.status, 200);
  assert.equal(result.calls.dify, 1);
  assert.equal(result.calls.make, 0);
  assertNoSensitiveLogs(result);
});

test("cross-user log read is denied", async () => {
  const airtableBody = { id: "recABCDEFGHIJKLMN", fields: { line_user_id_raw: "U_other_subject", question_text: "other private record" } };
  const result = await exercise({
    path: "/log?log_id=recABCDEFGHIJKLMN",
    method: "GET",
    env: { AIRTABLE_API_KEY: "test-airtable-key-private" },
    config: { airtableBody },
  });
  assert.equal(result.status, 403);
  assert.equal(result.body.record, null);
  assertNoPaidDownstream(result);
  assertNoSensitiveLogs(result);
});

test("unauthenticated duplicate payment callback attempts both fail closed", async () => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await exercise({ path: "/payment/callback", body: { event_id: "evt_test" }, token: null, env: baseQuotaEnv });
    assert.equal(result.status, 401);
    assertNoPaidDownstream(result);
    assertNoSensitiveLogs(result);
  }
});

let passed = 0;
for (const { name, fn } of cases) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

console.log(`RESULT ${passed}/${cases.length} security fail-closed cases passed`);
