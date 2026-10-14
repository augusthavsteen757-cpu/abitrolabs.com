#!/usr/bin/env bash
# Runs every test suite from CLAUDE.md against fresh local databases:
#   typecheck, unit tests, build, e2e (demo), beta mode, no-AI-key production, smoke.
#   bash scripts/test-all.sh
set -u
cd "$(dirname "$0")/.."
LOG="${TEST_LOG_DIR:-/tmp/klardal-test-all}"
mkdir -p "$LOG"
PORT=3000
BASE="http://localhost:$PORT"
CHROMIUM_PATH="${CHROMIUM_PATH:-/opt/pw-browsers/chromium}"
FAILED=()

stop() { fuser -k "$PORT/tcp" >/dev/null 2>&1; sleep 1; }
fresh_db() { rm -f data/fixflow.db*; npm run db:push >/dev/null 2>&1 && npm run db:seed >/dev/null 2>&1; }
start() { # $@ = env assignments
  stop; fresh_db
  env -u ANTHROPIC_API_KEY "$@" PORT=$PORT nohup npm start >"$LOG/server.log" 2>&1 &
  for _ in $(seq 1 40); do curl -s -o /dev/null "$BASE" && return 0; sleep 1; done
  echo "server did not start"; return 1
}
run() { # $1 = name, rest = command
  local name=$1; shift
  if "$@" >"$LOG/$name.log" 2>&1; then echo "  ✓ $name"; else echo "  ✗ $name (see $LOG/$name.log)"; FAILED+=("$name"); fi
}

echo "Klardal – all tests"
run typecheck npx tsc --noEmit
run unit sh -c "npx tsx scripts/unit.test.ts && npx tsx scripts/cpr.test.mts && npx tsx scripts/combine.test.mts"
run build npm run build

start ALLOW_LOCAL_DB=1 ALLOW_SIMULATED_PAYMENTS=1 ALLOW_DEMO_MODE=1 ADMIN_EMAILS=demo@klardal.dk PARTNER_CODES=E2E-PARTNER=1:2 &&
  run e2e env BASE_URL=$BASE CHROMIUM_PATH=$CHROMIUM_PATH node scripts/e2e.mjs

start BETA_FREE=1 ALLOW_LOCAL_DB=1 ALLOW_DEMO_MODE=1 APP_URL=https://klardal.com COMPANY_NAME=Klardal "COMPANY_CVR=under registrering" \
  "COMPANY_ADDRESS=Strandhuse 93, 5700 Svendborg" CONTACT_EMAIL=kontakt@klardal.com COMPANY_FOOTER_ADDRESS=0 ADMIN_EMAILS=beta-tester@eksempel.dk &&
  run beta env BASE_URL=$BASE CHROMIUM_PATH=$CHROMIUM_PATH node scripts/beta.mjs &&
  run smoke env BASE_URL=$BASE node scripts/smoke.mjs

start ALLOW_LOCAL_DB=1 && run no-ai-key env BASE_URL=$BASE node scripts/no-ai-key.mjs

stop
git checkout -- sample-quotes 2>/dev/null # the seed rewrites the sample PDFs
if [ ${#FAILED[@]} -eq 0 ]; then echo "All suites passed"; else echo "FAILED: ${FAILED[*]}"; exit 1; fi
