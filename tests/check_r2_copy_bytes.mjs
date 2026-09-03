import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { loadUi, record } from './test_r2_delayed_return_v1_0.mjs';

const read = p => fs.readFileSync(new URL('../' + p, import.meta.url));
const cardBytes = read('governance/cards/DISPATCH_MINGGE_V1_2_RC1_SLICE_A_R2_DELAYED_RETURN_20260903.md');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(cardBytes), 'feaf48fb9a2f85fea5000614d6f555dceb8199cadac8de685b6e95e81020b801');
const card = cardBytes.toString('utf8');
const plan = read('governance/plans/plan_r2_delayed_return_v0_1.md').toString('utf8');
const review = plan.split('<!-- HUB_REVIEW_SOURCE_BEGIN -->\n')[1].split('\n<!-- HUB_REVIEW_SOURCE_END -->')[0];
assert.equal(hash(review), 'c1693af3a7e2f07cb7bfb51b395377ab5944d0355ceb11568914b4214a9197e0');
const section = n => card.split(`### 2.${n} `)[1].split(`### 2.${n + 1} `)[0];
const sourceLine = (source, prefix) => {
  const line = source.split(/\r?\n/).find(line => line.startsWith(prefix));
  assert.ok(line, 'missing source anchor: ' + prefix); return line;
};
const after = (source, prefix) => sourceLine(source, prefix).slice(prefix.length).trim();
const expected = {
  heading: sourceLine(section(1), '這次回來'),
  actions: section(1).split(/\r?\n/).filter(x => x.startsWith('- ')).map(x => x.slice(2).split(/ {2,}/)),
  comparison: ['補記後續', '四鏡・深卜', '複盤'].map(title => {
    const group = section(2).split(/\r?\n/); const i = group.findIndex(x => x.startsWith(title));
    assert.ok(i >= 0); return { title, rows: group.slice(i + 1, i + 4), button: group[i + 4].replace(/^按鈕：/, '') };
  }),
  compareTitle: section(2).match(/^「([^」]+)」/)[1],
  compareTail: sourceLine(section(2), '三個都不是'),
  backList: sourceLine(section(1), 'safe exit label').match(/`([^`]+)`/)[1],
  title: after(section(3), '【標題】'),
  questions: section(3).split(/\r?\n/).filter(line => /^(後來發生|您做了|現在最卡)/.test(line)),
  note: sourceLine(section(3), '這一筆留在'),
  save: after(section(3), '【Primary】'),
  cancel: after(section(3), '【Safe exit】').split(/\s+/)[0],
  backRecord: after(section(3), '【Safe exit】').split('→')[1].trim(),
  success: after(section(3), '【成功（readback PASS 後）】').split(/ {2,}/)[0],
  failure: after(section(3), '【失敗（write 或 readback FAIL）】').split(/ {2,}/)[0],
  retry: sourceLine(section(4), '[ 再試一次').match(/^\[ (.+?) \]/)[1],
  home: sourceLine(section(4), '[ 再試一次').match(/\[ ([^\]]+) \]$/)[1],
  divine: sourceLine(section(4), '[ 向天問卦').match(/^\[ (.+?) \]/)[1],
  empty: sourceLine(section(4), '您還沒有'),
  readError: sourceLine(section(4), '目前讀取'),
  noTrace: sourceLine(section(5), '最近一次後續：').split('← 無後續時顯示：')[1],
  originalDate: sourceLine(section(5), '原始日期：').split('{')[0],
  recentTrace: sourceLine(section(5), '最近一次後續：').split('{')[0],
  view: sourceLine(section(5), '[ 看這一卦').match(/^\[ (.+?) \]/)[1],
  pending: review.split('【R6-P｜深卜 pending】\n')[1].split('\n')[0],
  deepError: review.split('【R6-F｜深卜 failed／unknown／缺結果】\n')[1].split('\n')[0],
  unconfirmed: review.split('【R6-U｜補記結果不明（unconfirmed）】\n')[1].split('\n')[0],
  support: review.match(/\[ (書僮客服) \]/)[1],
};
let pass = 0;
const same = (actual, wanted, name) => {
  assert.deepEqual(Buffer.from(typeof actual === 'string' ? actual : JSON.stringify(actual)),
    Buffer.from(typeof wanted === 'string' ? wanted : JSON.stringify(wanted)), name);
  pass++;
};
const escaped = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
for (const page of ['log', 'index']) {
  const u = loadUi(page);
  for (const [key, value] of Object.entries(expected)) same(u.api.copy[key], value, page + ':' + key);
}
for (const live of [false, true]) {
  const u = loadUi();
  u.api.renderDetail(record(), { ok: true, tier: 'subscriber', recordsCount: 3, fupanLive: live }, 'test', 'delayed_return');
  const html = u.elements.get('viewDetail').innerHTML;
  const actions = html.slice(html.indexOf('<section class="delayed-actions'));
  for (const [i, action] of expected.actions.entries()) {
    if (i === 2 && !live) continue;
    assert.ok(actions.includes(escaped(action[0])) && actions.includes(escaped(action[1]))); pass++;
  }
  assert.ok(actions.includes('>' + escaped(expected.backList) + '</a>')); pass++;
  assert.ok(!/<details[^>]*\bopen\b/.test(actions)); pass++;
  for (const item of expected.comparison.slice(0, live ? 3 : 2)) for (const row of item.rows) { assert.ok(actions.includes(escaped(row))); pass++; }
  const title = live ? expected.compareTitle : expected.compareTitle.replace('三', '兩');
  const tail = live ? expected.compareTail : expected.compareTail.replace('三個', '兩個');
  assert.ok(actions.includes(escaped(title)) && actions.includes(escaped(tail))); pass++;
  if (!live) { assert.ok(!actions.includes('<h3>複盤</h3>') && !actions.includes('想回看這一路')); pass++; }
  // Strip tags/attributes before checking numbers, since IDs and markup are not product copy.
  const text = actions.replace(/<[^>]*>/g, '');
  assert.ok(!/\d|龍運藏|靜坐|靜心|氣功|商品|半年方案/.test(text)); pass++;
  u.api.r2OpenCompose(); const form = u.elements.get('r2TaskView').innerHTML;
  for (const phrase of [expected.title, ...expected.questions, expected.note, expected.save, expected.cancel]) { assert.ok(form.includes(escaped(phrase))); pass++; }
}
// Mutation sanity: the source-derived expectation rejects the exact 您 -> 你 regression.
assert.throws(() => same(expected.questions[1].replace('您', '你'), expected.questions[1], 'negative copy mutation'));
console.log(`COPY_BYTE_PASS=${pass}; CARD_SHA=PASS; HUB_SOURCE_SHA=PASS; RENDERED_COPY=PASS; NEGATIVE_CONTROL=PASS`);
