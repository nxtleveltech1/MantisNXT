@echo off
REM ============================================================================
REM  Authentication Fix Verification Script (Windows)
REM  Tests that previously failing endpoints now work
REM ============================================================================

setlocal enabledelayedexpansion

echo ========================================================================
echo   MantisNXT Authentication Fix Verification
echo ========================================================================
echo.

set BASE_URL=http://localhost:3000
set TOTAL_TESTS=0
set PASSED_TESTS=0
set FAILED_TESTS=0

REM ============================================================================
REM  Environment Check
REM ============================================================================

echo Step 1: Environment Configuration Check
echo ------------------------------------------------------------------------

if exist .env.local (
    echo [OK] Found .env.local

    findstr /C:"ALLOW_PUBLIC_GET_ENDPOINTS" .env.local >nul
    if !errorlevel! equ 0 (
        echo [OK] ALLOW_PUBLIC_GET_ENDPOINTS is configured
    ) else (
        echo [FAIL] ALLOW_PUBLIC_GET_ENDPOINTS not found in .env.local
        echo   Please add: ALLOW_PUBLIC_GET_ENDPOINTS=/api/suppliers,/api/inventory,/api/dashboard_metrics,/api/alerts,/api/activities
        exit /b 1
    )
) else (
    echo [FAIL] .env.local not found
    exit /b 1
)

echo.

REM ============================================================================
REM  Server Check
REM ============================================================================

echo Step 2: Server Availability Check
echo ------------------------------------------------------------------------

curl -s --max-time 5 "%BASE_URL%/api/health" >nul 2>&1
if !errorlevel! equ 0 (
    echo [OK] Server is running at %BASE_URL%
) else (
    echo [FAIL] Server is not responding at %BASE_URL%
    echo   Please start the server with: npm run dev
    exit /b 1
)

echo.

REM ============================================================================
REM  Test Previously Failing Endpoints
REM ============================================================================

echo Step 3: Testing Previously Failing Endpoints (401 -^> 200)
echo ------------------------------------------------------------------------

call :test_endpoint "GET" "/api/suppliers" "Suppliers list (basic)"
call :test_endpoint "GET" "/api/suppliers?status=active,preferred&includeMetrics=true" "Suppliers with filters"
call :test_endpoint "GET" "/api/inventory?includeAlerts=true&includeMetrics=true" "Inventory with metrics"
call :test_endpoint "GET" "/api/inventory/enhanced?includeAlerts=true" "Enhanced inventory"

echo.

REM ============================================================================
REM  Test Working Endpoints
REM ============================================================================

echo Step 4: Testing Previously Working Endpoints (Still 200)
echo ------------------------------------------------------------------------

call :test_endpoint "GET" "/api/dashboard_metrics" "Dashboard metrics"
call :test_endpoint "GET" "/api/alerts" "Alerts list"

echo.

REM ============================================================================
REM  Results Summary
REM ============================================================================

echo ========================================================================
echo   Test Results Summary
echo ========================================================================
echo.
echo Total Tests:  !TOTAL_TESTS!
echo Passed:       !PASSED_TESTS!
echo Failed:       !FAILED_TESTS!
echo.

if !FAILED_TESTS! equ 0 (
    echo [OK] ALL TESTS PASSED
    echo.
    echo The authentication fix is working correctly!
    echo All previously failing endpoints now return 200 OK.
    exit /b 0
) else (
    echo [FAIL] SOME TESTS FAILED
    echo.
    echo Please check the failed tests above.
    exit /b 1
)

REM ============================================================================
REM  Test Function
REM ============================================================================

:test_endpoint
set METHOD=%~1
set ENDPOINT=%~2
set DESCRIPTION=%~3

set /a TOTAL_TESTS+=1

echo Test !TOTAL_TESTS!: %DESCRIPTION%
echo   -^> %METHOD% %ENDPOINT%

REM Make curl request and capture only status code
for /f %%i in ('curl -s -o nul -w "%%{http_code}" -X %METHOD% "%BASE_URL%%ENDPOINT%" 2^>nul') do set STATUS_CODE=%%i

if "!STATUS_CODE!"=="200" (
    echo   [PASS] Status: !STATUS_CODE!
    set /a PASSED_TESTS+=1
) else if "!STATUS_CODE!"=="000" (
    echo   [FAIL] Connection failed - is server running?
    set /a FAILED_TESTS+=1
) else (
    echo   [FAIL] Expected: 200, Got: !STATUS_CODE!
    set /a FAILED_TESTS+=1
)
echo.

goto :eof
