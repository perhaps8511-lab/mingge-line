// _e086_fn_matrix.mjs — helper for test_e086_checkout_mock_v1_0.sh 段③
// Extracts PAY_PLANS + buildPayMockPayload from index.html source and runs them
// together in an isolated Function scope (avoids bash/heredoc escaping of JS literals).
import fs from 'node:fs';

const idxPath = process.argv[2];
const src = fs.readFileSync(idxPath, 'utf8');

function extractConst(name) {
  const re = new RegExp('const ' + name + '\\s*=\\s*\\{[\\s\\S]*?\\n\\};');
  const m = src.match(re);
  if (!m) throw new Error('extractConst miss: ' + name);
  return m[0];
}
function extractFn(name) {
  const re = new RegExp('(async )?function ' + name + '\\([^)]*\\)\\{[\\s\\S]*?\\n\\}');
  const m = src.match(re);
  if (!m) throw new Error('extractFn miss: ' + name);
  return m[0];
}

let pass = 0, fail = 0;
function report(ok, label) {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + label);
  if (ok) pass++; else fail++;
}

const payPlansSrc = extractConst('PAY_PLANS');
const buildFnSrc = extractFn('buildPayMockPayload');
const factory = new Function(payPlansSrc + '\n' + buildFnSrc + '\nreturn buildPayMockPayload;');
const buildPayMockPayload = factory();

const M1_FIELDS = ['orderId', 'customId', 'status', 'amount', 'transactionHid', 'subscriptionId'];

// case1: 六欄位逐字對應 086 卡〇節 M1 契約,不多不少
{
  const p = buildPayMockPayload('planSingle149', 'success');
  const keys = Object.keys(p).sort();
  const expected = [...M1_FIELDS].sort();
  const exact = JSON.stringify(keys) === JSON.stringify(expected);
  report(exact, 'case1 buildPayMockPayload 回傳恰好 6 個 M1 欄位,禁自創欄位(實際=' + JSON.stringify(keys) + ')');
}

// case2: single_149(問一卦149)customId/amount 字面值取自卡片〇節,非推測
{
  const p = buildPayMockPayload('planSingle149', 'success');
  report(p.customId === 'single_149' && p.amount === 149, 'case2 planSingle149 → customId=single_149 amount=149(卡片〇節已定義值)');
}

// case3: sub_1490(問道複盤1490)customId/amount 字面值取自卡片〇節,非推測
{
  const p = buildPayMockPayload('planFupan1490', 'success');
  report(p.customId === 'sub_1490' && p.amount === 1490, 'case3 planFupan1490 → customId=sub_1490 amount=1490(卡片〇節已定義值)');
}

// case4: status 依 result 正確映射(success/fail 二值,無第三態)
{
  const ok = buildPayMockPayload('planSingle149', 'success').status === 'success';
  const bad = buildPayMockPayload('planSingle149', 'fail').status === 'fail';
  report(ok && bad, 'case4 status 欄位依 result 正確映射 success/fail(枚舉字面值待 Chat 對 Make M1 確認)');
}

// case5: subscriptionId 只在訂閱方案(planFupan1490)非 null,其餘三張卡為 null
{
  const sub = buildPayMockPayload('planFupan1490', 'success');
  const single = buildPayMockPayload('planSingle149', 'success');
  const pack = buildPayMockPayload('planPack399', 'success');
  const deep = buildPayMockPayload('planDeepdive200', 'success');
  report(
    typeof sub.subscriptionId === 'string' && sub.subscriptionId.startsWith('MOCKSUB-') &&
    single.subscriptionId === null && pack.subscriptionId === null && deep.subscriptionId === null,
    'case5 subscriptionId 僅訂閱方案(planFupan1490)非 null,其餘三張單次方案為 null'
  );
}

// case6: orderId/transactionHid 命名規則 + 每次呼叫皆不同(不可重放同一 orderId)
{
  const a = buildPayMockPayload('planDeepdive200', 'success');
  const b = buildPayMockPayload('planDeepdive200', 'success');
  const shaped = a.orderId.startsWith('MOCK-') && a.transactionHid === ('MOCKTX-' + a.orderId);
  report(shaped && a.orderId !== b.orderId, 'case6 orderId 以 MOCK- 開頭、transactionHid 含同一 orderId、每次呼叫皆唯一');
}

// case7: PAY_PLANS 四張卡 customId 均為非空字串(200 仍為暫定值,結構仍須完整,供 Chat 之後核對/覆寫)
{
  const src2 = payPlansSrc;
  const ids = ['single_149', 'pack_399', 'deepdive200', 'sub_1490'];
  const allPresent = ids.every((id) => src2.includes("'" + id + "'"));
  report(allPresent, 'case7 PAY_PLANS 四張卡 customId 皆已填值(200 仍為暫定值,見 index.html 內註記)');
}

// case8: 090 卡明定囊中銅錢 399 的 customId=pack_399,金額與 S159 文案同為 399
{
  const p = buildPayMockPayload('planPack399', 'success');
  report(p.customId === 'pack_399' && p.amount === 399, 'case8 planPack399 → customId=pack_399 amount=399(090 卡精確值)');
}

console.log('---SUMMARY--- pass=' + pass + ' fail=' + fail);
process.exit(fail === 0 ? 0 : 1);
