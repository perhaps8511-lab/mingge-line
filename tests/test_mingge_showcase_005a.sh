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
MANIFEST="$ROOT/plans/mingge_showcase_005_content_canonical_manifest_v1_0.md"
ASSET="$ROOT/assets/richmenu_mingge_005a_2500x1686_v1_0.png"

check(){
  if "$@"; then echo "[PASS] $1"; ((PASS++)); else echo "[FAIL] $1"; ((FAIL++)); fi
}

echo "=== 005A DOM / routing ==="

if grep -q "var pageMap = {ask:'page-about', about:'page-about', log:'page-log', study:'page-study', pay:'page-pay'}" "$IDX"; then
  echo "[PASS] action=ask 與 legacy action=about 共用問老易頁"; ((PASS++))
else
  echo "[FAIL] 問老易 route alias 缺失"; ((FAIL++))
fi

for NEEDLE in 'id="laoyiHallEnter"' 'data-laoyi-chip=' 'id="studyAskLaoyi"' 'id="laoyiContextReturn"' '這篇看不懂？問老易' '今天想自己讀一篇？'; do
  if grep -q "$NEEDLE" "$IDX"; then
    echo "[PASS] DOM 包含 $NEEDLE"; ((PASS++))
  else
    echo "[FAIL] DOM 缺少 $NEEDLE"; ((FAIL++))
  fi
done

echo ""
echo "=== 免費路徑與 quota 邊界 ==="

ASK_BLOCK=$(awk '/^async function laoyiSend/{flag=1} /^function laoyiComposerKeydown/{flag=0} flag{print}' "$IDX")
if echo "$ASK_BLOCK" | grep -q "RELAY_URL+'laoyi/chat'" && ! echo "$ASK_BLOCK" | grep -q "fetch(RELAY_URL,{"; then
  echo "[PASS] 問老易只走 learning endpoint，不呼叫問卦 root/quota POST"; ((PASS++))
else
  echo "[FAIL] 問老易傳送路徑不符免費邊界"; ((FAIL++))
fi

if grep -q "fetch(RELAY_URL+'study',{method:'GET'})" "$IDX"; then
  echo "[PASS] 易經書房維持 GET /study"; ((PASS++))
else
  echo "[FAIL] 易經書房 GET /study 契約缺失"; ((FAIL++))
fi

if grep -q "showAskLaoyiFallback(message,statusId,fallbackId,textId)" "$IDX" && grep -q 'readonly></textarea>' "$IDX"; then
  echo "[PASS] 非 LINE／送訊失敗有可複製文字 fallback"; ((PASS++))
else
  echo "[FAIL] 問老易 fallback 缺失"; ((FAIL++))
fi

MOCK_OUT=$(node - "$IDX" <<'NODE'
const fs=require('fs');
const vm=require('vm');
const source=fs.readFileSync(process.argv[2],'utf8');
const scriptMatches=[...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
for(const match of scriptMatches){ if(match[1].trim()) new vm.Script(match[1]); }
const start=source.indexOf('function studySendAskLaoyi');
const end=source.indexOf('\n}',start)+2;
if(start<0||end<2) throw new Error('studySendAskLaoyi not found');
const location={href:''};
const ctx={studyState:{articles:[{title:'測試文章'}]},location,encodeURIComponent};
vm.createContext(ctx);
vm.runInContext(source.slice(start,end)+'\nthis.__send=studySendAskLaoyi;',ctx);
const btn={disabled:false};
ctx.__send(0,btn);
if(!btn.disabled) throw new Error('button not locked');
if(location.href!=='./index.html?action=ask&content_id='+encodeURIComponent('測試文章')+'&entry_context=article&content_ref=0') throw new Error('article context route mismatch: '+location.href);
console.log('article context deep link passed');
NODE
)
if [ $? -eq 0 ]; then
  echo "[PASS] 真實 JS 語法與 article context deep link mock 皆通過"; ((PASS++))
else
  echo "[FAIL] article context isolated mock 失敗: $MOCK_OUT"; ((FAIL++))
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
const labels=['向天問卦','我的卦記','方案・信物','易經書房','問老易','書僮客服'];
const subtitles=['問一件新的事','回看、補記已有的事','看方案或龍宮舍利','自己讀一篇','把看不懂的問懂','查權益、訂單與售後'];
const okSize=m.size&&m.size.width===2500&&m.size.height===1686;
const okLabels=Array.isArray(m.areas)&&m.areas.length===6&&m.areas.every((a,i)=>a.action.label===labels[i]&&a.display.label===labels[i]&&a.display.subtitle===subtitles[i]);
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

ASSET_OUT=$(node - "$ASSET" <<'NODE'
const fs=require('fs');
const crypto=require('crypto');
const p=process.argv[2];
const expectedHash='b68193ade39f312860f42d5ebc775c9e8d271bee670887bd904945059af517c1';
const b=fs.readFileSync(p);
const signature=b.subarray(0,8).toString('hex');
const width=b.readUInt32BE(16);
const height=b.readUInt32BE(20);
const sha256=crypto.createHash('sha256').update(b).digest('hex');
const ok=signature==='89504e470d0a1a0a'&&width===2500&&height===1686&&b.length<900000&&sha256===expectedHash;
console.log(JSON.stringify({width,height,bytes:b.length,sha256,ok}));
if(!ok) process.exit(1);
NODE
)
if [ $? -eq 0 ]; then
  echo "[PASS] 候選 PNG 尺寸、容量與 SHA-256 已凍結: $ASSET_OUT"; ((PASS++))
else
  echo "[FAIL] 候選 PNG 驗證失敗: $ASSET_OUT"; ((FAIL++))
fi

if grep -q 'assets/richmenu_mingge_005a_2500x1686_v1_0.png' "$MANIFEST" && grep -q 'b68193ade39f312860f42d5ebc775c9e8d271bee670887bd904945059af517c1' "$MANIFEST"; then
  echo "[PASS] canonical manifest 已記錄 RC1 候選圖與 hash"; ((PASS++))
else
  echo "[FAIL] canonical manifest 候選圖留證缺失"; ((FAIL++))
fi

echo ""
echo "結果: ${PASS} PASS / ${FAIL} FAIL"
[ "$FAIL" -eq 0 ]
