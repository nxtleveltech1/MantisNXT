#!/bin/bash

# Test Selection APIs - Verify they work without authentication
# Run this script to test all selection endpoints

set -e

BASE_URL="${BASE_URL:-http://localhost:3000}"
SELECTION_ID="${SELECTION_ID:-}"

echo "========================================="
echo "Testing Selection APIs"
echo "Base URL: $BASE_URL"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local method=$1
    local path=$2
    local description=$3
    local expected_status=$4
    local auth_header=$5

    echo -e "${YELLOW}Testing:${NC} $description"
    echo "  Method: $method"
    echo "  Path: $path"

    if [ -n "$auth_header" ]; then
        echo "  Auth: $auth_header"
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Authorization: $auth_header" \
            "$BASE_URL$path")
    else
        echo "  Auth: None (Public)"
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$BASE_URL$path")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "$expected_status" ]; then
        echo -e "  ${GREEN}✓ PASS${NC} (HTTP $http_code)"
    else
        echo -e "  ${RED}✗ FAIL${NC} (Expected HTTP $expected_status, got HTTP $http_code)"
        echo "  Response: $body"
    fi
    echo ""
}

# Test 1: Health Check
echo "=== Health Checks ==="
test_endpoint "GET" "/api/health" "Health check endpoint" "200"
test_endpoint "GET" "/api/health/database" "Database health check" "200"
echo ""

# Test 2: List Selections (Should work without auth)
echo "=== Selection Management (Public GETs) ==="
test_endpoint "GET" "/api/core/selections" "List all selections" "200"
test_endpoint "GET" "/api/core/selections/active" "Get active selection" "200"
test_endpoint "GET" "/api/core/selections/catalog" "Get selection catalog" "200"
echo ""

# Test 3: Selection Items (Requires selection ID)
if [ -n "$SELECTION_ID" ]; then
    echo "=== Selection Items (Using ID: $SELECTION_ID) ==="
    test_endpoint "GET" "/api/core/selections/$SELECTION_ID/items" \
        "Get selection items WITHOUT auth" "200"

    test_endpoint "GET" "/api/core/selections/$SELECTION_ID/items" \
        "Get selection items WITH invalid Bearer token" "200" "Bearer invalid-token-12345"
    echo ""
else
    echo "=== Selection Items ==="
    echo -e "${YELLOW}Skipped:${NC} No SELECTION_ID provided"
    echo "  To test: export SELECTION_ID=your-selection-uuid"
    echo ""
fi

# Test 4: Selection Creation (Should require auth if middleware is added)
echo "=== Selection Write Operations ==="
echo -e "${YELLOW}Note:${NC} These operations should eventually require authentication"
echo ""

# Test 5: Check for 401 errors with Bearer token
echo "=== Auth Middleware Tests ==="
test_endpoint "GET" "/api/core/selections" \
    "List selections with invalid Bearer token" "200" "Bearer invalid-token"

echo -e "${YELLOW}Info:${NC} Selection GET operations should return 200 even with invalid tokens"
echo "      because they are in PUBLIC_ENDPOINTS configuration"
echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo ""
echo "If all tests passed:"
echo "  ✓ Selection APIs are publicly accessible"
echo "  ✓ No authentication required for GET operations"
echo "  ✓ UI should be able to fetch selection data"
echo ""
echo "If tests failed with HTTP 401:"
echo "  1. Check that src/middleware/api-auth.ts includes:"
echo "     PUBLIC_ENDPOINTS = ['/api/core/selections', ...]"
echo "  2. Restart development server: npm run dev"
echo "  3. Clear build cache: rm -rf .next && npm run dev"
echo "  4. Check .env.local for ALLOW_PUBLIC_GET_ENDPOINTS"
echo ""
echo "If tests failed with HTTP 500:"
echo "  - Check database connection: npm run test:db"
echo "  - Check API logs in terminal"
echo ""

# Get a selection ID for next run
if [ -z "$SELECTION_ID" ]; then
    echo "To test selection items endpoint, first get a selection ID:"
    echo "  1. Create selection via UI or:"
    echo "  2. Query database: psql \$NEON_DATABASE_URL -c 'SELECT selection_id FROM core.inventory_selection LIMIT 1;'"
    echo "  3. Export it: export SELECTION_ID=<your-id>"
    echo "  4. Rerun: ./scripts/test-selection-apis.sh"
fi
