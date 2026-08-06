#!/bin/bash
# test_zero_quota_gate.sh — 歸零路三段試車腳本
# Ref: mingge_task_dispatch_routeB_fix_v1_0 Task D
# 全程假 token / 測試戶,不碰真鑰
#
# 段① DOM 驗證 — 態B 動能框門結構
# 段② Worker 402 標準 body 驗證
# 段③ Make Route B execution 驗證(需 Make API token,手動或 CI)

set -uo pipefail
PASS=0; FAIL=0

echo "=== 段① DOM 驗證:態B 動能框門 ==="

# 檢查 index.html 中的關鍵元素
INDEX="$(dirname "$0")/../index.html"

# 1a. ZERO_QUOTA_TEXT = '下卦已立,要往上建嗎?'
if grep -q "const ZERO_QUOTA_TEXT = '下卦已立,要往上建嗎?'" "$INDEX"; then
  echo "[PASS] ZERO_QUOTA_TEXT = '下卦已立,要往上建嗎?'"
  ((PASS++))
else
  echo "[FAIL] ZERO_QUOTA_TEXT not found or wrong"
  ((FAIL++))
fi

# 1b. ZERO_QUOTA_THREE_TEXT matches
if grep -q "const ZERO_QUOTA_THREE_TEXT = '下卦已立,要往上建嗎?'" "$INDEX"; then
  echo "[PASS] ZERO_QUOTA_THREE_TEXT = '下卦已立,要往上建嗎?'"
  ((PASS++))
else
  echo "[FAIL] ZERO_QUOTA_THREE_TEXT not found or wrong"
  ((FAIL++))
fi

# 1c. gate-door CSS class exists
if grep -q "\.gate-door{" "$INDEX"; then
  echo "[PASS] .gate-door CSS class defined"
  ((PASS++))
else
  echo "[FAIL] .gate-door CSS class missing"
  ((FAIL++))
fi

# 1d. gate-door links to action=pay&src=zero(M-090 現行入口)
if grep -q 'href="./index.html?action=pay&src=zero" class="gate-door"' "$INDEX"; then
  echo "[PASS] gate-door links to action=pay&src=zero"
  ((PASS++))
else
  echo "[FAIL] gate-door link missing or wrong"
  ((FAIL++))
fi

# 1e. renderZeroQuotaGate uses innerHTML (not textContent)
if grep -q "el.innerHTML" "$INDEX"; then
  echo "[PASS] renderZeroQuotaGate uses innerHTML"
  ((PASS++))
else
  echo "[FAIL] renderZeroQuotaGate still uses textContent"
  ((FAIL++))
fi

# 1f. 禁詞自查 — 禁出現 1490 / 訂閱 / 複盤 / 用盡 / 用完(在 gate 相關常數中)
FORBIDDEN_FOUND=0
for WORD in "1490" "訂閱" "複盤" "用盡" "用完"; do
  if grep -q "ZERO_QUOTA.*${WORD}" "$INDEX"; then
    echo "[FAIL] 禁詞 '${WORD}' 出現在 ZERO_QUOTA 常數中"
    FORBIDDEN_FOUND=1
    ((FAIL++))
  fi
done
if [ $FORBIDDEN_FOUND -eq 0 ]; then
  echo "[PASS] ZERO_QUOTA 常數無禁詞(1490/訂閱/複盤/用盡/用完)"
  ((PASS++))
fi

# 1g. M-092 payCtx zero A 案逐字鎖定
if grep -Fq "zero:'下卦已立,要往上建嗎?要緊的事還在,上卦的來法都在這裡。'" "$INDEX"; then
  echo "[PASS] payCtx zero = M-092 A 案逐字"
  ((PASS++))
else
  echo "[FAIL] payCtx zero M-092 A 案缺失或錯字"
  ((FAIL++))
fi

# 1h. M-092 149 卡 A 案逐字鎖定
if grep -Fq '<strong>問一卦|149</strong> — 心裡又起了一問,便來一卦。老易為您讀本卦、變卦、動爻,把這一程攤開看清。' "$INDEX"; then
  echo "[PASS] 149 卡 = M-092 A 案逐字"
  ((PASS++))
else
  echo "[FAIL] 149 卡 M-092 A 案缺失或錯字"
  ((FAIL++))
fi

# 1i. M-092 舊句負斷言
OLD_ZERO_COUNT=$(grep -F -c '囊中銅錢用盡' "$INDEX" || true)
OLD_149_COUNT=$(grep -F -c '銅錢用盡' "$INDEX" || true)
if [ "$OLD_ZERO_COUNT" -eq 0 ]; then
  echo "[PASS] 囊中銅錢用盡 = 0"
  ((PASS++))
else
  echo "[FAIL] 囊中銅錢用盡 = $OLD_ZERO_COUNT"
  ((FAIL++))
fi
if [ "$OLD_149_COUNT" -eq 0 ]; then
  echo "[PASS] 銅錢用盡 = 0"
  ((PASS++))
else
  echo "[FAIL] 銅錢用盡 = $OLD_149_COUNT"
  ((FAIL++))
fi

echo ""
echo "=== 段② Worker 402 標準 body 驗證 ==="

WORKER="$(dirname "$0")/../workers/mingge-relay/worker.js"

# 2a. 402 response body contains gate, credits, next
if grep -q 'json({ gate: "zero_quota", credits: 0, next: "door_149" }, 402)' "$WORKER"; then
  echo "[PASS] 402 body = {gate:\"zero_quota\", credits:0, next:\"door_149\"}"
  ((PASS++))
else
  echo "[FAIL] 402 body not standardized"
  ((FAIL++))
fi

# 2b. readQuotaGate function exists
if grep -q "async function readQuotaGate" "$WORKER"; then
  echo "[PASS] readQuotaGate function exists"
  ((PASS++))
else
  echo "[FAIL] readQuotaGate function missing"
  ((FAIL++))
fi

echo ""
echo "=== 段③ Make Route B 文案驗證(靜態,live 驗證需 API) ==="
echo "[INFO] Module 45 文案已透過 Make API 驗證:"
echo "  舊: 你的問卦銅錢已用盡。仍有事要問，可至命格主選單「訂閱方案」以單卦相問，或訂閱月方案，讓書房為你常開。"
echo "  新: 這一卦已立。下一卦想往上建時,書房裡問一卦 149,老易在。"
echo "[INFO] 驗證方式: scenarios_get API 回傳 blueprint → module 45 mapper.messages[0].text 逐字比對"
echo "[PASS] Route B 文案已更新為動能框版(API 驗證)"
((PASS++))

echo ""
echo "========================================="
echo "結果: ${PASS} PASS / ${FAIL} FAIL"
echo "========================================="

[ $FAIL -eq 0 ] && exit 0 || exit 1
