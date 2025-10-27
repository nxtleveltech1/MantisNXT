@echo off
REM Type Verification Script for MantisNXT (Windows)
REM Checks TypeScript compilation for critical files

echo.
echo MantisNXT Type Safety Verification
echo ======================================
echo.

set FILES=src/lib/supplier-discovery/extractors.ts src/lib/types/inventory.ts src/lib/utils/api-helpers.ts src/types/nxt-spp.ts src/lib/api/error-handler.ts playwright.config.ts
set ERRORS=0

echo Checking critical files...
echo.

for %%f in (%FILES%) do (
  if exist "%%f" (
    echo   Checking %%f...
    npx tsc --noEmit --skipLibCheck "%%f" >nul 2>&1
    if !errorlevel! equ 0 (
      echo     [OK]
    ) else (
      echo     [ERROR]
      set /a ERRORS+=1
    )
  ) else (
    echo   [WARNING] %%f not found
  )
)

echo.
echo ======================================

if %ERRORS% equ 0 (
  echo All files are type-safe!
  echo.
  echo Next steps:
  echo   1. Run tests: npm test
  echo   2. Run E2E: npx playwright test
  echo   3. Full build: npm run build
  exit /b 0
) else (
  echo %ERRORS% file(s) have type errors
  echo.
  echo Run full type check: npx tsc --noEmit
  exit /b 1
)
