import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const logSource = read('log.html');
const indexSource = read('index.html');
const workerSource = read('workers/mingge-relay/worker.js');
const worker = (await import('data:text/javascript;base64,' + Buffer.from(workerSource).toString('base64'))).default;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const clone = x => JSON.parse(JSON.stringify(x));
export const ID = 'rec12345678901234';
export const UUID = '11111111-1111-4111-8111-111111111111';
export const UUID2 = '22222222-2222-4222-8222-222222222222';
export const record = () => ({ log_id: ID, session_id: 'synthetic-session', entry_type: 'divination',
  question_text: '合成問題', ben_gua: '乾', bian_gua: '坤', dong_yao: '1', qigua_time: '2026-09-03T01:00:00Z',
  output_json: '合成原始信箋\n第二行', trace_text: '舊後續\r\n保留空格  ', trace_at: '2026-09-02T01:00:00Z',
  deep_read_state: null, deep_read_output_json: null });
const stamp = id => `2026-09-03T09:00:00.000+08:00 · req:${id}`;

// Small DOM adapter: the production script builds the markup and binds the events.
// Browser layout is separately measured; this adapter makes no pixel/layout claims.
export function loadUi(page = 'log') {
  const elements = new Map(); const events = []; const messages = [];
  class Element {
    constructor(id, parent = null) {
      this.id = id; this.parent = parent; this._html = ''; this.value = ''; this.textContent = '';
      this.disabled = false; this.hidden = false; this.dataset = {}; this.style = {}; this.listeners = {};
      this.classList = { add() {}, remove() {}, contains() { return false; } };
    }
    set innerHTML(html) {
      for (const [id, el] of elements) {
        let parent = el.parent;
        while (parent) { if (parent === this) { elements.delete(id); break; } parent = parent.parent; }
      }
      this._html = html;
      for (const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*\bid="([^"]+)"[^>]*)>/gi)) {
        const el = new Element(match[3], this);
        el.disabled = /\sdisabled(?:\s|$)/.test(match[2]); el.hidden = /\shidden(?:\s|$)/.test(match[2]);
        elements.set(el.id, el);
      }
    }
    get innerHTML() { return this._html; }
    addEventListener(name, fn) { this.listeners[name] = fn; }
    async click() { if (!this.disabled && this.listeners.click) await this.listeners.click(); }
    focus() { events.push(['focus', this.id]); }
    scrollIntoView() { events.push(['scroll', this.id]); }
    setAttribute(k, v) { this[k] = v; }
    remove() { elements.delete(this.id); }
  }
  for (const id of ['viewLoading', 'viewError', 'viewDetail', 'errMsg', 'logStatus', 'logList', 'logLoading', 'fupanBanner', 'r2ListHome']) elements.set(id, new Element(id));
  const context = {
    URLSearchParams, TextEncoder, AbortController, Set, Map, Intl, Date, Promise, crypto: { randomUUID },
    console: { warn() {}, log() {} },
    setTimeout: (fn, ms) => { if (ms < 10000) fn(); return 1; }, clearTimeout() {},
    fetch: async () => { throw Error('unexpected fetch'); },
    window: { location: { search: `?log_id=${ID}&src=log`, href: '' } },
    liff: { async init() {}, isLoggedIn: () => true, getAccessToken: () => 'synthetic-token', login() {},
      isInClient: () => true, sendMessages: async m => messages.push(m), closeWindow: () => events.push(['close']) },
    document: {
      getElementById: id => elements.get(id) || null,
      querySelectorAll: () => [],
    },
    quotaCreditsFromSub: () => 3,
  };
  vm.createContext(context);
  if (page === 'log') {
    const script = [...logSource.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)[1].replace(/\ninit\(\);\s*$/, '');
    vm.runInContext(script + '\nthis.api={renderDetail,init,resolveGuaViewContext,buildDelayedActionsHtml,buildR2ComparisonHtml,r2OpenCompose,r2UpdateCompose,r2SubmitCompose,r2ReturnRecord,r2DeepState,r2OpenDeep,r2Readback,r2FindEntry,fetchSubscriberTier,copy:R2_COPY,get compose(){return r2Compose},get record(){return r2ActiveRecord}};', context);
  } else {
    const copy = indexSource.slice(indexSource.indexOf('const R2_COPY ='), indexSource.indexOf('/* ===== E09 歷史卦例頁 ===== */'));
    const esc = indexSource.slice(indexSource.indexOf('function lcEsc('), indexSource.indexOf('function lcDate('));
    const source = indexSource.slice(indexSource.indexOf('function buildFupanBannerHtml('), indexSource.indexOf('/* ===== LIFF 子頁面路由'));
    vm.runInContext('const LIFF_ID="test";const RELAY_URL="https://relay.test/";\n' + copy + esc + source
      + '\nthis.api={initLogPage,buildR2ListCard,buildR2ListState,buildFupanBannerHtml,r2TraceSummary,r2ListDate,copy:R2_COPY};', context);
  }
  return { context, api: context.api, elements, events, messages };
}

function storeHarness(options = {}) {
  const rec = record(); delete rec.log_id;
  const store = { id: ID, fields: { ...rec, line_user_id_raw: 'synthetic-owner', golden_seal: true, golden_seal_time: 'unchanged' } };
  const calls = []; let gets = 0, patches = 0;
  const fetcher = async (input, init = {}) => {
    const url = new URL(typeof input === 'string' ? input : input.url);
    const method = init.method || 'GET'; calls.push({ origin: url.origin, path: url.pathname, query: url.search, method, body: init.body });
    if (url.pathname === '/oauth2/v2.1/verify') return json({ client_id: options.wrongChannel ? 'wrong' : '2010192384' });
    if (url.pathname === '/v2/profile') return json({ userId: options.otherOwner ? 'other-owner' : 'synthetic-owner' });
    if (url.hostname !== 'api.airtable.com') throw Error('unapproved downstream in test');
    if (url.pathname.endsWith('/' + ID)) {
      if (method === 'PATCH') {
        patches++;
        const fields = JSON.parse(init.body).fields;
        if (options.patchFail) return json({}, 500);
        if (!options.ignorePatch) Object.assign(store.fields, fields);
        if (options.throwAfterWrite) throw Error('response lost');
        return json(clone(store));
      }
      gets++;
      if (options.onGet) await options.onGet({ store, gets, patches });
      if (options.getFail || (options.verifyFail && patches)) return json({}, 503);
      if (options.getBadJson) return new Response('{');
      return json(clone(store));
    }
    if (options.historyFail) return json({}, 403);
    if (options.historyBadJson) return new Response('{');
    if (options.historyBadShape) return json({});
    return json({ records: url.pathname.endsWith('tblVyf8WfTQxvtpEg') ? (options.empty ? [] : [clone(store)]) : [] });
  };
  const env = { AIRTABLE_API_KEY: 'synthetic-key' };
  async function call(path, body, token = 'synthetic-token') {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['X-Line-AccessToken'] = token;
    const originalFetch = globalThis.fetch, originalLog = console.log;
    globalThis.fetch = fetcher; console.log = () => {};
    try {
      const res = await worker.fetch(new Request('https://relay.test' + path, {
        method: body === undefined ? 'GET' : 'POST', headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      }), env);
      return { status: res.status, body: await res.json() };
    } finally { globalThis.fetch = originalFetch; console.log = originalLog; }
  }
  return { store, calls, call, fetcher, options, get patches() { return patches; }, get gets() { return gets; } };
}

export async function runTests() {
  const cases = [];
  const test = (name, fn) => cases.push([name, fn]);
  const render = (u, rec = record(), tier = { ok: true, tier: 'free', recordsCount: 4, fupanLive: false }, mode = 'delayed_return') => u.api.renderDetail(rec, tier, 'synthetic-token', mode);
  const fill = (u, answers = ['新的合成後續', '', '']) => {
    u.api.r2OpenCompose(); answers.forEach((v, i) => { u.elements.get('r2Answer' + i).value = v; }); u.api.r2UpdateCompose();
  };
  for (const [query, result] of [
    ['context=first_completion', 'first_completion'], ['ctx=first', 'first_completion'], ['src=letter', 'first_completion'],
    ['src=log&ctx=first', 'delayed_return'], ['src=log&context=first_completion', 'delayed_return'],
    ['ctx=delayed&src=letter', 'delayed_return'], ['', 'delayed_return'], ['context=unknown', 'delayed_return'],
  ]) test('A1 source: ' + (query || 'no context'), () => assert.equal(loadUi().api.resolveGuaViewContext(new URLSearchParams(query)), result));
  test('A1 session storage is not a context authority', () => {
    const u = loadUi(); u.context.sessionStorage = { getItem: () => 'synthetic-session' };
    assert.equal(u.api.resolveGuaViewContext(new URLSearchParams('src=log')), 'delayed_return');
  });
  test('R3/E1 saving poll keeps waiting after read_error; only exact record clears inflight', async () => {
    const values = new Map([['mg_inflight_session_id', 'synthetic-session'], ['mg_inflight_qigua_time', record().qigua_time]]);
    let calls = 0; const delays = [];
    const c = { RELAY_URL: 'https://relay.test/', SESSION_ID: 'synthetic-session',
      sessionStorage: { getItem: key => values.get(key), removeItem: key => values.delete(key) },
      setTimeout: (fn, ms) => { delays.push(ms); fn(); }, console: { warn() {} },
      window: { addEventListener() {} }, document: { addEventListener() {} },
      fetch: async () => {
        assert.equal(values.size, 2);
        return ++calls === 1 ? json({ state: 'read_error' }, 502) : json({ records: [record()] });
      },
    };
    vm.createContext(c);
    const slice = indexSource.slice(indexSource.indexOf('function normalizedTimestampMs'), indexSource.indexOf('/* LIFF 初始化'));
    vm.runInContext(slice + '\nthis.wait=waitForPersistedLog;', c);
    const saved = await c.wait('synthetic-token', 'synthetic-session', record().qigua_time);
    assert.equal(saved.log_id, ID); assert.equal(calls, 2); assert.equal(values.size, 0);
    assert.deepEqual(delays, [1500]);
  });
  test('A2 actual first renderer has no routes / comparison / compose / deep CTA', () => {
    const u = loadUi(); render(u, record(), { ok: true, tier: 'subscriber', recordsCount: 4, fupanLive: true }, 'first_completion');
    const html = u.elements.get('viewDetail').innerHTML;
    for (const id of ['delayedActions', 'r2Comparison', 'r2TaskView', 'deepdiveBtn']) assert.ok(!html.includes(id));
    assert.ok(html.includes('回首頁')); assert.ok(html.includes('合成原始信箋'));
  });
  test('A3 saved trace and escaped completed output precede routes', () => {
    const u = loadUi(); const rec = record(); rec.deep_read_state = 'completed'; rec.deep_read_output_json = '<script>private()</script>';
    render(u, rec); const html = u.elements.get('viewDetail').innerHTML;
    assert.ok(html.indexOf('舊後續') < html.indexOf('id="delayedActions"'));
    assert.ok(html.indexOf('&lt;script&gt;') < html.indexOf('id="delayedActions"'));
    assert.ok(!html.includes('<script>private'));
  });
  for (const [live, count, expected] of [[false, 4, false], [undefined, 4, false], [true, 2, false], [true, 3, true]]) {
    test(`A4/R7 shared fupan gate live=${live} count=${count}`, () => {
      const u = loadUi(); render(u, record(), { ok: true, tier: 'subscriber', recordsCount: count, fupanLive: live });
      const html = u.elements.get('viewDetail').innerHTML;
      assert.equal(html.includes('想回看這一路'), expected);
      assert.equal(html.includes('這三個差在哪？'), expected);
      assert.equal(html.includes('這兩個差在哪？'), !expected);
      assert.equal(html.includes('兩個都不是新的一卦。'), !expected);
      const index = loadUi('index');
      assert.equal(Boolean(index.api.buildFupanBannerHtml({ tier: 'subscriber' }, count, live)), expected);
    });
  }
  for (const [state, output, expected] of [[null, null, 'new'], ['', null, 'new'], ['pending', null, 'pending'],
    ['completed', 'result', 'completed'], ['completed', '', 'unavailable'], ['failed', null, 'unavailable'], ['bad', null, 'unavailable']]) {
    test('R4 deep state ' + state + '/' + output, () => assert.equal(loadUi().api.r2DeepState({ deep_read_state: state, deep_read_output_json: output }), expected));
  }
  test('R4 missing deep field is unknown, never new', () => assert.equal(loadUi().api.r2DeepState({}), 'unavailable'));
  test('R4 pending/failed/completed do not trigger or purchase', async () => {
    for (const state of ['pending', 'failed', 'completed']) {
      const u = loadUi(); let calls = 0; u.context.fetch = async () => { calls++; throw Error(); };
      render(u, { ...record(), deep_read_state: state, deep_read_output_json: 'result' }); await u.api.r2OpenDeep();
      assert.equal(calls, 0); assert.equal(u.context.window.location.href, '');
      if (state !== 'completed') assert.ok(u.elements.get('r2TaskView').innerHTML.includes(state === 'pending' ? u.api.copy.pending : u.api.copy.deepError));
      else assert.ok(u.events.some(e => e[1] === 'r2DeepResult'));
    }
  });
  test('R4 new unpaid follows existing deepdive pay route', async () => {
    const u = loadUi(); render(u); await u.api.r2OpenDeep();
    assert.equal(u.context.window.location.href, './index.html?action=pay&src=deepdive');
  });
  test('R6 support uses exact Rich Menu message, no decision memory', async () => {
    const u = loadUi(); render(u, { ...record(), deep_read_state: 'failed' }); await u.api.r2OpenDeep();
    await u.elements.get('r2Support').click(); assert.equal(JSON.stringify(u.messages), JSON.stringify([[{ type: 'text', text: '書僮客服' }]]));
  });
  test('R4 entitled trigger accepts legacy plain text and stays single flight', async () => {
    const u = loadUi(); let complete; let calls = 0;
    render(u, record(), { ok: true, tier: 'subscriber', recordsCount: 4, fupanLive: false });
    u.context.fetch = async (url, opts) => {
      calls++; assert.ok(url.endsWith('/trigger/deepdive'));
      assert.deepEqual(JSON.parse(opts.body), { log_id: ID });
      return new Promise(resolve => { complete = resolve; });
    };
    const pending = u.api.r2OpenDeep(); await u.api.r2OpenDeep();
    assert.equal(calls, 1); complete(new Response('accepted')); await pending;
    assert.ok(u.elements.get('r2TaskView').innerHTML.includes(u.api.copy.pending));
    assert.equal(u.context.window.location.href, '');
  });
  test('R4 late trigger response cannot replace a newly opened trace form', async () => {
    const u = loadUi(); let complete;
    render(u, record(), { ok: true, tier: 'subscriber', recordsCount: 4, fupanLive: false });
    u.context.fetch = () => new Promise(resolve => { complete = resolve; });
    const pending = u.api.r2OpenDeep();
    await u.elements.get('r2Cancel').click(); fill(u, ['keep my unsaved answer', '', '']);
    const compose = u.api.compose;
    complete(new Response('accepted')); await pending;
    assert.equal(u.api.compose, compose);
    assert.equal(u.elements.get('r2Answer0').value, 'keep my unsaved answer');
    assert.ok(u.elements.get('r2TaskView').innerHTML.includes(u.api.copy.title));
  });
  test('A5 log read error and history read error clear routes', async () => {
    for (const failLog of [true, false]) {
      const u = loadUi(); render(u);
      u.context.fetch = async url => url.includes('log?') && !failLog ? json({ record: record() }) : json({ state: 'read_error' }, 502);
      await u.api.init(); assert.equal(u.elements.get('viewDetail').innerHTML, '');
      assert.ok(u.elements.get('viewError').innerHTML.includes(u.api.copy.readError));
      assert.ok(!u.elements.get('viewError').innerHTML.includes(u.api.copy.empty));
    }
  });
  test('R5 init focuses and scrolls only delayed actions', async () => {
    for (const first of [false, true]) {
      const u = loadUi(); u.context.window.location.search = `?log_id=${ID}&${first ? 'ctx=first' : 'src=log'}`;
      u.context.fetch = async url => url.includes('log?') ? json({ record: record() }) : json({ records: [record()], fupan_live_proven: false });
      await u.api.init(); assert.equal(u.events.some(e => e[1] === 'delayedActions'), !first);
    }
  });
  test('A5 history parser counts only distinct owned divination', async () => {
    const u = loadUi(); u.context.fetch = async () => json({ records: [record(), record(), { ...record(), log_id: 'other', entry_type: 'fupan' }], fupan_live_proven: true });
    const tier = await u.api.fetchSubscriberTier('test'); assert.equal(tier.recordsCount, 1);
  });
  test('C3/R8 single nonempty answer / labels / limits / cancel', async () => {
    const u = loadUi(); render(u); fill(u, ['', '', '']); assert.equal(u.elements.get('r2Save').disabled, true);
    u.elements.get('r2Answer1').value = '選擇稍等'; u.api.r2UpdateCompose();
    assert.equal(u.api.compose.text, '「您做了什麼決定？」\n選擇稍等'); assert.equal(u.elements.get('r2Save').disabled, false);
    u.elements.get('r2Answer1').value = 'a'.repeat(500); u.api.r2UpdateCompose(); assert.equal(u.elements.get('r2Save').disabled, true);
    assert.equal(u.elements.get('r2Answer1').value.length, 500);
    await u.elements.get('r2Cancel').click(); assert.equal(u.api.compose, null);
  });
  test('C1/C2 end-to-end UI -> Worker append -> independent GET -> rendered saved record', async () => {
    const h = storeHarness(); const u = loadUi(); render(u); fill(u);
    const submitted = u.api.compose.text; const requestId = u.api.compose.requestId;
    const before = clone(h.store.fields);
    u.context.fetch = async (url, init) => {
      const route = new URL(url); const result = await h.call(route.pathname + route.search, init.method === 'POST' ? JSON.parse(init.body) : undefined);
      return json(result.body, result.status);
    };
    await u.elements.get('r2Save').click();
    assert.ok(u.elements.get('r2TaskView').innerHTML.includes(u.api.copy.success));
    assert.ok(h.store.fields.trace_text.startsWith(before.trace_text + '\n---\n'));
    assert.ok(h.store.fields.trace_text.includes('req:' + requestId + '\n' + submitted));
    for (const key of ['question_text', 'ben_gua', 'bian_gua', 'dong_yao', 'output_json', 'qigua_time', 'golden_seal', 'golden_seal_time']) assert.equal(h.store.fields[key], before[key]);
    assert.equal(h.patches, 1); assert.ok(h.gets >= 3);
    await u.elements.get('r2Cancel').click(); assert.ok(u.elements.get('viewDetail').innerHTML.includes('新的合成後續'));
    assert.ok(!u.elements.get('viewDetail').innerHTML.includes('req:' + requestId));
  });
  test('C2 old matching words never count as new readback', async () => {
    const u = loadUi(); render(u); fill(u); const text = u.api.compose.text;
    u.context.fetch = async url => url.endsWith('trace') ? json({ traced: true }) : json({ record: { ...record(), trace_text: record().trace_text + '\n' + text } });
    await u.api.r2SubmitCompose(); assert.ok(u.elements.get('r2TaskView').innerHTML.includes(u.api.copy.unconfirmed));
  });
  test('R2 timeout/response loss uses unconfirmed; retry reuses exact request id/body', async () => {
    const h = storeHarness({ throwAfterWrite: true }); const u = loadUi(); render(u); fill(u);
    const bodies = [];
    u.context.fetch = async (url, init) => {
      if (init.method === 'POST') bodies.push(init.body);
      const route = new URL(url); const result = await h.call(route.pathname + route.search, init.method === 'POST' ? JSON.parse(init.body) : undefined);
      return json(result.body, result.status);
    };
    await u.api.r2SubmitCompose(); assert.ok(u.elements.get('r2TaskView').innerHTML.includes(u.api.copy.unconfirmed));
    h.options.throwAfterWrite = false; await u.elements.get('r2Retry').click();
    assert.ok(u.elements.get('r2TaskView').innerHTML.includes(u.api.copy.success));
    assert.equal(bodies[0], bodies[1]); assert.equal(h.patches, 1);
  });
  test('R2 definite pre-PATCH failure uses exact failed copy', async () => {
    const u = loadUi(); render(u); fill(u); u.context.fetch = async () => json({ state: 'failed' }, 403);
    await u.api.r2SubmitCompose(); assert.ok(u.elements.get('r2TaskView').innerHTML.includes(u.api.copy.failure));
  });
  test('R1 UI single-flight does not POST twice', async () => {
    const u = loadUi(); render(u); fill(u); let release; let count = 0;
    u.context.fetch = async () => { count++; await new Promise(r => { release = r; }); return json({ state: 'unconfirmed' }, 202); };
    const promise = u.api.r2SubmitCompose(); await u.api.r2SubmitCompose(); assert.equal(count, 1); release(); await promise;
  });
  test('D2 new question link carries no old question or record', () => {
    const u = loadUi(); render(u); assert.ok(u.elements.get('viewDetail').innerHTML.includes('href="./index.html?action=divine"'));
  });
  test('R8 list selects last entry first answer, not stamp or delimiter', () => {
    const u = loadUi('index'); const text = 'old\n---\n' + stamp(UUID) + '\n「後來發生什麼？」\nfirst\n\n「現在最卡的是什麼？」\nsecond\n---\n' + stamp(UUID2) + '\n「您做了什麼決定？」\nlatest';
    assert.equal(u.api.r2TraceSummary(text), 'latest');
    const html = u.api.buildR2ListCard({ ...record(), trace_text: text });
    assert.ok(html.includes('latest')); assert.ok(!html.includes('req:')); assert.ok(html.includes('&src=log'));
    assert.ok(u.api.buildR2ListCard({ ...record(), trace_text: null }).includes(u.api.copy.noTrace));
  });
  test('A5 list retry / malformed vs true empty / hidden fupan', async () => {
    const u = loadUi('index'); u.context.fetch = async () => json({}); await u.api.initLogPage();
    assert.ok(u.elements.get('logList').innerHTML.includes(u.api.copy.readError));
    u.context.fetch = async () => json({ records: [], fupan_live_proven: false }); await u.elements.get('r2HistoryRetry').click();
    assert.ok(u.elements.get('logList').innerHTML.includes(u.api.copy.empty));
    assert.equal(u.elements.get('fupanBanner').innerHTML, '');
  });
  test('C1 Worker append two IDs preserves original exact bytes; repeat is idempotent', async () => {
    const h = storeHarness(); const old = h.store.fields.trace_text;
    const a = await h.call('/trace', { log_id: ID, trace_text: 'alpha', request_id: UUID });
    assert.equal(a.status, 200); const first = h.store.fields.trace_text;
    const b = await h.call('/trace', { log_id: ID, trace_text: 'beta', request_id: UUID2 });
    assert.equal(b.status, 200); assert.ok(h.store.fields.trace_text.startsWith(first + '\n---\n'));
    assert.ok(first.startsWith(old + '\n---\n')); assert.match(a.body.entry, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+08:00 · req:/);
    const again = await h.call('/trace', { log_id: ID, trace_text: 'alpha', request_id: UUID });
    assert.equal(again.body.idempotent, true); assert.equal(h.patches, 2);
    for (const call of h.calls.filter(c => c.method === 'PATCH')) assert.deepEqual(Object.keys(JSON.parse(call.body).fields).sort(), ['trace_at', 'trace_text']);
  });
  test('R1 same ID different payload is not a false success', async () => {
    const h = storeHarness(); await h.call('/trace', { log_id: ID, trace_text: 'alpha', request_id: UUID });
    const res = await h.call('/trace', { log_id: ID, trace_text: 'beta', request_id: UUID });
    assert.equal(res.body.state, 'unconfirmed'); assert.equal(h.patches, 1);
  });
  test('R1 one repair uses latest store, bounded to two PATCH attempts', async () => {
    const h = storeHarness({ onGet({ store, patches, gets }) { if (patches === 1 && gets === 2) store.fields.trace_text = 'concurrent entry'; } });
    const res = await h.call('/trace', { log_id: ID, trace_text: 'alpha', request_id: UUID });
    assert.equal(res.body.traced, true); assert.equal(h.patches, 2); assert.ok(h.store.fields.trace_text.startsWith('concurrent entry\n---\n'));
    const fail = storeHarness({ ignorePatch: true }); const no = await fail.call('/trace', { log_id: ID, trace_text: 'alpha', request_id: UUID });
    assert.equal(no.body.state, 'unconfirmed'); assert.equal(fail.patches, 2);
  });
  test('R1 KNOWN_RESIDUAL: later independent overwrite can erase a previously verified entry', async () => {
    const h = storeHarness(); const before = h.store.fields.trace_text;
    const saved = await h.call('/trace', { log_id: ID, trace_text: 'alpha', request_id: UUID }); assert.equal(saved.body.traced, true);
    h.store.fields.trace_text = before + '\n---\n' + stamp(UUID2) + '\nbeta';
    const after = await h.call('/log?log_id=' + ID); assert.ok(!after.body.record.trace_text.includes(UUID));
    // This demonstrates Hub-accepted residual risk; it does not claim cross-device serialization.
  });
  for (const options of [{ patchFail: true }, { verifyFail: true }, { throwAfterWrite: true }]) {
    test('R2 post-PATCH uncertainty ' + Object.keys(options)[0], async () => {
      const h = storeHarness(options); const res = await h.call('/trace', { log_id: ID, trace_text: 'x', request_id: UUID });
      assert.equal(res.body.state, 'unconfirmed'); assert.equal(res.body.traced, undefined);
    });
  }
  for (const [name, body] of [['missing id', { log_id: ID, trace_text: 'x' }], ['bad UUID', { log_id: ID, trace_text: 'x', request_id: 'bad' }],
    ['extra field', { log_id: ID, trace_text: 'x', request_id: UUID, question_text: 'overwrite' }],
    ['empty', { log_id: ID, trace_text: '   ', request_id: UUID }], ['500 limit', { log_id: ID, trace_text: 'x'.repeat(501), request_id: UUID }],
    ['body limit', { log_id: ID, trace_text: 'x'.repeat(5000), request_id: UUID }]]) {
    test('C negative ' + name, async () => { const h = storeHarness(); const res = await h.call('/trace', body); assert.ok(res.status >= 400); assert.equal(h.patches, 0); });
  }
  for (const options of [{ otherOwner: true }, { wrongChannel: true }, { getFail: true }, { getBadJson: true }]) {
    test('C negative ' + Object.keys(options)[0], async () => {
      const h = storeHarness(options); const res = await h.call('/trace', { log_id: ID, trace_text: 'x', request_id: UUID });
      assert.ok(res.status >= 400); assert.equal(h.patches, 0);
    });
  }
  test('C wrong entry type and missing token never write', async () => {
    const h = storeHarness(); h.store.fields.entry_type = 'fupan';
    assert.equal((await h.call('/trace', { log_id: ID, trace_text: 'x', request_id: UUID })).status, 404);
    assert.equal((await h.call('/trace', { log_id: ID, trace_text: 'x', request_id: UUID }, null)).status, 401); assert.equal(h.patches, 0);
  });
  for (const options of [{ historyFail: true }, { historyBadJson: true }, { historyBadShape: true }]) {
    test('R3 history strict ' + Object.keys(options)[0], async () => {
      const res = await storeHarness(options).call('/history'); assert.equal(res.status, 502);
      assert.equal(res.body.state, 'read_error'); assert.equal(res.body.records, undefined);
    });
  }
  test('R3 history genuine empty and server fupan=false; sort retained', async () => {
    const h = storeHarness({ empty: true }); const res = await h.call('/history');
    assert.equal(res.status, 200); assert.deepEqual(res.body.records, []); assert.equal(res.body.fupan_live_proven, false);
    assert.ok(h.calls.some(c => c.query.includes('sort%5B0%5D%5Bfield%5D=qigua_time')));
  });
  test('R3 /log returns exactly two new deep fields, no identities or deep request refs', async () => {
    const h = storeHarness(); Object.assign(h.store.fields, { deep_read_state: 'completed', deep_read_output_json: '<b>result</b>', deep_read_request_id: 'private', deep_read_entitlement_id: 'private' });
    const res = await h.call('/log?log_id=' + ID);
    assert.equal(res.body.record.deep_read_state, 'completed'); assert.equal(res.body.record.deep_read_output_json, '<b>result</b>');
    for (const key of ['line_user_id_raw', 'deep_read_request_id', 'deep_read_entitlement_id']) assert.equal(res.body.record[key], undefined);
  });
  let pass = 0, fail = 0;
  for (const [name, fn] of cases) { try { await fn(); pass++; console.log('[PASS]', name); } catch (e) { fail++; console.log('[FAIL]', name, e.message); } }
  console.log(`R2 PASS=${pass} FAIL=${fail}; SYNTHETIC_VM_AND_MOCK_STORE_ONLY; LIVE_READBACK=NOT_RUN; F=COWORK_PENDING; G=OWNER_PENDING`);
  return fail;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = (await runTests()) ? 1 : 0;
