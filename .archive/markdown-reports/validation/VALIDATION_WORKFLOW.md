# API Endpoint Validation Workflow

## EMERGENCY VALIDATION PROTOCOL

This document provides step-by-step instructions for validating all API endpoint fixes using Chrome DevTools MCP.

---

## Prerequisites

- ✅ Backend fixes deployed
- ✅ Development server running on http://localhost:3000
- ✅ Chrome DevTools MCP server active
- ✅ Fresh browser session (cache cleared)

---

## Phase 1: Browser Setup

### Step 1: Launch Browser and Navigate

```bash
# Use Chrome DevTools MCP to open browser and navigate
mcp__chrome-devtools__list_pages
mcp__chrome-devtools__navigate_page
  url: "http://localhost:3000"
```

### Step 2: Establish Baseline

```bash
# Capture initial state before any fixes
mcp__chrome-devtools__list_console_messages
# Save count of errors

mcp__chrome-devtools__list_network_requests
  resourceTypes: ["xhr", "fetch"]
# Save list of failing endpoints
```

---

## Phase 2: Page-by-Page Validation

### Test 1: Dashboard (Analytics)

**Navigate:**
```bash
mcp__chrome-devtools__navigate_page
  url: "http://localhost:3000"
  timeout: 10000
```

**Capture Console Errors:**
```bash
mcp__chrome-devtools__list_console_messages
```

**Expected Result:** 0 console errors (React 19 strict mode may show doubled messages in dev)

**Capture Network Requests:**
```bash
mcp__chrome-devtools__list_network_requests
  resourceTypes: ["xhr", "fetch"]
  pageSize: 50
```

**Verify Critical Endpoints:**
- `/api/analytics/dashboard` → 200 OK
- `/api/dashboard_metrics` → 200 OK

**Take Screenshot:**
```bash
mcp__chrome-devtools__take_screenshot
  filePath: "K:/00Project/MantisNXT/validation-reports/screenshots/dashboard-after-fix.png"
  format: "png"
```

---

### Test 2: Inventory Page

**Navigate:**
```bash
mcp__chrome-devtools__navigate_page
  url: "http://localhost:3000/inventory"
  timeout: 10000
```

**Capture Console Errors:**
```bash
mcp__chrome-devtools__list_console_messages
```

**Expected Result:** 0 console errors

**Capture Network Requests:**
```bash
mcp__chrome-devtools__list_network_requests
  resourceTypes: ["xhr", "fetch"]
  pageSize: 50
```

**Verify Critical Endpoints:**
- `/api/inventory` → 200 OK
- `/api/inventory/complete` → 200 OK

**Take Screenshot:**
```bash
mcp__chrome-devtools__take_screenshot
  filePath: "K:/00Project/MantisNXT/validation-reports/screenshots/inventory-after-fix.png"
  format: "png"
```

---

### Test 3: Suppliers Page

**Navigate:**
```bash
mcp__chrome-devtools__navigate_page
  url: "http://localhost:3000/suppliers"
  timeout: 10000
```

**Capture Console Errors:**
```bash
mcp__chrome-devtools__list_console_messages
```

**Expected Result:** 0 console errors

**Capture Network Requests:**
```bash
mcp__chrome-devtools__list_network_requests
  resourceTypes: ["xhr", "fetch"]
  pageSize: 50
```

**Verify Critical Endpoints:**
- `/api/suppliers` → 200 OK

**Take Screenshot:**
```bash
mcp__chrome-devtools__take_screenshot
  filePath: "K:/00Project/MantisNXT/validation-reports/screenshots/suppliers-after-fix.png"
  format: "png"
```

---

### Test 4: Admin Dashboard

**Navigate:**
```bash
mcp__chrome-devtools__navigate_page
  url: "http://localhost:3000/admin"
  timeout: 10000
```

**Capture Console Errors:**
```bash
mcp__chrome-devtools__list_console_messages
```

**Expected Result:** 0 console errors

**Capture Network Requests:**
```bash
mcp__chrome-devtools__list_network_requests
  resourceTypes: ["xhr", "fetch"]
  pageSize: 50
```

**Verify Critical Endpoints:**
- `/api/analytics/dashboard` → 200 OK
- `/api/admin/*` → 200 OK

**Take Screenshot:**
```bash
mcp__chrome-devtools__take_screenshot
  filePath: "K:/00Project/MantisNXT/validation-reports/screenshots/admin-after-fix.png"
  format: "png"
```

---

### Test 5: SPP (Supplier Portal)

**Navigate:**
```bash
mcp__chrome-devtools__navigate_page
  url: "http://localhost:3000/spp"
  timeout: 10000
```

**Capture Console Errors:**
```bash
mcp__chrome-devtools__list_console_messages
```

**Expected Result:** 0 console errors

**Capture Network Requests:**
```bash
mcp__chrome-devtools__list_network_requests
  resourceTypes: ["xhr", "fetch"]
  pageSize: 50
```

**Verify Critical Endpoints:**
- `/api/spp/dashboard` → 200 OK

**Take Screenshot:**
```bash
mcp__chrome-devtools__take_screenshot
  filePath: "K:/00Project/MantisNXT/validation-reports/screenshots/spp-after-fix.png"
  format: "png"
```

---

## Phase 3: Performance Validation

### Network Performance Check

```bash
# Start performance trace
mcp__chrome-devtools__performance_start_trace
  reload: true
  autoStop: true

# Navigate to critical page
mcp__chrome-devtools__navigate_page
  url: "http://localhost:3000"

# Stop trace and analyze
mcp__chrome-devtools__performance_stop_trace
```

**Expected Results:**
- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1

---

## Phase 4: Error Analysis

### Categorize Console Errors

For each error found:

1. **React 19 Strict Mode Duplicates**
   - Errors that appear exactly twice
   - Only in development mode
   - Expected behavior: IGNORE

2. **API Errors**
   - Failed fetch requests
   - 404, 500, or other HTTP errors
   - Expected: NONE after backend fixes

3. **TypeScript/Runtime Errors**
   - Uncaught exceptions
   - Type mismatches
   - Expected: NONE

4. **Hydration Errors**
   - React hydration mismatches
   - Expected: NONE

---

## Phase 5: Network Request Analysis

### Categorize Network Requests

For each API request:

1. **Status Code:**
   - ✅ 200-299: Success
   - ⚠️  300-399: Redirect (investigate)
   - ❌ 400-499: Client error (fix frontend)
   - ❌ 500-599: Server error (fix backend)

2. **Response Time:**
   - ✅ <500ms: Excellent
   - ⚠️  500-1000ms: Acceptable
   - ❌ >1000ms: Needs optimization

3. **Resource Type:**
   - `xhr` / `fetch`: API calls
   - `script`: JavaScript bundles
   - `stylesheet`: CSS files
   - `image`: Images

---

## Phase 6: Generate Report

### Validation Report Template

```markdown
# API Endpoint Validation Report

**Date:** [TIMESTAMP]
**Server:** http://localhost:3000
**Tester:** Claude Agent

---

## Summary

| Metric | Before Fix | After Fix | Status |
|--------|------------|-----------|--------|
| Console Errors | [COUNT] | [COUNT] | [✅/❌] |
| Failed API Calls | [COUNT] | [COUNT] | [✅/❌] |
| Network Success Rate | [%] | [%] | [✅/❌] |
| Pages Tested | - | 5 | ✅ |

---

## Endpoint Results

### ✅ Fixed Endpoints (200 OK)

| Endpoint | Method | Status | Response Time |
|----------|--------|--------|---------------|
| /api/analytics/dashboard | GET | 200 | [TIME]ms |
| /api/dashboard_metrics | GET | 200 | [TIME]ms |
| /api/inventory | GET | 200 | [TIME]ms |
| /api/inventory/complete | GET | 200 | [TIME]ms |
| /api/suppliers | GET | 200 | [TIME]ms |

### ❌ Still Failing Endpoints

| Endpoint | Method | Status | Error Message |
|----------|--------|--------|---------------|
| [ENDPOINT] | [METHOD] | [STATUS] | [ERROR] |

---

## Console Errors

### Before Fixes
```
[CONSOLE ERROR LOGS]
```

### After Fixes
```
[CONSOLE ERROR LOGS - SHOULD BE EMPTY]
```

---

## Performance Metrics

| Page | LCP | FID | CLS | Overall |
|------|-----|-----|-----|---------|
| Dashboard | [TIME] | [TIME] | [SCORE] | [✅/❌] |
| Inventory | [TIME] | [TIME] | [SCORE] | [✅/❌] |
| Suppliers | [TIME] | [TIME] | [SCORE] | [✅/❌] |

---

## Screenshots

- [Dashboard After Fix](./screenshots/dashboard-after-fix.png)
- [Inventory After Fix](./screenshots/inventory-after-fix.png)
- [Suppliers After Fix](./screenshots/suppliers-after-fix.png)
- [Admin After Fix](./screenshots/admin-after-fix.png)
- [SPP After Fix](./screenshots/spp-after-fix.png)

---

## Recommendations

### Critical Issues (Immediate Action Required)
- [ISSUE 1]
- [ISSUE 2]

### Performance Improvements
- [OPTIMIZATION 1]
- [OPTIMIZATION 2]

### Follow-up Tasks
- [TASK 1]
- [TASK 2]

---

## Sign-off

- [ ] All critical endpoints returning 200 OK
- [ ] Zero console errors (excluding React strict mode duplicates)
- [ ] All pages loading correctly
- [ ] Performance metrics within acceptable range
- [ ] Screenshots captured for all critical pages

**Status:** [✅ PASS / ❌ FAIL]
**Next Steps:** [ACTIONS]

---

*Report generated by Claude Agent using Chrome DevTools MCP*
```

---

## Quick Command Reference

### Navigation
```bash
mcp__chrome-devtools__navigate_page
mcp__chrome-devtools__navigate_page_history
```

### Console Monitoring
```bash
mcp__chrome-devtools__list_console_messages
```

### Network Analysis
```bash
mcp__chrome-devtools__list_network_requests
mcp__chrome-devtools__get_network_request
```

### Screenshots
```bash
mcp__chrome-devtools__take_screenshot
```

### Performance
```bash
mcp__chrome-devtools__performance_start_trace
mcp__chrome-devtools__performance_stop_trace
mcp__chrome-devtools__performance_analyze_insight
```

---

## Emergency Contacts

If validation fails:

1. **Backend Team:** Fix API endpoint implementations
2. **Frontend Team:** Fix API consumption patterns
3. **DevOps Team:** Check server configuration
4. **QA Team:** Expanded test coverage needed

---

## Success Criteria

✅ **PASS:** All endpoints return 200 OK, zero console errors, all pages render correctly

❌ **FAIL:** Any endpoint errors, console errors (non-strict-mode), or broken pages

⚠️  **PARTIAL:** Some non-critical endpoints failing, but core functionality works

---

**Last Updated:** 2025-10-09
**Maintained By:** Development Team
**Version:** 1.0.0
