#!/bin/sh

set -eu

cd "$(dirname "$0")/.."

bun build --compile --target=bun-darwin-arm64 --outfile dist/container-darwin-arm64 src/main.ts
bun build --compile --target=bun-darwin-x64 --outfile dist/container-darwin-x64 src/main.ts
bun build --compile --target=bun-linux-arm64-musl --outfile dist/container-linux-arm64 src/main.ts
bun build --compile --target=bun-linux-x64-musl --outfile dist/container-linux-x64 src/main.ts
bun build --compile --target=bun-windows-x64 --outfile dist/container-windows-x64.exe src/main.ts
bun build --compile --target=bun-windows-arm64 --outfile dist/container-windows-arm64.exe src/main.ts
