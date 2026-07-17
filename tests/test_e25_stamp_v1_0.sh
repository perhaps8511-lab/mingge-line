#!/bin/bash
# test_e25_stamp_v1_0.sh — E25② 卦記蓋印(補後續)回歸鉤
# Ref: plans/plan_e25_stamp_v0_1.md(Codex 互審 r1 10 條 BLOCKER 已回應)
# V1(Worker /trace headless 全契約矩陣,Node ESM import 真檔 worker.js;缺檔=FAIL,不可假綠燈)
# V2(log.html 文案逐字唯一定義)
# V3(log.html stamp 函式真執行,含 XSS escaping 斷言,非純 regex)
# 全程假 token / 測試 log_id,不碰真鑰,不打真 Airtable/LINE

set -uo pipefail
PASS=0; FAIL=0

# canonical worker source = repo 內 tracked workers/mingge-relay/worker.js(第 2 輪互審後鎖定路徑,
# 避免「測 A 檔、部署 B 檔」——此檔即 wrangler.toml main= 指向的部署真相源)
IDX="$(dirname "$0")/../log.html"
WORKER="${WORKER_JS_PATH:-$(dirname "$0")/../workers/mingge-relay/worker.js}"

echo "=== V1: Worker /trace headless 全契約矩陣(Node ESM import 真檔) ==="

if [ ! -f "$WORKER" ]; then
  echo "FAIL - worker.js not found at \$WORKER_JS_PATH ($WORKER) — 必要 artifact 缺失,視為 FAIL(不可假綠燈)"
  FAIL=$((FAIL + 1))
else
  NODE_OUT=$(WORKER_PATH="$WORKER" node --input-type=module -e "
import { pathToFileURL } from 'node:url';
const worker = (await import(pathToFileURL(process.env.WORKER_PATH).href)).default;

const OWNER = 'TEST_Uowner0000000000000000000';
const OTHER = 'TEST_Uother0000000000000000000';
const LOG_ID = 'recAAAAAAAAAAAAAA';
const AT_DIV_LOG_FOR_TEST = 'tblVyf8WfTQxvtpEg';

function mockFetch(scenario) {
  return async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('line.me/oauth2')) {
      if (scenario.lineVerifyDown) throw new Error('network down');
      if (scenario.badToken) return { ok: false, status: 401 };
      return { ok: true, json: async () => ({ client_id: '2010192384' }) };
    }
    if (u.includes('line.me/v2/profile')) {
      return { ok: true, json: async () => ({ userId: scenario.callerId, displayName: 'TA' }) };
    }
    if (u.includes('api.airtable.com') && (!opts.method || opts.method === 'GET')) {
      if (scenario.airtableGetNetworkDown) throw new Error('network down');
      if (scenario.recordMissing) return { ok: false, status: 404, text: async () => 'not found' };
      if (scenario.airtableGetNonOk) return { ok: false, status: 500, text: async () => 'server error' };
      if (scenario.airtableGetBadJson) return { ok: true, json: async () => { throw new Error('bad json'); } };
      return {
        ok: true,
        json: async () => ({ id: LOG_ID, fields: { line_user_id_raw: OWNER, entry_type: scenario.entryType ?? 'divination' } })
      };
    }
    if (u.includes('api.airtable.com') && opts.method === 'PATCH') {
      if (scenario.airtablePatchNetworkDown) throw new Error('network down');
      if (scenario.airtablePatchNonOk) return { ok: false, status: 500, text: async () => 'server error' };
      scenario.patchBody = JSON.parse(opts.body);
      return { ok: true, json: async () => ({}) };
    }
    throw new Error('unexpected fetch: ' + u);
  };
}

async function callTraceRaw(scenario, rawBody, headers) {
  globalThis.fetch = mockFetch(scenario);
  const req = new Request('https://mingge-relay.test/trace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: rawBody,
  });
  const env = scenario.noApiKey ? {} : { AIRTABLE_API_KEY: 'fake-key' };
  return worker.fetch(req, env);
}
function callTrace(scenario, body, headers) {
  return callTraceRaw(scenario, JSON.stringify(body), headers);
}

const results = [];

// case1: 合法請求 → 200,PATCH body 含 trace_text+trace_at
{
  const scenario = { callerId: OWNER };
  const res = await callTrace(scenario, { log_id: LOG_ID, trace_text: '後來去談了,結果不錯。' }, { 'X-Line-AccessToken': 'tok' });
  const data = await res.json();
  results.push(['case1 200', res.status === 200]);
  results.push(['case1 traced=true', data.traced === true]);
  results.push(['case1 PATCH has trace_text', scenario.patchBody?.fields?.trace_text === '後來去談了,結果不錯。']);
  results.push(['case1 PATCH has trace_at ISO', typeof scenario.patchBody?.fields?.trace_at === 'string' && !Number.isNaN(Date.parse(scenario.patchBody.fields.trace_at))]);
}

// case2: 他人 log_id → 403
{
  const scenario = { callerId: OTHER };
  const res = await callTrace(scenario, { log_id: LOG_ID, trace_text: 'x' }, { 'X-Line-AccessToken': 'tok' });
  results.push(['case2 403 (他人 log_id)', res.status === 403]);
}

// case3: 缺 token → 401
{
  const scenario = { callerId: OWNER };
  const res = await callTrace(scenario, { log_id: LOG_ID, trace_text: 'x' }, {});
  results.push(['case3 401 (缺 token)', res.status === 401]);
}

// case4: trace_text 超過 500 字(.length,UTF-16 code units)→ 400
{
  const scenario = { callerId: OWNER };
  const longText = 'x'.repeat(501);
  const res = await callTrace(scenario, { log_id: LOG_ID, trace_text: longText }, { 'X-Line-AccessToken': 'tok' });
  results.push(['case4 400 (>500 chars)', res.status === 400]);
}
// case4b: 剛好 500 字 → 200(邊界)
{
  const scenario = { callerId: OWNER };
  const exactText = 'x'.repeat(500);
  const res = await callTrace(scenario, { log_id: LOG_ID, trace_text: exactText }, { 'X-Line-AccessToken': 'tok' });
  results.push(['case4b 200 (==500 chars boundary)', res.status === 200]);
}

// case5: 多餘欄位 → 400
{
  const scenario = { callerId: OWNER };
  const res = await callTrace(scenario, { log_id: LOG_ID, trace_text: 'x', extra: 1 }, { 'X-Line-AccessToken': 'tok' });
  results.push(['case5 400 (extra field)', res.status === 400]);
}

// case6: OPTIONS → 204 + CORS headers
{
  const req = new Request('https://mingge-relay.test/trace', { method: 'OPTIONS' });
  const res = await worker.fetch(req, { AIRTABLE_API_KEY: 'fake-key' });
  results.push(['case6 204', res.status === 204]);
  results.push(['case6 CORS allow-origin', res.headers.get('Access-Control-Allow-Origin') === 'https://perhaps8511-lab.github.io']);
  results.push(['case6 CORS allow-methods', (res.headers.get('Access-Control-Allow-Methods') || '').includes('POST')]);
  results.push(['case6 CORS allow-headers', (res.headers.get('Access-Control-Allow-Headers') || '').includes('X-Line-AccessToken')]);
}

// case7: log_id 格式不符 → 400
{
  const scenario = { callerId: OWNER };
  const res = await callTrace(scenario, { log_id: 'not-a-rec-id', trace_text: 'x' }, { 'X-Line-AccessToken': 'tok' });
  results.push(['case7 400 (bad log_id)', res.status === 400]);
}

// case8: trace_text 空白(trim 後空) → 400
{
  const scenario = { callerId: OWNER };
  const res = await callTrace(scenario, { log_id: LOG_ID, trace_text: '   ' }, { 'X-Line-AccessToken': 'tok' });
  results.push(['case8 400 (blank trace_text)', res.status === 400]);
}

// case9: 非 application/json Content-Type → 400
{
  const scenario = { callerId: OWNER };
  globalThis.fetch = mockFetch(scenario);
  const req = new Request('https://mingge-relay.test/trace', {
    method: 'POST', headers: { 'Content-Type': 'text/plain', 'X-Line-AccessToken': 'tok' },
    body: JSON.stringify({ log_id: LOG_ID, trace_text: 'x' }),
  });
  const res = await worker.fetch(req, { AIRTABLE_API_KEY: 'fake-key' });
  results.push(['case9 400 (bad content-type)', res.status === 400]);
}

// case10: 壞 JSON body → 400
{
  const scenario = { callerId: OWNER };
  const res = await callTraceRaw(scenario, '{not valid json', { 'X-Line-AccessToken': 'tok' });
  results.push(['case10 400 (malformed json)', res.status === 400]);
}

// case11: body 超過位元組上限 → 413(第 2 輪互審後改真 chunked stream,12×1024 bytes,
// 驗證是邊讀邊擋、非讀完全部才檢查——用自訂 ReadableStream 逐塊 enqueue)
{
  const scenario = { callerId: OWNER };
  globalThis.fetch = mockFetch(scenario);
  let chunksConsumedBeforeCutoff = 0;
  const totalChunks = 12;
  const stream = new ReadableStream({
    async pull(controller) {
      if (chunksConsumedBeforeCutoff >= totalChunks) {
        controller.close();
        return;
      }
      chunksConsumedBeforeCutoff++;
      controller.enqueue(new TextEncoder().encode('x'.repeat(1024)));
    }
  });
  const req = new Request('https://mingge-relay.test/trace', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Line-AccessToken': 'tok' },
    body: stream,
    duplex: 'half',
  });
  const res = await worker.fetch(req, { AIRTABLE_API_KEY: 'fake-key' });
  results.push(['case11 413 (oversized chunked body)', res.status === 413]);
  results.push(['case11 stopped reading before all 12 chunks consumed', chunksConsumedBeforeCutoff < totalChunks]);
}

// case12: 缺 log_id → 400
{
  const scenario = { callerId: OWNER };
  const res = await callTrace(scenario, { trace_text: 'x' }, { 'X-Line-AccessToken': 'tok' });
  results.push(['case12 400 (missing log_id)', res.status === 400]);
}

// case13: AIRTABLE_API_KEY 未配置 → 503
{
  const scenario = { callerId: OWNER, noApiKey: true };
  const res = await callTrace(scenario, { log_id: LOG_ID, trace_text: 'x' }, { 'X-Line-AccessToken': 'tok' });
  results.push(['case13 503 (no api key)', res.status === 503]);
}

// case14: LINE verify 401(真無效 token)→ 401
{
  const scenario = { callerId: OWNER, badToken: true };
  const res = await callTrace(scenario, { log_id: LOG_ID, trace_text: 'x' }, { 'X-Line-AccessToken': 'tok' });
  results.push(['case14 401 (invalid token)', res.status === 401]);
}

// case15: LINE verify network down(非 token 本身無效)→ 非 2xx,不得靜默當作成功
{
  const scenario = { callerId: OWNER, lineVerifyDown: true };
  const res = await callTrace(scenario, { log_id: LOG_ID, trace_text: 'x' }, { 'X-Line-AccessToken': 'tok' });
  results.push(['case15 4xx/5xx (LINE upstream down, not 2xx)', res.status >= 400]);
}

// case16: Airtable GET record 404 → 404
{
  const scenario = { callerId: OWNER, recordMissing: true };
  const res = await callTrace(scenario, { log_id: LOG_ID, trace_text: 'x' }, { 'X-Line-AccessToken': 'tok' });
  results.push(['case16 404 (record missing)', res.status === 404]);
}

// case17: Airtable GET network down → 502
{
  const scenario = { callerId: OWNER, airtableGetNetworkDown: true };
  const res = await callTrace(scenario, { log_id: LOG_ID, trace_text: 'x' }, { 'X-Line-AccessToken': 'tok' });
  results.push(['case17 502 (airtable GET network down)', res.status === 502]);
}

// case18: Airtable GET non-ok(非404)→ 502
{
  const scenario = { callerId: OWNER, airtableGetNonOk: true };
  const res = await callTrace(scenario, { log_id: LOG_ID, trace_text: 'x' }, { 'X-Line-AccessToken': 'tok' });
  results.push(['case18 502 (airtable GET 500)', res.status === 502]);
}

// case19: Airtable GET 回壞 JSON → 502
{
  const scenario = { callerId: OWNER, airtableGetBadJson: true };
  const res = await callTrace(scenario, { log_id: LOG_ID, trace_text: 'x' }, { 'X-Line-AccessToken': 'tok' });
  results.push(['case19 502 (airtable GET bad json)', res.status === 502]);
}

// case20: Airtable PATCH network down → 502
{
  const scenario = { callerId: OWNER, airtablePatchNetworkDown: true };
  const res = await callTrace(scenario, { log_id: LOG_ID, trace_text: 'x' }, { 'X-Line-AccessToken': 'tok' });
  results.push(['case20 502 (airtable PATCH network down)', res.status === 502]);
}

// case21: Airtable PATCH non-ok → 502
{
  const scenario = { callerId: OWNER, airtablePatchNonOk: true };
  const res = await callTrace(scenario, { log_id: LOG_ID, trace_text: 'x' }, { 'X-Line-AccessToken': 'tok' });
  results.push(['case21 502 (airtable PATCH 500)', res.status === 502]);
}

// case22: 該筆記錄 entry_type 非 divination(如 mood)→ 404(不得寫入非卦記類型)
{
  const scenario = { callerId: OWNER, entryType: 'mood' };
  const res = await callTrace(scenario, { log_id: LOG_ID, trace_text: 'x' }, { 'X-Line-AccessToken': 'tok' });
  results.push(['case22 404 (non-divination entry_type)', res.status === 404]);
}

// case22b: GET /study 仍向 Airtable 查詢 featured 欄且原樣回傳(第 2 輪互審 BLOCKER:
// canonical source 曾缺此欄,與 live drift,已同步修復,此案防再度漂移)
{
  let requestedFields = null;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('api.airtable.com')) {
      requestedFields = new URL(u).searchParams.getAll('fields[]');
      return { ok: true, json: async () => ({ records: [{ fields: { title: 'X', featured: true } }] }) };
    }
    throw new Error('unexpected fetch: ' + u);
  };
  const req = new Request('https://mingge-relay.test/study');
  const res = await worker.fetch(req, { AIRTABLE_API_KEY: 'fake-key' });
  const data = await res.json();
  results.push(['case22b /study query includes featured field', requestedFields?.includes('featured')]);
  results.push(['case22b /study response passthrough featured', data.articles?.[0]?.featured === true]);
}

// case23: GET /log 回傳含 trace_text/trace_at 欄位(白名單追加驗證)
{
  const scenario = { callerId: OWNER };
  globalThis.fetch = mockFetch(scenario);
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('line.me/oauth2')) return { ok: true, json: async () => ({ client_id: '2010192384' }) };
    if (u.includes('line.me/v2/profile')) return { ok: true, json: async () => ({ userId: OWNER, displayName: 'TA' }) };
    if (u.includes('api.airtable.com')) {
      return { ok: true, json: async () => ({ id: LOG_ID, fields: { line_user_id_raw: OWNER, trace_text: '後來去談了。', trace_at: '2026-07-11T09:00:00.000Z' } }) };
    }
    throw new Error('unexpected fetch: ' + u);
  };
  const req = new Request('https://mingge-relay.test/log?log_id=' + LOG_ID, { headers: { 'X-Line-AccessToken': 'tok' } });
  const res = await worker.fetch(req, { AIRTABLE_API_KEY: 'fake-key' });
  const data = await res.json();
  results.push(['case23 /log passthrough trace_text', data.record?.trace_text === '後來去談了。']);
  results.push(['case23 /log passthrough trace_at', data.record?.trace_at === '2026-07-11T09:00:00.000Z']);
  globalThis.fetch = origFetch;
}

// case24: GET /history 回傳含 trace_text/trace_at 欄位(白名單追加驗證,第 2 輪互審後補)
{
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('line.me/oauth2')) return { ok: true, json: async () => ({ client_id: '2010192384' }) };
    if (u.includes('line.me/v2/profile')) return { ok: true, json: async () => ({ userId: OWNER, displayName: 'TA' }) };
    if (u.includes('api.airtable.com') && u.includes(AT_DIV_LOG_FOR_TEST)) {
      return { ok: true, json: async () => ({ records: [{ id: LOG_ID, fields: { line_user_id_raw: OWNER, trace_text: '後來去談了。', trace_at: '2026-07-11T09:00:00.000Z' } }] }) };
    }
    if (u.includes('api.airtable.com')) {
      return { ok: true, json: async () => ({ records: [] }) };
    }
    throw new Error('unexpected fetch: ' + u);
  };
  const req = new Request('https://mingge-relay.test/history', { headers: { 'X-Line-AccessToken': 'tok' } });
  const res = await worker.fetch(req, { AIRTABLE_API_KEY: 'fake-key' });
  const data = await res.json();
  const rec = (data.records || [])[0];
  results.push(['case24 /history passthrough trace_text', rec?.trace_text === '後來去談了。']);
  results.push(['case24 /history passthrough trace_at', rec?.trace_at === '2026-07-11T09:00:00.000Z']);
}

for (const [name, ok] of results) {
  console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name);
}
if (results.length < 20) {
  console.log('FAIL - test matrix regressed: expected >=20 cases, got ' + results.length);
  process.exit(1);
}
process.exit(results.every(r => r[1]) ? 0 : 1);
" 2>&1)
  NODE_EXIT=$?
  echo "$NODE_OUT"
  PASS=$((PASS + $(echo "$NODE_OUT" | grep -c '^PASS')))
  FAIL=$((FAIL + $(echo "$NODE_OUT" | grep -c '^FAIL')))
  if [ "$NODE_EXIT" -ne 0 ] && ! echo "$NODE_OUT" | grep -q '^FAIL'; then
    echo "FAIL - V1 node process crashed (exit $NODE_EXIT) with no FAIL lines emitted — treating as hard failure"
    FAIL=$((FAIL + 1))
  fi
fi

echo ""
echo "=== V2: log.html 文案逐字唯一定義(每條字面全檔恰好一次) ==="

NODE_OUT2=$(node --input-type=module -e "
import fs from 'node:fs';
const src = fs.readFileSync('$IDX', 'utf8');

const copyLines = [
  '補後續 · 蓋金印',
  '蓋下金印',
  '已蓋印。這一卦,有了後續。',
  '金印 · 已補後續',
  '當時所問的事,後來往哪邊走了 —— 一兩句即可。',
];

const results = [];
for (const line of copyLines) {
  const re = new RegExp(line.replace(/[.*+?^\${}()|[\]\\\\]/g, '\\\\\$&'), 'g');
  const count = (src.match(re) || []).length;
  results.push(['copy exactly once: ' + line, count === 1]);
}

results.push(['success card uses existing paper token', src.includes('.stamp-success-card{') && src.includes('background:var(--paper-card)')]);
results.push(['saved badge >=20px deep ink and bold', src.includes('font-family:var(--serif);font-size:20px;color:var(--ink)') && src.includes('margin-bottom:10px;font-weight:700')]);
results.push(['completion copy >=17px', src.includes('.stamp-toast{') && src.includes('font-family:var(--serif);font-size:17px;line-height:1.7')]);
results.push(['trace text >=20px with 1.8 line-height', src.includes('.stamp-trace-text{font-family:var(--serif);font-size:20px;line-height:1.8;color:var(--ink)')]);
results.push(['deepdive CTA approved copy unchanged', (src.match(/四鏡·深卜 200/g) || []).length === 1]);

for (const [name, ok] of results) {
  console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name);
}
process.exit(results.every(r => r[1]) ? 0 : 1);
" 2>&1)
NODE_EXIT2=$?
echo "$NODE_OUT2"
PASS=$((PASS + $(echo "$NODE_OUT2" | grep -c '^PASS')))
FAIL=$((FAIL + $(echo "$NODE_OUT2" | grep -c '^FAIL')))
if [ "$NODE_EXIT2" -ne 0 ] && ! echo "$NODE_OUT2" | grep -q '^FAIL'; then
  echo "FAIL - V2 node process crashed (exit $NODE_EXIT2) with no FAIL lines emitted — treating as hard failure"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=== V3: log.html stamp 函式真執行(vm,非純 regex)+ XSS escaping 斷言 ==="

NODE_OUT3=$(node --input-type=module -e "
import vm from 'node:vm';
import fs from 'node:fs';
const src = fs.readFileSync('$IDX', 'utf8');

function extractFn(name) {
  const re = new RegExp('(async )?function ' + name + '\\\\([^)]*\\\\)\\\\s*\\\\{[\\\\s\\\\S]*?\\\\n\\\\}');
  const m = src.match(re);
  if (!m) throw new Error('extractFn miss: ' + name);
  return m[0];
}
function extractLet(name) {
  const re = new RegExp('let ' + name + ' = .*?;');
  const m = src.match(re);
  if (!m) throw new Error('extractLet miss: ' + name);
  return m[0];
}
const code = [
  extractLet('stampState'),
  extractFn('esc'), extractFn('textToHtml'),
  extractFn('formatTraceAt'),
  extractFn('buildStampBadgeHtml'), extractFn('buildStampSectionHtml'),
  extractFn('openStampModal'), extractFn('closeStampModal'),
  extractFn('submitStamp'), extractFn('renderStampResult'),
  'globalThis.__formatTraceAt = formatTraceAt;',
  'globalThis.__buildStampBadgeHtml = buildStampBadgeHtml;',
  'globalThis.__buildStampSectionHtml = buildStampSectionHtml;',
  'globalThis.__openStampModal = openStampModal;',
  'globalThis.__submitStamp = submitStamp;',
  'globalThis.__setStampState = (s) => { stampState = s; };',
].join('\\n\\n');

function makeFakeDom() {
  const sections = new Map(); // btnId -> section fake el
  function makeSection() {
    const sec = { _html: '' };
    Object.defineProperty(sec, 'innerHTML', {
      get() { return sec._html; },
      set(v) { sec._html = v; },
    });
    return sec;
  }
  const openBtnSection = makeSection();
  const els = {
    stampOverlay: { _classes: new Set(), classList: { add(c){ this._classes = this._classes || new Set(); els.stampOverlay._classes.add(c); }, remove(c){ els.stampOverlay._classes.delete(c); } } },
    stampTextarea: { value: '', focus(){} },
    stampConfirmBtn: { disabled: false },
    stampOpenBtn: { closest(sel) { return sel === '.section' ? openBtnSection : null; } },
  };
  const doc = { getElementById(id) { return els[id] || null; } };
  return { doc, els, openBtnSection };
}

const RELAY_URL = 'https://mingge-relay.test/';
const results = [];

function buildCtx(fetchImpl) {
  const { doc, els, openBtnSection } = makeFakeDom();
  const ctx = { console, document: doc, fetch: fetchImpl, RELAY_URL, JSON };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return { ctx, els, openBtnSection };
}

// 未蓋印 → 入口按鈕,無常駐標示
{
  const { ctx } = buildCtx(async () => ({ ok: true, json: async () => ({}) }));
  const noTrace = ctx.__buildStampSectionHtml({});
  results.push(['no trace_text => shows entry button', noTrace.includes('stampOpenBtn') && noTrace.includes('補後續 · 蓋金印')]);
  results.push(['no trace_text => no badge', !noTrace.includes('stamp-badge')]);
}

// 已蓋印 → 常駐標示,無入口按鈕(互斥)
{
  const { ctx } = buildCtx(async () => ({ ok: true, json: async () => ({}) }));
  const withTrace = ctx.__buildStampSectionHtml({ trace_text: '後來順利談成了。', trace_at: '2026-07-11T09:00:00.000Z' });
  results.push(['has trace_text => shows badge', withTrace.includes('stamp-badge') && withTrace.includes('金印 · 已補後續')]);
  results.push(['has trace_text => no entry button', !withTrace.includes('stampOpenBtn')]);
  results.push(['has trace_text => renders content', withTrace.includes('後來順利談成了。')]);
  results.push(['reload trace_at => Asia/Taipei YYYY/MM/DD HH:mm', withTrace.includes('保存時間｜2026/07/11 17:00')]);
}

// trace_at 缺漏或無效 → 安全降級,不得顯示 Invalid Date
{
  const { ctx } = buildCtx(async () => ({ ok: true, json: async () => ({}) }));
  const missingAt = ctx.__buildStampSectionHtml({ trace_text: '後來順利談成了。' });
  const invalidAt = ctx.__buildStampSectionHtml({ trace_text: '後來順利談成了。', trace_at: 'not-a-date' });
  results.push(['missing trace_at => no time row', !missingAt.includes('stamp-trace-time') && !missingAt.includes('Invalid Date')]);
  results.push(['invalid trace_at => no invalid date', !invalidAt.includes('stamp-trace-time') && !invalidAt.includes('Invalid Date')]);
}

// submitStamp 成功轉態:renderStampResult 真執行,section innerHTML 換成常駐態
{
  const traceText = '後來去談了,結果不錯。';
  const traceAt = '2026-07-11T09:00:00.000Z';
  const { ctx, els, openBtnSection } = buildCtx(async () => ({ ok: true, json: async () => ({ trace_text: traceText, trace_at: traceAt }) }));
  ctx.__setStampState({ logId: 'recAAAAAAAAAAAAAA', token: 'tok' });
  els.stampTextarea.value = traceText;
  await ctx.__submitStamp();
  results.push(['submitStamp success => badge rendered', openBtnSection.innerHTML.includes('金印 · 已補後續')]);
  results.push(['submitStamp success => toast rendered', openBtnSection.innerHTML.includes('已蓋印。這一卦,有了後續。')]);
  results.push(['submitStamp success => Taipei time rendered', openBtnSection.innerHTML.includes('保存時間｜2026/07/11 17:00')]);
  results.push(['submitStamp and reload share identical success card', openBtnSection.innerHTML === ctx.__buildStampBadgeHtml(traceText, traceAt)]);
  results.push(['submitStamp success => modal closed', !els.stampOverlay._classes.has('open')]);
}

// submitStamp fetch reject(network down)→ 保留入口按鈕、按鈕重新啟用,不寫入常駐態
{
  const { ctx, els, openBtnSection } = buildCtx(async () => { throw new Error('network down'); });
  ctx.__setStampState({ logId: 'recAAAAAAAAAAAAAA', token: 'tok' });
  els.stampTextarea.value = '後來去談了。';
  await ctx.__submitStamp();
  results.push(['submitStamp network error => no badge written', openBtnSection.innerHTML === '']);
  results.push(['submitStamp network error => confirm button re-enabled', els.stampConfirmBtn.disabled === false]);
}

// submitStamp 非 200 → 同上,保留入口、重新啟用
{
  const { ctx, els, openBtnSection } = buildCtx(async () => ({ ok: false, status: 502 }));
  ctx.__setStampState({ logId: 'recAAAAAAAAAAAAAA', token: 'tok' });
  els.stampTextarea.value = '後來去談了。';
  await ctx.__submitStamp();
  results.push(['submitStamp non-200 => no badge written', openBtnSection.innerHTML === '']);
  results.push(['submitStamp non-200 => confirm button re-enabled', els.stampConfirmBtn.disabled === false]);
}

// submitStamp 回 200 但契約不合(缺 trace_text 字串)→ 視為失敗,不寫常駐態
{
  const { ctx, els, openBtnSection } = buildCtx(async () => ({ ok: true, json: async () => ({ traced: true }) }));
  ctx.__setStampState({ logId: 'recAAAAAAAAAAAAAA', token: 'tok' });
  els.stampTextarea.value = '後來去談了。';
  await ctx.__submitStamp();
  results.push(['submitStamp bad contract => no badge written', openBtnSection.innerHTML === '']);
  results.push(['submitStamp bad contract => confirm button re-enabled', els.stampConfirmBtn.disabled === false]);
}

// XSS:trace_text 含惡意標記,輸出必須逐字轉義,不得原樣輸出可執行標籤
{
  const { ctx } = buildCtx(async () => ({ ok: true, json: async () => ({}) }));
  const xssPayload = '<script>alert(1)</script><img src=x onerror=alert(2)>';
  const xssOut = ctx.__buildStampSectionHtml({ trace_text: xssPayload });
  results.push(['XSS payload not raw <script> tag', !xssOut.includes('<script>alert(1)</script>')]);
  results.push(['XSS payload img tag escaped (no raw <img)', !xssOut.includes('<img')]);
  results.push(['XSS payload escaped to &lt;script&gt;', xssOut.includes('&lt;script&gt;')]);
}

for (const [name, ok] of results) {
  console.log((ok ? 'PASS' : 'FAIL') + ' - ' + name);
}
process.exit(results.every(r => r[1]) ? 0 : 1);
" 2>&1)
NODE_EXIT3=$?
echo "$NODE_OUT3"
PASS=$((PASS + $(echo "$NODE_OUT3" | grep -c '^PASS')))
FAIL=$((FAIL + $(echo "$NODE_OUT3" | grep -c '^FAIL')))
if [ "$NODE_EXIT3" -ne 0 ] && ! echo "$NODE_OUT3" | grep -q '^FAIL'; then
  echo "FAIL - V3 node process crashed (exit $NODE_EXIT3) with no FAIL lines emitted — treating as hard failure"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "=== 總結: PASS=$PASS FAIL=$FAIL ==="
[ "$FAIL" -eq 0 ]
