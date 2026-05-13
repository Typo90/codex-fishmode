#!/usr/bin/env sh
set -eu

REPO_URL="${FISHMODE_REPO_URL:-https://github.com/example/codex-fishmode/archive/refs/heads/main.tar.gz}"

if [ -f "./scripts/install.mjs" ]; then
  node ./scripts/install.mjs "$@"
  exit 0
fi

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

curl -fsSL "$REPO_URL" -o "$tmp_dir/fishmode.tar.gz"
tar -xzf "$tmp_dir/fishmode.tar.gz" -C "$tmp_dir"
repo_dir="$(find "$tmp_dir" -maxdepth 1 -type d -name 'codex-fishmode-*' | head -n 1)"
node "$repo_dir/scripts/install.mjs" "$@"
