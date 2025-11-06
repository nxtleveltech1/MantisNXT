#!/bin/bash

# AI Metrics API Integration Tests
# Tests all production endpoints without mock data

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_BASE="${BASE_URL}/api/v1/ai/metrics"

echo "=========================================="
echo "AI Metrics API Integration Tests"
echo "=========================================="
echo "Base URL: ${BASE_URL}"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

# Test function
test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"

  echo -n "Testing: ${name}... "

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "${API_BASE}${endpoint}")
  elif [ "$method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -d "$data" \
      "${API_BASE}${endpoint}")
  fi

  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$status_code" = "200" ] || [ "$status_code" = "201" ]; then
    echo -e "${GREEN}PASS${NC} (${status_code})"
    PASS_COUNT=$((PASS_COUNT + 1))

    # Pretty print JSON if possible
    if command -v jq &> /dev/null; then
      echo "$body" | jq -C '.' 2>/dev/null | head -10 || echo "$body"
    else
      echo "$body" | head -3
    fi
    echo ""
  else
    echo -e "${RED}FAIL${NC} (${status_code})"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    echo "Response: $body"
    echo ""
  fi
}

echo "1. API Endpoint Tests"
echo "----------------------------------------"

# Test 1: Get metrics summary
test_endpoint "GET /api/v1/ai/metrics (Summary)" \
  "GET" \
  ""

# Test 2: Get sales metrics
test_endpoint "GET /api/v1/ai/metrics/sales" \
  "GET" \
  "/sales?period=daily"

# Test 3: Get sales metrics (fresh)
test_endpoint "GET /api/v1/ai/metrics/sales (Fresh)" \
  "GET" \
  "/sales?period=daily&fresh=true"

# Test 4: Get inventory metrics
test_endpoint "GET /api/v1/ai/metrics/inventory" \
  "GET" \
  "/inventory?period=daily"

# Test 5: Get supplier performance metrics
test_endpoint "GET /api/v1/ai/metrics/supplier_performance" \
  "GET" \
  "/supplier_performance?period=monthly"

# Test 6: Get customer behavior metrics
test_endpoint "GET /api/v1/ai/metrics/customer_behavior" \
  "GET" \
  "/customer_behavior?period=weekly"

# Test 7: Get financial metrics
test_endpoint "GET /api/v1/ai/metrics/financial" \
  "GET" \
  "/financial?period=monthly"

# Test 8: Get operational metrics
test_endpoint "GET /api/v1/ai/metrics/operational" \
  "GET" \
  "/operational?period=daily"

# Test 9: Get specific metric by key
test_endpoint "GET /api/v1/ai/metrics/sales/daily_sales_summary" \
  "GET" \
  "/sales/daily_sales_summary"

# Test 10: Invalidate sales cache
test_endpoint "POST /api/v1/ai/metrics/invalidate (Sales)" \
  "POST" \
  "/invalidate" \
  '{"metricType":"sales"}'

# Test 11: Invalidate all cache
test_endpoint "POST /api/v1/ai/metrics/invalidate (All)" \
  "POST" \
  "/invalidate" \
  '{}'

# Test 12: Recalculate sales metrics
test_endpoint "POST /api/v1/ai/metrics/recalculate (Sales)" \
  "POST" \
  "/recalculate" \
  '{"metricType":"sales"}'

# Test 13: Recalculate inventory metrics
test_endpoint "POST /api/v1/ai/metrics/recalculate (Inventory)" \
  "POST" \
  "/recalculate" \
  '{"metricType":"inventory"}'

# Test 14: Test with date range
test_endpoint "GET /api/v1/ai/metrics/sales (Date Range)" \
  "GET" \
  "/sales?startDate=2025-10-01T00:00:00Z&endDate=2025-11-04T23:59:59Z"

# Test 15: Test hourly period
test_endpoint "GET /api/v1/ai/metrics/sales (Hourly)" \
  "GET" \
  "/sales?period=hourly"

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "Total Tests: $((PASS_COUNT + FAIL_COUNT))"
echo -e "${GREEN}Passed: ${PASS_COUNT}${NC}"
echo -e "${RED}Failed: ${FAIL_COUNT}${NC}"
echo ""

if [ $FAIL_COUNT -gt 0 ]; then
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
else
  echo -e "${GREEN}✅ All tests passed${NC}"
  exit 0
fi
