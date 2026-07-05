#!/usr/bin/env bash
# codex-review-gate v1.0 — Stop Hook 守衛
# 職責:Claude Code 想收工時,掃 plans/ 內「本次 session 有動過」的計畫檔,
#      檔尾沒有審核 Marker → 擋下,塞指令叫 Claude 去跑 codex-review Skill。
# 只攔不審;審的方法論在 Skill(解耦:攔壞修 Hook,審爛修 Skill)。

set -euo pipefail

INPUT=$(cat)                                   # Claude Code 以 stdin 傳 hook payload(JSON)
MARKER="<!-- CODEX-REVIEW: APPROVED"           # Marker 前綴(完整規格見第 3 節)

# 防無限迴圈:stop_hook_active=true 代表本次 stop 已是 hook 觸發的續跑,直接放行
if echo "$INPUT" | grep -q '"stop_hook_active":[[:space:]]*true'; then
  exit 0
fi

PLAN_DIR="plans"
[ -d "$PLAN_DIR" ] || exit 0                   # 沒有 plans/ = 本 repo 未用計畫流,放行

# 找「最近 4 小時內修改、且缺 Marker」的計畫檔(近似「本 session 產物」)
UNAPPROVED=""
while IFS= read -r f; do
  if ! tail -n 5 "$f" | grep -q "$MARKER"; then
    UNAPPROVED="${UNAPPROVED}${f}\n"
  fi
done < <(find "$PLAN_DIR" -name '*.md' -mmin -240 2>/dev/null)

if [ -z "$UNAPPROVED" ]; then
  exit 0                                       # 全數已蓋章 → 放行
fi

# 擋下 + 回塞指令(exit 2 = block,stderr 內容會回饋給 Claude 當新指令)
>&2 printf '以下實作計畫尚未通過 Codex 互審(檔尾無 APPROVED Marker):\n%b請立即啟動 codex-review Skill(.claude/skills/codex-review/SKILL.md),對上列每一份計畫跑完整互審循環;達成共識並蓋上 Marker 之前,不得收工。\n' "$UNAPPROVED"
exit 2
