// GET /artifacts 行為測試 —— 實跑 worker fetch handler，證明「讀到零筆」與「讀取失敗」是兩件事。
// 以 stub 取代 global fetch，不連 Airtable、不需要金鑰。
import worker from '../workers/mingge-relay/worker.js';

let pass = 0, fail = 0;
const check = (c, id, d) => { console.log(`${c ? '[PASS]' : '[FAIL]'} ${id} ${d}`); c ? pass++ : fail++; };
const realFetch = globalThis.fetch;
const req = () => new Request('https://relay.test/artifacts', { method: 'GET' });

async function run(env, stub) {
  globalThis.fetch = stub;
  try { const res = await worker.fetch(req(), env); return { status: res.status, body: await res.json() }; }
  finally { globalThis.fetch = realFetch; }
}
const airtableOk = (records) => async () => new Response(JSON.stringify({ records }), { status: 200, headers: { 'Content-Type': 'application/json' } });
const airtableStatus = (status) => async () => new Response('upstream said no', { status });
const airtableThrows = () => async () => { throw new Error('boom'); };

const publishable = {
  fields: {
    artifact_id: 'TESTPUB1', title_mingge: '測試品',
    actual_photos: [{ url: 'https://own.cdn/test.jpg' }],
    price_mingge_twd: 6800, price_band: '6000_14999',
    inventory_model: 'unique_item', unknowns: '來源年代未經第三方鑑定。',
    publish_blocked: 'PUBLISHABLE',
  },
};
const blocked = { fields: { artifact_id: 'TESTBLK1', publish_blocked: 'BLOCKED' } };

// 1) 讀取成功但零筆
{
  const r = await run({ AIRTABLE_API_KEY: 'k' }, airtableOk([]));
  check(r.status === 200, 'EP1a', `零筆 → HTTP 200（實得 ${r.status}）`);
  check(r.body.state === 'ok', 'EP1b', `零筆 → state="ok"（實得 ${r.body.state}）`);
  check(Array.isArray(r.body.items) && r.body.items.length === 0, 'EP1c', '零筆 → items=[]');
}
// 2) 讀到資料但全部 BLOCKED → 仍是 ok + 空
{
  const r = await run({ AIRTABLE_API_KEY: 'k' }, airtableOk([blocked]));
  check(r.status === 200 && r.body.state === 'ok' && r.body.items.length === 0, 'EP2', 'BLOCKED 列被擋掉 → ok + 空清單（非 read_error）');
}
// 3) 缺金鑰
{
  const r = await run({}, airtableOk([publishable]));
  check(r.status === 503 && r.body.state === 'read_error' && r.body.reason === 'credential_unavailable', 'EP3', `缺金鑰 → 503 read_error/credential_unavailable（實得 ${r.status}/${r.body.state}）`);
  check(r.body.items.length === 0, 'EP3b', '缺金鑰不得回任何商品');
}
// 4) 權限不足
for (const s of [401, 403]) {
  const r = await run({ AIRTABLE_API_KEY: 'k' }, airtableStatus(s));
  check(r.status === 503 && r.body.state === 'read_error' && r.body.reason === 'permission_denied', 'EP4-' + s, `Airtable ${s} → 503 read_error/permission_denied`);
}
// 5) 上游 5xx
{
  const r = await run({ AIRTABLE_API_KEY: 'k' }, airtableStatus(500));
  check(r.status === 503 && r.body.state === 'read_error' && r.body.reason === 'upstream_error', 'EP5', 'Airtable 500 → 503 read_error/upstream_error');
}
// 6) 網路失敗
{
  const r = await run({ AIRTABLE_API_KEY: 'k' }, airtableThrows());
  check(r.status === 503 && r.body.state === 'read_error' && r.body.reason === 'upstream_unreachable', 'EP6', '網路失敗 → 503 read_error/upstream_unreachable');
}
// 7) 讀取失敗一律不外洩上游原文/金鑰
{
  const r = await run({ AIRTABLE_API_KEY: 'SECRET-KEY-VALUE' }, airtableStatus(403));
  const raw = JSON.stringify(r.body);
  check(!raw.includes('SECRET-KEY-VALUE') && !raw.includes('upstream said no'), 'EP7', 'read_error 回應不含金鑰、不含 Airtable 原始回應');
}
// 8) 有可上架列 → ok + 只回白名單欄位
{
  const r = await run({ AIRTABLE_API_KEY: 'k' }, airtableOk([publishable, blocked]));
  check(r.status === 200 && r.body.state === 'ok' && r.body.items.length === 1, 'EP8a', '1 筆 PUBLISHABLE + 1 筆 BLOCKED → 只回 1 筆');
  const it = r.body.items[0];
  check(it.artifact_id === 'TESTPUB1' && it.photo_url === 'https://own.cdn/test.jpg' && it.price_mingge_twd === 6800, 'EP8b', '欄位映射正確');
  for (const internal of ['sku_source_ref', 'unverified_factual_claims', 'supplier_facts_note', 'data_state', 'evidence_grade', 'publish_block_reasons'])
    check(!(internal in it), 'EP8c-' + internal, `內部欄位「${internal}」未外流`);
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail === 0 ? 0 : 1);
