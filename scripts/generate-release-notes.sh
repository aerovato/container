#!/bin/sh

set -eu

cd "$(dirname "$0")/.."

if [ $# -ne 1 ]; then
  echo "usage: $0 <tag>" >&2
  exit 2
fi

TAG="$1"
CHANGELOG="Changelog.md"
OUT="release-notes.md"

if [ ! -f "$CHANGELOG" ]; then
  echo "error: $CHANGELOG not found" >&2
  exit 1
fi

awk -v tag="$TAG" '
  $0=="## "tag {on=1; next}
  /^## / && on {on=0}
  on {print}
' "$CHANGELOG" | sed '/./,$!d' | tac | sed '/./,$!d' | tac > "$OUT"

if [ ! -s "$OUT" ]; then
  echo "error: no changelog entry found for $TAG in $CHANGELOG" >&2
  rm -f "$OUT"
  exit 1
fi

echo "Wrote $OUT for $TAG"
