#!/usr/bin/env bash
set -euo pipefail

# Usage:
#  ./scripts/run-e2e.sh [js|py] [<test-path-or-pattern>]
# Examples:
#  ./scripts/run-e2e.sh js tests/index-quicklink.spec.js
#  ./scripts/run-e2e.sh py tests/test_setup_guide.py

PORT="${PORT:-8001}"
SERVER_CMD="${SERVER_CMD:-python3 -m http.server $PORT}"
TEST_TYPE="${1:-js}"
TEST_ARG="${2:-}" # optional test file/path

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

logfile="/tmp/run-e2e-server.log"

echo "Starting local server on port $PORT... (logs: $logfile)"
# Start server in background
$SERVER_CMD >"$logfile" 2>&1 &
SERVER_PID=$!

cleanup() {
  echo "Stopping server (pid $SERVER_PID)..."
  kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Wait for server readiness
echo "Waiting for http://localhost:$PORT/ to be reachable..."
for i in {1..60}; do
  if curl -sSf "http://localhost:$PORT/" >/dev/null 2>&1; then
    echo "Server is up"
    break
  fi
  sleep 0.5
done

if ! curl -sSf "http://localhost:$PORT/" >/dev/null 2>&1; then
  echo "Server did not become ready in time. Check $logfile" >&2
  exit 1
fi

if [ "$TEST_TYPE" = "js" ]; then
  echo "Running JS Playwright tests"
  if [ ! -d node_modules ]; then
    echo "Installing Node dependencies..."
    npm install
  fi
  npx playwright install --with-deps
  if [ -n "$TEST_ARG" ]; then
    npx playwright test "$TEST_ARG" --reporter=list
  else
    npx playwright test --reporter=list
  fi
  exit_code=$?
elif [ "$TEST_TYPE" = "py" ]; then
  echo "Running Python Playwright tests"
  python -m pip install --upgrade pip
  python -m pip install -r requirements.txt
  python -m playwright install --with-deps
  if [ -n "$TEST_ARG" ]; then
    pytest -q "$TEST_ARG"
  else
    pytest -q
  fi
  exit_code=$?
else
  echo "Unknown test type: $TEST_TYPE" >&2
  exit_code=2
fi

exit $exit_code
