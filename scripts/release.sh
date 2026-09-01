#!/bin/sh

set -eu

requested=${1:-}

if [ -z "$requested" ]; then
  printf '%s\n' 'Usage: npm run release -- <patch | minor | major | version>' >&2
  exit 1
fi

current=$(node -p "require('./package.json').version")

resolve_version() {
  candidate=$1

  case "$candidate" in
    *[!0-9.]* | '' | *.*.*.* | .* | *.)
      printf '%s\n' 'Version must be patch, minor, major, or X.Y.Z.' >&2
      exit 1
      ;;
  esac

  old_ifs=$IFS
  IFS=.
  set -- $candidate
  IFS=$old_ifs

  [ "$#" -eq 3 ] && [ -n "$1" ] && [ -n "$2" ] && [ -n "$3" ] || {
    printf '%s\n' 'Version must be patch, minor, major, or X.Y.Z.' >&2
    exit 1
  }

  printf '%s\n' "$candidate"
}

case "$requested" in
  major | minor | patch)
    old_ifs=$IFS
    IFS=.
    set -- $current
    IFS=$old_ifs

    major=$1
    minor=$2
    patch=$3

    case "$requested" in
      major)
        major=$((major + 1))
        minor=0
        patch=0
        ;;
      minor)
        minor=$((minor + 1))
        patch=0
        ;;
      patch)
        patch=$((patch + 1))
        ;;
    esac

    version="$major.$minor.$patch"
    ;;
  v*)
    version=$(resolve_version "${requested#v}")
    ;;
  *)
    version=$(resolve_version "$requested")
    ;;
esac

tag="v$version"

npm run release-notes "$tag"
rm release-notes.md

npm version "$version" --git-tag-version
git push origin main --follow-tags
