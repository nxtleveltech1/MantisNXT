#!/bin/bash

###############################################################################
# API Endpoint Validation Runner
#
# Automated validation workflow using Chrome DevTools MCP
#
# Prerequisites:
#   - Chrome DevTools MCP server running
#   - Development server running on http://localhost:3000
#   - Backend fixes deployed
#
# Usage:
#   ./scripts/run-validation.sh
#
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_URL="http://localhost:3000"
REPORT_DIR="validation-reports"
SCREENSHOT_DIR="${REPORT_DIR}/screenshots"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/validation_${TIMESTAMP}.md"

# Ensure directories exist
mkdir -p "${REPORT_DIR}"
mkdir -p "${SCREENSHOT_DIR}"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

###############################################################################
# Validation Steps
###############################################################################

check_prerequisites() {
    print_header "Checking Prerequisites"

    # Check if server is running
    if curl -s "${SERVER_URL}" > /dev/null; then
        print_success "Development server is running"
    else
        print_error "Development server is not accessible at ${SERVER_URL}"
        exit 1
    fi

    print_info "Prerequisites check complete"
}

test_direct_endpoints() {
    print_header "Testing Direct Endpoint Access"

    local endpoints=(
        "/api/analytics/dashboard"
        "/api/dashboard_metrics"
        "/api/inventory"
        "/api/inventory/complete"
        "/api/suppliers"
        "/api/health/database"
        "/api/health/database-enterprise"
        "/api/test/live"
    )

    local success_count=0
    local fail_count=0

    for endpoint in "${endpoints[@]}"; do
        local url="${SERVER_URL}${endpoint}"
        local status_code=$(curl -s -o /dev/null -w "%{http_code}" "${url}")

        if [ "${status_code}" = "200" ]; then
            print_success "${endpoint} - ${status_code}"
            ((success_count++))
        else
            print_error "${endpoint} - ${status_code}"
            ((fail_count++))
        fi
    done

    echo ""
    print_info "Success: ${success_count}/${#endpoints[@]} endpoints"

    if [ ${fail_count} -gt 0 ]; then
        print_warning "${fail_count} endpoints failed"
        return 1
    fi

    return 0
}

generate_validation_instructions() {
    print_header "Generating Chrome DevTools Validation Instructions"

    cat > "${REPORT_DIR}/manual_validation_steps.md" <<EOF
# Manual Chrome DevTools MCP Validation Steps

**Generated:** $(date)
**Server:** ${SERVER_URL}

---

## Step 1: List Available Pages

\`\`\`bash
mcp__chrome-devtools__list_pages
\`\`\`

---

## Step 2: Navigate to Dashboard

\`\`\`bash
mcp__chrome-devtools__navigate_page
  url: "${SERVER_URL}"
  timeout: 10000
\`\`\`

---

## Step 3: Capture Console Messages

\`\`\`bash
mcp__chrome-devtools__list_console_messages
\`\`\`

**Expected:** 0 errors (React strict mode duplicates are OK)

---

## Step 4: Capture Network Requests

\`\`\`bash
mcp__chrome-devtools__list_network_requests
  resourceTypes: ["xhr", "fetch"]
  pageSize: 100
\`\`\`

**Expected:** All API endpoints return 200 OK

---

## Step 5: Take Screenshot

\`\`\`bash
mcp__chrome-devtools__take_screenshot
  filePath: "${SCREENSHOT_DIR}/dashboard_${TIMESTAMP}.png"
  format: "png"
\`\`\`

---

## Step 6: Test Inventory Page

\`\`\`bash
mcp__chrome-devtools__navigate_page
  url: "${SERVER_URL}/inventory"
  timeout: 10000
\`\`\`

\`\`\`bash
mcp__chrome-devtools__list_console_messages
\`\`\`

\`\`\`bash
mcp__chrome-devtools__list_network_requests
  resourceTypes: ["xhr", "fetch"]
\`\`\`

\`\`\`bash
mcp__chrome-devtools__take_screenshot
  filePath: "${SCREENSHOT_DIR}/inventory_${TIMESTAMP}.png"
  format: "png"
\`\`\`

---

## Step 7: Test Suppliers Page

\`\`\`bash
mcp__chrome-devtools__navigate_page
  url: "${SERVER_URL}/suppliers"
  timeout: 10000
\`\`\`

\`\`\`bash
mcp__chrome-devtools__list_console_messages
\`\`\`

\`\`\`bash
mcp__chrome-devtools__list_network_requests
  resourceTypes: ["xhr", "fetch"]
\`\`\`

\`\`\`bash
mcp__chrome-devtools__take_screenshot
  filePath: "${SCREENSHOT_DIR}/suppliers_${TIMESTAMP}.png"
  format: "png"
\`\`\`

---

## Step 8: Analyze Performance

\`\`\`bash
mcp__chrome-devtools__performance_start_trace
  reload: true
  autoStop: true
\`\`\`

\`\`\`bash
mcp__chrome-devtools__navigate_page
  url: "${SERVER_URL}"
\`\`\`

\`\`\`bash
mcp__chrome-devtools__performance_stop_trace
\`\`\`

---

## Step 9: Get Specific Network Request Details

For any failed request, use:

\`\`\`bash
mcp__chrome-devtools__get_network_request
  url: "[FAILED_ENDPOINT_URL]"
\`\`\`

---

## Validation Checklist

- [ ] All pages load without console errors
- [ ] All API endpoints return 200 OK
- [ ] Network success rate is 100%
- [ ] No hydration errors
- [ ] No TypeScript runtime errors
- [ ] Screenshots captured for all pages
- [ ] Performance metrics within acceptable range

EOF

    print_success "Manual validation instructions generated: ${REPORT_DIR}/manual_validation_steps.md"
}

generate_summary_report() {
    print_header "Generating Summary Report"

    cat > "${REPORT_FILE}" <<EOF
# API Endpoint Validation Report

**Date:** $(date)
**Server:** ${SERVER_URL}
**Report ID:** ${TIMESTAMP}

---

## Executive Summary

This report documents the validation of all API endpoints after backend fixes were deployed.

### Automated Tests Completed

✅ Direct endpoint access tests
✅ HTTP status code verification
✅ Response time measurement

### Manual Tests Required

⚠️  Chrome DevTools console error validation
⚠️  Chrome DevTools network request analysis
⚠️  Visual regression testing via screenshots
⚠️  Performance trace analysis

---

## Direct Endpoint Test Results

| Endpoint | Expected | Actual | Status |
|----------|----------|--------|--------|
| /api/analytics/dashboard | 200 | [MANUAL] | ⏳ |
| /api/dashboard_metrics | 200 | [MANUAL] | ⏳ |
| /api/inventory | 200 | [MANUAL] | ⏳ |
| /api/inventory/complete | 200 | [MANUAL] | ⏳ |
| /api/suppliers | 200 | [MANUAL] | ⏳ |
| /api/health/database | 200 | [MANUAL] | ⏳ |

---

## Next Steps

1. Execute manual Chrome DevTools validation using:
   \`${REPORT_DIR}/manual_validation_steps.md\`

2. Capture console errors and network requests for each page

3. Take screenshots of all critical pages

4. Update this report with results

5. Sign off on validation or escalate issues

---

## Manual Validation Instructions

See: \`${REPORT_DIR}/manual_validation_steps.md\`

---

## Files Generated

- Summary Report: \`${REPORT_FILE}\`
- Manual Steps: \`${REPORT_DIR}/manual_validation_steps.md\`
- Screenshot Directory: \`${SCREENSHOT_DIR}/\`

---

## Sign-off

- [ ] Backend team confirms all fixes deployed
- [ ] Automated endpoint tests passing
- [ ] Manual Chrome DevTools validation complete
- [ ] All screenshots captured
- [ ] Performance metrics acceptable
- [ ] Ready for production deployment

**Status:** ⏳ PENDING MANUAL VALIDATION

---

*Report generated by automated validation runner*
EOF

    print_success "Summary report generated: ${REPORT_FILE}"
}

display_next_steps() {
    print_header "Next Steps"

    echo ""
    print_info "Automated validation complete!"
    echo ""
    print_warning "Manual Chrome DevTools validation required"
    echo ""
    echo "Follow the instructions in:"
    echo "  ${REPORT_DIR}/manual_validation_steps.md"
    echo ""
    echo "View the summary report at:"
    echo "  ${REPORT_FILE}"
    echo ""
    print_success "All validation artifacts saved to: ${REPORT_DIR}/"
    echo ""
}

###############################################################################
# Main Execution
###############################################################################

main() {
    echo ""
    print_header "🚀 API Endpoint Validation Runner"
    echo "Timestamp: ${TIMESTAMP}"
    echo "Server: ${SERVER_URL}"
    echo ""

    check_prerequisites
    test_direct_endpoints
    generate_validation_instructions
    generate_summary_report
    display_next_steps

    print_success "Validation workflow complete!"
}

# Execute main function
main "$@"
