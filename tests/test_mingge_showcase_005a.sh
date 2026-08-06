#!/bin/bash
# MINGGE-SHOWCASE-005A repository-only acceptance checks.
# Static/isolated only: no LINE, Worker, Make, Dify, Airtable or payment mutation.

set -uo pipefail
PASS=0
FAIL=0
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IDX="$ROOT/index.html"
MAP="$ROOT/plans/mingge_showcase_005a_rich_menu_mapping_v1_0.json"
SPEC="$ROOT/plans/mingge_showcase_005a_rich_menu_delivery_spec_v1_0.md"

check(){
  if "$@"; then echo "[PASS] $1"; ((PASS++)); else echo "[FAIL] $1"; ((FAIL++)); fi
}

echo "=== 005A DOM / routing ==="

if grep -q "var pageMap = {ask:'page-about', about:'page-about', log:'page-log', study:'page-study', pay:'page-pay'}" "$IDX"; then
  echo "[PASS] action=ask 與 legacy action=about 共用問老易頁"; ((PASS++))
else
  echo "[FAIL] 問老易 route alias 缺失"; ((FAIL++))
fi

for NEEDLE in 'id="laoyiHall"' 'id="laoyiRoom"' 'id="studyAskLaoyi"' 'id="studyAskFallback"' '拿這篇問老易' '向天問卦'; do
  if grep -q "$NEEDLE" "$IDX"; then
    echo "[PASS] DOM 包含 $NEEDLE"; ((PASS++))
  else
    echo "[FAIL] DOM 缺少 $NEEDLE"; ((FAIL++))
  fi
done

echo ""
echo "=== 免費路徑與 quota 邊界 ==="

ASK_BLOCK=$(awk '/^function studySendAskLaoyi/{flag=1} flag{print} /^}/{if(flag){exit}}' "$IDX")
if echo "$ASK_BLOCK" | grep -q "action=ask&content_id=" && ! echo "$ASK_BLOCK" | grep -qE 'fetch\(|RELAY_URL|method:.*POST|sendMessages'; then
  echo "[PASS] 書房問老易走格5 content_id deep link，不呼叫 Worker/quota POST"; ((PASS++))
else
  echo "[FAIL] 書房問老易 deep-link 免費邊界不符"; ((FAIL++))
fi

if grep -q "fetch(RELAY_URL+'study',{method:'GET'})" "$IDX"; then
  echo "[PASS] 易經書房維持 GET /study"; ((PASS++))
else
  echo "[FAIL] 易經書房 GET /study 契約缺失"; ((FAIL++))
fi

if grep -q "function laoyiOpeningLine" "$IDX" && grep -q "contentTitle=laoyiSanitizeTitle(new URLSearchParams(location.search).get('content_id'))" "$IDX"; then
  echo "[PASS] content_id 由格5入口消費並生成文章開場"; ((PASS++))
else
  echo "[FAIL] content_id 消費或格5文章開場缺失"; ((FAIL++))
fi

MOCK_OUT=$(node - "$IDX" <<'NODE'
const fs=require('fs');
const vm=require('vm');
const source=fs.readFileSync(process.argv[2],'utf8');
const scriptMatches=[...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
for(const match of scriptMatches){ if(match[1].trim()) new vm.Script(match[1]); }
function extractFn(name){
  const m=source.match(new RegExp('function '+name+'\\([^)]*\\)\\{[\\s\\S]*?\\n\\}'));
  if(!m) throw new Error('function missing: '+name);
  return m[0];
}
const code=[
  extractFn('studySendAskLaoyi'),
  extractFn('laoyiSanitizeTitle'),
  extractFn('laoyiOpeningLine'),
  'this.__send=studySendAskLaoyi;this.__sanitize=laoyiSanitizeTitle;this.__opening=laoyiOpeningLine;'
].join('\n');
const ctx={
  studyState:{articles:[{title:'等他來問，火候才對'}]},
  LAOYI_TITLE_MAX:200,
  location:{href:''},
  encodeURIComponent,
};
vm.createContext(ctx);
vm.runInContext(code,ctx);
ctx.__send(0,{disabled:false});
const target=new URL(ctx.location.href,'https://example.test/');
if(target.searchParams.get('action')!=='ask') throw new Error('action=ask missing');
const title=ctx.__sanitize(target.searchParams.get('content_id'));
if(title!=='等他來問，火候才對') throw new Error('content_id round-trip failed');
const opening=ctx.__opening({opener:'content',contentTitle:title});
if(opening!=='你帶來的是〈等他來問，火候才對〉。文中何處讓你停下了？') throw new Error('destination opening mismatch');
console.log('study deep link + content_id opening passed');
NODE
)
if [ $? -eq 0 ]; then
  echo "[PASS] 真實 JS 語法、study deep link 與格5文章開場 mock 皆通過"; ((PASS++))
else
  echo "[FAIL] study deep-link isolated mock 失敗: $MOCK_OUT"; ((FAIL++))
fi

if grep -q "await fetch(RELAY_URL,{" "$IDX" && grep -q "method:'POST'" "$IDX" && grep -q "if(blockEntryIfNeeded(gateState)) return;" "$IDX"; then
  echo "[PASS] 現行向天問卦 POST 與 entry quota gate 仍在"; ((PASS++))
else
  echo "[FAIL] 現行問卦 gate／POST 疑似被破壞"; ((FAIL++))
fi

echo ""
echo "=== Rich Menu mapping / delivery spec ==="

NODE_OUT=$(node - "$MAP" <<'NODE'
const fs=require('fs');
const p=process.argv[2];
const m=JSON.parse(fs.readFileSync(p,'utf8'));
const labels=['向天問卦','我的卦記','訂閱方案','易經書房','問老易','書僮客服'];
const okSize=m.size&&m.size.width===2500&&m.size.height===1686;
const okLabels=Array.isArray(m.areas)&&m.areas.length===6&&m.areas.every((a,i)=>a.action.label===labels[i]);
const okAsk=m.areas[4].action.type==='message'&&m.areas[4].action.text==='問老易';
const totalArea=m.areas.reduce((n,a)=>n+a.bounds.width*a.bounds.height,0);
const okBounds=totalArea===2500*1686;
console.log(JSON.stringify({okSize,okLabels,okAsk,okBounds}));
if(!okSize||!okLabels||!okAsk||!okBounds) process.exit(1);
NODE
)
if [ $? -eq 0 ]; then
  echo "[PASS] mapping 六格、2500×1686、問老易 message action 與完整面積皆正確"; ((PASS++))
else
  echo "[FAIL] mapping 驗證失敗: $NODE_OUT"; ((FAIL++))
fi

if grep -q '小於 `900,000 bytes`' "$SPEC" && grep -q '不得直接非等比拉伸' "$SPEC" && grep -q 'NOT ACTIVATED' "$SPEC"; then
  echo "[PASS] 壓縮、比例與未啟用邊界已明列"; ((PASS++))
else
  echo "[FAIL] Rich Menu 交付規格不完整"; ((FAIL++))
fi

echo ""
echo "結果: ${PASS} PASS / ${FAIL} FAIL"
[ "$FAIL" -eq 0 ]
