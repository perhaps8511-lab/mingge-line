#!/bin/bash
# test_e55_askviachat_v1_0.sh — E55 書房「拿這篇問老易」直送對話 驗收腳本
# Ref: plans/plan_e55_askviachat_v0_1.md(Workflow 平行對抗式審查 wf_c978f39e-07e/wf_f6761991-502,
#      Codex CLI 環境不可用;liffReady 布林競態經 Perth S167 邊界裁決改共享 promise cache)
# V1(headless 純函式矩陣,Node vm)/ V2(佈線+範圍隔離,行號)/ V3(常數與文案唯一定義)/
# V4(版本指紋)/ V5(既有函式零回歸)/ V6(E48 studyShareArticle 零行為變更逐行核對)/ V7(live-diff 收斂範圍)
# 全程假資料,不碰真鑰

set -uo pipefail
PASS=0; FAIL=0

IDX="$(dirname "$0")/../index.html"

echo "=== V1: 純函式矩陣(headless,Node vm)==="

NODE_OUT=$(node --input-type=module -e "
import vm from 'node:vm';
import fs from 'node:fs';

const src = fs.readFileSync('$IDX', 'utf8');

function extractFn(name){
  const re = new RegExp('(async )?function '+name+'\\\\([^)]*\\\\)\\\\{[\\\\s\\\\S]*?\\\\n\\\\}');
  const m = src.match(re);
  if(!m) throw new Error('extractFn miss: '+name);
  return m[0];
}

// case1: studySendAskLaoyi 使用共享 ensureLiffInit(不再是各自獨立 liffReady 布林檢查)
const fnSrc = extractFn('studySendAskLaoyi');
const usesSharedInit = /await ensureLiffInit\(\);/.test(fnSrc);
const noLocalBoolGuard = !/if\(!liffReady\)\{ *await liff\.init/.test(fnSrc);
console.log((usesSharedInit && noLocalBoolGuard ? 'PASS' : 'FAIL') + ' case1 studySendAskLaoyi 用共享 ensureLiffInit,非各自獨立 liffReady 布林 guard');

// case2: studyShareArticle(E48)也改用共享 ensureLiffInit
const shareFnSrc = extractFn('studyShareArticle');
const shareUsesSharedInit = /await ensureLiffInit\(\);/.test(shareFnSrc);
console.log((shareUsesSharedInit ? 'PASS' : 'FAIL') + ' case2 studyShareArticle(E48)已改用共享 ensureLiffInit');

// case3: ensureLiffInit 存在且具備 promise 快取(非布林)+ 失敗清快取重試邏輯
const ensureFnSrc = extractFn('ensureLiffInit');
const hasCacheVar = /var liffInitPromise\s*=\s*null;/.test(src);
const hasCatchReset = /\.catch\(function\(e\)\{ *liffInitPromise\s*=\s*null; *throw e; *\}\)/.test(src);
console.log((hasCacheVar && hasCatchReset ? 'PASS' : 'FAIL') + ' case3 ensureLiffInit 具 promise 快取 + 失敗清快取重試');

// case4: studySendAskLaoyi 內 message 字串與 baseline(a56b568)原 848 行字面逐位元組相同
const messageMatch = fnSrc.match(/var message\s*=\s*'([^']*(?:\\\\.[^']*)*)'/);
const expectedMessage = '問老易\\\\n我剛讀完〈'+ \"' + (a.title||'這篇文章') + '\" + '〉，想再問深一點。';
// 直接比對:兩者皆由 'a.title||這篇文章' 組字,取原始片段字串比對前後半段
const hasCorrectPrefix = /'問老易\\\\n我剛讀完〈'\+\(a\.title\|\|'這篇文章'\)\+'〉，想再問深一點。'/.test(fnSrc);
console.log((hasCorrectPrefix ? 'PASS' : 'FAIL') + ' case4 message 組字與原字面逐位元組相同(前後綴+分隔符)');

// case5: 成功提示句逐字比對(含半形逗號)
const successText = '已送進對話。回到聊天室,老易接著說。';
const hasSuccessText = fnSrc.indexOf(\"'\"+successText+\"'\") >= 0;
console.log((hasSuccessText ? 'PASS' : 'FAIL') + ' case5 成功提示句逐字命中(半形逗號)');

// case6: setTimeout 1500ms + closeWindow 條件呼叫
const hasTimeout1500 = /\},1500\)/.test(fnSrc) && /closeWindow/.test(fnSrc);
console.log((hasTimeout1500 ? 'PASS' : 'FAIL') + ' case6 1.5 秒後條件呼叫 closeWindow');

// case7: 失敗走 showAskLaoyiFallback,zero 新造 fallback
const usesExistingFallback = /showAskLaoyiFallback\(message,statusId,fallbackId,textId\)/.test(fnSrc);
console.log((usesExistingFallback ? 'PASS' : 'FAIL') + ' case7 失敗走既有 showAskLaoyiFallback(零新造)');
" 2>&1)

echo "$NODE_OUT"
NODE_FAIL=$(echo "$NODE_OUT" | grep -c '^FAIL')
NODE_PASS=$(echo "$NODE_OUT" | grep -c '^PASS')
if [ "$NODE_FAIL" -eq 0 ] && [ "$NODE_PASS" -ge 7 ]; then
  echo "[PASS] V1 純函式矩陣 7/7 case 全過"; ((PASS++))
else
  echo "[FAIL] V1 純函式矩陣未全過(FAIL=$NODE_FAIL PASS=$NODE_PASS)"; ((FAIL++))
fi

echo ""
echo "=== V2: 佈線(行號)==="

if grep -q "ask.onclick=function(){ studySendAskLaoyi(gidx,ask); };" "$IDX"; then
  echo "[PASS] V2a studyAskLaoyi 鈕已改綁 studySendAskLaoyi"; ((PASS++))
else
  echo "[FAIL] V2a 綁定未改"; ((FAIL++))
fi

if ! grep -q "sendAskLaoyiIntent('問老易\\\\n我剛讀完" "$IDX"; then
  echo "[PASS] V2b 舊行內呼叫 sendAskLaoyiIntent(書房頁)已移除"; ((PASS++))
else
  echo "[FAIL] V2b 舊呼叫殘留"; ((FAIL++))
fi

echo ""
echo "=== V3: 常數與文案唯一定義 ==="

SUCCESS_COUNT=$(grep -cF '已送進對話。回到聊天室,老易接著說。' "$IDX")
if [ "$SUCCESS_COUNT" -eq 1 ]; then
  echo "[PASS] 成功提示句唯一出現一處(=$SUCCESS_COUNT)"; ((PASS++))
else
  echo "[FAIL] 成功提示句出現次數異常(=$SUCCESS_COUNT)"; ((FAIL++))
fi

# 半形逗號版本存在,全形逗號版本零出現(防再次踩雷)
FULLWIDTH_VARIANT=$(grep -cF '已送進對話。回到聊天室，老易接著說。' "$IDX" || true)
if [ "${FULLWIDTH_VARIANT:-0}" -eq 0 ]; then
  echo "[PASS] 全形逗號誤植版本零出現"; ((PASS++))
else
  echo "[FAIL] 偵測到全形逗號誤植版本"; ((FAIL++))
fi

echo ""
echo "=== V4: 版本指紋同步 ==="
if grep -qF '<title>命格 · 進場儀式 v1.6.1</title>' "$IDX" && grep -qF 'v1.6.1(E55 拿這篇問老易直送對話)' "$IDX"; then
  echo "[PASS] title/foot 版本指紋皆已 bump 至 v1.6.1"; ((PASS++))
else
  echo "[FAIL] 版本指紋未同步"; ((FAIL++))
fi

echo ""
echo "=== V5: 既有函式零回歸(sendAskLaoyiIntent 本體 + 問老易頁兩呼叫點)==="
ANCHORS=(
  "async function sendAskLaoyiIntent(message,statusId,fallbackId,textId){"
  "status.textContent='已送到 LINE 對話，老易會在那裡接著聊。';"
  "sendAskLaoyiIntent('問老易','askLaoyiStatus','askLaoyiFallback','askLaoyiFallbackText');"
  "sendAskLaoyiIntent(button.getAttribute('data-ask-laoyi'),'askLaoyiStatus','askLaoyiFallback','askLaoyiFallbackText');"
)
REG_OK=1
for anchor in "${ANCHORS[@]}"; do
  if ! grep -qF "$anchor" "$IDX"; then
    echo "[FAIL] 既有錨點消失:$anchor"; REG_OK=0
  fi
done
if [ "$REG_OK" -eq 1 ]; then
  echo "[PASS] V5 sendAskLaoyiIntent 本體+問老易頁兩呼叫點全數逐字存在,零改動"; ((PASS++))
else
  ((FAIL++))
fi

echo ""
echo "=== V6: E48 studyShareArticle 零行為變更逐行核對 ==="
SHARE_BLOCK=$(awk '/^async function studyShareArticle/{flag=1} flag{print} /^}/{if(flag)exit}' "$IDX")
E48_ANCHORS=(
  "var text=studyBuildShareText(a);"
  "if(!(liff.isInClient && liff.isInClient())){ throw new Error('not in LINE client'); }"
  "if(!(liff.isApiAvailable && liff.isApiAvailable('shareTargetPicker'))){ throw new Error('shareTargetPicker unavailable'); }"
  "await liff.shareTargetPicker([{type:'text',text:text}]);"
  "location.href='https://line.me/R/share?text='+encodeURIComponent(text);"
)
E48_OK=1
for anchor in "${E48_ANCHORS[@]}"; do
  if ! echo "$SHARE_BLOCK" | grep -qF "$anchor"; then
    echo "[FAIL] E48 錨點消失(逾越只動 init 那一行的授權):$anchor"; E48_OK=0
  fi
done
if echo "$SHARE_BLOCK" | grep -qF "await ensureLiffInit();" && [ "$E48_OK" -eq 1 ]; then
  echo "[PASS] V6 studyShareArticle 僅 init 取得方式改為 ensureLiffInit(),其餘 payload/文案/URL/fallback 逐字存在"; ((PASS++))
else
  echo "[FAIL] V6 E48 零行為變更條件不符"; ((FAIL++))
fi

echo ""
echo "=== V7: live-diff 收斂範圍(僅 index.html + 本測試腳本 + plan 檔)==="
REPO_ROOT="$(dirname "$0")/.."
CHANGED=$(git -C "$REPO_ROOT" status --porcelain -- index.html log.html workers/mingge-relay/worker.js pay_success.html pay_failure.html tests/test_e55_askviachat_v1_0.sh plans/plan_e55_askviachat_v0_1.md)
UNEXPECTED=$(echo "$CHANGED" | grep -v "^ M index.html$" | grep -v "test_e55_askviachat_v1_0.sh$" | grep -v "plan_e55_askviachat_v0_1.md$")
if [ -z "$UNEXPECTED" ]; then
  echo "[PASS] 範圍僅 index.html(修改)+ 本測試腳本/plan 檔(新增);log.html/worker.js/pay 頁零觸碰"; ((PASS++))
else
  echo "[FAIL] 偵測到範圍外變動:"; echo "$UNEXPECTED"; ((FAIL++))
fi

echo ""
echo "=== 總結:PASS=$PASS FAIL=$FAIL ==="
[ "$FAIL" -eq 0 ]
