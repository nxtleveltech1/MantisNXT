#!/bin/bash

# Quick smoke test for AI endpoints (1 minute)
# Tests basic connectivity and response from AI API routes

echo "🔥 AI SDK v5 - Quick Smoke Test"
echo "================================"

BASE_URL="http://localhost:3000"
TIMEOUT=10

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if server is running
echo "Checking server status..."
if ! curl -s --max-time 5 "$BASE_URL" > /dev/null 2>&1; then
  echo -e "${RED}❌ Server is not running on $BASE_URL${NC}"
  echo "Please start the server with: npm run dev"
  exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# Test 1: Chat API
echo "1️⃣ Testing Chat API..."
CHAT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Say hello in 3 words"}]}' \
  --max-time $TIMEOUT)

if [ $? -eq 0 ] && [ ! -z "$CHAT_RESPONSE" ]; then
  echo -e "${GREEN}✅ Chat API working${NC}"
  echo "   Response: ${CHAT_RESPONSE:0:50}..."
else
  echo -e "${RED}❌ Chat API failed${NC}"
fi
echo ""

# Test 2: Generate API
echo "2️⃣ Testing Generate API..."
GEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/ai/generate" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Test prompt","mode":"concise"}' \
  --max-time $TIMEOUT)

if [ $? -eq 0 ] && [ ! -z "$GEN_RESPONSE" ]; then
  echo -e "${GREEN}✅ Generate API working${NC}"
else
  echo -e "${RED}❌ Generate API failed${NC}"
fi
echo ""

# Test 3: Analyze API
echo "3️⃣ Testing Analyze API..."
ANALYZE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/ai/analyze" \
  -H "Content-Type: application/json" \
  -d '{"data":{"test":"data"},"context":"testing"}' \
  --max-time $TIMEOUT)

if [ $? -eq 0 ] && [ ! -z "$ANALYZE_RESPONSE" ]; then
  echo -e "${GREEN}✅ Analyze API working${NC}"
else
  echo -e "${RED}❌ Analyze API failed${NC}"
fi
echo ""

# Test 4: Health check
echo "4️⃣ Testing Health endpoint..."
HEALTH_RESPONSE=$(curl -s "$BASE_URL/api/health" --max-time 5)

if [ $? -eq 0 ] && echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
  echo -e "${GREEN}✅ Health check passed${NC}"
else
  echo -e "${YELLOW}⚠️  Health check returned unexpected response${NC}"
fi

echo ""
echo "================================"
echo "🔥 Smoke test complete!"
echo ""
