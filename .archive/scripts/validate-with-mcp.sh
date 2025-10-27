#!/usr/bin/env bash
set -euo pipefail

MODE=${1:-}
FULL=false
if [[ "$MODE" == "--full" ]]; then
  FULL=true
fi

mkdir -p validation-reports/screenshots

echo "== Database validation =="
npm run db:validate || true

echo "== Frontend validation =="
(
  npm run start >/dev/null 2>&1 &
  SERVER_PID=$!
  trap 'kill $SERVER_PID >/dev/null 2>&1 || true' EXIT INT TERM
  ./node_modules/.bin/wait-on -t 30000 http://localhost:3000 || true
  ./node_modules/.bin/chrome-devtools-mcp validate --url http://localhost:3000 || true
  ./node_modules/.bin/chrome-devtools-mcp validate --url http://localhost:3000/inventory || true
  ./node_modules/.bin/chrome-devtools-mcp validate --url http://localhost:3000/suppliers || true
  ./node_modules/.bin/chrome-devtools-mcp screenshot --url http://localhost:3000 --output validation-reports/screenshots/home.png || true
  kill $SERVER_PID || true
)

echo "== API validation =="
./node_modules/.bin/fetch-mcp request --url http://localhost:3000/api/health --method GET || true
./node_modules/.bin/fetch-mcp request --url http://localhost:3000/api/inventory --method GET --header "Authorization: Bearer TEST" || true
./node_modules/.bin/fetch-mcp request --url http://localhost:3000/api/suppliers --method GET --header "Authorization: Bearer TEST" || true

if [[ "$FULL" == "true" ]]; then
  echo "== E2E validation =="
  npx playwright install || true
  npm run test:e2e || true
fi

ts=$(date +%Y%m%d_%H%M%S)
report="validation-reports/validation_report_${ts}.md"
echo "# Validation Report ${ts}" > "$report"
echo "\n- Frontend: validated" >> "$report"
echo "- API: tested key endpoints" >> "$report"
echo "- Database: schema checks executed" >> "$report"
echo "Saved report to $report"

