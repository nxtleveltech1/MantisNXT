#!/bin/bash

#
# Transaction Pattern Validation Script
# Detects common transaction anti-patterns and connection leaks
#
# Usage: ./scripts/validate-transactions.sh
#

set -e

echo "=================================="
echo "Transaction Pattern Validator"
echo "=================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check 1: pool.query('BEGIN') usage (CRITICAL)
echo "🔍 Checking for pool.query('BEGIN') anti-pattern..."
if grep -r "pool\.query.*['\"]BEGIN['\"]" src/app/api/ --include="*.ts" --include="*.tsx" 2>/dev/null; then
  echo -e "${RED}❌ CRITICAL: Found pool.query('BEGIN') usage${NC}"
  echo "   This causes connection leaks and breaks transaction isolation."
  echo "   Fix: Use TransactionHelper.withTransaction() instead."
  echo ""
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}✅ No pool.query('BEGIN') found${NC}"
  echo ""
fi

# Check 2: client.query('BEGIN') without release (WARNING)
echo "🔍 Checking for manual transaction management..."
FILES_WITH_BEGIN=$(grep -r "client\.query.*['\"]BEGIN['\"]" src/app/api/ --include="*.ts" --include="*.tsx" -l 2>/dev/null || true)
if [ -n "$FILES_WITH_BEGIN" ]; then
  echo -e "${YELLOW}⚠️  Found ${#FILES_WITH_BEGIN[@]} files with manual BEGIN${NC}"
  echo "   Files using client.query('BEGIN'):"
  for file in $FILES_WITH_BEGIN; do
    # Check if file has proper release
    if ! grep -q "client\.release()" "$file" 2>/dev/null; then
      echo -e "   ${RED}❌ Missing release:${NC} $file"
      ERRORS=$((ERRORS + 1))
    else
      echo -e "   ${GREEN}✅${NC} $file (has release)"
    fi
  done
  echo ""
fi

# Check 3: TransactionHelper usage
echo "🔍 Checking TransactionHelper adoption..."
HELPER_USAGE=$(grep -r "TransactionHelper" src/ --include="*.ts" --include="*.tsx" | wc -l)
echo -e "   Found ${GREEN}${HELPER_USAGE}${NC} references to TransactionHelper"
if [ "$HELPER_USAGE" -lt 5 ]; then
  echo -e "${YELLOW}⚠️  Low TransactionHelper usage${NC}"
  echo "   Consider using TransactionHelper for transaction safety."
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 4: Potential connection leaks
echo "🔍 Checking for potential connection leaks..."
FILES_WITH_CONNECT=$(grep -r "pool\.connect()" src/app/api/ --include="*.ts" --include="*.tsx" -l 2>/dev/null || true)
if [ -n "$FILES_WITH_CONNECT" ]; then
  for file in $FILES_WITH_CONNECT; do
    # Count connect vs release
    CONNECT_COUNT=$(grep -c "pool\.connect()" "$file" 2>/dev/null || echo "0")
    RELEASE_COUNT=$(grep -c "\.release()" "$file" 2>/dev/null || echo "0")

    if [ "$CONNECT_COUNT" -ne "$RELEASE_COUNT" ]; then
      echo -e "   ${RED}❌ Potential leak:${NC} $file"
      echo "      pool.connect(): $CONNECT_COUNT, release(): $RELEASE_COUNT"
      ERRORS=$((ERRORS + 1))
    fi
  done
fi

# Check if no leaks found
if [ "$ERRORS" -eq 0 ]; then
  echo -e "${GREEN}✅ No connection leaks detected${NC}"
fi
echo ""

# Check 5: Long transaction candidates
echo "🔍 Checking for potential long transactions..."
LONG_TX_PATTERNS=(
  "for.*await.*client\.query"
  "while.*await.*client\.query"
  "\.forEach.*client\.query"
)

for pattern in "${LONG_TX_PATTERNS[@]}"; do
  if grep -r "$pattern" src/app/api/ --include="*.ts" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Found potential long transaction pattern:${NC} $pattern"
    echo "   Consider batching operations to avoid timeout."
    WARNINGS=$((WARNINGS + 1))
  fi
done

if [ "$WARNINGS" -eq 0 ]; then
  echo -e "${GREEN}✅ No long transaction patterns detected${NC}"
fi
echo ""

# Check 6: Missing error handling
echo "🔍 Checking for transaction error handling..."
FILES_WITH_TX=$(grep -r "withTransaction" src/app/api/ --include="*.ts" --include="*.tsx" -l 2>/dev/null || true)
if [ -n "$FILES_WITH_TX" ]; then
  for file in $FILES_WITH_TX; do
    # Check if withTransaction is wrapped in try-catch at API level
    if ! grep -A 20 "withTransaction" "$file" | grep -q "catch.*error" 2>/dev/null; then
      echo -e "   ${YELLOW}⚠️  Missing error handling:${NC} $file"
      echo "      Add try-catch around withTransaction for API error responses."
      WARNINGS=$((WARNINGS + 1))
    fi
  done

  if [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}✅ All transactions have error handling${NC}"
  fi
fi
echo ""

# Check 7: Statement timeout configuration
echo "🔍 Checking statement timeout configuration..."
STATEMENT_TIMEOUT=$(grep -r "statement_timeout" lib/database/ --include="*.ts" 2>/dev/null || true)
if [ -n "$STATEMENT_TIMEOUT" ]; then
  echo "$STATEMENT_TIMEOUT"
  # Extract value
  TIMEOUT_VALUE=$(echo "$STATEMENT_TIMEOUT" | grep -o '[0-9]\+' | head -1)
  if [ "$TIMEOUT_VALUE" -gt 120000 ]; then
    echo -e "${YELLOW}⚠️  Statement timeout > 2 minutes${NC}"
    echo "   Current: ${TIMEOUT_VALUE}ms"
    echo "   Recommended: 60000-90000ms (1-1.5 minutes)"
    WARNINGS=$((WARNINGS + 1))
  else
    echo -e "${GREEN}✅ Statement timeout is optimal${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  No statement timeout configured${NC}"
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Summary
echo "=================================="
echo "Validation Summary"
echo "=================================="

if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  echo ""
  echo "Transaction management is correctly implemented."
  exit 0
else
  echo -e "${RED}Errors: $ERRORS${NC}"
  echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
  echo ""

  if [ "$ERRORS" -gt 0 ]; then
    echo -e "${RED}❌ CRITICAL ISSUES FOUND${NC}"
    echo "Fix errors before deploying to production."
    echo ""
    echo "Quick fixes:"
    echo "  1. Replace pool.query('BEGIN') with TransactionHelper.withTransaction()"
    echo "  2. Ensure all pool.connect() has matching .release()"
    echo "  3. Wrap transactions in try-catch for error handling"
    echo ""
    exit 1
  else
    echo -e "${YELLOW}⚠️  WARNINGS FOUND${NC}"
    echo "Review warnings to improve transaction safety."
    echo ""
    exit 0
  fi
fi