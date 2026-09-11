#!/usr/bin/env bash
# Start both halves of AI Log Explainer. Works on macOS and Linux.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f backend/.env ]; then
  echo "backend/.env is missing. Copy backend/.env.example and add your OpenRouter key." >&2
  exit 1
fi

[ -d .venv ] || python3 -m venv .venv
./.venv/bin/pip install -q -r backend/requirements.txt

( cd backend && ../.venv/bin/uvicorn app.main:app --reload --port 8000 ) &
API=$!
trap 'kill $API 2>/dev/null || true' EXIT

[ -d ai-log-ui/node_modules ] || ( cd ai-log-ui && npm install )
cd ai-log-ui && npm run dev
