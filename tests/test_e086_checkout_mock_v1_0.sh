#!/bin/bash
# Card 124 v1.3: FalseToken trusted issuer + entitlement gates.
set -uo pipefail

PASS=0
FAIL=0
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IDX="$ROOT/index.html"
WRK="$ROOT/workers/mingge-relay/worker.js"

pass(){ echo "[PASS] $1"; PASS=$((PASS+1)); }
fail(){ echo "[FAIL] $1"; FAIL=$((FAIL+1)); }

node --check "$WRK" >/dev/null 2>&1 && pass "worker.js syntax" || fail "worker.js syntax"
node "$ROOT/tests/_e086_fn_matrix.mjs" "$IDX" && pass "legacy 086 plan matrix" || fail "legacy 086 plan matrix"

grep -qE "^const CHECKOUT_MODE = 'mock';" "$IDX" && pass "CHECKOUT_MODE remains mock" || fail "CHECKOUT_MODE changed"
[ "$(grep -c '付款通道整備中,眼下還付不了款;開通到哪一步了,問一聲「書僮客服」便知。' "$IDX")" -eq 3 ] && pass "R302-d fail-honest copy exact in three plan cards" || fail "fail-honest copy drift"
grep -qF '退費:單卦與囊中銅錢,<strong>七天之內、一枚未用</strong>,全數退還;起過卦了,便算書房已為您開講,依規不退。問道·複盤一次付清六個月,到期即止、不自動續扣;<strong>十四天之內、未起過卦</strong>,全退;起了卦或過了十四天,依規不退,書房陪您到期滿。<br>' "$IDX" && pass "refund two-track copy remains exact" || fail "refund copy drift"
grep -qF 'id="payMockOverlay"' "$IDX" && grep -qF 'id="payMockOk"' "$IDX" && grep -qF 'id="payMockFail"' "$IDX" && grep -qF 'id="payMockCancel"' "$IDX" && pass "mock overlay contract remains complete" || fail "mock overlay contract drift"
for PAGE in "$ROOT/pay_success.html" "$ROOT/pay_failure.html"; do
  if grep -qF 'el.textContent = parts.join' "$PAGE" && ! grep -qF '.innerHTML' "$PAGE"; then
    pass "$(basename "$PAGE") keeps textContent query rendering"
  else
    fail "$(basename "$PAGE") query rendering safety drift"
  fi
done

grep -qF "RELAY_URL+'falsetoken/checkout'" "$IDX" && pass "mock success calls trusted relay" || fail "trusted relay call missing"
grep -qF "body:JSON.stringify({plan:plan.customId})" "$IDX" && pass "browser sends plan key only" || fail "browser payload is not plan-only"
grep -qF "'X-Line-AccessToken':token" "$IDX" && pass "LINE token stays in authenticated relay header" || fail "authenticated relay header missing"

if grep -E "HOOK_FALSETOKEN|make\.com|hook\.(us|eu)[0-9]*\.make" "$IDX" >/dev/null; then
  fail "frontend exposes FalseToken/Make hook material"
else
  pass "frontend has no FalseToken/Make hook material"
fi

grep -qF "deepen_200" "$IDX" && grep -qF "deepen_200" "$WRK" && pass "canonical deepen_200 spelling" || fail "canonical deepen_200 missing"
grep -E '(^|[^0-9])349([^0-9]|$)' "$IDX" "$WRK" >/dev/null && fail "external forbidden 349 present" || pass "forbidden 349 absent"
grep -qF 'payment_bypass_consent_gate' "$IDX" "$WRK" && fail "payment consent bypass present" || pass "payment consent bypass absent"

node --input-type=module - "$WRK" <<'NODE'
import {pathToFileURL} from 'node:url';

const workerPath = process.argv[2];
const worker = (await import(pathToFileURL(workerPath).href + '?card124=' + Date.now())).default;
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failures++;
};

function lineIdentityFetch(extra) {
  return async (input, init={}) => {
    const url = String(input);
    if (url.includes('/oauth2/v2.1/verify')) return new Response(JSON.stringify({client_id:'2010192384'}), {status:200});
    if (url.includes('/v2/profile')) return new Response(JSON.stringify({userId:'U_CARD124',displayName:'Card 124'}), {status:200});
    return extra(input, init);
  };
}

async function checkout(plan, bodyOverride, envOverride) {
  let forwarded = null;
  globalThis.fetch = lineIdentityFetch(async (input, init={}) => {
    if (String(input) === 'https://hook.invalid/falsetoken') {
      forwarded = JSON.parse(init.body);
      return new Response('{}', {status:200});
    }
    throw new Error('unexpected fetch ' + input);
  });
  const req = new Request('https://relay.test/falsetoken/checkout', {
    method:'POST',
    headers:{'Content-Type':'application/json','X-Line-AccessToken':'token'},
    body:JSON.stringify(bodyOverride ?? {plan}),
  });
  const res = await worker.fetch(req, {HOOK_FALSETOKEN:'https://hook.invalid/falsetoken', ...(envOverride||{})});
  return {res, json:await res.json(), forwarded};
}

for (const [plan, amount] of [['single_149',149],['pack_399',399],['sub_1490',1490]]) {
  const out = await checkout(plan);
  check(out.res.status === 202, `${plan} accepted`);
  check(out.forwarded?.plan === plan && out.forwarded?.amount === amount, `${plan} amount is server canonical`);
  check(out.forwarded?.line_user_id === 'U_CARD124' && out.forwarded?.status === 'pending', `${plan} trusted identity + pending only`);
  check(/^MG\d+[a-f0-9]{12}$/.test(out.forwarded?.order_id || ''), `${plan} server order_id shape`);
  check(out.forwarded?.custom_id === `FT-${out.forwarded?.order_id}`, `${plan} unique custom_id derives from order`);
  check(JSON.stringify(Object.keys(out.forwarded||{}).sort()) === JSON.stringify(['amount','custom_id','line_user_id','order_id','plan','status'].sort()), `${plan} normalized payload exact fields`);
}

const one = await checkout('single_149');
const two = await checkout('single_149');
check(one.forwarded.order_id !== two.forwarded.order_id && one.forwarded.custom_id !== two.forwarded.custom_id, 'same-plan orders remain unique');

const extra = await checkout('single_149', {plan:'single_149',amount:1,line_user_id:'attacker'});
check(extra.res.status === 400 && extra.forwarded === null, 'browser cannot assert amount or identity');
const deep = await checkout('deepen_200');
check(deep.res.status === 409 && deep.forwarded === null, 'deepen_200 fails closed until Track B schema GO');
const noHook = await checkout('single_149', undefined, {HOOK_FALSETOKEN:undefined});
check(noHook.res.status === 503 && noHook.forwarded === null, 'missing HOOK_FALSETOKEN fails closed');

async function fupan(subscriberFields, env={AIRTABLE_API_KEY:'fake',HOOK_FUPAN:'https://hook.invalid/fupan'}) {
  let hookCalls = 0;
  globalThis.fetch = lineIdentityFetch(async (input) => {
    const url = String(input);
    if (url.startsWith('https://api.airtable.com/')) {
      return new Response(JSON.stringify({records:subscriberFields ? [{fields:subscriberFields}] : []}), {status:200});
    }
    if (url === 'https://hook.invalid/fupan') { hookCalls++; return new Response('{}',{status:200}); }
    throw new Error('unexpected fetch ' + input);
  });
  const req = new Request('https://relay.test/trigger/fupan', {
    method:'POST',
    headers:{'Content-Type':'application/json','X-Line-AccessToken':'token'},
    body:JSON.stringify({current_question:'現在該怎麼整理？'}),
  });
  const res = await worker.fetch(req, env);
  return {res, hookCalls};
}

const paid = await fupan({subscriber_tier:'subscriber',consent_at:'2026-08-10T00:00:00.000Z'});
check(paid.res.status === 202 && paid.hookCalls === 1, 'subscriber with consent passes fupan backend gate');
const free = await fupan({subscriber_tier:'free',consent_at:'2026-08-10T00:00:00.000Z'});
check(free.res.status === 403 && free.hookCalls === 0, 'free account fails closed at fupan backend gate');
const noConsent = await fupan({subscriber_tier:'subscriber'});
check(noConsent.res.status === 403 && noConsent.hookCalls === 0, 'subscriber without consent fails closed');
const noAirtable = await fupan(null, {HOOK_FUPAN:'https://hook.invalid/fupan'});
check(noAirtable.res.status === 503 && noAirtable.hookCalls === 0, 'missing Airtable binding fails closed');

process.exit(failures ? 1 : 0);
NODE
if [ "$?" -eq 0 ]; then pass "Card 124 worker contract matrix"; else fail "Card 124 worker contract matrix"; fi

echo "---SUMMARY--- PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
