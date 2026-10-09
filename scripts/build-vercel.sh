#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

target_dir="${CARGO_TARGET_DIR:-$project_root/target}"
if [[ "$target_dir" != /* ]]; then
  target_dir="$project_root/$target_dir"
fi

rustup target add wasm32-unknown-unknown

if ! command -v wasm-bindgen >/dev/null || [[ "$(wasm-bindgen --version)" != "wasm-bindgen 0.2.129" ]]; then
  cargo install wasm-bindgen-cli --version 0.2.129 --locked --root "$target_dir/wasm-bindgen-cli"
  export PATH="$target_dir/wasm-bindgen-cli/bin:$PATH"
fi

if [[ "$(wasm-bindgen --version)" != "wasm-bindgen 0.2.129" ]]; then
  echo "This workspace requires wasm-bindgen-cli 0.2.129." >&2
  exit 1
fi

cargo build --locked --release -p myport-play --target wasm32-unknown-unknown
wasm-bindgen "$target_dir/wasm32-unknown-unknown/release/myport_play.wasm" \
  --target web --out-dir public/play --out-name myport_play

mkdir -p target/vercel-static/assets
cp -R public/. target/vercel-static/assets/

for asset in site.css play.css play/bootstrap.js play/myport_play.js play/myport_play_bg.wasm; do
  if [[ ! -f "target/vercel-static/assets/$asset" ]]; then
    echo "Required runtime asset '$asset' was not produced." >&2
    exit 1
  fi
done
