#!/bin/bash
# Create a non-default Rich Menu candidate and link it to exactly one sealed account.
# Required environment variables are consumed without being printed:
#   LINE_CHANNEL_ACCESS_TOKEN, SEALED_LINE_USER_ID

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MAP="$ROOT/plans/mingge_showcase_005b_rich_menu_mapping_v1_0.json"
IMAGE="$ROOT/assets/richmenu_mingge_005b_2500x1686_v1_0.png"

: "${LINE_CHANNEL_ACCESS_TOKEN:?LINE_CHANNEL_ACCESS_TOKEN is required}"
: "${SEALED_LINE_USER_ID:?SEALED_LINE_USER_ID is required}"

case "$SEALED_LINE_USER_ID" in
  U????????????????????????????????) ;;
  *) echo "SEALED_LINE_USER_ID format is invalid" >&2; exit 2 ;;
esac

test -f "$MAP"
test -f "$IMAGE"

read -r WIDTH HEIGHT < <(node -e '
const fs=require("fs");
const b=fs.readFileSync(process.argv[1]);
if(b.length<24 || b.toString("hex",0,8)!=="89504e470d0a1a0a") process.exit(2);
process.stdout.write(`${b.readUInt32BE(16)} ${b.readUInt32BE(20)}`);
' "$IMAGE")
BYTES="$(wc -c < "$IMAGE")"
if [ "$WIDTH" != "2500" ] || [ "$HEIGHT" != "1686" ] || [ "$BYTES" -ge 1000000 ]; then
  echo "Rich Menu image contract failed" >&2
  exit 3
fi

CREATE_BODY="$(curl --fail-with-body --silent --show-error \
  -X POST 'https://api.line.me/v2/bot/richmenu' \
  -H "Authorization: Bearer ${LINE_CHANNEL_ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  --data-binary "@$MAP")"

RICH_MENU_ID="$(node -e '
const body=JSON.parse(process.argv[1]);
if(typeof body.richMenuId!=="string" || !body.richMenuId.startsWith("richmenu-")) process.exit(2);
process.stdout.write(body.richMenuId);
' "$CREATE_BODY")"

curl --fail-with-body --silent --show-error \
  -X POST "https://api-data.line.me/v2/bot/richmenu/${RICH_MENU_ID}/content" \
  -H "Authorization: Bearer ${LINE_CHANNEL_ACCESS_TOKEN}" \
  -H 'Content-Type: image/png' \
  --data-binary "@$IMAGE" >/dev/null

curl --fail-with-body --silent --show-error \
  -X POST "https://api.line.me/v2/bot/user/${SEALED_LINE_USER_ID}/richmenu/${RICH_MENU_ID}" \
  -H "Authorization: Bearer ${LINE_CHANNEL_ACCESS_TOKEN}" >/dev/null

LINKED_ID="$(curl --fail-with-body --silent --show-error \
  -H "Authorization: Bearer ${LINE_CHANNEL_ACCESS_TOKEN}" \
  "https://api.line.me/v2/bot/user/${SEALED_LINE_USER_ID}/richmenu" \
  | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  const body=JSON.parse(s);
  if(typeof body.richMenuId!=="string") process.exit(2);
  process.stdout.write(body.richMenuId);
});
')"

if [ "$LINKED_ID" != "$RICH_MENU_ID" ]; then
  echo "Per-user Rich Menu readback mismatch" >&2
  exit 4
fi

printf 'rich_menu_id=%s\n' "$RICH_MENU_ID"
printf 'scope=single-sealed-account\n'
printf 'default_rich_menu=unchanged\n'
