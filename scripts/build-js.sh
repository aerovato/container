#!/bin/sh

set -eu

cd "$(dirname "$0")/.."

tsc

# Necessary for imports to work
cp package.json dist/package.json

chmod u+x dist/js/main.js
