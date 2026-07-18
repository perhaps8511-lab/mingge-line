#!/bin/bash
# test_e40_giftfix_v1_0.sh — E40② 首觸贈幣語修復驗收腳本
# Ref: plans/plan_e40_giftfix_v1_0.md(Codex 互審 APPROVED r2)
# V1(headless 條件矩陣 + 結構斷言,Node vm)/ V2(佈線行號)/ V3(文案唯一定義)/ V4(live-diff 收斂範圍)
# 全程假 token / 測試戶,不碰真鑰

set -uo pipefail
PASS=0; FAIL=0

IDX="$(dirname "$0")/../index.html"

echo "=== V1: 條件矩陣(headless,Node vm)+ 結構斷言 ==="

NODE_OUT=$(node --input-type=module -e "
import vm from 'node:vm';
import fs from 'node:fs';

const src = fs.readFileSync('$IDX', 'utf8');

// 抽出 quotaCreditsFromSub / GIFT_TEXT / giftShouldShow / applyEntryGift 原始碼片段
function extractFn(name){
  const re = new RegExp('(async )?function '+name+'\\\\([^)]*\\\\)\\\\{[\\\\s\\\\S]*?\\\\n\\\\}');
  const m = src.match(re);
  if(!m) throw new Error('extractFn miss: '+name);
  return m[0];
}
function extractConst(name){
  const re = new RegExp('const '+name+' = .*?;');
  const m = src.match(re);
  if(!m) throw new Error('extractConst miss: '+name);
  return m[0];
}

const code = [
  extractConst('GIFT_TEXT'),
  extractFn('quotaCreditsFromSub'),
  extractFn('giftShouldShow'),
  extractFn('applyEntryGift'),
  'globalThis.__quotaCreditsFromSub = quotaCreditsFromSub;',
  'globalThis.__giftShouldShow = giftShouldShow;',
  'globalThis.__applyEntryGift = applyEntryGift;',
  'globalThis.__GIFT_TEXT = GIFT_TEXT;',
].join('\\n\\n');

// case 1-3: 純函式矩陣
const ctx1 = { console };
vm.createContext(ctx1);
vm.runInContext(code, ctx1);

const results = [];
results.push(['case1 subscriber=null => show', ctx1.__giftShouldShow(null) === true]);
results.push(['case2 coins=3(free) => show', ctx1.__giftShouldShow({tier:'free',trial_quota_remaining:3,monthly_quota_remaining:0}) === true]);
results.push(['case3 coins=2 => hide', ctx1.__giftShouldShow({tier:'free',trial_quota_remaining:2,monthly_quota_remaining:0}) === false]);
results.push(['case5 subscriber tier + coins=3 => hide', ctx1.__giftShouldShow({tier:'subscriber',trial_quota_remaining:3,monthly_quota_remaining:0}) === false]);

// case 4: fetch reject,applyEntryGift 不拋錯,giftEl 維持 hidden
async function runCase4(){
  const giftEl = { hidden: true, textContent: '' };
  const ctx2 = {
    console,
    document: { getElementById: (id) => id==='entryGiftEntry' ? giftEl : null },
    DEV_MODE: false,
    RELAY_URL: 'https://example.invalid/',
    AbortController: globalThis.AbortController,
    setTimeout, clearTimeout,
    fetch: () => Promise.reject(new Error('network down')),
  };
  vm.createContext(ctx2);
  vm.runInContext(code, ctx2);
  let threw = false;
  try{ await ctx2.__applyEntryGift('FAKE_TOKEN_TEST'); }
  catch(e){ threw = true; }
  return !threw && giftEl.hidden === true && giftEl.textContent === '';
}

// case 6: fetch resolve subscriber=null,applyEntryGift 應顯示且文字正確
async function runCase6(){
  const giftEl = { hidden: true, textContent: '' };
  const ctx3 = {
    console,
    document: { getElementById: (id) => id==='entryGiftEntry' ? giftEl : null },
    DEV_MODE: false,
    RELAY_URL: 'https://example.invalid/',
    AbortController: globalThis.AbortController,
    setTimeout, clearTimeout,
    fetch: () => Promise.resolve({ ok:true, json: async () => ({ records:[], subscriber:null }) }),
  };
  vm.createContext(ctx3);
  vm.runInContext(code, ctx3);
  await ctx3.__applyEntryGift('FAKE_TOKEN_TEST');
  return giftEl.hidden === false && giftEl.textContent === ctx3.__GIFT_TEXT;
}

(async () => {
  results.push(['case4 fetch reject => 不拋錯且維持 hidden', await runCase4()]);
  results.push(['case6 subscriber=null(真實fetch路徑) => show+文字正確', await runCase6()]);
  for(const [name, ok] of results){
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);
  }
  if(results.some(r => !r[1])) process.exit(1);
})();
" 2>&1)

echo "$NODE_OUT"
NODE_FAIL=$(echo "$NODE_OUT" | grep -c '^FAIL')
NODE_PASS=$(echo "$NODE_OUT" | grep -c '^PASS')
if [ "$NODE_FAIL" -eq 0 ] && [ "$NODE_PASS" -ge 6 ]; then
  echo "[PASS] V1 條件矩陣 6/6 case 全過"; ((PASS++))
else
  echo "[FAIL] V1 條件矩陣未全過(FAIL=$NODE_FAIL PASS=$NODE_PASS)"; ((FAIL++))
fi

# V1 結構斷言:E40 後續修正已把 entryGiftEntry 移至進場 s0；不得退回 s1
S0_BLOCK=$(awk '/id="s0"/{flag=1} flag{print} /id="s1"/{if(flag)exit}' "$IDX")
S1_BLOCK=$(awk '/id="s1"/{flag=1} flag{print} /id="s2"/{if(flag)exit}' "$IDX")
if echo "$S0_BLOCK" | grep -q 'entryGiftEntry' && ! echo "$S1_BLOCK" | grep -q 'entryGiftEntry'; then
  echo "[PASS] V1 結構斷言:entryGiftEntry 落在 s0，且未退回 s1"; ((PASS++))
else
  echo "[FAIL] V1 結構斷言:entryGiftEntry 未落在預期位置"; ((FAIL++))
fi

echo ""
echo "=== V2: 佈線(靜態行號引證)==="
if grep -n "void applyEntryGift(liffAccessToken)" "$IDX" | grep -q .; then
  CALL_LINE=$(grep -n "void applyEntryGift(liffAccessToken)" "$IDX" | head -1 | cut -d: -f1)
  BLOCK_LINE=$(grep -n "if(blockEntryIfNeeded(gateState)) return;" "$IDX" | head -1 | cut -d: -f1)
  if [ "$CALL_LINE" -gt "$BLOCK_LINE" ]; then
    echo "[PASS] applyEntryGift 呼叫點(行 $CALL_LINE)在 blockEntryIfNeeded(行 $BLOCK_LINE)之後"; ((PASS++))
  else
    echo "[FAIL] 呼叫順序不符預期"; ((FAIL++))
  fi
else
  echo "[FAIL] 找不到 applyEntryGift 呼叫點"; ((FAIL++))
fi

echo ""
echo "=== V3: 文案唯一定義(常數口徑)==="
CONST_COUNT=$(grep -cF "const GIFT_TEXT = '一輩子相贈 3 枚問卦銅錢 —— 一枚一問。';" "$IDX")
REF_COUNT=$(grep -c "GIFT_TEXT" "$IDX")
LITERAL_COUNT=$(grep -cF '一輩子相贈 3 枚問卦銅錢 —— 一枚一問。' "$IDX")
if [ "$CONST_COUNT" -eq 1 ] && [ "$REF_COUNT" -ge 3 ] && [ "$LITERAL_COUNT" -eq 1 ]; then
  echo "[PASS] GIFT_TEXT 常數唯一定義,字面文字僅出現於定義處(定義=$CONST_COUNT,引用=$REF_COUNT,字面=$LITERAL_COUNT)"; ((PASS++))
else
  echo "[FAIL] 文案常數化條件不符(定義=$CONST_COUNT,引用=$REF_COUNT,字面=$LITERAL_COUNT)"; ((FAIL++))
fi

echo ""
echo "=== V4: live-diff 收斂範圍(僅 index.html + 本測試腳本)==="
REPO_ROOT="$(dirname "$0")/.."
CHANGED=$(git -C "$REPO_ROOT" status --porcelain -- index.html log.html workers/mingge-relay/worker.js tests/test_e40_giftfix_v1_0.sh)
UNEXPECTED=$(echo "$CHANGED" | grep -v "^ M index.html$" | grep -v "test_e40_giftfix_v1_0.sh$")
if [ -z "$UNEXPECTED" ]; then
  echo "[PASS] 範圍僅 index.html(修改)+ 本測試腳本(新增);log.html/worker.js 零觸碰"; ((PASS++))
else
  echo "[FAIL] 偵測到範圍外變動:"; echo "$UNEXPECTED"; ((FAIL++))
fi

echo ""
echo "=== 總結:PASS=$PASS FAIL=$FAIL ==="
[ "$FAIL" -eq 0 ]
