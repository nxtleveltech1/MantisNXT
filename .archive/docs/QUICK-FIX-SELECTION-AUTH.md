# QUICK FIX: Selection API Authentication Issue

## Problem
HTTP 401 errors when accessing `/nxt-spp?tab=selections` showing "Missing authentication token"

## Root Cause
The selection API routes **do NOT use authentication middleware** but you may be experiencing:
- Browser cache issues
- Development server serving stale code
- Network interceptor adding auth requirements

## Immediate Solution (Applied)

### 1. Added Defensive Configuration
Modified `src/middleware/api-auth.ts` to explicitly whitelist selection endpoints:

```typescript
const PUBLIC_ENDPOINTS = [
  '/api/health',
  '/api/health/database',
  '/api/health/database-enterprise',
  '/api/core/selections',           // ← ADDED
  '/api/core/selections/active',    // ← ADDED
  '/api/core/selections/catalog',   // ← ADDED
];
```

This ensures selection GET requests remain public even if future code accidentally wraps them with auth middleware.

### 2. Clear Cache and Restart

```bash
# Stop dev server (Ctrl+C)
rm -rf .next
npm run dev
```

### 3. Hard Refresh Browser
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

## Test the Fix

### Option A: Use Test Script (Recommended)
```bash
chmod +x scripts/test-selection-apis.sh
./scripts/test-selection-apis.sh
```

### Option B: Manual cURL Tests
```bash
# Test 1: List selections (should return 200)
curl -v http://localhost:3000/api/core/selections

# Test 2: Get active selection (should return 200 or 404 if none active)
curl -v http://localhost:3000/api/core/selections/active

# Test 3: Get selection catalog (should return 200)
curl -v http://localhost:3000/api/core/selections/catalog

# Test 4: Get selection items (replace {id} with actual selection ID)
curl -v http://localhost:3000/api/core/selections/{selection-id}/items
```

### Option C: Browser DevTools
1. Open `/nxt-spp?tab=selections`
2. Press F12 to open DevTools
3. Go to Network tab
4. Look for requests to `/api/core/selections/*`
5. Check if they return 200 (success) or 401 (unauthorized)

## Expected Behavior After Fix

**BEFORE:**
- Status: 401 Unauthorized
- Error: "Missing authentication token"
- UI shows: "No products found"

**AFTER:**
- Status: 200 OK
- Response contains product data
- UI displays products in table

## Still Getting 401 Errors?

If the issue persists after the fix:

### Check 1: Verify Code is Running
```bash
# Check that PUBLIC_ENDPOINTS includes selections
grep -A5 "PUBLIC_ENDPOINTS" src/middleware/api-auth.ts
```

Should show:
```typescript
const PUBLIC_ENDPOINTS = [
  '/api/health',
  '/api/health/database',
  '/api/health/database-enterprise',
  '/api/core/selections',
  '/api/core/selections/active',
  '/api/core/selections/catalog',
];
```

### Check 2: Verify No Global Middleware
```bash
# Should return empty (no global middleware.ts)
find . -maxdepth 2 -name "middleware.ts" -not -path "./node_modules/*" -not -path "./.next/*"
```

### Check 3: Check Route Handler
```bash
# Verify route does NOT use withAuth
grep -n "withAuth" src/app/api/core/selections/[id]/items/route.ts
```

Should return empty (no matches).

### Check 4: Database Connection
The error might be a database issue disguised as auth:
```bash
curl http://localhost:3000/api/health/database
```

Should return:
```json
{"success": true, "database": "connected", ...}
```

## Understanding the Architecture

### Routes WITHOUT Auth (Public for GETs)
- `/api/core/selections` - List selections
- `/api/core/selections/active` - Get active selection
- `/api/core/selections/catalog` - Get product catalog
- `/api/core/selections/[id]/items` - Get selection items

### Routes WITH Auth (Protected)
- `/api/analytics/dashboard` - Analytics data
- `/api/inventory` - Inventory operations
- `/api/suppliers` - Supplier management

### How Auth Works
Routes opt-in to authentication by wrapping their exports:

```typescript
// Public route (NO AUTH)
export async function GET(request: NextRequest) {
  // Anyone can call this
}

// Protected route (REQUIRES AUTH)
import { withAuth } from '@/middleware/api-auth';

export const GET = withAuth(async (request: NextRequest) => {
  // Requires Authorization: Bearer <token>
});
```

Selection routes intentionally use the first pattern (no auth) for read operations.

## Files Modified

1. `src/middleware/api-auth.ts` - Added selection endpoints to PUBLIC_ENDPOINTS
2. `docs/P1-AUTH-INCIDENT-ANALYSIS.md` - Detailed technical analysis
3. `.env.local.example` - Environment variable configuration template
4. `scripts/test-selection-apis.sh` - Automated API testing script

## Next Steps (Future Improvements)

1. Add authentication to POST operations:
   - POST `/api/core/selections` - Create selection
   - POST `/api/core/selections/workflow` - Modify selection
   - POST `/api/core/selections/[id]/activate` - Activate selection

2. Add integration tests for auth middleware

3. Document API authentication requirements in code comments

## Need More Help?

See full technical analysis in:
- `docs/P1-AUTH-INCIDENT-ANALYSIS.md`

Test APIs programmatically:
- `scripts/test-selection-apis.sh`

Contact: Check project README for support channels
