#!/bin/bash
# Installs the Zombs BBQ game's npm dependencies so tests, type checks and builds work
# in Claude Code cloud sessions.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}/game"
# .npmrc sets legacy-peer-deps (works around an npm 10 peer-resolution crash with vitest)
npm install --no-audit --no-fund --loglevel=error
# Playwright smoke tests use the pre-installed Chromium instead of downloading one
echo 'export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1' >> "${CLAUDE_ENV_FILE:-/dev/null}"
