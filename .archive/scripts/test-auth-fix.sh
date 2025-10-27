#!/bin/bash

###############################################################################
# Authentication Fix Verification Script
# Tests that previously failing endpoints now work with the ALLOW_PUBLIC_GET_ENDPOINTS fix
###############################################################################

echo "========================================================================"
echo "  MantisNXT Authentication Fix Verification"
echo "========================================================================"
echo ""

# Configuration
BASE_URL="http://localhost:3000"
TIMEOUT=10

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

###############################################################################
# Helper Functions
###############################################################################

test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local expected_status=$4

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -e "${BLUE}Test $TOTAL_TESTS:${NC} $description"
    echo -e "  ${YELLOW}→${NC} $method $endpoint"

    # Make request and capture status code and response time
    response=$(curl -s -o /dev/null -w "%{http_code}|%{time_total}" \
        --max-time $TIMEOUT \
        -X $method \
        "$BASE_URL$endpoint" \
        2>&1)

    status_code=$(echo $response | cut -d'|' -f1)
    time_total=$(echo $response | cut -d'|' -f2)

    # Convert time to milliseconds
    time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "  ${GREEN}✓ PASS${NC} - Status: $status_code | Time: ${time_ms}ms"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "  ${RED}✗ FAIL${NC} - Expected: $expected_status, Got: $status_code | Time: ${time_ms}ms"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

test_endpoint_with_auth() {
    local method=$1
    local endpoint=$2
    local description=$3
    local expected_status=$4

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -e "${BLUE}Test $TOTAL_TESTS:${NC} $description"
    echo -e "  ${YELLOW}→${NC} $method $endpoint (with auth)"

    # Make request with Bearer token
    response=$(curl -s -o /dev/null -w "%{http_code}|%{time_total}" \
        --max-time $TIMEOUT \
        -X $method \
        -H "Authorization: Bearer test_token_12345" \
        "$BASE_URL$endpoint" \
        2>&1)

    status_code=$(echo $response | cut -d'|' -f1)
    time_total=$(echo $response | cut -d'|' -f2)
    time_ms=$(echo "$time_total * 1000" | bc | cut -d'.' -f1)

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "  ${GREEN}✓ PASS${NC} - Status: $status_code | Time: ${time_ms}ms"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "  ${RED}✗ FAIL${NC} - Expected: $expected_status, Got: $status_code | Time: ${time_ms}ms"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

###############################################################################
# Environment Check
###############################################################################

echo "Step 1: Environment Configuration Check"
echo "----------------------------------------------------------------------"

if [ -f .env.local ]; then
    echo -e "${GREEN}✓${NC} Found .env.local"

    if grep -q "ALLOW_PUBLIC_GET_ENDPOINTS" .env.local; then
        echo -e "${GREEN}✓${NC} ALLOW_PUBLIC_GET_ENDPOINTS is configured"

        # Extract and display the value
        value=$(grep "ALLOW_PUBLIC_GET_ENDPOINTS" .env.local | cut -d'=' -f2)
        echo "  Value: $value"
    else
        echo -e "${RED}✗${NC} ALLOW_PUBLIC_GET_ENDPOINTS not found in .env.local"
        echo "  Please add: ALLOW_PUBLIC_GET_ENDPOINTS=/api/suppliers,/api/inventory,/api/dashboard_metrics,/api/alerts,/api/activities"
        exit 1
    fi
else
    echo -e "${RED}✗${NC} .env.local not found"
    exit 1
fi

echo ""

###############################################################################
# Server Check
###############################################################################

echo "Step 2: Server Availability Check"
echo "----------------------------------------------------------------------"

if curl -s --max-time 5 "$BASE_URL/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Server is running at $BASE_URL"
else
    echo -e "${RED}✗${NC} Server is not responding at $BASE_URL"
    echo "  Please start the server with: npm run dev"
    exit 1
fi

echo ""

###############################################################################
# Previously Failing Endpoints (Should Now Work)
###############################################################################

echo "Step 3: Testing Previously Failing Endpoints (401 → 200)"
echo "----------------------------------------------------------------------"

# Suppliers endpoint - basic
test_endpoint "GET" "/api/suppliers" \
    "Suppliers list (basic)" \
    "200"

# Suppliers endpoint - with filters
test_endpoint "GET" "/api/suppliers?status=active,preferred&includeMetrics=true" \
    "Suppliers list (with filters and metrics)" \
    "200"

# Inventory endpoint - basic
test_endpoint "GET" "/api/inventory?includeAlerts=true&includeMetrics=true" \
    "Inventory list (with alerts and metrics)" \
    "200"

# Inventory enhanced endpoint
test_endpoint "GET" "/api/inventory/enhanced?includeAlerts=true" \
    "Enhanced inventory (with alerts)" \
    "200"

###############################################################################
# Working Endpoints (Should Still Work)
###############################################################################

echo "Step 4: Testing Previously Working Endpoints (Still 200)"
echo "----------------------------------------------------------------------"

# Dashboard metrics
test_endpoint "GET" "/api/dashboard_metrics" \
    "Dashboard metrics" \
    "200"

# Alerts
test_endpoint "GET" "/api/alerts" \
    "Alerts list" \
    "200"

# Recent activities
test_endpoint "GET" "/api/activities/recent" \
    "Recent activities" \
    "200"

###############################################################################
# POST/PUT/DELETE Should Still Require Auth
###############################################################################

echo "Step 5: Testing Write Operations (Should Require Auth or Accept Token)"
echo "----------------------------------------------------------------------"

# POST without auth - should still work with token or fail gracefully
test_endpoint_with_auth "POST" "/api/suppliers" \
    "Create supplier (with auth token)" \
    "400"  # Will fail validation but not auth (400 = bad request, 401 = unauthorized)

###############################################################################
# Results Summary
###############################################################################

echo ""
echo "========================================================================"
echo "  Test Results Summary"
echo "========================================================================"
echo ""
echo -e "Total Tests:  $TOTAL_TESTS"
echo -e "${GREEN}Passed:${NC}       $PASSED_TESTS"
echo -e "${RED}Failed:${NC}       $FAILED_TESTS"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
    echo ""
    echo "The authentication fix is working correctly!"
    echo "All previously failing endpoints now return 200 OK."
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    echo ""
    echo "Please check the failed tests above."
    echo "Common issues:"
    echo "  1. Server not restarted after .env.local changes"
    echo "  2. ALLOW_PUBLIC_GET_ENDPOINTS not configured correctly"
    echo "  3. Endpoint prefix mismatch in configuration"
    exit 1
fi
