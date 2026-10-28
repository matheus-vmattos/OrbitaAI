#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export XDG_DATA_HOME="$PWD/.cache/data"
export XDG_CACHE_HOME="$PWD/.cache"
export NEXT_TELEMETRY_DISABLED=1
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm typecheck
pnpm build
