# URGENT: WooCommerce Sync Fix - Deployment Instructions

## Critical Issue FIXED
**Problem**: Customer sync failing with `invalid input syntax for type uuid: "default"`
**Root Cause**: Frontend sending string "default" instead of valid UUID for org_id
**Status**: EMERGENCY FIX APPLIED - READY FOR DEPLOYMENT

---

## Quick Start (5 Minutes to Production)

### Step 1: Pull Latest Changes
```bash
git status
# You should see these modified files:
# - src/app/integrations/woocommerce/page.tsx
# - src/app/api/v1/integrations/woocommerce/sync/customers/route.ts
```

### Step 2: Set Environment Variable (CRITICAL!)
Add to your `.env` file or environment:
```bash
DEFAULT_ORG_ID=00000000-0000-0000-0000-000000000001
```

**OR** use your actual organization UUID:
```bash
# Query your database first:
psql -U postgres -d your_database -c "SELECT id FROM organization LIMIT 1;"

# Then set that UUID:
DEFAULT_ORG_ID=<your-actual-org-uuid>
```

### Step 3: Create Default Organization (if needed)
```bash
# Run this SQL script:
psql -U postgres -d your_database -f scripts/create-default-org.sql

# Or manually:
psql -U postgres -d your_database << 'EOF'
INSERT INTO organization (id, name, slug, plan_type)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Default Organization',
  'default-org',
  'starter'
)
ON CONFLICT (id) DO NOTHING;
EOF
```

### Step 4: Restart Application
```bash
# Development:
npm run dev

# Production:
pm2 restart mantis-nxt
# OR
systemctl restart mantis-nxt
# OR
docker-compose restart
```

### Step 5: Verify Fix
```bash
# Test organization API:
curl http://localhost:3000/api/v1/organizations/current

# Expected response:
# {"success":true,"data":{"id":"00000000-0000-0000-0000-000000000001",...}}
```

### Step 6: Test WooCommerce Sync
1. Navigate to: `http://localhost:3000/integrations/woocommerce`
2. Click "Sync Now" on Customers card
3. Watch console/logs for successful sync

---

## What Was Fixed

### 1. Frontend - Gets Real org_id
**Before**:
```typescript
org_id: 'default' // ❌ WRONG
```

**After**:
```typescript
const orgResponse = await fetch('/api/v1/organizations/current');
org_id: orgData.data.id // ✅ CORRECT UUID
```

### 2. Backend - Validates UUID Format
New validation before database queries:
```typescript
if (!uuidRegex.test(org_id)) {
  return error 400
}
```

### 3. New API Endpoint
`GET /api/v1/organizations/current`
- Returns organization UUID
- Fallbacks: ENV var → Database → Emergency UUID

---

## Verification Tests

### Test 1: Organization API
```bash
curl http://localhost:3000/api/v1/organizations/current
```
✅ Should return: `{"success":true,"data":{"id":"<uuid>",...}}`
❌ Should NOT return: error or "default"

### Test 2: UUID Validation
```bash
curl -X POST http://localhost:3000/api/v1/integrations/woocommerce/sync/customers \
  -H "Content-Type: application/json" \
  -d '{"config":{"url":"","consumerKey":"","consumerSecret":""},"org_id":"invalid"}'
```
✅ Should return: `{"success":false,"error":"Invalid organization ID format..."}`

### Test 3: Customer Sync
1. Open: http://localhost:3000/integrations/woocommerce
2. Configure WooCommerce credentials
3. Click "Sync Now" on Customers
4. Check logs for:
   - ✅ "Processing batch 1/X"
   - ✅ "Synced X customers"
   - ❌ No "invalid input syntax for type uuid"

---

## Rollback Plan (if needed)

If the fix causes issues:

### Quick Rollback
```bash
git revert HEAD~3
npm run dev
```

### Manual Rollback
Revert these files to previous version:
- `src/app/integrations/woocommerce/page.tsx`
- `src/app/api/v1/integrations/woocommerce/sync/customers/route.ts`

Delete this file:
- `src/app/api/v1/organizations/current/route.ts`

---

## Post-Deployment Monitoring

### Success Indicators
- ✅ Customer sync completes without errors
- ✅ Database queries succeed with valid UUIDs
- ✅ Circuit breaker stays closed
- ✅ Batch processing logs appear

### Failure Indicators
- ❌ "invalid input syntax for type uuid" errors
- ❌ "Failed to get organization ID" errors
- ❌ Circuit breaker opens immediately
- ❌ Sync fails for all customers

### Log Monitoring
Watch for these messages:
```bash
# Good signs:
"Processing batch X/Y"
"Synced X customers: Y created, Z updated"

# Bad signs:
"invalid input syntax for type uuid"
"Circuit breaker is open"
"Failed to get organization ID"
```

---

## Environment Variables Reference

### Required
```bash
# Default organization UUID
DEFAULT_ORG_ID=00000000-0000-0000-0000-000000000001
```

### Optional (existing)
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/mantis
WOOCOMMERCE_CONSUMER_KEY=ck_xxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxx
```

---

## Database Schema Requirements

### organization table must exist:
```sql
CREATE TABLE organization (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    plan_type text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

### customer table must reference organization:
```sql
CREATE TABLE customer (
    id uuid PRIMARY KEY,
    org_id uuid NOT NULL REFERENCES organization(id),
    email text,
    name text,
    ...
);
```

---

## Support & Troubleshooting

### Issue: Organization API returns 500 error
**Solution**:
```bash
# Check database connection
psql -U postgres -d your_database -c "SELECT 1;"

# Check if organization table exists
psql -U postgres -d your_database -c "\dt organization"

# Create organization if missing
psql -U postgres -d your_database -f scripts/create-default-org.sql
```

### Issue: "Failed to get organization ID" on frontend
**Solution**:
1. Check organization API: `curl http://localhost:3000/api/v1/organizations/current`
2. Set DEFAULT_ORG_ID environment variable
3. Restart application

### Issue: Still getting "invalid input syntax for type uuid"
**Solution**:
1. Verify frontend changes deployed (check browser dev tools network tab)
2. Clear browser cache
3. Check org_id value in request payload (should be UUID, not "default")
4. Verify backend validation is active (should reject "default")

### Issue: Circuit breaker opens immediately
**Solution**:
1. This is EXPECTED if org_id is still invalid
2. Fix org_id issue first (see above)
3. Wait 60 seconds for circuit to reset
4. Retry sync

---

## Files Changed in This Fix

### Modified Files
1. `src/app/integrations/woocommerce/page.tsx` (25 lines changed)
2. `src/app/api/v1/integrations/woocommerce/sync/customers/route.ts` (18 lines added)

### New Files
1. `src/app/api/v1/organizations/current/route.ts` (NEW - 93 lines)
2. `scripts/create-default-org.sql` (NEW - 14 lines)
3. `INCIDENT_RESPONSE_WOOCOMMERCE_SYNC.md` (NEW - documentation)
4. `DEPLOYMENT_INSTRUCTIONS_URGENT.md` (NEW - this file)

---

## Contact

For urgent issues during deployment:
- Check logs first: `tail -f logs/application.log`
- Test organization API: `curl http://localhost:3000/api/v1/organizations/current`
- Verify environment variables: `echo $DEFAULT_ORG_ID`

---

## Next Steps (After Deployment)

Once sync is working:
1. ✅ Monitor for 24 hours
2. ✅ Verify all customers synced correctly
3. ✅ Test with additional WooCommerce stores
4. 🔜 Integrate with authentication system (remove DEFAULT_ORG_ID dependency)
5. 🔜 Add org_id to integration_connector table
6. 🔜 Add multi-organization support

---

**Deployment Status**: READY ✅
**Risk Level**: LOW (defensive fix with fallbacks)
**Rollback Time**: <5 minutes
**Testing Time**: <10 minutes
