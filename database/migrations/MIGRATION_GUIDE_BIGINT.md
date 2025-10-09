# Migration Execution Guide: BIGINT Strategy

**ADR Reference**: ADR-1 (Migration File Rewrite)
**Author**: Aster (Full-Stack Architect)
**Date**: 2025-10-09
**Status**: Production-Ready

---

## Overview

This guide provides step-by-step instructions for executing the BIGINT-based migrations on Neon database branches. These migrations replace the UUID-based migrations with BIGINT GENERATED ALWAYS AS IDENTITY columns to match production schema structure.

### Migrations Covered

| Migration | File | Description |
|-----------|------|-------------|
| 001 | `001_create_pricelist_tables_BIGINT.sql` | Creates supplier_pricelists and pricelist_items tables |
| 002 | `002_create_analytics_tables_BIGINT.sql` | Creates analytics, performance, and purchase order tables |

### Rollback Scripts

| Rollback | File | Purpose |
|----------|------|---------|
| 001 | `001_create_pricelist_tables_BIGINT_ROLLBACK.sql` | Drops pricelist tables |
| 002 | `002_create_analytics_tables_BIGINT_ROLLBACK.sql` | Drops analytics tables |

---

## Prerequisites

### Required Tools
- ✅ Neon CLI or Neon Console access
- ✅ PostgreSQL client (psql) or Node.js with pg library
- ✅ Access to Neon project: `proud-mud-50346856` (NXT-SPP-Supplier Inventory Portfolio)

### Environment Variables
```bash
NEON_PROJECT_ID=proud-mud-50346856
NEON_API_KEY=<your-api-key>
DATABASE_URL=<neon-connection-string>
```

---

## Safety Rules

### 🚨 CRITICAL SAFETY MEASURES

1. **NEVER execute migrations on production branch directly**
2. **ALWAYS use a test branch first**
3. **ALWAYS verify rollback works before considering migration safe**
4. **ALWAYS compare schemas after migration**
5. **NEVER skip validation steps**

### Testing Strategy

```
Development Branch → Test → Rollback → Re-apply → Validate → Production
```

---

## Execution Steps

### Step 1: Create Test Branch

```bash
# Using Neon CLI
neon branches create --project-id proud-mud-50346856 --name migration-test-001-002

# Or using Neon Console
# Navigate to: Project → Branches → Create Branch
# Name: migration-test-001-002
# Parent: production
```

**Expected Output**: Branch ID (e.g., `br-test-abc123`)

### Step 2: Connect to Test Branch

```bash
# Get connection string for test branch
neon connection-string proud-mud-50346856 --branch migration-test-001-002

# Export to environment
export DATABASE_URL="<connection-string-from-above>"
```

### Step 3: Run Pre-Migration Validation

```bash
# Execute validation script
node scripts/verify-migration-schema.js --pre-migration
```

**Expected Output**:
```
✅ Connected to branch: migration-test-001-002
✅ Core schema exists
⚠️  Pricelist tables: NOT FOUND (expected for new migration)
⚠️  Analytics tables: NOT FOUND (expected for new migration)
```

### Step 4: Execute Migration 001

```bash
# Using psql
psql "$DATABASE_URL" -f database/migrations/001_create_pricelist_tables_BIGINT.sql

# Or using Node.js script
node scripts/run-migration.js --file 001_create_pricelist_tables_BIGINT.sql
```

**Expected Output**:
```
NOTICE:  Supplier pricelists table exists: t
NOTICE:  Pricelist items table exists: t
NOTICE:  Migration 001 completed successfully (BIGINT strategy)
COMMIT
```

### Step 5: Validate Migration 001

```bash
node scripts/verify-migration-schema.js --validate-001
```

**Expected Validation**:
- ✅ `core.supplier_pricelists` table exists
- ✅ `pricelist_id` is BIGINT with identity
- ✅ `supplier_id` is BIGINT (FK to core.supplier)
- ✅ Foreign key constraints exist
- ✅ Indexes created
- ✅ Triggers functional

### Step 6: Execute Migration 002

```bash
# Using psql
psql "$DATABASE_URL" -f database/migrations/002_create_analytics_tables_BIGINT.sql

# Or using Node.js script
node scripts/run-migration.js --file 002_create_analytics_tables_BIGINT.sql
```

**Expected Output**:
```
NOTICE:  Table exists: core.supplier_performance
NOTICE:  Table exists: core.stock_movements
NOTICE:  Table exists: core.analytics_anomalies
NOTICE:  Table exists: core.analytics_predictions
NOTICE:  Table exists: core.analytics_dashboard_config
NOTICE:  Table exists: core.purchase_orders
NOTICE:  Table exists: core.purchase_order_items
NOTICE:  Migration 002: Created 7 out of 7 expected tables
NOTICE:  Migration 002 completed successfully (BIGINT strategy)
COMMIT
```

### Step 7: Validate Migration 002

```bash
node scripts/verify-migration-schema.js --validate-002
```

**Expected Validation**:
- ✅ All 7 analytics tables exist
- ✅ All ID columns are BIGINT with identity
- ✅ Foreign key constraints correct
- ✅ Indexes created
- ✅ Triggers functional

### Step 8: Test Rollback (CRITICAL)

```bash
# Rollback migration 002 first
psql "$DATABASE_URL" -f database/migrations/002_create_analytics_tables_BIGINT_ROLLBACK.sql

# Rollback migration 001
psql "$DATABASE_URL" -f database/migrations/001_create_pricelist_tables_BIGINT_ROLLBACK.sql
```

**Expected Output**:
```
NOTICE:  Dropped table: core.purchase_order_items
NOTICE:  Dropped table: core.purchase_orders
...
NOTICE:  Rollback validation: All tables successfully dropped
NOTICE:  Migration 002 rolled back successfully
COMMIT
```

### Step 9: Verify Rollback

```bash
node scripts/verify-migration-schema.js --post-rollback
```

**Expected Validation**:
- ✅ All migration tables dropped
- ✅ No orphaned constraints
- ✅ No orphaned indexes
- ✅ Database schema clean

### Step 10: Re-apply Migrations

```bash
# Re-apply to confirm repeatability
psql "$DATABASE_URL" -f database/migrations/001_create_pricelist_tables_BIGINT.sql
psql "$DATABASE_URL" -f database/migrations/002_create_analytics_tables_BIGINT.sql

# Final validation
node scripts/verify-migration-schema.js --final
```

### Step 11: Compare with Production Schema

```bash
# Compare test branch schema with production
node scripts/compare-schemas.js \
  --test-branch migration-test-001-002 \
  --production-branch production
```

**Expected Output**:
```
Schema Comparison Report
========================
✅ New tables in test branch: 9
✅ ID column types match: BIGINT
✅ Foreign key consistency: PASS
✅ Index coverage: PASS
⚠️  Tables not in production: 9 (expected - new migrations)
```

### Step 12: Apply to Production (When Ready)

**Prerequisites before production deployment**:
- ✅ All validation steps passed
- ✅ Rollback tested successfully
- ✅ Schema comparison approved
- ✅ Team review completed
- ✅ Backup created

```bash
# Switch to production branch connection
export DATABASE_URL="<production-connection-string>"

# Execute migrations
psql "$DATABASE_URL" -f database/migrations/001_create_pricelist_tables_BIGINT.sql
psql "$DATABASE_URL" -f database/migrations/002_create_analytics_tables_BIGINT.sql

# Final production validation
node scripts/verify-migration-schema.js --production
```

---

## Validation Checklist

### Pre-Migration
- [ ] Test branch created
- [ ] Connection string verified
- [ ] Pre-migration schema documented
- [ ] Rollback scripts reviewed

### During Migration
- [ ] Migration 001 completed without errors
- [ ] Migration 001 validation passed
- [ ] Migration 002 completed without errors
- [ ] Migration 002 validation passed

### Post-Migration
- [ ] Rollback tested successfully
- [ ] Migrations re-applied successfully
- [ ] Schema comparison matches expectations
- [ ] No orphaned objects remain
- [ ] Performance benchmarks acceptable

### Production Deployment
- [ ] All test validations passed
- [ ] Team review approved
- [ ] Backup created
- [ ] Deployment window scheduled
- [ ] Rollback plan documented

---

## Troubleshooting

### Error: "relation does not exist"

**Cause**: Foreign key table not created yet
**Solution**: Ensure migrations run in order (001 before 002)

### Error: "duplicate key value violates unique constraint"

**Cause**: Attempting to re-run migration without rollback
**Solution**: Run rollback script first, then re-apply migration

### Error: "column already exists"

**Cause**: Migration partially applied
**Solution**: Check current schema state, run rollback if needed

### Error: "permission denied"

**Cause**: Insufficient database permissions
**Solution**: Verify connection string uses correct credentials with DDL permissions

---

## Scripts Reference

### verify-migration-schema.js

**Purpose**: Validates database schema state before/after migrations
**Usage**:
```bash
node scripts/verify-migration-schema.js [--pre-migration|--validate-001|--validate-002|--post-rollback|--final]
```

### compare-schemas.js

**Purpose**: Compares schema between two branches
**Usage**:
```bash
node scripts/compare-schemas.js --test-branch <branch-id> --production-branch <branch-id>
```

### run-migration.js

**Purpose**: Executes migration file with proper error handling
**Usage**:
```bash
node scripts/run-migration.js --file <migration-file>
```

---

## Rollback Procedure

If migration fails in production:

1. **Immediate Action**:
   ```bash
   psql "$DATABASE_URL" -f database/migrations/002_create_analytics_tables_BIGINT_ROLLBACK.sql
   psql "$DATABASE_URL" -f database/migrations/001_create_pricelist_tables_BIGINT_ROLLBACK.sql
   ```

2. **Verify Rollback**:
   ```bash
   node scripts/verify-migration-schema.js --post-rollback
   ```

3. **Investigate**:
   - Review error logs
   - Check database permissions
   - Verify foreign key dependencies

4. **Fix and Retry**:
   - Correct migration scripts
   - Test on branch again
   - Re-apply to production when ready

---

## Success Criteria

Migration is considered successful when:

✅ All tables created with correct schema
✅ All ID columns are BIGINT with GENERATED ALWAYS AS IDENTITY
✅ All foreign keys reference correct tables
✅ All indexes created
✅ All triggers functional
✅ Rollback tested and verified
✅ Schema comparison matches production patterns
✅ No errors in execution logs
✅ Performance benchmarks acceptable

---

## Contact & Support

**Migration Owner**: Aster (Full-Stack Architect)
**ADR Reference**: ADR-1 (Migration File Rewrite - BIGINT Strategy)
**Project**: MantisNXT Inventory Management System
**Neon Project ID**: proud-mud-50346856

For issues or questions, refer to:
- Migration execution logs
- Schema comparison reports
- Validation script outputs
- ADR documentation
