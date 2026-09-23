import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, randomUUID, createHmac, createHash } from 'node:crypto';
import { createSubjectVerifier, postgresJtiConsumer } from '../src/w1/subject.js';
import { createW1Server } from '../src/w1/http.js';
import { createLegacyReader, mergeRecords } from '../src/w1/legacy.js';
import { verifyLineWebhook } from '../src/w1/line-webhook.js';
import { A11, BASIS, readthroughAdmission } from '../src/w1/admission.js';
import { loadV34, checkRuntimeBinding } from '../src/w1/registry.js';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const A = `U${'a'.repeat(32)}`, B = `U${'b'.repeat(32)}`;
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
function token(overrides = {}, key = privateKey, header = { alg: 'EdDSA', typ: 'JWT' }) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const body = `${encode(header)}.${encode({ sub: A, iss: 'mingge-relay', aud: 'mingge-api',
    iat: 1000, exp: 1120, jti: randomUUID(), req: 'request-a', src: 'liff', ...overrides })}`;
  return `${body}.${sign(null, Buffer.from(body), key).toString('base64url')}`;
}
function verifier(consumeJti) {
  const seen = new Set();
  return createSubjectVerifier({ publicKey: publicPem, clock: () => 1010000,
    consumeJti: consumeJti || (async jti => { if (seen.has(jti)) return false; seen.add(jti); return true; }) });
}
const request = t => ({ token: t, requestId: 'request-a', body: { request_id: 'request-a' } });
test('verified subject is immutable; replay fails, fresh token can reuse request ID', async () => {
  const auth = verifier(), t = token();
  const context = await auth(request(t));
  assert.equal(context.subject, A);
  assert.throws(() => { context.subject = B; }, TypeError);
  await assert.rejects(auth(request(t)), { message: 'UNAUTHORIZED' });
  assert.equal((await auth(request(token()))).subject, A);
});
test('missing, expired, wrong audience/issuer/signature, future and unbound claims fail closed', async () => {
  for (const change of [{ exp: 1000 }, { iat: 1020 }, { exp: 2000 }, { aud: 'other' },
    { iss: 'other' }, { req: 'other' }, { sub: '' }, { sub: 'injection' }, { jti: '' }, { src: 'body' }]) {
    await assert.rejects(verifier()(request(token(change))), { message: 'UNAUTHORIZED' });
  }
  const other = generateKeyPairSync('ed25519');
  for (const t of [undefined, '', 'invalid', token({}, other.privateKey), token({}, privateKey, { alg: 'none', typ: 'JWT' })]) {
    await assert.rejects(verifier()(request(t)), { message: 'UNAUTHORIZED' });
  }
});
test('identity in body, nested fields or query is rejected, not ignored', async () => {
  for (const field of ['subject', 'line_user_id', 'line_user_id_raw', 'user', 'userId']) {
    for (const extra of [{ body: { [field]: B } }, { body: { nested: { [field]: B } } }, { query: { [field]: B } }]) {
      await assert.rejects(verifier()({ ...request(token()), ...extra }), { message: 'BAD_FIELD', status: 400 });
    }
  }
});
test('JTI store outage and non-boolean success cannot authenticate', async () => {
  for (const consume of [async () => { throw new Error('PRIVATE_MARKER'); }, async () => 1]) {
    await assert.rejects(verifier(consume)(request(token())), { message: 'UNAUTHORIZED' });
  }
});
test('auth diagnostics use fixed reasons while HTTP response stays generic', async () => {
  const kid = 'synthetic-kid';
  const auth = createSubjectVerifier({ publicKey: publicPem, kid, clock: () => 1010000, consumeJti: async () => true });
  const header = { alg: 'EdDSA', typ: 'JWT', kid };
  const valid = token({}, privateKey, header);
  const other = generateKeyPairSync('ed25519');
  const cases = [
    [{ token: undefined, requestId: 'request-a', body: {} }, 'AUTH_TOKEN_MISSING'],
    [{ token: 'PRIVATE_TOKEN_MARKER', requestId: 'request-a', body: {} }, 'AUTH_JWT_FORMAT_INVALID'],
    [{ token: token({}, privateKey, { ...header, kid: 'wrong-kid' }), requestId: 'request-a', body: {} }, 'AUTH_KID_MISMATCH'],
    [{ token: token({}, other.privateKey, header), requestId: 'request-a', body: {} }, 'AUTH_SIGNATURE_INVALID'],
    [{ token: token({ iat: 1020 }, privateKey, header), requestId: 'request-a', body: {} }, 'AUTH_CLAIMS_TIME_INVALID'],
  ];
  for (const [input, reason] of cases) {
    await assert.rejects(auth(input), error => {
      assert.equal(error.message, 'UNAUTHORIZED');
      assert.equal(error.status, 401);
      assert.equal(error.authReasonCode, reason);
      assert.doesNotMatch(error.message, /PRIVATE_TOKEN_MARKER/);
      assert.doesNotMatch(error.stack, /PRIVATE_TOKEN_MARKER/);
      return true;
    });
  }
  const jtiStorageFailure = createSubjectVerifier({ publicKey: publicPem, kid, clock: () => 1010000,
    consumeJti: async () => { throw new Error('PRIVATE_STORAGE_MARKER'); } });
  await assert.rejects(jtiStorageFailure({ token: valid, requestId: 'request-a', body: {} }), error => {
    assert.equal(error.message, 'UNAUTHORIZED');
    assert.equal(error.authReasonCode, 'AUTH_JTI_STORAGE_ERROR');
    assert.doesNotMatch(error.stack, /PRIVATE_STORAGE_MARKER/);
    return true;
  });
  const replayed = createSubjectVerifier({ publicKey: publicPem, kid, clock: () => 1010000, consumeJti: async () => false });
  await assert.rejects(replayed({ token: valid, requestId: 'request-a', body: {} }), { authReasonCode: 'AUTH_JTI_REJECTED' });

  const events = [];
  const server = createW1Server({ service: { store: { hasOwnerBinding: async () => false } }, authenticate: auth,
    log: event => events.push(event) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/quota`, {
      headers: { 'X-Mingge-Request-Id': 'request-a' },
    });
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'UNAUTHORIZED' });
    assert.deepEqual(events, [{ error_code: 'AUTH_TOKEN_MISSING', status: 401 }]);
    assert.doesNotMatch(JSON.stringify(events), /PRIVATE_TOKEN_MARKER|PRIVATE_STORAGE_MARKER/);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
test('Postgres replay adapter uses atomic conflict insert and bound values', async () => {
  let captured;
  const consume = postgresJtiConsumer({ query: async (...args) => { captured = args; return { rowCount: 1 }; } });
  const id = randomUUID();
  assert.equal(await consume(id, 1120), true);
  assert.match(captured[0], /ON CONFLICT DO NOTHING RETURNING/);
  assert.deepEqual(captured[1], [id, 1120]);
});
test('LINE webhook verification uses raw bytes, rejects reserialization', () => {
  const raw = Buffer.from('{ "events": [] }'), secret = 'synthetic-secret';
  const signature = createHmac('sha256', secret).update(raw).digest('base64');
  assert.equal(verifyLineWebhook(raw, signature, secret), true);
  assert.equal(verifyLineWebhook(Buffer.from(JSON.stringify(JSON.parse(raw))), signature, secret), false);
  assert.equal(verifyLineWebhook(raw, signature, ''), false);
});

const evidence = Object.fromEntries(['C1', 'C2', 'C3', 'C4', 'C5'].map(id => [id,
  { status: 'PASS', reference: `synthetic-test-only/${id}` }]));
const syntheticPat = 'synthetic-readonly-token';
function legacyConfig(extra = {}) {
  return { evidence, token: syntheticPat,
    tokenSha256: createHash('sha256').update(syntheticPat).digest('hex'),
    environment: 'staging', base: 'appSynthetic', table: 'tblSynthetic',
    isOwnerTestGrant: async subject => subject === A, ...extra };
}
const row = (subject = A) => ({ id: 'recSynthetic', fields: { line_user_id_raw: subject,
  entry_type: 'divination', question_text: 'PRIVATE_MARKER', session_id: 's1' } });
test('each absent C condition blocks before any fetch; booleans alone are not evidence', () => {
  for (const id of Object.keys(evidence)) {
    const partial = { ...evidence, [id]: undefined };
    assert.equal(readthroughAdmission(partial).status, 'NEEDS_BOUNDED_CHANGE');
    assert.throws(() => createLegacyReader(legacyConfig({ evidence: partial })), { message: 'NEEDS_BOUNDED_CHANGE' });
  }
  assert.equal(readthroughAdmission({ C1: true }).status, 'NEEDS_BOUNDED_CHANGE');
});
test('wrong token fingerprint and production environment are blocked', () => {
  for (const extra of [{ token: 'other' }, { environment: 'production' }]) {
    assert.throws(() => createLegacyReader(legacyConfig(extra)), { message: 'NEEDS_BOUNDED_CHANGE' });
  }
});
test('read is scoped GET, no-store, no redirects; response drops identity and is immutable', async () => {
  let calls = 0;
  const read = createLegacyReader(legacyConfig({ fetchImpl: async (url, options) => {
    calls++;
    assert.equal(options.method, 'GET'); assert.equal(options.cache, 'no-store');
    assert.equal(options.redirect, 'error');
    assert.equal(url.searchParams.get('filterByFormula'), `AND({line_user_id_raw}="${A}",{entry_type}="divination")`);
    assert.equal(url.searchParams.get('maxRecords'), '50');
    return { ok: true, json: async () => ({ records: [row()] }) };
  } }));
  const result = await read(Object.freeze({ subject: A }));
  assert.equal(result[0].writable, false); assert.equal(result[0].line_user_id_raw, undefined);
  assert.throws(() => { result[0].writable = true; }, TypeError);
  await assert.rejects(read({ subject: B }), { message: 'OWNER_TEST_GRANT_REQUIRED' });
  await assert.rejects(read({}), { message: 'SUBJECT_BINDING_REQUIRED' });
  assert.equal(calls, 1);
});
test('A cannot receive B legacy row; all upstream errors are sanitized', async () => {
  for (const fetchImpl of [
    async () => ({ ok: true, json: async () => ({ records: [row(B)] }) }),
    async () => ({ ok: true, json: async () => ({ records: null }) }),
    async () => ({ ok: false }),
    async () => { throw new Error('PRIVATE_MARKER'); },
  ]) {
    await assert.rejects(createLegacyReader(legacyConfig({ fetchImpl }))({ subject: A }),
      { message: 'LEGACY_READ_UNAVAILABLE' });
  }
});
test('revocation is rechecked on every read', async () => {
  let active = true, calls = 0;
  const read = createLegacyReader(legacyConfig({ isOwnerTestGrant: async () => active,
    fetchImpl: async () => { calls++; return { ok: true, json: async () => ({ records: [] }) }; } }));
  await read({ subject: A }); active = false;
  await assert.rejects(read({ subject: A }), { message: 'OWNER_TEST_GRANT_REQUIRED' });
  assert.equal(calls, 1);
});
test('dedupe uses source ID then nonempty session ID; no empty-key collapse', () => {
  const current = [{ legacy_source_airtable_id: 'rec1', request_id: 'r1' }];
  const legacy = [{ id: 'rec1' }, { id: 'rec2', session_id: 'r1' }, { id: 'rec3', session_id: '' }];
  assert.deepEqual(mergeRecords(current, legacy), [...current, legacy[2]]);
});
test('A11 stays advisory; historical unknown runtime and changed prompt are refused', () => {
  assert.equal(A11.blocking, false); assert.equal(A11.threshold_status, 'ENGINEERING_CANDIDATE');
  assert.throws(() => checkRuntimeBinding({ status: 'HISTORICAL_HARNESS_NOT_FINAL_RUNTIME', safetySettings: 'PROVIDER_DEFAULT_UNKNOWN' }),
    { message: 'RUNTIME_BINDING_UNVERIFIED' });
  assert.equal(BASIS.contract.length, 64);
  const dir = mkdtempSync(join(tmpdir(), 'mingge-w1-'));
  try {
    const file = join(dir, 'modified.txt'); writeFileSync(file, 'synthetic-modified-prompt');
    assert.throws(() => loadV34(file), { message: 'PROMPT_SHA_MISMATCH' });
  } finally { rmSync(dir, { recursive: true }); }
});
