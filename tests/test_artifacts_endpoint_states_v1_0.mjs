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
const firstBatchLegacyPass = { fields: { ...publishable.fields, artifact_id: 'XTVSSPvA' } };

// 1) 讀取成功但零筆
{
  const r = await run({ AIRTABLE_API_KEY: 'k' }, airtableOk([]));
  check(r.status === 200, 'EP1a', `零筆 → HTTP 200（實得 ${r.status}）`);
  check(r.body.state === 'ok', 'EP1b', `零筆 → state="ok"（實得 ${r.body.state}）`);
  check(Array.isArray(r.body.items) && r.body.items.length === 0, 'EP1c', '零筆 → items=[]');
  check(r.body.catalog_state === 'empty' && r.body.published_count === 0 && r.body.gate === 'publication_state', 'EP1d', 'catalog state 由 published_count=0 衍生');
}
// 2) 讀到資料但全部 BLOCKED → 仍是 ok + 空
{
  const r = await run({ AIRTABLE_API_KEY: 'k' }, airtableOk([blocked]));
  check(r.status === 200 && r.body.state === 'ok' && r.body.items.length === 0, 'EP2', 'BLOCKED 列被擋掉 → ok + 空清單（非 read_error）');
}
// 3) 缺金鑰
{
  const r = await run({}, airtableOk([publishable]));
  check(r.status === 503 && r.body.state === 'read_error' && r.body.catalog_state === 'read_error' && r.body.reason === 'credential_unavailable', 'EP3', `缺金鑰 → 503 read_error/credential_unavailable（實得 ${r.status}/${r.body.state}）`);
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
// 8) legacy PUBLISHABLE 不得自動升格 published
{
  const r = await run({ AIRTABLE_API_KEY: 'k' }, airtableOk([publishable, blocked]));
  check(r.status === 200 && r.body.state === 'ok' && r.body.catalog_state === 'empty' && r.body.items.length === 0, 'EP8a', '未知 SKU 即使 legacy PUBLISHABLE 仍 fail closed');
  check(r.body.published_count === 0, 'EP8b', 'published count 不採信 legacy formula');
}
// 9) first batch 明列 needs_supplier，即使 legacy gate 通過仍不得公開
{
  const r = await run({ AIRTABLE_API_KEY: 'k' }, airtableOk([firstBatchLegacyPass]));
  check(r.status === 200 && r.body.catalog_state === 'empty' && r.body.items.length === 0, 'EP9a', 'XTVSSPvA needs_supplier → empty');
  const raw = JSON.stringify(r.body);
  for (const internal of ['pending_source', 'source_category', 'current_offer_price_twd', 'evidence_refs'])
    check(!raw.includes(internal), 'EP9b-' + internal, `internal publication 欄位「${internal}」未外流`);
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail === 0 ? 0 : 1);
