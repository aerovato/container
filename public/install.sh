#!/bin/sh
set -eu

REPO="aerovato/container"
INSTALL_DIR="$HOME/.code-container/bin"
NPM_FALLBACK=2

fallback() {
  printf '\nThe standalone installer cannot continue on this system.\n' >&2
  printf 'Install container via npm instead:\n' >&2
  printf '  npm install -g @aerovato/container\n' >&2
}

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Install requires %s.\n' "$1" >&2
    return "$NPM_FALLBACK"
  fi
}

download() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$1" -o "$2"
    return $?
  fi
  if command -v wget >/dev/null 2>&1; then
    wget -q "$1" -O "$2"
    return $?
  fi
  printf 'Install requires curl or wget.\n' >&2
  return "$NPM_FALLBACK"
}

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    set -- $(sha256sum "$1")
    printf '%s\n' "$1"
    return 0
  fi
  if command -v shasum >/dev/null 2>&1; then
    set -- $(shasum -a 256 "$1")
    printf '%s\n' "$1"
    return 0
  fi
  printf 'Install requires sha256sum or shasum.\n' >&2
  return "$NPM_FALLBACK"
}

asset_name() {
  case "$(uname -s | tr '[:upper:]' '[:lower:]')" in
    darwin) os="darwin"; ext="zip" ;;
    linux) os="linux"; ext="tar.gz" ;;
    *) printf 'Unsupported OS.\n' >&2; return "$NPM_FALLBACK" ;;
  esac

  case "$(uname -m)" in
    x86_64 | amd64) arch="x64" ;;
    arm64 | aarch64) arch="arm64" ;;
    *) printf 'Unsupported architecture.\n' >&2; return "$NPM_FALLBACK" ;;
  esac

  printf 'container-%s-%s.%s\n' "$os" "$arch" "$ext"
}

add_to_path() {
  case ":$PATH:" in
    *":$INSTALL_DIR:"*) return 0 ;;
  esac

  profile="${PROFILE:-}"
  if [ -z "$profile" ]; then
    case "$(basename "${SHELL:-}")" in
      zsh) profile="$HOME/.zshrc" ;;
      bash) profile="$HOME/.bashrc" ;;
      *) profile="$HOME/.profile" ;;
    esac
  fi

  mkdir -p "$(dirname "$profile")"
  touch "$profile"
  if ! grep -F "$INSTALL_DIR" "$profile" >/dev/null 2>&1; then
    printf '\n# container\nexport PATH="%s:$PATH"\n' "$INSTALL_DIR" >> "$profile"
    printf 'Added %s to PATH in %s\n' "$INSTALL_DIR" "$profile"
  fi
  printf 'Restart your shell or run this command for the current session:\n'
  printf '  export PATH="%s:$PATH"\n' "$INSTALL_DIR"
}

install_container() {
  for command in uname tr mktemp grep mkdir install mv basename dirname touch; do
    need "$command" || return $?
  done

  archive="$(asset_name)" || return $?
  base_url="https://github.com/$REPO/releases/latest/download"
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' EXIT INT TERM

  printf 'Downloading %s...\n' "$archive"
  download "$base_url/$archive" "$tmp_dir/$archive" || return $?
  download "$base_url/checksums.txt" "$tmp_dir/checksums.txt" || return $?

  checksum_line="$(grep "  $archive$" "$tmp_dir/checksums.txt" || true)"
  set -- $checksum_line
  expected="${1:-}"
  actual="$(sha256 "$tmp_dir/$archive")" || return $?

  if [ -z "$expected" ]; then
    printf 'Checksum entry not found for %s.\n' "$archive" >&2
    return "$NPM_FALLBACK"
  fi

  if [ "$expected" != "$actual" ]; then
    printf 'Checksum verification failed for %s. Please rerun the installer.\n' "$archive" >&2
    return 1
  fi

  mkdir -p "$INSTALL_DIR"

  case "$archive" in
    *.tar.gz)
    need tar || return $?
    tar -xzf "$tmp_dir/$archive" -C "$tmp_dir"
    ;;
    *.zip)
    need unzip || return $?
    unzip -q "$tmp_dir/$archive" -d "$tmp_dir"
    ;;
  esac

  install -m 755 "$tmp_dir/container" "$INSTALL_DIR/container.new"
  mv -f "$INSTALL_DIR/container.new" "$INSTALL_DIR/container"

  printf 'container installed to %s/container\n' "$INSTALL_DIR"
  add_to_path
}

install_container || {
  status=$?
  if [ "$status" -eq "$NPM_FALLBACK" ]; then
    fallback
  fi
  exit "$status"
}
