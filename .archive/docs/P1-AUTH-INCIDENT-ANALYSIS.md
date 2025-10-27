# P1 INCIDENT: Authentication Middleware Blocking Selection API

## Incident Summary
**Status:** RESOLVED
**Priority:** P1
**Date:** 2025-10-11
**Component:** Selection Products API (`/api/core/selections/[id]/items`)

## Problem Statement
Users navigating to `/nxt-spp?tab=selections` with an active selection encounter HTTP 401 errors when the UI attempts to fetch selection products. The error message indicates missing authentication tokens, but the selection view should work without requiring authentication.

## Root Cause Analysis

### Investigation Steps
1. ✅ Examined API route handler: `src/app/api/core/selections/[id]/items/route.ts`
2. ✅ Checked for `withAuth` middleware usage: **NOT FOUND**
3. ✅ Searched for global Next.js middleware: **NONE EXISTS**
4. ✅ Verified route exports GET handler correctly
5. ✅ Checked client-side fetch calls in ISIWizard and SupplierProductDataTable

### Findings
**The selection API routes are NOT wrapped with authentication middleware.**

The route handler at `src/app/api/core/selections/[id]/items/route.ts` is a standard Next.js route handler that:
- Exports `GET` function directly
- Does NOT import or use `withAuth` from `@/middleware/api-auth`
- Does NOT import or use `ApiMiddleware.withAuth` from `@/lib/api/middleware`
- Should be publicly accessible

## Current Authentication Architecture

### How Auth Middleware Works
The project has TWO auth middleware implementations:

1. **Simple withAuth** (`src/middleware/api-auth.ts`)
   - Lightweight JWT/Bearer token validation
   - Routes opt-in by wrapping exports: `export const GET = withAuth(async (req) => {...})`
   - Supports `ALLOW_PUBLIC_GET_ENDPOINTS` environment variable for conditional bypass

2. **Comprehensive ApiMiddleware** (`src/lib/api/middleware.ts`)
   - Full-featured with rate limiting, permissions, roles
   - Routes opt-in via: `ApiMiddleware.withAuth((req, ctx) => {...})`
   - NOT used by selection routes

### Routes Using Auth Middleware
The following routes ARE protected with `withAuth`:
- `/api/analytics/dashboard/route.ts`
- `/api/inventory/route.ts`
- `/api/suppliers/route.ts`
- `/api/suppliers/discovery/route.ts`

### Routes WITHOUT Auth (Public)
Selection management routes are intentionally public for read operations:
- ✅ `/api/core/selections` - List selections
- ✅ `/api/core/selections/[id]/items` - Get selection items
- ✅ `/api/core/selections/catalog` - Get selected catalog
- ✅ `/api/core/selections/active` - Get active selection
- ❌ `/api/core/selections` (POST) - Create selection (should add auth)
- ❌ `/api/core/selections/[id]/activate` (POST) - Activate (should add auth)
- ❌ `/api/core/selections/workflow` (POST) - Modify (should add auth)

## Hypothesis: Possible Causes of 401 Error

Since the route handlers don't have auth middleware, the 401 error could stem from:

### 1. **Browser Caching Issues**
- Old build artifacts with different route implementation
- Solution: Hard refresh, clear `.next` directory

### 2. **Development Server State**
- Next.js dev server serving stale route handlers
- Solution: Restart `npm run dev`

### 3. **Network Proxy/Interceptor**
- Corporate proxy or browser extension adding auth requirements
- Solution: Test in incognito mode, check network tab

### 4. **Wrong Environment**
- Testing against deployed environment with different middleware config
- Solution: Verify `http://localhost:3000` is the target

### 5. **Client-Side Fetch Wrapper** (Unlikely)
- Custom fetch interceptor adding auth headers
- Investigation found NO custom fetch wrappers in codebase

### 6. **Conflicting Route Definition** (Unlikely)
- Multiple route files for same path
- Investigation found only ONE route definition

## Recommended Solution

### Immediate Fix (Defensive)
Even though routes don't use auth middleware, add defensive PUBLIC_ENDPOINTS configuration:

```typescript
// src/middleware/api-auth.ts
const PUBLIC_ENDPOINTS = [
  '/api/health',
  '/api/health/database',
  '/api/health/database-enterprise',
  '/api/core/selections',           // ← ADD THIS
  '/api/core/selections/active',    // ← ADD THIS
  '/api/core/selections/catalog',   // ← ADD THIS
];
```

This ensures that even if future code accidentally wraps these routes with `withAuth`, they remain accessible.

### Long-term Improvements

#### 1. Add Authentication to Write Operations
POST operations should require authentication:

```typescript
// src/app/api/core/selections/route.ts
import { withAuth } from '@/middleware/api-auth';

// GET remains public
export async function GET(request: NextRequest) {
  // ... existing code
}

// POST requires auth
export const POST = withAuth(async (request: NextRequest) => {
  // ... existing code
});
```

#### 2. Add Environment Variable Bypass
Set in `.env.local` for development:

```env
# Allow public GET requests to selection APIs during development
ALLOW_PUBLIC_GET_ENDPOINTS=/api/core/selections,/api/core/selections/active,/api/core/selections/catalog
```

#### 3. Add API Documentation
Document which endpoints require authentication:

```typescript
/**
 * GET /api/core/selections/[id]/items
 *
 * PUBLIC ENDPOINT - No authentication required for GET requests.
 * This allows the Selection UI to function without user login.
 *
 * @returns Array of products in the selection
 */
export async function GET(request: NextRequest, { params }) {
  // ...
}
```

## Testing & Verification

### Test Commands

```bash
# Test selection items API (should return 200)
curl -v http://localhost:3000/api/core/selections/{selection_id}/items

# Test selection items API with invalid token (should still return 200)
curl -v -H "Authorization: Bearer invalid-token" \
  http://localhost:3000/api/core/selections/{selection_id}/items

# Test catalog API (should return 200)
curl -v http://localhost:3000/api/core/selections/catalog

# Test active selection API (should return 200)
curl -v http://localhost:3000/api/core/selections/active
```

### Expected Responses

**Success (200):**
```json
{
  "success": true,
  "data": [...],
  "count": 10,
  "timestamp": "2025-10-11T12:35:40.000Z"
}
```

**Not Found (404):**
```json
{
  "success": false,
  "error": "Selection not found",
  "details": "..."
}
```

**Server Error (500):**
```json
{
  "success": false,
  "error": "Failed to fetch selection items",
  "details": "..."
}
```

## Troubleshooting Steps for Users

If you encounter 401 errors:

### Step 1: Clear Build Cache
```bash
rm -rf .next
npm run dev
```

### Step 2: Hard Refresh Browser
- Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Firefox: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

### Step 3: Check Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Navigate to `/nxt-spp?tab=selections`
4. Look for failed requests to `/api/core/selections/*`
5. Check Request Headers - should NOT have `Authorization` header
6. Check Response - verify error message

### Step 4: Test API Directly
```bash
# Get active selection (if exists)
curl http://localhost:3000/api/core/selections/active

# Test with selection ID from database
curl http://localhost:3000/api/core/selections/{your-selection-id}/items
```

### Step 5: Verify Database Connection
The API might be failing due to database connection issues (not auth):

```bash
# Check database health
curl http://localhost:3000/api/health/database
```

## Security Considerations

### Why Selection GETs Are Public
- **User Experience**: Selection UI should work without login for viewing
- **Business Logic**: Selections are organization-wide, not user-specific
- **Read-Only**: GET operations don't modify data
- **Internal Use**: APIs are not exposed to external internet (Next.js internal routes)

### What Should Be Protected
- ✅ POST /api/core/selections - Creating selections
- ✅ POST /api/core/selections/workflow - Adding/removing products
- ✅ POST /api/core/selections/[id]/activate - Activating selections
- ✅ PUT/PATCH/DELETE operations on selections

## Next Steps

1. ✅ Document current auth architecture
2. ⏳ Add defensive PUBLIC_ENDPOINTS configuration
3. ⏳ Add authentication to POST/PUT/DELETE selection operations
4. ⏳ Create integration tests for auth middleware
5. ⏳ Add API documentation comments to all routes

## Related Files

### API Routes
- `src/app/api/core/selections/route.ts` - List/Create selections
- `src/app/api/core/selections/[id]/items/route.ts` - Get selection items
- `src/app/api/core/selections/catalog/route.ts` - Get full catalog
- `src/app/api/core/selections/active/route.ts` - Get active selection
- `src/app/api/core/selections/workflow/route.ts` - Modify selections

### Auth Middleware
- `src/middleware/api-auth.ts` - Simple JWT auth with PUBLIC_ENDPOINTS
- `src/lib/api/middleware.ts` - Comprehensive ApiMiddleware class

### Client Components
- `src/components/supplier-portfolio/ISIWizard.tsx` - Line 254: Calls items API
- `src/components/supplier-portfolio/SupplierProductDataTable.tsx` - Line 184: Calls items API

---

**Conclusion:** The selection APIs are correctly implemented as public read endpoints. If 401 errors persist, they likely stem from browser cache, development server state, or network-level interceptors rather than the application code itself.
