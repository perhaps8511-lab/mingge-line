#!/bin/bash
# Roll back only the per-user binding. The candidate menu itself is retained.

set -euo pipefail

: "${LINE_CHANNEL_ACCESS_TOKEN:?LINE_CHANNEL_ACCESS_TOKEN is required}"
: "${SEALED_LINE_USER_ID:?SEALED_LINE_USER_ID is required}"

case "$SEALED_LINE_USER_ID" in
  U????????????????????????????????) ;;
  *) echo "SEALED_LINE_USER_ID format is invalid" >&2; exit 2 ;;
esac

curl --fail-with-body --silent --show-error \
  -X DELETE "https://api.line.me/v2/bot/user/${SEALED_LINE_USER_ID}/richmenu" \
  -H "Authorization: Bearer ${LINE_CHANNEL_ACCESS_TOKEN}" >/dev/null

printf 'scope=single-sealed-account\n'
printf 'binding=removed\n'
printf 'default_rich_menu=unchanged\n'
