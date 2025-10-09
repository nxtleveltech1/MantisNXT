# Known Issues & Workarounds

This document tracks known issues in the MantisNXT project and their workarounds.

## 🔴 ACTIVE ISSUES

### 1. Zod v4 Peer Dependency Conflict with @ai-sdk/anthropic

**Status**: ⚠️ WORKAROUND ACTIVE
**Severity**: HIGH (Blocks Vercel deployment)
**Affected**: npm install, Vercel builds
**Fix Commit**: `7794ae5`

#### Problem
- `@ai-sdk/anthropic@1.2.12` requires `zod@^3.0.0` as peer dependency
- Project uses `zod@4.1.9` for latest features and bug fixes
- Causes `ERESOLVE` conflict during `npm install` on Vercel
- Blocks all deployments

#### Root Cause
- `@ai-sdk/anthropic` hasn't updated to support zod v4 yet
- Other AI SDK packages (`@ai-sdk/gateway`, etc.) already support zod v4
- Ecosystem lag in updating peer dependencies

#### Workaround (ACTIVE)
**Files**: `.npmrc`, `package.json`

```bash
# .npmrc
legacy-peer-deps=true
engine-strict=false
```

```json
// package.json
"overrides": {
  "zod": "^4.1.9"
}
```

#### Impact
- ✅ Vercel builds now succeed
- ✅ npm install works in all environments
- ✅ No functional changes to application
- ⚠️ Warning messages may appear during install (safe to ignore)

#### Monitoring
- Check @ai-sdk/anthropic releases: https://www.npmjs.com/package/@ai-sdk/anthropic
- Remove workarounds once v2.x or updated v1.x supports zod v4
- Expected resolution: Q2 2025

#### Testing
```bash
# Verify build works
npm install
npm run build

# Check for warnings (expected)
npm install 2>&1 | grep -i "peer"
```

---

### 2. Suppliers Table Missing contact_person Column

**Status**: 🔴 OPEN
**Severity**: MEDIUM (1 endpoint failure)
**Affected**: `/api/inventory/complete`
**Discovered**: ITERATION 3 - Emergency Schema Validation

#### Problem
- API endpoint queries `s.contact_person` from `core.supplier` table
- Column doesn't exist in actual database schema
- Causes 500 error on `/api/inventory/complete` endpoint

#### Error
```
ERROR: column s.contact_person does not exist
```

#### Root Cause
- Schema mismatch between API code and database
- Missing migration to add column
- OR API using incorrect column name

#### Solution Options
1. **Add column to database** (preferred if needed)
   ```sql
   ALTER TABLE core.supplier ADD COLUMN contact_person TEXT;
   ```

2. **Update API to use correct column** (if column name is wrong)
   - Check actual schema for correct column name
   - Update query in `src/app/api/inventory/complete/route.ts`

#### Next Steps
1. Verify actual supplier table schema
2. Determine if contact_person is needed
3. Create migration if needed
4. Update API endpoint
5. Test `/api/inventory/complete` returns 200 OK

---

### 3. Analytics Tables Missing Auto-Increment Sequences

**Status**: 🟡 MIGRATION READY
**Severity**: MEDIUM (Blocks INSERT operations)
**Affected**: Analytics tables
**Fix Available**: `database/migrations/005_fix_analytics_sequences.sql`

#### Problem
- Primary keys on analytics tables missing SERIAL/BIGSERIAL
- Manual sequence assignment required
- Causes INSERT failures without explicit IDs

#### Solution
- Migration 005 ready to deploy
- Adds sequences and DEFAULT nextval() to primary keys
- Rollback script available

#### Deployment
```bash
psql -f database/migrations/005_fix_analytics_sequences.sql
```

**Status**: Waiting for production maintenance window

---

## 🟢 RESOLVED ISSUES

### 1. RealTimeAnalyticsDashboard TypeError (RESOLVED)

**Resolved**: Git commit `6b6c9d4`
**Date**: 2025-10-09

#### Problem
- Component tried to call `.map()` on object instead of array
- TypeError: `anomaliesData.data.map is not a function`

#### Solution
- Updated component to access nested arrays:
  - `anomaliesData.data.anomalies`
  - `predictionsData.data.predictions`
  - `recommendationsData.data.recommendations`
- Added defensive null checks

**Status**: ✅ FIXED

---

### 2. Platform-Wide API Failures (RESOLVED)

**Resolved**: Git commits `098f44a`, `c4296df`
**Date**: 2025-10-09
**Iteration**: ITERATION 3 Emergency Fix

#### Problem
- 10+ API endpoints returning 500/400 errors
- Schema qualification missing (`core.*` prefix)
- Incorrect table/column names

#### Solution
- Fixed 3 critical endpoints:
  - `/api/analytics/dashboard`
  - `/api/suppliers`
  - `/api/inventory/products`
- Verified 7 endpoints already working
- Added comprehensive error handling

**Status**: ✅ 9/10 FIXED (90% success rate)

---

## 📋 How to Use This Document

### For Developers
1. Check this file before starting work
2. Note any workarounds that affect your area
3. Update when you discover new issues
4. Mark issues as resolved when fixed

### For Deployment
1. Review ACTIVE ISSUES before deploying
2. Verify workarounds are in place
3. Test affected areas post-deployment

### For Operations
1. Monitor issues marked as HIGH severity
2. Track upstream dependencies for fixes
3. Schedule maintenance windows for migrations

---

**Last Updated**: 2025-10-09
**Next Review**: 2025-10-16
**Document Owner**: Development Team
