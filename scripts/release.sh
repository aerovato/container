#!/bin/sh

set -eu

version=${1:-}

if [ -z "$version" ]; then
  printf '%s\n' 'Usage: npm run release -- <version>' >&2
  exit 1
fi

# Normalize to vx.x.x
case "$version" in
  v*) tag="$version" ;;
  *) tag="v$version" ;;
esac

npm run release-notes "$tag"
rm release-notes.md

npm version "$tag" --git-tag-version
git push origin main --follow-tags