#!/bin/sh

set -eu

version=${1:-}

if [ -z "$version" ]; then
  printf '%s\n' 'Usage: npm run publish -- <version>' >&2
  exit 1
fi

npm version "$version"
git push origin main --follow-tags