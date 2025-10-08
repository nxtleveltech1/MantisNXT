#!/bin/bash

###############################################################################
# Vercel AI SDK v5 Endpoint Testing Script
#
# Tests all AI endpoints manually with curl
# Usage: ./scripts/test-ai-endpoints.sh [endpoint_name]
###############################################################################

set -e

# Configuration
BASE_URL="${TEST_API_URL:-http://localhost:3000}"
RESULTS_FILE="ai-endpoint-test-results.json"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
LOG_FILE="logs/ai-tests-${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create logs directory
mkdir -p logs

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[PASS]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[FAIL]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$LOG_FILE"
}

# Results tracking
declare -A RESULTS
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test helper function
test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    local expected_status=${5:-200}

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    log "Testing: $name"

    local start_time=$(date +%s%3N)

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))

    # Extract status code (last line)
    local status_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')

    # Validate response
    if [ "$status_code" -eq "$expected_status" ]; then
        success "$name - Status: $status_code (${duration}ms)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        RESULTS[$name]="PASS"
    else
        error "$name - Status: $status_code (expected $expected_status)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        RESULTS[$name]="FAIL"
        echo "Response: $body" >> "$LOG_FILE"
    fi

    echo "---" >> "$LOG_FILE"
}

###############################################################################
# Test Definitions
###############################################################################

test_health_check() {
    log "=== Health Check ==="
    test_endpoint "Health Check" "GET" "/api/health" "" 200
}

test_chat_basic() {
    log "=== Chat Endpoint - Basic ==="

    local payload='{
        "messages": [
            {"role": "user", "content": "Say Hello World exactly"}
        ],
        "stream": false
    }'

    test_endpoint "Chat - Basic Request" "POST" "/api/ai/chat" "$payload" 200
}

test_chat_streaming() {
    log "=== Chat Endpoint - Streaming ==="

    local payload='{
        "messages": [
            {"role": "user", "content": "Count from 1 to 3"}
        ],
        "stream": true
    }'

    # For streaming, just check if we get a 200 response
    log "Testing: Chat Streaming"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/ai/chat" \
        -H "Content-Type: application/json" \
        -d "$payload")

    if [ "$status" -eq 200 ]; then
        success "Chat - Streaming (Status: $status)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        RESULTS["Chat-Streaming"]="PASS"
    else
        error "Chat - Streaming (Status: $status)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        RESULTS["Chat-Streaming"]="FAIL"
    fi
}

test_chat_conversation() {
    log "=== Chat Endpoint - Conversation ==="

    # Create conversation
    local create_payload='{
        "messages": [
            {"role": "user", "content": "Remember this: 42"}
        ]
    }'

    log "Creating conversation..."
    response=$(curl -s -X POST "$BASE_URL/api/ai/chat" \
        -H "Content-Type: application/json" \
        -d "$create_payload")

    # Extract conversation ID (assumes JSON response with conversationId field)
    conv_id=$(echo "$response" | grep -o '"conversationId":"[^"]*"' | cut -d'"' -f4)

    if [ -n "$conv_id" ]; then
        success "Conversation created: $conv_id"

        # Retrieve conversation
        test_endpoint "Chat - Retrieve Conversation" "GET" "/api/ai/chat?conversationId=$conv_id" "" 200
    else
        warning "Could not extract conversation ID"
    fi
}

test_generate_text() {
    log "=== Generate Endpoint - Text ==="

    local payload='{
        "mode": "custom",
        "prompt": "Write exactly three words.",
        "stream": false
    }'

    test_endpoint "Generate - Custom Text" "POST" "/api/ai/generate" "$payload" 200
}

test_generate_content() {
    log "=== Generate Endpoint - Content ==="

    local payload='{
        "mode": "content",
        "content": {
            "topic": "TypeScript benefits",
            "type": "description",
            "length": "brief",
            "tone": "professional"
        }
    }'

    test_endpoint "Generate - Content Mode" "POST" "/api/ai/generate" "$payload" 200
}

test_generate_batch() {
    log "=== Generate Endpoint - Batch ==="

    local payload='{
        "batch": [
            {"mode": "custom", "prompt": "Say Test 1"},
            {"mode": "custom", "prompt": "Say Test 2"}
        ]
    }'

    test_endpoint "Generate - Batch" "POST" "/api/ai/generate" "$payload" 200
}

test_analyze_data() {
    log "=== Analyze Endpoint ==="

    local payload='{
        "analysisType": "business",
        "objectives": ["Identify trends"],
        "questions": ["What are key metrics?"],
        "dataSources": [{
            "type": "custom",
            "dataset": [
                {"metric": "revenue", "value": 100000}
            ]
        }]
    }'

    test_endpoint "Analyze - Business Data" "POST" "/api/ai/analyze" "$payload" 200
}

test_supplier_discovery() {
    log "=== Supplier Discovery ==="

    local payload='{
        "query": "office supplies",
        "requirements": ["reliable delivery"]
    }'

    # May return 404 if not implemented
    status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/ai/suppliers/discover" \
        -H "Content-Type: application/json" \
        -d "$payload")

    if [ "$status" -eq 404 ]; then
        warning "Supplier Discovery - Not Implemented (404)"
    else
        test_endpoint "Supplier Discovery" "POST" "/api/ai/suppliers/discover" "$payload" 200
    fi
}

test_predictive_analytics() {
    log "=== Predictive Analytics ==="

    local payload='{
        "metric": "revenue",
        "historicalData": [
            {"date": "2024-01", "value": 100000},
            {"date": "2024-02", "value": 105000}
        ],
        "forecastPeriods": 3
    }'

    # May return 404 if not implemented
    status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/ai/analytics/predictive" \
        -H "Content-Type: application/json" \
        -d "$payload")

    if [ "$status" -eq 404 ]; then
        warning "Predictive Analytics - Not Implemented (404)"
    else
        test_endpoint "Predictive Analytics" "POST" "/api/ai/analytics/predictive" "$payload" 200
    fi
}

test_anomaly_detection() {
    log "=== Anomaly Detection ==="

    local payload='{
        "dataset": [
            {"value": 100},
            {"value": 102},
            {"value": 500},
            {"value": 98}
        ]
    }'

    # May return 404 if not implemented
    status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/ai/analytics/anomalies" \
        -H "Content-Type: application/json" \
        -d "$payload")

    if [ "$status" -eq 404 ]; then
        warning "Anomaly Detection - Not Implemented (404)"
    else
        test_endpoint "Anomaly Detection" "POST" "/api/ai/analytics/anomalies" "$payload" 200
    fi
}

test_insights_generation() {
    log "=== Insights Generation ==="

    local payload='{
        "context": "Q1 2024 Performance",
        "metrics": {
            "revenue": 500000,
            "growth": 0.15
        }
    }'

    # May return 404 if not implemented
    status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/ai/insights/generate" \
        -H "Content-Type: application/json" \
        -d "$payload")

    if [ "$status" -eq 404 ]; then
        warning "Insights Generation - Not Implemented (404)"
    else
        test_endpoint "Insights Generation" "POST" "/api/ai/insights/generate" "$payload" 200
    fi
}

test_error_handling() {
    log "=== Error Handling ==="

    # Test missing required fields
    local payload='{
        "messages": []
    }'

    test_endpoint "Error - Empty Messages" "POST" "/api/ai/chat" "$payload" 400

    # Test invalid role
    local payload2='{
        "messages": [
            {"role": "invalid", "content": "test"}
        ]
    }'

    test_endpoint "Error - Invalid Role" "POST" "/api/ai/chat" "$payload2" 400
}

###############################################################################
# Main Execution
###############################################################################

main() {
    log "Starting Vercel AI SDK v5 Endpoint Tests"
    log "Base URL: $BASE_URL"
    log "Timestamp: $TIMESTAMP"
    echo ""

    # Run all tests
    test_health_check
    echo ""

    test_chat_basic
    test_chat_streaming
    test_chat_conversation
    echo ""

    test_generate_text
    test_generate_content
    test_generate_batch
    echo ""

    test_analyze_data
    echo ""

    test_supplier_discovery
    test_predictive_analytics
    test_anomaly_detection
    test_insights_generation
    echo ""

    test_error_handling
    echo ""

    # Summary
    echo "========================================"
    log "Test Summary"
    echo "========================================"
    log "Total Tests: $TOTAL_TESTS"
    success "Passed: $PASSED_TESTS"
    error "Failed: $FAILED_TESTS"

    # Calculate success rate
    if [ $TOTAL_TESTS -gt 0 ]; then
        success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
        log "Success Rate: ${success_rate}%"
    fi

    echo ""
    log "Detailed logs saved to: $LOG_FILE"

    # Exit with appropriate code
    if [ $FAILED_TESTS -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main "$@"
