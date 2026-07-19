#!/bin/bash
# test_e48_e52_shufang_v1_0.sh — E48 書房分享卡 + E52 讀卦隨筆第四分類 驗收腳本
# Ref: plans/plan_e48_e52_shufang_frontend_v0_1.md(獨立 subagent 對抗式審查 PASS,見 plan 檔 Round 1 段落
#      — Codex CLI 本機環境不可用,7 種模型名皆同一帳號層錯誤,已在 plan 檔揭露)
# V1(headless 純函式矩陣,Node vm)/ V2(佈線+範圍隔離,行號)/ V3(常數與文案唯一定義)/ V4(live-diff 收斂範圍)
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
function extractVar(name){
  const re = new RegExp('(?:var|const) '+name+'\\\\s*=\\\\s*.*?;');
  const m = src.match(re);
  if(!m) throw new Error('extractVar miss: '+name);
  return m[0];
}

const code = [
  extractVar('STUDY_CATS'),
  extractVar('STUDY_MARK'),
  extractVar('STUDY_QUOTE_RE'),
  extractVar('OA_ADD_FRIEND_URL'),
  extractFn('studyShareQuote'),
  extractFn('studyBuildShareText'),
  'globalThis.__STUDY_CATS = STUDY_CATS;',
  'globalThis.__OA_ADD_FRIEND_URL = OA_ADD_FRIEND_URL;',
  'globalThis.__studyShareQuote = studyShareQuote;',
  'globalThis.__studyBuildShareText = studyBuildShareText;',
].join('\\n\\n');

const ctx = { console };
vm.createContext(ctx);
vm.runInContext(code, ctx);

const results = [];

// case1: STUDY_CATS 四分類、順序、讀卦隨筆在末位
results.push(['case1 STUDY_CATS=[節氣信,人際小文,時節問候,讀卦隨筆]',
  JSON.stringify(ctx.__STUDY_CATS) === JSON.stringify(['節氣信','人際小文','時節問候','讀卦隨筆'])]);

// case2: OA_ADD_FRIEND_URL 值正確
results.push(['case2 OA_ADD_FRIEND_URL===https://lin.ee/pWlYLBe',
  ctx.__OA_ADD_FRIEND_URL === 'https://lin.ee/pWlYLBe']);

// case3: 含古典引文的 body(仿 rj/jq 既有格式)→ 抽出引文
const bodyWithQuote = '老易在書房，談帶新人。\n\n帶新人最常犯的，是教得太滿。蒙卦的卦辭說「匪我求童蒙，童蒙求我」——不是老師追著學生教。\n\n您現在帶的那個人，是您追著教得多，還是他追著問得多？\n\n—— 書房常開。';
results.push(['case3 studyShareQuote 抽出卦辭引文',
  ctx.__studyShareQuote(bodyWithQuote) === '「匪我求童蒙，童蒙求我」']);

// case4: 純問候 body(wh 系列,無卦引)→ 空字串
const bodyNoQuote = '老易在書房，寫於雨水。\n\n春雨落得細，事也不必趕得急。今年的局才剛潤開，容它慢慢滲。\n\n雨水安好。';
results.push(['case4 studyShareQuote 無卦引回傳空字串',
  ctx.__studyShareQuote(bodyNoQuote) === '']);

// case5: studyBuildShareText 含引文 → 6 行,含 ?src=share
const a1 = { title:'帶新人：等他來問，火候才對', body: bodyWithQuote };
const text1 = ctx.__studyBuildShareText(a1);
const lines1 = text1.split('\n');
results.push(['case5 含引文:6 行結構正確', lines1.length === 6
  && lines1[0] === '【易經書房】帶新人：等他來問，火候才對'
  && lines1[1] === ''
  && lines1[2] === '「匪我求童蒙，童蒙求我」'
  && lines1[3] === ''
  && lines1[4] === '—— 易經書房 · 命格'
  && lines1[5] === 'https://lin.ee/pWlYLBe?src=share']);

// case6: studyBuildShareText 無引文 → 4 行,零壞版(無連續空行/結尾為連結)
const a2 = { title:'純問候 — 雨水', body: bodyNoQuote };
const text2 = ctx.__studyBuildShareText(a2);
const lines2 = text2.split('\n');
results.push(['case6 無引文:4 行結構正確、零多餘空行', lines2.length === 4
  && lines2[0] === '【易經書房】純問候 — 雨水'
  && lines2[1] === ''
  && lines2[2] === '—— 易經書房 · 命格'
  && lines2[3] === 'https://lin.ee/pWlYLBe?src=share']);

// case7: 標題為空字串時不拋錯(schema guard 邊界)
const a3 = { title:'', body:'' };
let threw7 = false;
try{ ctx.__studyBuildShareText(a3); }catch(e){ threw7 = true; }
results.push(['case7 title/body 皆空不拋錯', !threw7]);

for(const [name, ok] of results){
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + name);
}
if(results.some(r => !r[1])) process.exit(1);
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
echo "=== V2: 佈線 + 範圍隔離(B1 結構性排除,行號)==="

STUDY_BLOCK=$(awk '/id="page-study"/{flag=1} flag{print} /id="page-log"/{if(flag)exit}' "$IDX")
LOG_BLOCK=$(awk '/id="page-log"/{flag=1} flag{print} /id="page-about"/{if(flag)exit}' "$IDX")
ABOUT_BLOCK=$(awk '/id="page-about"/{flag=1} flag{print} /class="foot"/{if(flag)exit}' "$IDX")

if echo "$STUDY_BLOCK" | grep -q 'studyShareBtn' \
  && ! echo "$LOG_BLOCK" | grep -q 'studyShareBtn' \
  && ! echo "$ABOUT_BLOCK" | grep -q 'studyShareBtn'; then
  echo "[PASS] V2a studyShareBtn 僅落在 #page-study,#page-log/#page-about 零命中"; ((PASS++))
else
  echo "[FAIL] V2a studyShareBtn 範圍隔離失敗"; ((FAIL++))
fi

if grep -q "shareBtn.onclick=function(){ studyShareArticle(gidx,shareBtn); }" "$IDX"; then
  BIND_LINE=$(grep -n "shareBtn.onclick=function(){ studyShareArticle(gidx,shareBtn); }" "$IDX" | head -1 | cut -d: -f1)
  ASK_LINE=$(grep -n "ask.onclick=function(){" "$IDX" | head -1 | cut -d: -f1)
  if [ "$BIND_LINE" -gt "$ASK_LINE" ]; then
    echo "[PASS] V2b 分享鈕綁定(行 $BIND_LINE)在既有問老易鈕綁定(行 $ASK_LINE)之後,追加不插隊"; ((PASS++))
  else
    echo "[FAIL] V2b 綁定順序不符預期"; ((FAIL++))
  fi
else
  echo "[FAIL] V2b 找不到分享鈕綁定"; ((FAIL++))
fi

# liffReady 旗標防護慣例一致性(對抗 E09 同頁雙重初始化搶跑)
if grep -q "async function studyShareArticle" "$IDX" && \
   awk '/async function studyShareArticle/{flag=1} flag{print} /^}/{if(flag)exit}' "$IDX" | grep -q "if(!liffReady){ await liff.init({liffId:LIFF_ID}); liffReady=true; }"; then
  echo "[PASS] V2c studyShareArticle 用 liffReady 旗標防護(同既有 recoverLiffToken 慣例)"; ((PASS++))
else
  echo "[FAIL] V2c studyShareArticle 缺 liffReady 旗標防護"; ((FAIL++))
fi

# fallback 用 location.href,不用 window.open(避免 await 後脫離使用者手勢鏈被靜默擋下)
if awk '/async function studyShareArticle/{flag=1} flag{print} /^}/{if(flag)exit}' "$IDX" | grep -q "location.href='https://line.me/R/share?text='" \
  && ! awk '/async function studyShareArticle/{flag=1} flag{print} /^}/{if(flag)exit}' "$IDX" | grep -q "window.open"; then
  echo "[PASS] V2d fallback 用 location.href,零 window.open"; ((PASS++))
else
  echo "[FAIL] V2d fallback 未用 location.href 或誤用 window.open"; ((FAIL++))
fi

echo ""
echo "=== V3: 常數與文案唯一定義 ==="

CONST_COUNT=$(grep -cF 'const OA_ADD_FRIEND_URL = "https://lin.ee/pWlYLBe";' "$IDX")
LITERAL_COUNT=$(grep -cF 'lin.ee/pWlYLBe' "$IDX")
if [ "$CONST_COUNT" -eq 1 ] && [ "$LITERAL_COUNT" -eq 1 ]; then
  echo "[PASS] OA_ADD_FRIEND_URL 常數唯一定義,字面短鏈僅出現一處(定義=$CONST_COUNT,字面=$LITERAL_COUNT)"; ((PASS++))
else
  echo "[FAIL] OA_ADD_FRIEND_URL 常數化條件不符(定義=$CONST_COUNT,字面=$LITERAL_COUNT)"; ((FAIL++))
fi

BRAND_COUNT=$(grep -cF "'—— 易經書房 · 命格'" "$IDX")
if [ "$BRAND_COUNT" -eq 1 ]; then
  echo "[PASS] 分享品牌行「—— 易經書房 · 命格」僅出現一處(定義於 studyBuildShareText)"; ((PASS++))
else
  echo "[FAIL] 品牌行出現次數異常(=$BRAND_COUNT)"; ((FAIL++))
fi

echo ""
echo "=== V4: 版本指紋同步 ==="
if grep -qF '<title>命格 · 進場儀式 v1.6.0</title>' "$IDX" && grep -qF 'v1.6.0(E48/E52 書房分享卡+讀卦隨筆)' "$IDX"; then
  echo "[PASS] title/foot 版本指紋皆已 bump 至 v1.6.0"; ((PASS++))
else
  echo "[FAIL] 版本指紋未同步"; ((FAIL++))
fi

echo ""
echo "=== V5: 既有三分類零回歸(逐項既有函式/樣式存在性,零改寫佐證)==="
REGRESSION_ANCHORS=(
  "function studyRenderCover()"
  "function studyRenderList(cat)"
  "function studyRenderRead(gidx,from)"
  ".study-tag{background:transparent"
  ".study-card{position:relative"
  ".study-read .sr-body{font-size:17px;line-height:1.95"
)
REG_OK=1
for anchor in "${REGRESSION_ANCHORS[@]}"; do
  if ! grep -qF "$anchor" "$IDX"; then
    echo "[FAIL] 既有錨點消失:$anchor"; REG_OK=0
  fi
done
if [ "$REG_OK" -eq 1 ]; then
  echo "[PASS] V5 既有三分類渲染函式/CSS 錨點全數存在,零刪改"; ((PASS++))
else
  ((FAIL++))
fi

echo ""
echo "=== V6: live-diff 收斂範圍(僅 index.html + 本測試腳本 + plan 檔)==="
REPO_ROOT="$(dirname "$0")/.."
CHANGED=$(git -C "$REPO_ROOT" status --porcelain -- index.html log.html workers/mingge-relay/worker.js pay_success.html pay_failure.html tests/test_e48_e52_shufang_v1_0.sh plans/plan_e48_e52_shufang_frontend_v0_1.md)
UNEXPECTED=$(echo "$CHANGED" | grep -v "^ M index.html$" | grep -v "test_e48_e52_shufang_v1_0.sh$" | grep -v "plan_e48_e52_shufang_frontend_v0_1.md$")
if [ -z "$UNEXPECTED" ]; then
  echo "[PASS] 範圍僅 index.html(修改)+ 本測試腳本/plan 檔(新增);log.html/worker.js/pay 頁零觸碰"; ((PASS++))
else
  echo "[FAIL] 偵測到範圍外變動:"; echo "$UNEXPECTED"; ((FAIL++))
fi

echo ""
echo "=== 總結:PASS=$PASS FAIL=$FAIL ==="
[ "$FAIL" -eq 0 ]
