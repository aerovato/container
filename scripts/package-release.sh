#!/bin/sh

set -eu

cd "$(dirname "$0")/.."
root_dir="$(pwd)"

rm -f dist/*.tar.gz dist/*.zip dist/checksums.txt
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT INT TERM

package_unix_zip() {
  cp "dist/$1" "$tmp_dir/container"
  (cd "$tmp_dir" && zip -q "$root_dir/dist/$2" container)
  rm -f "$tmp_dir/container"
}

package_unix_tar() {
  cp "dist/$1" "$tmp_dir/container"
  tar -czf "dist/$2" -C "$tmp_dir" container
  rm -f "$tmp_dir/container"
}

package_windows_zip() {
  cp "dist/$1" "$tmp_dir/container.exe"
  (cd "$tmp_dir" && zip -q "$root_dir/dist/$2" container.exe)
  rm -f "$tmp_dir/container.exe"
}

package_unix_zip container-darwin-arm64 container-darwin-arm64.zip
package_unix_zip container-darwin-x64 container-darwin-x64.zip
package_unix_tar container-linux-arm64 container-linux-arm64.tar.gz
package_unix_tar container-linux-x64 container-linux-x64.tar.gz
package_windows_zip container-windows-x64.exe container-windows-x64.zip
package_windows_zip container-windows-arm64.exe container-windows-arm64.zip

(cd dist && sha256sum *.tar.gz *.zip > checksums.txt)
