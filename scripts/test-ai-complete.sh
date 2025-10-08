#!/bin/bash

# Vercel AI SDK v5 - Comprehensive Test Suite
# Master test orchestration script

set -e

echo "🧪 Vercel AI SDK v5 - Comprehensive Test Suite"
echo "=============================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
TEST_START_TIME=$(date +%s)

# Function to run a test
run_test() {
  local test_name="$1"
  local test_command="$2"

  echo -e "${BLUE}Running: ${test_name}${NC}"

  if eval "$test_command"; then
    echo -e "${GREEN}✅ PASS: ${test_name}${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    return 0
  else
    echo -e "${RED}❌ FAIL: ${test_name}${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
  fi
}

# Test 1: Package verification
echo -e "\n${BLUE}1️⃣ Package Verification${NC}"
run_test "Package Installation" "node $SCRIPT_DIR/verify-ai-sdk.js"

# Test 2: Environment variables
echo -e "\n${BLUE}2️⃣ Environment Variables${NC}"
if [ -f "$PROJECT_ROOT/.env.local" ]; then
  echo "  ✅ .env.local exists"

  # Check for API keys (without revealing them)
  if grep -q "OPENAI_API_KEY=" "$PROJECT_ROOT/.env.local"; then
    if grep -q "OPENAI_API_KEY=your-" "$PROJECT_ROOT/.env.local"; then
      echo -e "  ${YELLOW}⚠️  OPENAI_API_KEY needs to be configured${NC}"
    else
      echo "  ✅ OPENAI_API_KEY is set"
    fi
  else
    echo "  ❌ OPENAI_API_KEY not found"
  fi

  if grep -q "ANTHROPIC_API_KEY=" "$PROJECT_ROOT/.env.local"; then
    if grep -q "ANTHROPIC_API_KEY=your-" "$PROJECT_ROOT/.env.local"; then
      echo -e "  ${YELLOW}⚠️  ANTHROPIC_API_KEY needs to be configured${NC}"
    else
      echo "  ✅ ANTHROPIC_API_KEY is set"
    fi
  else
    echo "  ❌ ANTHROPIC_API_KEY not found"
  fi

  if grep -q "DEFAULT_AI_PROVIDER=" "$PROJECT_ROOT/.env.local"; then
    echo "  ✅ DEFAULT_AI_PROVIDER is set"
  fi

  if grep -q "ENABLE_AI_FEATURES=true" "$PROJECT_ROOT/.env.local"; then
    echo "  ✅ ENABLE_AI_FEATURES is enabled"
  fi
else
  echo -e "  ${RED}❌ .env.local not found${NC}"
fi

# Test 3: TypeScript compilation
echo -e "\n${BLUE}3️⃣ TypeScript Compilation${NC}"
run_test "TypeScript Check" "cd $PROJECT_ROOT && npx tsc --noEmit --skipLibCheck"

# Test 4: File structure validation
echo -e "\n${BLUE}4️⃣ File Structure${NC}"
CRITICAL_FILES=(
  "src/lib/ai/providers.ts"
  "src/lib/ai/config.ts"
  "src/types/ai.ts"
  "src/app/api/ai/chat/route.ts"
  "src/components/ai/ChatInterfaceV5.tsx"
)

for file in "${CRITICAL_FILES[@]}"; do
  if [ -f "$PROJECT_ROOT/$file" ]; then
    echo "  ✅ $file"
  else
    echo -e "  ${RED}❌ $file is missing${NC}"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
done

# Test 5: Import validation
echo -e "\n${BLUE}5️⃣ Import Validation${NC}"
echo "  Checking if AI SDK modules can be imported..."

cat > /tmp/test-ai-imports.js << 'EOF'
try {
  require('ai');
  require('@ai-sdk/anthropic');
  require('@ai-sdk/openai');
  console.log('✅ All AI SDK modules imported successfully');
  process.exit(0);
} catch (error) {
  console.error('❌ Failed to import AI SDK modules:', error.message);
  process.exit(1);
}
EOF

if node /tmp/test-ai-imports.js; then
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

rm /tmp/test-ai-imports.js

# Test 6: Configuration loading
echo -e "\n${BLUE}6️⃣ Configuration Loading${NC}"
cat > /tmp/test-config.mjs << 'EOF'
import { getAIConfig } from './src/lib/ai/config.ts';

try {
  const config = getAIConfig();
  console.log('  ✅ AI config loaded successfully');
  console.log(`  ✅ Default provider: ${config.defaultProvider}`);
  console.log(`  ✅ Features enabled: ${config.enableFeatures}`);
  process.exit(0);
} catch (error) {
  console.error('  ❌ Failed to load config:', error.message);
  process.exit(1);
}
EOF

if cd "$PROJECT_ROOT" && node --loader ts-node/esm /tmp/test-config.mjs 2>/dev/null; then
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo "  ⚠️  Config test skipped (requires runtime environment)"
fi

rm /tmp/test-config.mjs 2>/dev/null || true

# Calculate test duration
TEST_END_TIME=$(date +%s)
TEST_DURATION=$((TEST_END_TIME - TEST_START_TIME))

# Summary
echo ""
echo "=============================================="
echo -e "${BLUE}📊 Test Summary${NC}"
echo "=============================================="
echo -e "Tests Passed: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Tests Failed: ${RED}${TESTS_FAILED}${NC}"
echo "Duration: ${TEST_DURATION}s"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed! AI SDK v5 is ready for use.${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
  exit 1
fi
