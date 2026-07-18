#!/bin/bash
# MINGGE-SHOWCASE-005B repository acceptance checks.
# Static/isolated only: no LINE, Worker, Make, Dify, Airtable or payment mutation.

set -uo pipefail
PASS=0
FAIL=0
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IDX="$ROOT/index.html"
MAP="$ROOT/plans/mingge_showcase_005b_rich_menu_mapping_v1_0.json"
IMAGE="$ROOT/assets/richmenu_mingge_005b_2500x1686_v1_0.png"
CREATE="$ROOT/scripts/create_mingge_005b_sealed_rich_menu.sh"
ROLLBACK="$ROOT/scripts/unlink_mingge_005b_sealed_rich_menu.sh"

pass(){ echo "[PASS] $1"; ((PASS++)); }
fail(){ echo "[FAIL] $1"; ((FAIL++)); }

echo "=== 005B article message / LIFF permission matrix ==="

NODE_OUT=$(node - "$IDX" <<'NODE'
const fs=require('fs');
const vm=require('vm');
const source=fs.readFileSync(process.argv[2],'utf8');
for(const match of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
  if(match[1].trim()) new vm.Script(match[1]);
}
const start=source.indexOf('function buildStudyAskLaoyiMessage');
const end=source.indexOf('function initAskLaoyiPage',start);
if(start<0||end<0) throw new Error('005B helpers not found');
const helpers=source.slice(start,end);

function makeElements(){
  return {
    status:{textContent:'',dataset:{}},
    fallback:{hidden:true},
    text:{value:'',focus(){},select(){}}
  };
}
async function run(liff,message){
  const els=makeElements();
  const ids={s:els.status,f:els.fallback,t:els.text};
  const ctx={
    LIFF_ID:'mock-liff',liff,
    document:{getElementById:id=>ids[id]||null,querySelectorAll:()=>[]},
    navigator:{clipboard:{writeText:async()=>{}}},
    setTimeout:()=>0,
    console:{warn(){}},
  };
  vm.createContext(ctx);
  vm.runInContext(helpers+'\nthis.__send=sendAskLaoyiIntent;this.__article=buildStudyAskLaoyiMessage;',ctx);
  await ctx.__send(message,'s','f','t');
  await Promise.resolve();
  return {els,article:ctx.__article};
}

(async()=>{
  let sent=null;
  const ok=await run({
    init:async()=>{},isInClient:()=>true,isLoggedIn:()=>true,
    getContext:()=>({type:'utou',scope:['chat_message.write']}),
    permission:{query:async()=>({state:'granted'})},
    sendMessages:async messages=>{sent=messages;},closeWindow(){}
  },'一般易理題');
  if(!sent||sent[0].text!=='一般易理題'||ok.els.status.dataset.askError!=='sent'||!ok.els.fallback.hidden) throw new Error('granted path');

  const unavailable=await run({
    init:async()=>{},isInClient:()=>true,isLoggedIn:()=>true,
    getContext:()=>({type:'utou',scope:[]}),permission:{query:async()=>({state:'unavailable'})},
    sendMessages:async()=>{throw new Error('must not send');}
  },'權限題');
  if(unavailable.els.status.dataset.askError!=='chat-message-unavailable'||unavailable.els.fallback.hidden) throw new Error('unavailable path');

  const prompt=await run({
    init:async()=>{},isInClient:()=>true,isLoggedIn:()=>true,
    getContext:()=>({type:'utou',scope:['chat_message.write']}),permission:{query:async()=>({state:'prompt'})},
    sendMessages:async()=>{throw new Error('must not send');}
  },'待同意題');
  if(prompt.els.status.dataset.askError!=='chat-message-prompt'||prompt.els.fallback.hidden) throw new Error('prompt path');

  const external=await run({
    init:async()=>{},isInClient:()=>true,isLoggedIn:()=>true,
    getContext:()=>({type:'external'}),sendMessages:async()=>{}
  },'外部題');
  if(external.els.status.dataset.askError!=='not-liff-chat'||external.els.fallback.hidden) throw new Error('external path');

  const denied=await run({
    init:async()=>{},isInClient:()=>true,isLoggedIn:()=>true,
    getContext:()=>({type:'utou'}),permission:{query:async()=>({state:'granted'})},
    sendMessages:async()=>{const e=new Error('denied');e.code=403;throw e;}
  },'403題');
  if(denied.els.status.dataset.askError!=='send-403'||denied.els.fallback.hidden) throw new Error('403 path');

  const msg=ok.article({title:'  春節  \n 〔A 決策癱瘓〕  '});
  if(msg!== '我剛讀完易經書房的〈春節 〔A 決策癱瘓〕〉，想請老易再講深一點：這篇對我現在做事有什麼提醒？') throw new Error('article contract');
  if(msg.startsWith('問老易')||msg.includes('\n')) throw new Error('legacy control prefix remains');
  console.log('5 LIFF cases + article contract passed');
})().catch(e=>{console.error(e);process.exit(1);});
NODE
)
if [ $? -eq 0 ]; then pass "LIFF granted/unavailable/prompt/external/403 與書房訊息 contract 全過"; else fail "$NODE_OUT"; fi

ASK_BLOCK=$(awk '/async function sendAskLaoyiIntent/{flag=1} flag{print} /^}/{if(flag){exit}}' "$IDX")
if echo "$ASK_BLOCK" | grep -q 'liff.sendMessages' && ! echo "$ASK_BLOCK" | grep -qE 'fetch\(|RELAY_URL|method:.*POST|149'; then
  pass "免費問老易只用 LIFF sendMessages，零 quota／付款 POST"
else
  fail "免費問老易越過 repository 邊界"
fi

echo ""
echo "=== Rich Menu artifact / sealed-only scripts ==="

NODE_MAP=$(node - "$MAP" <<'NODE'
const fs=require('fs');
const m=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const labels=['向天問卦','我的卦記','訂閱方案','易經書房','問老易','書僮客服'];
const area=m.areas.reduce((n,a)=>n+a.bounds.width*a.bounds.height,0);
const ok=m.size.width===2500&&m.size.height===1686&&m.areas.length===6&&
  m.areas.every((a,i)=>a.action.label===labels[i])&&area===2500*1686&&
  m.areas[4].action.type==='message'&&m.areas[4].action.text==='問老易'&&
  [0,1,2,3].every(i=>m.areas[i].action.uri.startsWith('https://liff.line.me/2010192384-9AwjI8qH/'));
if(!ok) process.exit(1);
NODE
)
if [ $? -eq 0 ]; then pass "005B mapping 六格、LIFF URI、問老易 message action 與面積正確"; else fail "mapping contract 失敗: $NODE_MAP"; fi

read -r W H < <(identify -format '%w %h' "$IMAGE")
BYTES=$(wc -c < "$IMAGE")
HASH=$(sha256sum "$IMAGE" | cut -d' ' -f1)
if [ "$W" = 2500 ] && [ "$H" = 1686 ] && [ "$BYTES" -lt 900000 ] && [ "$HASH" = ed1e8dac2db5c8c35ed6cc5df3d9baf6f534c7751485d0104808f974d5876591 ]; then
  pass "Rich Menu 圖 exact 2500×1686／848532 bytes／SHA-256"
else
  fail "Rich Menu 圖規格漂移: ${W}x${H} ${BYTES} ${HASH}"
fi

if grep -q '/v2/bot/user/${SEALED_LINE_USER_ID}/richmenu/${RICH_MENU_ID}' "$CREATE" && \
   grep -q '/v2/bot/user/${SEALED_LINE_USER_ID}/richmenu' "$ROLLBACK" && \
   ! grep -q '/user/all/richmenu' "$CREATE" && ! grep -q '/user/all/richmenu' "$ROLLBACK"; then
  pass "建立／rollback 腳本只允許 sealed per-user binding，零 Default endpoint"
else
  fail "Rich Menu 腳本 scope 不符"
fi

if bash -n "$CREATE" && bash -n "$ROLLBACK"; then pass "Rich Menu scripts shell syntax 通過"; else fail "Rich Menu scripts shell syntax 失敗"; fi

echo ""
echo "結果: ${PASS} PASS / ${FAIL} FAIL"
[ "$FAIL" -eq 0 ]
