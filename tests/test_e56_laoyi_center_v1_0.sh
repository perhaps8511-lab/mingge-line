#!/bin/bash
# test_e56_laoyi_center_v1_0.sh — E56 老易學習中心(格5兩態/relay直連/單向帶話/字級一致) 驗收腳本
# Ref: governance/cards/001_taskcard_e56_laoyi_center_S20260721_v1_1.md
#      plans/plan_e56_laoyi_center_v0_1.md(Codex codex exec r1-r4 互審 + Perth #6/#17/#13 拍板)
# 段① DOM/CSS 結構驗證  段② JS 純函式矩陣(Node vm)  段③ worker.js payload/契約驗證
# 段④ S1-S7 話術逐字驗證  段⑤ 邊界/禁碰範圍驗證
# 全程假資料,不碰真鑰

set -uo pipefail
PASS=0; FAIL=0

REPO_ROOT="$(dirname "$0")/.."
IDX="$REPO_ROOT/index.html"
WRK="$REPO_ROOT/workers/mingge-relay/worker.js"

pass(){ echo "[PASS] $1"; PASS=$((PASS+1)); }
fail(){ echo "[FAIL] $1"; FAIL=$((FAIL+1)); }

echo "=== 段① DOM/CSS 結構驗證 ==="

grep -qF 'id="laoyiHall"' "$IDX" && pass "門廳容器 #laoyiHall 存在" || fail "門廳容器缺失"
grep -qF 'id="laoyiRoom"' "$IDX" && pass "問答室容器 #laoyiRoom 存在" || fail "問答室容器缺失"
grep -qF 'id="laoyiThread"' "$IDX" && pass "對話串 #laoyiThread 存在" || fail "對話串缺失"
grep -qF 'id="laoyiInput"' "$IDX" && pass "輸入框 #laoyiInput 存在" || fail "輸入框缺失"
grep -qF 'id="laoyiSend"' "$IDX" && pass "送出鈕 #laoyiSend 存在" || fail "送出鈕缺失"
grep -qF 'id="laoyiSvcEntry"' "$IDX" && pass "常駐店務入口 #laoyiSvcEntry 存在" || fail "店務入口缺失"
grep -qF 'id="laoyiClosing"' "$IDX" && pass "25輪收尾容器 #laoyiClosing 存在" || fail "收尾容器缺失"

# 顯隱機制 regression guard(code review r2 blocker:.laoyi-view{display:none}+.laoyi-room{display:flex}
# 同特異度靠來源序互蓋,JS 只切 hidden 屬性卻沒有規則吃它,門廳永遠隱藏/問答室永遠顯示)
if grep -qE '^\s*\.laoyi-view\{display:' "$IDX"; then
  fail "偵測到 .laoyi-view{display:...} 無條件規則(與 .laoyi-room{display:flex} 同特異度互蓋,曾致顯隱失效,禁止復現)"
else
  pass "無 .laoyi-view{display:...} 無條件規則(顯隱互蓋地雷已拆除)"
fi
grep -qF '.laoyi-hall[hidden],.laoyi-room[hidden]{display:none;}' "$IDX" && pass "顯隱唯一機制=[hidden] 屬性選擇器(具高特異度,實測 hall/room computed display 於三情境皆正確,見 build-evidence 回報)" || fail "[hidden] 顯隱規則缺失"
grep -qF 'id="askLaoyiStatus"' "$IDX" && grep -qF 'id="askLaoyiFallback"' "$IDX" && grep -qF 'id="askLaoyiFallbackText"' "$IDX" \
  && pass "005A fallback 三節點(status/fallback/text)於問答室內保留" || fail "fallback 三節點缺失(N1所修 r1 #7)"

grep -qF 'maxlength="2000"' "$IDX" && pass "composer textarea 前端 maxlength=2000(與 worker 2000 上限同契約)" || fail "前端 maxlength 缺失"

grep -qF '.laoyi-bubble{' "$IDX" && pass ".laoyi-bubble CSS 定義存在" || fail ".laoyi-bubble CSS 缺失"

# E47:內文≥17px / 行高≥1.9(泡泡/composer/門廳段落)
if grep -A3 '\.laoyi-bubble{' "$IDX" | grep -q 'font-size:17px' && grep -A3 '\.laoyi-bubble{' "$IDX" | grep -q 'line-height:1.9'; then
  pass "E47① .laoyi-bubble font-size≥17px + line-height≥1.9"
else
  fail "E47① .laoyi-bubble 字級/行高不符"
fi
if grep -A2 '\.laoyi-composer textarea{' "$IDX" | grep -q 'font-size:17px'; then
  pass "E47① composer textarea font-size≥17px"
else
  fail "E47① composer textarea 字級不符"
fi
if grep -qF '.laoyi-hall .lp-body p{font-size:17px;line-height:1.9;}' "$IDX"; then
  pass "E47① 門廳段落 font-size≥17px + line-height≥1.9"
else
  fail "E47① 門廳段落字級不符"
fi

# C4:卦記字級一致
if grep -qF '#page-log .lp-header .lp-sub{font-size:17px;}' "$IDX"; then
  pass "C4 #page-log .lp-sub 已補齊 17px(比照 page-pay/page-study 基準)"
else
  fail "C4 卦記字級未修正"
fi

echo ""
echo "=== 段② JS 純函式矩陣(Node vm,假資料)==="

NODE_OUT=$(node "$(dirname "$0")/_e56_fn_matrix.mjs" "$IDX" 2>&1)

echo "$NODE_OUT"
NODE_FAIL=$(echo "$NODE_OUT" | grep -c '^FAIL')
NODE_PASS=$(echo "$NODE_OUT" | grep -c '^PASS')
if [ "$NODE_FAIL" -eq 0 ] && [ "$NODE_PASS" -ge 11 ]; then
  pass "段② JS 純函式矩陣 11/11 case 全過"
else
  fail "段② JS 純函式矩陣未全過(FAIL=$NODE_FAIL PASS=$NODE_PASS)"
fi

echo ""
echo "=== 段③ worker.js /laoyi/chat payload/契約驗證 ==="

node --check "$WRK" >/dev/null 2>&1 && pass "worker.js 語法檢查通過(node --check)" || fail "worker.js 語法錯誤"

grep -qF 'url.pathname === "/laoyi/chat"' "$WRK" && pass "路由 /laoyi/chat 存在" || fail "路由缺失"
ROUTE_BLOCK=$(awk '/url\.pathname === "\/laoyi\/chat"/{flag=1} flag{print; if(/^    }$/ && flag==1){exit}}' "$WRK")

echo "$ROUTE_BLOCK" | grep -qF 'resolveUserId(accessToken, LINE_CHANNEL_ID)' && pass "沿用既有 resolveUserId() LINE token 驗證" || fail "缺 LINE token 驗證"
echo "$ROUTE_BLOCK" | grep -qF 'query.length > 2000' && pass "query 長度上限 2000(與前端同契約)" || fail "query 長度上限缺失"
echo "$ROUTE_BLOCK" | grep -qF 'LAOYI_CONV_ID_RE.test(rawConvId)' && pass "conversation_id 格式白名單驗證(拒收不截斷,r1 #14)" || fail "conversation_id 驗證缺失"
echo "$ROUTE_BLOCK" | grep -qF 'if (!env.DIFY_LAOYI_KEY)' && echo "$ROUTE_BLOCK" | grep -qF '503' && pass "DIFY_LAOYI_KEY 缺鑰回 503(B2 佔位設計)" || fail "缺鑰處理缺失"
if echo "$ROUTE_BLOCK" | grep -qF 'DIFY_LAOYI_KEY' && ! echo "$ROUTE_BLOCK" | grep -Eq 'DIFY_LAOYI_KEY\s*=\s*"[A-Za-z0-9]'; then
  pass "DIFY_LAOYI_KEY 無硬編碼字面值"
else
  fail "DIFY_LAOYI_KEY 疑似硬編碼或缺失"
fi
echo "$ROUTE_BLOCK" | grep -qF 'api.dify.ai/v1/chat-messages' && pass "轉發至 Dify chat-messages blocking 端點" || fail "Dify 端點缺失"
echo "$ROUTE_BLOCK" | grep -qF 'AbortController' && echo "$ROUTE_BLOCK" | grep -qF 'LAOYI_UPSTREAM_TIMEOUT_MS' && pass "上游呼叫具 timeout(r1 #12)" || fail "timeout 缺失"
echo "$ROUTE_BLOCK" | grep -qF 'answerOk' && echo "$ROUTE_BLOCK" | grep -qF 'convOk' && pass "上游回應形狀驗證(answer/conversation_id 型別+非空,r1 #15)" || fail "上游回應驗證缺失"
echo "$ROUTE_BLOCK" | grep -qF 'hasAnswer' && ! echo "$ROUTE_BLOCK" | grep -qF 'JSON.stringify(difyData)' && pass "錯誤 log 不落原始 Dify 回應內容(r2 N2 修正)" || fail "log 可能外洩上游原始內容"
echo "$ROUTE_BLOCK" | grep -qF "code: \"" && pass "錯誤回應含穩定 code 欄位(r1 #26)" || fail "缺 code 欄位"
echo "$ROUTE_BLOCK" | grep -qF 'inputs: {}' && echo "$ROUTE_BLOCK" | grep -qF 'response_mode: "blocking"' && pass "Dify 呼叫 body 契約正確" || fail "Dify body 契約錯誤"

# CORS/OPTIONS(r1 #19,查證既有全域機制已覆蓋,非新增邏輯)
grep -qF 'if (request.method === "OPTIONS")' "$WRK" && pass "全域 OPTIONS handler 存在(涵蓋新路由,r1 #19 查證)" || fail "OPTIONS handler 缺失"
grep -A6 'function corsHeaders' "$WRK" | grep -qF 'X-Line-AccessToken' && pass "corsHeaders() Allow-Headers 含 X-Line-AccessToken(既有七路由同款,非新風險)" || fail "CORS header 缺失"

echo ""
echo "=== 段④ 話術逐字驗證(S1-S7,禁改字)==="

declare -A SCRIPTS=(
  ["S1"]="老易這裡。這一進是問學的地方——易經的道理、卦的意思、書房裡的文章，都可以問。但有三件事老夫不做：不替你占、不替你斷、不談店務帳目。占卦是天的事，店務找書僮。想清楚了，就進來坐。"
  ["S2"]="坐。今日想問哪一卦、哪一篇、哪一句？"
  ["S5"]="這是店務，老夫不管帳——書僮就在門外。你這一問，我替你帶到他案上。"
  ["S6"]="已送到書僮案上。回到聊天室，書僮接著答。"
  ["S7"]="請教老易——卦、文章、易經都可問"
)
for key in "${!SCRIPTS[@]}"; do
  text="${SCRIPTS[$key]}"
  if grep -qF "$text" "$IDX"; then
    pass "$key 逐字命中"
  else
    fail "$key 逐字不符或缺失"
  fi
done

# S3/S4 為模板/引擎生成,檢查模板骨架與固定字面片段
grep -qF "你帶來的是〈'+opts.contentTitle+'〉。文中何處讓你停下了？" "$IDX" && pass "S3 開場模板逐字(篇名以變數帶入)" || fail "S3 模板缺失或走樣"
grep -qF "心中默念此問，起一卦" "$IDX" && pass "S4 CTA 按鈕文字逐字" || fail "S4 CTA 按鈕文字缺失"

echo ""
echo "=== 段⑤ 邊界/禁碰範圍驗證 ==="

# stateless:relay 新路由不寫 Airtable/D1/KV
if echo "$ROUTE_BLOCK" | grep -qE 'AIRTABLE|api\.airtable\.com|env\.(DB|KV)'; then
  fail "偵測到 /laoyi/chat 路由疑似寫入 Airtable/D1/KV,違反 stateless 鐵則"
else
  pass "stateless:/laoyi/chat 路由零 Airtable/D1/KV 寫入"
fi

# 前端不含 Dify 端點/金鑰字面值
if grep -qF 'api.dify.ai' "$IDX" || grep -Eq 'DIFY_LAOYI_KEY\s*=\s*"' "$IDX"; then
  fail "index.html 疑似含 Dify 端點/金鑰字面值"
else
  pass "index.html 不含 Dify 端點/金鑰(僅持有既有 RELAY_URL)"
fi

# 凍結鏈零觸碰:5379670/5202754 不得出現在任何「功能性」新增行(webhook URL/env/fetch 呼叫);
# 純文件性註解提及(如 /* ... 5379670 ... */)不算觸碰 Make scenario 本身,予以排除
DIFF_MAKE_TOUCH=$(git -C "$REPO_ROOT" diff --unified=0 -- index.html workers/mingge-relay/worker.js 2>/dev/null \
  | grep -E '^\+' | grep -v '^\+++' | grep '5379670\|5202754' | grep -vE '^\+\s*(//|/\*|\*)' | grep -c . || true)
if [ "${DIFF_MAKE_TOUCH:-0}" -eq 0 ]; then
  pass "diff 中新增行零功能性觸碰 5379670/5202754(僅文件註解提及,凍結鏈零改動)"
else
  fail "diff 中新增行觸碰 5379670/5202754,逾越禁碰邊界"
fi

echo ""
echo "=== 總結:PASS=$PASS FAIL=$FAIL ==="
[ "$FAIL" -eq 0 ]
