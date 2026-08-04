#!/bin/bash
# test_e086_checkout_mock_v1_0.sh — 086 格3付費卡 checkout 三態架構 + mock 結帳流 驗收腳本
# Ref: 086_dispatch_mingge_cprime_checkout_S-20260804_v1_0.md(〇/二節)
#      plan: polished-kindling-stardust(Claude Code Plan Mode,Perth 2026-08-04 放行)
# 段① DOM/設定存在性  段②文案不變回歸鎖  段③payload 契約鎖(node)  段④安全閘斷言  段⑤邊界斷言
# 全程假資料,不碰真鑰;唯一對外呼叫的雲端端點(mingge-pay-relay Worker)只在人工手動點擊時才會真的送出

set -uo pipefail
PASS=0; FAIL=0

REPO_ROOT="$(dirname "$0")/.."
IDX="$REPO_ROOT/index.html"
SUCC="$REPO_ROOT/pay_success.html"
FAILP="$REPO_ROOT/pay_failure.html"

pass(){ echo "[PASS] $1"; PASS=$((PASS+1)); }
fail(){ echo "[FAIL] $1"; FAIL=$((FAIL+1)); }

echo "=== 段① DOM/設定存在性驗證 ==="

grep -qE "^const CHECKOUT_MODE = 'mock';" "$IDX" && pass "CHECKOUT_MODE 單一設定點存在,預設 'mock'" || fail "CHECKOUT_MODE 缺失/預設值不符"
grep -qF 'const PAY_RELAY_URL = "https://mingge-pay-relay.perhaps8511.workers.dev/";' "$IDX" \
  && pass "PAY_RELAY_URL 已設定為 Perth 提供之真實 S82 relay URL" || fail "PAY_RELAY_URL 缺失/URL 不符"
grep -qF "const OEN_SANDBOX_CHECKOUT_URL = '';" "$IDX" && pass "OEN_SANDBOX_CHECKOUT_URL 佔位存在(卡片未提供真值,誠實留空)" || fail "OEN_SANDBOX_CHECKOUT_URL 缺失"
grep -qF "const OEN_PROD_CHECKOUT_URL = '';" "$IDX" && pass "OEN_PROD_CHECKOUT_URL 佔位存在(明文擱置)" || fail "OEN_PROD_CHECKOUT_URL 缺失"
grep -qF 'const PAY_PLANS = {' "$IDX" && pass "PAY_PLANS 四卡對照表存在" || fail "PAY_PLANS 缺失"
grep -qF "function isCheckoutTestViewer(){" "$IDX" && pass "isCheckoutTestViewer() 顯式測試旗標函式存在" || fail "isCheckoutTestViewer 缺失"
grep -qF "new URLSearchParams(location.search).get('paytest')==='1'" "$IDX" && pass "測試旗標為 ?paytest=1(比照既有 ?dev=1 慣例)" || fail "paytest 判斷式缺失/寫法不符"

grep -qF 'id="planPack399"' "$IDX" && pass "囊中銅錢399 卡補上 id=planPack399(原本四卡中唯一缺 id 者)" || fail "planPack399 id 未補"
grep -qF 'id="planSingle149"' "$IDX" && grep -qF 'id="planDeepdive200"' "$IDX" && grep -qF 'id="planFupan1490"' "$IDX" \
  && pass "其餘三張付費卡 id 仍在(planSingle149/planDeepdive200/planFupan1490)" || fail "既有卡片 id 缺失"

grep -qF 'id="payMockOverlay"' "$IDX" && pass "mock 結帳 overlay 容器 #payMockOverlay 存在" || fail "mock overlay 容器缺失"
grep -qF 'id="payMockOk"' "$IDX" && grep -qF 'id="payMockFail"' "$IDX" && grep -qF 'id="payMockCancel"' "$IDX" \
  && pass "mock overlay 成功/失敗/取消三顆按鈕皆存在" || fail "mock overlay 按鈕缺失(未滿三顆)"

grep -qF 'function buildPayMockPayload(planKey, result){' "$IDX" && pass "buildPayMockPayload() 純函式存在" || fail "buildPayMockPayload 缺失"
grep -qF 'async function payMockConfirm(result){' "$IDX" && pass "payMockConfirm() 存在" || fail "payMockConfirm 缺失"
grep -qF 'function initPayCheckoutCards(){' "$IDX" && pass "initPayCheckoutCards() 掛接函式存在" || fail "initPayCheckoutCards 缺失"
grep -qF 'initPayCheckoutCards(); // 086卡' "$IDX" && pass "initPayPage() 內已呼叫 initPayCheckoutCards()" || fail "initPayPage 未掛接 086 邏輯"

echo ""
echo "=== 段② 文案不變回歸鎖(Perth 硬約束②:production 預設態逐字不變)==="

TEXT_COUNT=$(grep -c '付款通道整備中;銅錢尚在,不急。' "$IDX")
if [ "$TEXT_COUNT" -eq 4 ]; then
  pass "四張付費卡「付款通道整備中;銅錢尚在,不急。」文案逐字仍在,共 4 處(既有整備態文案 = mock 態文案,未被改寫)"
else
  fail "整備中文案處數不符預期(預期 4,實際 $TEXT_COUNT)——可能誤改了現況文案"
fi

if grep -qE '^\s*function initPayCheckoutCards\(\)\{\s*$' "$IDX"; then
  FN_BLOCK=$(awk '/^function initPayCheckoutCards\(\)\{/{flag=1} flag{print; if(/^\}$/ && flag==1){exit}}' "$IDX")
  echo "$FN_BLOCK" | head -2 | grep -qF 'if(!isCheckoutTestViewer()) return;' \
    && pass "initPayCheckoutCards() 第一行即 guard isCheckoutTestViewer(),無旗標時零副作用(不掛任何 click listener)" \
    || fail "initPayCheckoutCards() 缺少 test-viewer guard,可能導致 production 誤觸發"
else
  fail "找不到 initPayCheckoutCards() 函式區塊"
fi

echo ""
echo "=== 段③ payload 契約鎖(Node,假資料,比照 test_e56 extractFn 手法)==="

NODE_OUT=$(node "$(dirname "$0")/_e086_fn_matrix.mjs" "$IDX" 2>&1)
echo "$NODE_OUT"
NODE_FAIL=$(echo "$NODE_OUT" | grep -c '^FAIL')
NODE_PASS=$(echo "$NODE_OUT" | grep -c '^PASS')
if [ "$NODE_FAIL" -eq 0 ] && [ "$NODE_PASS" -ge 8 ]; then
  pass "段③ JS 純函式矩陣 8/8 case 全過(payload 六欄位契約鎖)"
else
  fail "段③ JS 純函式矩陣未全過(FAIL=$NODE_FAIL PASS=$NODE_PASS)"
fi

echo ""
echo "=== 段④ 安全閘斷言 ==="

if grep -qE "orderId: 'MOCK-'|orderId: orderId" "$IDX"; then
  pass "orderId 為前端動態生成(MOCK- 前綴),非寫死字面值"
else
  fail "orderId 生成邏輯不符預期"
fi

# pay_success.html / pay_failure.html:query 參數必須用 textContent 寫入,禁 innerHTML(防 XSS)
for F in "$SUCC" "$FAILP"; do
  NAME=$(basename "$F")
  if grep -qF 'el.textContent = parts.join' "$F" && ! grep -qF '.innerHTML' "$F"; then
    pass "$NAME 用 textContent 寫入 query 參數,無 innerHTML(防 query string 反射 XSS)"
  else
    fail "$NAME query 參數注入方式不符安全預期"
  fi
  grep -qF 'id="orderDetail" hidden' "$F" && pass "$NAME 無參數時 #orderDetail 預設 hidden(維持現況文案)" || fail "$NAME 缺少 hidden 預設"
done

# 現況既有文案逐字不動(pay_success/pay_failure 誠實態語氣沿用)
grep -qF '收據與開通通知已送至您的' "$SUCC" && pass "pay_success.html 既有文案逐字保留" || fail "pay_success.html 既有文案疑似被改寫"
grep -qF '本次交易未成立,' "$FAILP" && pass "pay_failure.html 既有文案逐字保留" || fail "pay_failure.html 既有文案疑似被改寫"

echo ""
echo "=== 段⑤ 邊界斷言(禁碰雲端/Worker 原始碼、禁碰 sanmus2-line-ai-pool)==="

WORKER_DIFF=$(git -C "$REPO_ROOT" diff --stat main -- workers/ 2>/dev/null | grep -c . || true)
if [ "${WORKER_DIFF:-0}" -eq 0 ]; then
  pass "workers/ 目錄零改動(本卡只引用已部署的 mingge-pay-relay URL,不碰任何 Worker 原始碼)"
else
  fail "workers/ 目錄偵測到改動,逾越本卡邊界(禁碰雲端/Cloudflare)"
fi

# 金鑰/token 零觸碰(本卡邊界:「金鑰與 token 不碰不問」)
if git -C "$REPO_ROOT" diff --unified=0 main -- index.html pay_success.html pay_failure.html 2>/dev/null \
  | grep -E '^\+' | grep -v '^\+++' | grep -qiE 'MAKE_PAY_HOOK|channel.?token|JWT'; then
  fail "diff 中偵測到金鑰/token 相關字樣,逾越本卡邊界"
else
  pass "diff 中零金鑰/token 字樣觸碰(MAKE_PAY_HOOK/channel token/JWT 均未出現)"
fi

echo ""
echo "---SUMMARY--- PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
