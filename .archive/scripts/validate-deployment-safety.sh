#!/bin/bash
# Deployment Safety Validation Script
# Run before and after cleanup to ensure deployment integrity

set -e

echo "🔍 MantisNXT Deployment Safety Validation"
echo "=========================================="
echo ""

ERRORS=0

# Function to report check status
check_pass() {
  echo "  ✅ $1"
}

check_fail() {
  echo "  ❌ $1"
  ERRORS=$((ERRORS + 1))
}

check_warn() {
  echo "  ⚠️  $1"
}

# Check 1: Node modules installed
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
  check_pass "node_modules directory exists"
else
  check_fail "node_modules missing - run 'npm ci'"
fi
echo ""

# Check 2: Critical build files exist
echo "📄 Checking critical build files..."
CRITICAL_FILES=(
  "package.json"
  "package-lock.json"
  "next.config.js"
  "tsconfig.json"
  "tailwind.config.js"
  "postcss.config.js"
)

for file in "${CRITICAL_FILES[@]}"; do
  if [ -f "$file" ]; then
    check_pass "$file exists"
  else
    check_fail "$file missing"
  fi
done
echo ""

# Check 3: Docker files exist
echo "🐳 Checking Docker configuration..."
DOCKER_FILES=(
  "Dockerfile.prod"
  "Dockerfile.migrations"
  "Dockerfile.backup"
  "docker-compose.prod.yml"
  "docker-compose.yml"
)

for file in "${DOCKER_FILES[@]}"; do
  if [ -f "$file" ]; then
    check_pass "$file exists"
  else
    check_fail "$file missing"
  fi
done
echo ""

# Check 4: CI/CD configurations
echo "🔄 Checking CI/CD configurations..."
if [ -f ".github/workflows/ci-cd.yml" ]; then
  check_pass "GitHub Actions CI/CD workflow exists"
else
  check_fail ".github/workflows/ci-cd.yml missing"
fi

if [ -f ".github/workflows/testing.yml" ]; then
  check_pass "GitHub Actions testing workflow exists"
else
  check_fail ".github/workflows/testing.yml missing"
fi

if [ -f ".gitlab-ci.yml" ]; then
  check_pass "GitLab CI configuration exists"
else
  check_warn "GitLab CI configuration missing (optional)"
fi
echo ""

# Check 5: Environment files
echo "🔐 Checking environment configuration..."
if [ -f ".env.example" ]; then
  check_pass ".env.example exists"
else
  check_fail ".env.example missing"
fi

if [ -f ".env.production" ]; then
  check_pass ".env.production exists"
else
  check_fail ".env.production missing"
fi

# Check for secrets in git
if git ls-files | grep -q ".env.local"; then
  check_fail ".env.local is tracked in git (SECURITY RISK)"
else
  check_pass ".env.local not tracked in git"
fi

if git ls-files | grep -q "secrets/"; then
  check_fail "secrets/ directory tracked in git (SECURITY RISK)"
else
  check_pass "secrets/ not tracked in git"
fi
echo ""

# Check 6: Critical script files
echo "📜 Checking critical scripts..."
CRITICAL_SCRIPTS=(
  "scripts/dev-server-manager.js"
  "scripts/system-stabilizer.js"
  "scripts/system-resource-monitor.js"
  "scripts/backup.sh"
)

for script in "${CRITICAL_SCRIPTS[@]}"; do
  if [ -f "$script" ]; then
    check_pass "$script exists"
  else
    check_warn "$script missing (may impact development)"
  fi
done
echo ""

# Check 7: Source directories
echo "📁 Checking source directories..."
CRITICAL_DIRS=(
  "src"
  "lib"
  "public"
  "database/schema"
)

for dir in "${CRITICAL_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    check_pass "$dir/ directory exists"
  else
    check_fail "$dir/ directory missing"
  fi
done
echo ""

# Check 8: TypeScript compilation (optional - may fail in dev)
echo "🔨 Testing TypeScript compilation..."
if npm run type-check 2>&1 | grep -q "error TS"; then
  check_warn "TypeScript errors present (expected during development)"
else
  check_pass "TypeScript compilation clean"
fi
echo ""

# Check 9: Lint check (optional)
echo "🎨 Testing linting..."
if npm run lint > /dev/null 2>&1; then
  check_pass "ESLint passed"
else
  check_warn "ESLint warnings/errors present"
fi
echo ""

# Check 10: Test suite (optional - may take time)
echo "🧪 Testing test suite..."
if npm run test > /dev/null 2>&1; then
  check_pass "Test suite passed"
else
  check_warn "Some tests failing (review test output)"
fi
echo ""

# Check 11: Docker compose validation
echo "🐋 Validating Docker Compose syntax..."
if command -v docker-compose &> /dev/null; then
  if docker-compose -f docker-compose.prod.yml config > /dev/null 2>&1; then
    check_pass "docker-compose.prod.yml syntax valid"
  else
    check_fail "docker-compose.prod.yml syntax invalid"
  fi
else
  check_warn "docker-compose not installed - skipping validation"
fi
echo ""

# Check 12: Package.json script integrity
echo "📋 Checking package.json scripts..."
REQUIRED_SCRIPTS=(
  "dev"
  "build"
  "start"
  "lint"
  "type-check"
  "test"
)

for script_name in "${REQUIRED_SCRIPTS[@]}"; do
  if grep -q "\"$script_name\":" package.json; then
    check_pass "npm script '$script_name' defined"
  else
    check_fail "npm script '$script_name' missing"
  fi
done
echo ""

# Summary
echo "=========================================="
echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ ALL CRITICAL CHECKS PASSED"
  echo ""
  echo "   Safe to proceed with repository cleanup."
  echo "   Deployment infrastructure is intact."
  exit 0
else
  echo "❌ VALIDATION FAILED: $ERRORS error(s) found"
  echo ""
  echo "   FIX ERRORS BEFORE PROCEEDING WITH CLEANUP"
  echo "   Review the failures above and restore missing files."
  exit 1
fi
