#!/bin/bash

# Type Verification Script for MantisNXT
# Checks TypeScript compilation for critical files

set -e

echo "🔍 MantisNXT Type Safety Verification"
echo "======================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Files to check
FILES=(
  "src/lib/supplier-discovery/extractors.ts"
  "src/lib/types/inventory.ts"
  "src/lib/utils/api-helpers.ts"
  "src/types/nxt-spp.ts"
  "src/lib/api/error-handler.ts"
  "playwright.config.ts"
)

ERRORS=0

echo "Checking critical files..."
echo ""

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -n "  Checking $file... "
    if npx tsc --noEmit --skipLibCheck "$file" 2>/dev/null; then
      echo -e "${GREEN}✓${NC}"
    else
      echo -e "${RED}✗${NC}"
      ERRORS=$((ERRORS + 1))
    fi
  else
    echo -e "  ${YELLOW}⚠${NC} $file not found"
  fi
done

echo ""
echo "======================================"

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✨ All files are type-safe!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Run tests: npm test"
  echo "  2. Run E2E: npx playwright test"
  echo "  3. Full build: npm run build"
  exit 0
else
  echo -e "${RED}⚠️  $ERRORS file(s) have type errors${NC}"
  echo ""
  echo "Run full type check: npx tsc --noEmit"
  exit 1
fi
