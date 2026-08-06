#!/bin/bash
# E55/E56 書房「拿這篇問老易」現行 deep-link 鏈驗收。
# 靜態 + Node vm；不呼叫 LINE、Worker、Dify、Airtable。

set -uo pipefail
PASS=0; FAIL=0
IDX="$(dirname "$0")/../index.html"

echo "=== V1: 現行 deep-link 鏈真執行(Node vm)==="
NODE_OUT=$(node --input-type=module -e "
import vm from 'node:vm';
import fs from 'node:fs';
const src=fs.readFileSync('$IDX','utf8');
function extractFn(name){
  const m=src.match(new RegExp('(async )?function '+name+'\\\\([^)]*\\\\)\\\\{[\\\\s\\\\S]*?\\\\n\\\\}'));
  if(!m) throw new Error('extractFn miss: '+name);
  return m[0];
}
const sendSrc=extractFn('studySendAskLaoyi');
const sanitizeSrc=extractFn('laoyiSanitizeTitle');
const openingSrc=extractFn('laoyiOpeningLine');
const results=[];
results.push(['studySendAskLaoyi 指向格5 content_id deep link',/action=ask&content_id=/.test(sendSrc)]);
results.push(['不殘留舊 sendMessages/Worker POST',!/sendMessages|fetch\\(|RELAY_URL/.test(sendSrc)]);
results.push(['點擊後鎖鈕避免重複導頁',/btnEl\\.disabled=true/.test(sendSrc)]);
const ctx={studyState:{articles:[{title:'等他來問，火候才對'}]},LAOYI_TITLE_MAX:200,location:{href:''},encodeURIComponent};
vm.createContext(ctx);
vm.runInContext([sendSrc,sanitizeSrc,openingSrc,
  'this.__send=studySendAskLaoyi;this.__sanitize=laoyiSanitizeTitle;this.__opening=laoyiOpeningLine;'
].join('\n'),ctx);
const btn={disabled:false};
ctx.__send(0,btn);
const target=new URL(ctx.location.href,'https://example.test/');
results.push(['deep link 真執行得到 action=ask',target.searchParams.get('action')==='ask']);
const title=ctx.__sanitize(target.searchParams.get('content_id'));
results.push(['content_id 篇名 round-trip 無 loss',title==='等他來問，火候才對']);
results.push(['按鈕真被鎖定',btn.disabled===true]);
const opening=ctx.__opening({opener:'content',contentTitle:title});
results.push(['抵達格5後顯示實際成功開場句',
  opening==='你帶來的是〈等他來問，火候才對〉。文中何處讓你停下了？']);
results.push(['initAskLaoyiPage 消費 content_id',
  /contentTitle=laoyiSanitizeTitle\\(new URLSearchParams\\(location\\.search\\)\\.get\\('content_id'\\)\\)/.test(src)
  && /laoyiEnterRoom\\(\\{opener:'content', contentTitle:contentTitle\\}\\)/.test(src)]);
for(const [name,ok] of results) console.log((ok?'PASS':'FAIL')+' '+name);
process.exit(results.every(r=>r[1])?0:1);
" 2>&1)
NODE_EXIT=$?
echo "$NODE_OUT"
NODE_PASS=$(echo "$NODE_OUT" | grep -c '^PASS')
NODE_FAIL=$(echo "$NODE_OUT" | grep -c '^FAIL')
if [ "$NODE_EXIT" -eq 0 ] && [ "$NODE_PASS" -eq 8 ] && [ "$NODE_FAIL" -eq 0 ]; then
  echo "[PASS] V1 deep-link 鏈 8/8"; ((PASS++))
else
  echo "[FAIL] V1 deep-link 鏈未全過(PASS=$NODE_PASS FAIL=$NODE_FAIL exit=$NODE_EXIT)"; ((FAIL++))
fi

echo ""
echo "=== V2: 佈線與新錨 ==="
ANCHORS=(
  "ask.onclick=function(){ studySendAskLaoyi(gidx,ask); };"
  "function studySendAskLaoyi(gidx,btnEl){"
  "location.href='./index.html?action=ask&content_id='+encodeURIComponent(a.title||'這篇文章');"
  "return '你帶來的是〈'+opts.contentTitle+'〉。文中何處讓你停下了？';"
  "var contentTitle=laoyiSanitizeTitle(new URLSearchParams(location.search).get('content_id'));"
)
ANCHOR_OK=1
for anchor in "${ANCHORS[@]}"; do
  if ! grep -qF "$anchor" "$IDX"; then
    echo "[FAIL] 現行錨點消失:$anchor"; ANCHOR_OK=0
  fi
done
if [ "$ANCHOR_OK" -eq 1 ]; then
  echo "[PASS] studySendAskLaoyi → 格5成功開場新錨完整"; ((PASS++))
else
  ((FAIL++))
fi

if ! grep -q "sendAskLaoyiIntent('問老易\\\\n我剛讀完" "$IDX" && \
   ! grep -q "async function sendAskLaoyiIntent" "$IDX"; then
  echo "[PASS] 舊 sendAskLaoyiIntent 架構零殘留"; ((PASS++))
else
  echo "[FAIL] 舊 sendAskLaoyiIntent 架構仍殘留"; ((FAIL++))
fi

echo ""
echo "=== V3: 成功開場與版本指紋 ==="
SUCCESS_COUNT=$(grep -cF "return '你帶來的是〈'+opts.contentTitle+'〉。文中何處讓你停下了？';" "$IDX")
LEGACY_COUNT=$(grep -cF '已送進對話。回到聊天室,老易接著說。' "$IDX" || true)
if [ "$SUCCESS_COUNT" -eq 1 ] && [ "${LEGACY_COUNT:-0}" -eq 0 ]; then
  echo "[PASS] 現行成功開場唯一定義，舊成功句零殘留"; ((PASS++))
else
  echo "[FAIL] 成功開場 truth 異常(current=$SUCCESS_COUNT legacy=$LEGACY_COUNT)"; ((FAIL++))
fi

if grep -qF '<title>命格 · 進場儀式 v1.6.1</title>' "$IDX" && \
   grep -qF 'v1.6.1(E55 拿這篇問老易直送對話)' "$IDX"; then
  echo "[PASS] title/foot 版本指紋同步為 v1.6.1"; ((PASS++))
else
  echo "[FAIL] 版本指紋未同步"; ((FAIL++))
fi

echo ""
echo "=== V4: E48 共享 init 零回歸 ==="
SHARE_BLOCK=$(awk '/^async function studyShareArticle/{flag=1} flag{print} /^}/{if(flag)exit}' "$IDX")
E48_ANCHORS=(
  "var text=studyBuildShareText(a);"
  "await ensureLiffInit();"
  "await liff.shareTargetPicker([{type:'text',text:text}]);"
  "location.href='https://line.me/R/share?text='+encodeURIComponent(text);"
)
E48_OK=1
for anchor in "${E48_ANCHORS[@]}"; do
  if ! echo "$SHARE_BLOCK" | grep -qF "$anchor"; then
    echo "[FAIL] E48 錨點消失:$anchor"; E48_OK=0
  fi
done
if [ "$E48_OK" -eq 1 ]; then
  echo "[PASS] studyShareArticle 共享 init/payload/fallback 錨完整"; ((PASS++))
else
  ((FAIL++))
fi

echo ""
echo "=== 總結:PASS=$PASS FAIL=$FAIL ==="
[ "$FAIL" -eq 0 ]
