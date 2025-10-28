# Database Deployment Quickstart

This guide provides rapid deployment instructions for MantisNXT critical database fixes.

## 🎯 Quick Deploy (Choose One Method)

### Method 1: TypeScript Script (Recommended)
```bash
# Using tsx directly
tsx database/scripts/deploy-critical-fixes.ts

# Or using npm script (add to package.json)
npm run db:deploy:critical
```

### Method 2: SQL Direct
```bash
# Using psql
psql $DATABASE_URL -f database/scripts/deploy-critical-fixes.sql

# Or with Neon connection string
psql $NEON_SPP_DATABASE_URL -f database/scripts/deploy-critical-fixes.sql
```

### Method 3: Shell Script (Linux/Mac)
```bash
# Make executable
chmod +x database/scripts/deploy-critical-fixes.sh

# Run
./database/scripts/deploy-critical-fixes.sh
```

### Method 4: PowerShell (Windows)
```powershell
# Run with execution policy bypass
powershell -ExecutionPolicy Bypass -File .\database\scripts\deploy-critical-fixes.ps1

# Or if already allowed
.\database\scripts\deploy-critical-fixes.ps1
```

## 📋 Prerequisites

### Required
- PostgreSQL client (`psql`) installed and in PATH
- Node.js 18+ with `tsx` for TypeScript execution
- Environment variable set:
  - `DATABASE_URL` or `NEON_SPP_DATABASE_URL`

### Optional
- `pg` npm package for TypeScript scripts
- Bash shell for `.sh` scripts
- PowerShell 5.1+ for `.ps1` scripts

## 🔍 Verification

After deployment, verify the fixes:

```bash
# Comprehensive verification
tsx database/scripts/verify-critical-fixes.ts

# RLS verification (optional)
psql $DATABASE_URL -f database/scripts/verify-rls-implementation.sql
```

## 📦 What Gets Deployed

### Migration 005: Analytics Sequences Fix
- Creates auto-increment sequences for `analytics_anomalies` and `analytics_predictions`
- Links sequences to primary key columns
- Tests auto-increment functionality
- **Impact**: Fixes INSERT failures on analytics tables

### Migration 006: Supplier Contact Person Column
- Adds `contact_person` JSONB column to `core.supplier`
- Creates GIN index for JSONB queries
- Sets default empty object for all rows
- **Impact**: Fixes `/api/inventory/complete` route failures

## ⚡ One-Line Deploy + Verify

```bash
# TypeScript (recommended)
tsx database/scripts/deploy-critical-fixes.ts && tsx database/scripts/verify-critical-fixes.ts

# SQL
psql $DATABASE_URL -f database/scripts/deploy-critical-fixes.sql && \
psql $DATABASE_URL -f database/scripts/verify-rls-implementation.sql

# Shell
./database/scripts/deploy-critical-fixes.sh && \
tsx database/scripts/verify-critical-fixes.ts
```

## 🚨 Rollback (If Needed)

If deployment fails, you can manually rollback:

```sql
-- Rollback 006 (Contact Person)
BEGIN;
DROP INDEX IF EXISTS core.idx_supplier_contact_person_gin;
ALTER TABLE core.supplier DROP COLUMN IF EXISTS contact_person;
COMMIT;

-- Rollback 005 (Analytics Sequences)
BEGIN;
ALTER TABLE core.analytics_anomalies
  ALTER COLUMN anomaly_id DROP DEFAULT;
DROP SEQUENCE IF EXISTS core.analytics_anomalies_anomaly_id_seq CASCADE;

ALTER TABLE core.analytics_predictions
  ALTER COLUMN prediction_id DROP DEFAULT;
DROP SEQUENCE IF EXISTS core.analytics_predictions_prediction_id_seq CASCADE;
COMMIT;
```

## 📊 Expected Output

### Successful Deployment
```
============================================================
  CRITICAL DATABASE FIXES DEPLOYMENT
============================================================

✓ Database Connection Verified
  Database: neondb
  Time: 2025-10-28 12:34:56

→ Deploying 005_fix_analytics_sequences.sql...
  ✓ Success (234ms)

→ Deploying 006_add_supplier_contact_person.sql...
  ✓ Success (156ms)

→ Verifying migrations...
  ✓ Sequence core.analytics_anomalies_anomaly_id_seq exists
  ✓ Sequence core.analytics_predictions_prediction_id_seq exists
  ✓ Column contact_person exists (jsonb)
  ✓ GIN index idx_supplier_contact_person_gin exists

============================================================
  ✓ ALL CRITICAL FIXES DEPLOYED SUCCESSFULLY
============================================================

  Total Duration: 390ms
```

### Verification Output
```
============================================================
  CRITICAL DATABASE FIXES VERIFICATION
============================================================

→ Testing database connection...
  ✓ Database Connection

→ Verifying analytics sequences...
  ✓ Analytics Sequences Exist (2/2)
  ✓ Sequence linked to analytics_anomalies.anomaly_id
  ✓ Sequence linked to analytics_predictions.prediction_id

→ Testing auto-increment functionality...
  ✓ Analytics Anomalies Auto-Increment (Generated ID: 1001)
  ✓ Analytics Predictions Auto-Increment (Generated ID: 2001)

→ Verifying supplier contact_person column...
  ✓ Contact Person Column Exists (Type: jsonb)
  ✓ Contact Person Data Type (JSONB)
  ✓ Contact Person GIN Index (idx_supplier_contact_person_gin)

→ Testing JSONB operations...
  ✓ JSONB Insert/Query Operations (Data correctly stored)
  ✓ Test Data Cleanup

============================================================
  VERIFICATION SUMMARY
============================================================

  Total Tests: 12
  Passed: 12
  Success Rate: 100.0%

  ✓ ALL CRITICAL VERIFICATIONS PASSED
```

## 🔧 Troubleshooting

### Connection Errors
```bash
# Test connection manually
psql $DATABASE_URL -c "SELECT NOW()"

# Check environment variables
echo $DATABASE_URL
echo $NEON_SPP_DATABASE_URL
```

### Permission Errors
```bash
# Verify you have CREATE and ALTER permissions
psql $DATABASE_URL -c "
SELECT has_schema_privilege('core', 'CREATE') as can_create,
       has_schema_privilege('core', 'USAGE') as can_use;
"
```

### Migration Already Applied
If migrations are already applied, the scripts will succeed silently due to `IF NOT EXISTS` clauses. This is safe and expected behavior.

## 📚 Additional Resources

- [Migrations README](./migrations/README.md) - Detailed migration documentation
- [Schema Documentation](./schema/COMPREHENSIVE_ARCHITECTURE_DOCUMENTATION.md)
- [RLS Implementation](./scripts/verify-rls-implementation.sql)

## 🆘 Support

If deployment fails:
1. Check the error message carefully
2. Verify database connectivity
3. Ensure you have proper permissions
4. Review logs for specific SQL errors
5. Try manual verification queries

## 📝 NPM Scripts (Add to package.json)

```json
{
  "scripts": {
    "db:deploy:critical": "tsx database/scripts/deploy-critical-fixes.ts",
    "db:verify:critical": "tsx database/scripts/verify-critical-fixes.ts",
    "db:verify:rls": "psql $DATABASE_URL -f database/scripts/verify-rls-implementation.sql",
    "db:fix:complete": "npm run db:deploy:critical && npm run db:verify:critical"
  }
}
```

## ✅ Success Criteria

Deployment is successful when:
- ✅ Both migrations execute without errors
- ✅ Analytics sequences exist and generate IDs
- ✅ Supplier table has `contact_person` column
- ✅ GIN index exists on `contact_person`
- ✅ No NULL values in `contact_person` column
- ✅ JSONB operations work correctly

## 🎉 Post-Deployment

After successful deployment:
1. ✅ Analytics INSERT operations work without explicit IDs
2. ✅ `/api/inventory/complete` route no longer fails
3. ✅ Supplier contact information can be stored and queried
4. ✅ Application errors related to schema mismatches are resolved

---

**Last Updated**: 2025-10-28
**Maintainer**: Database Oracle
**Status**: Production Ready
