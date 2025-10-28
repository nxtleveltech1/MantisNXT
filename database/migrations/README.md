# Database Migrations

This directory contains all database migration scripts for the MantisNXT inventory management system.

## 📁 Directory Structure

```
database/migrations/
├── 001_create_pricelist_tables.sql           # Core pricelist tables
├── 002_create_analytics_tables.sql           # Analytics infrastructure
├── 003_critical_schema_fixes.sql             # Schema corrections
├── 004_create_purchase_orders.sql            # Purchase order system
├── 005_fix_analytics_sequences.sql           # Analytics auto-increment fix
├── 006_add_supplier_contact_person.sql       # Supplier contact person column
├── 007_add_missing_supplier_columns.sql      # Additional supplier fields
├── 008_add_created_by_to_stock_movement.sql  # Stock movement audit
└── data/                                      # Data migration scripts
    └── README_MIGRATION_EXECUTION.md         # Data migration guide
```

## 🎯 Migration Execution Order

Migrations must be executed in numerical order:

1. **001** - Pricelist tables (foundation)
2. **002** - Analytics tables
3. **003** - Schema fixes
4. **004** - Purchase orders
5. **005** - Analytics sequences ⚠️ **CRITICAL**
6. **006** - Supplier contact person ⚠️ **CRITICAL**
7. **007** - Supplier columns
8. **008** - Stock movement audit

## ⚠️ Critical Migrations

### Migration 005: Analytics Sequences Fix
**Problem**: Analytics tables missing auto-increment sequences
**Impact**: INSERT failures on `analytics_anomalies` and `analytics_predictions`
**Solution**: Creates sequences and links to primary keys

```sql
-- What it does
CREATE SEQUENCE core.analytics_anomalies_anomaly_id_seq;
ALTER TABLE core.analytics_anomalies
  ALTER COLUMN anomaly_id SET DEFAULT nextval('core.analytics_anomalies_anomaly_id_seq');
```

### Migration 006: Supplier Contact Person
**Problem**: Missing `contact_person` column on `core.supplier`
**Impact**: `/api/inventory/complete` route failures
**Solution**: Adds JSONB column with GIN index

```sql
-- What it does
ALTER TABLE core.supplier
ADD COLUMN contact_person JSONB DEFAULT '{}'::jsonb;

CREATE INDEX idx_supplier_contact_person_gin
ON core.supplier USING GIN (contact_person);
```

## 🚀 Quick Deployment

### Deploy Critical Fixes Only
```bash
# TypeScript (recommended)
tsx database/scripts/deploy-critical-fixes.ts

# SQL direct
psql $DATABASE_URL -f database/scripts/deploy-critical-fixes.sql

# Shell script
./database/scripts/deploy-critical-fixes.sh

# PowerShell
.\database\scripts\deploy-critical-fixes.ps1
```

### Deploy Single Migration
```bash
# Using npm script
npm run db:migrate -- 005_fix_analytics_sequences.sql

# Direct psql
psql $DATABASE_URL -f database/migrations/005_fix_analytics_sequences.sql
```

### Deploy All Migrations
```bash
# Sequential deployment (recommended)
for file in database/migrations/00*.sql; do
  echo "Deploying $file..."
  psql $DATABASE_URL -f "$file"
done
```

## 🔍 Verification

### Verify Critical Fixes
```bash
# Comprehensive verification
tsx database/scripts/verify-critical-fixes.ts

# Expected output: All tests pass
# ✓ Analytics Sequences Exist
# ✓ Auto-increment works
# ✓ Contact person column exists
# ✓ JSONB operations work
```

### Verify Single Migration
```bash
# Check analytics sequences
psql $DATABASE_URL -c "
  SELECT
    pg_get_serial_sequence('core.analytics_anomalies', 'anomaly_id') as anomalies_seq,
    pg_get_serial_sequence('core.analytics_predictions', 'prediction_id') as predictions_seq;
"

# Check contact_person column
psql $DATABASE_URL -c "
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'core'
    AND table_name = 'supplier'
    AND column_name = 'contact_person';
"
```

## 📋 Migration Template

When creating new migrations, use this template:

```sql
-- ============================================================================
-- Migration: [Number]_[descriptive_name].sql
-- Date: YYYY-MM-DD
-- Phase: [Phase Letter] - [Phase Name]
-- Issue: [Brief description of problem]
-- ============================================================================

BEGIN;

-- [Migration logic here]

-- Verification
DO $$
BEGIN
  -- Test the migration
  -- RAISE NOTICE if successful
  -- RAISE EXCEPTION if failed
END $$;

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
```

## 🔄 Rollback Procedures

### Rollback Migration 006
```sql
BEGIN;
DROP INDEX IF EXISTS core.idx_supplier_contact_person_gin;
ALTER TABLE core.supplier DROP COLUMN IF EXISTS contact_person;
COMMIT;
```

### Rollback Migration 005
```sql
BEGIN;
ALTER TABLE core.analytics_anomalies
  ALTER COLUMN anomaly_id DROP DEFAULT;
DROP SEQUENCE IF EXISTS core.analytics_anomalies_anomaly_id_seq CASCADE;

ALTER TABLE core.analytics_predictions
  ALTER COLUMN prediction_id DROP DEFAULT;
DROP SEQUENCE IF EXISTS core.analytics_predictions_prediction_id_seq CASCADE;
COMMIT;
```

## 📊 Migration Status Tracking

### Check Applied Migrations
```sql
-- Create migration tracking table (if not exists)
CREATE TABLE IF NOT EXISTS core.schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW(),
  applied_by VARCHAR(255) DEFAULT CURRENT_USER,
  description TEXT
);

-- Query migration status
SELECT * FROM core.schema_migrations ORDER BY version;
```

### Record Migration
```sql
INSERT INTO core.schema_migrations (version, description)
VALUES ('005', 'Fix analytics sequences')
ON CONFLICT (version) DO NOTHING;
```

## 🛠️ Development Workflow

### Before Creating Migration
1. Review existing schema
2. Check for conflicts with other migrations
3. Plan rollback strategy
4. Write verification tests

### Creating Migration
1. Create numbered file: `00X_descriptive_name.sql`
2. Write idempotent SQL (use `IF NOT EXISTS`)
3. Add verification block
4. Test locally first

### After Migration
1. Run verification scripts
2. Test affected API endpoints
3. Monitor for errors
4. Update documentation

## 🚨 Common Issues

### Issue: "relation already exists"
**Solution**: Use `IF NOT EXISTS` clauses
```sql
CREATE TABLE IF NOT EXISTS core.my_table (...);
ALTER TABLE core.my_table ADD COLUMN IF NOT EXISTS my_column TEXT;
```

### Issue: "column does not exist"
**Solution**: Check migration order and dependencies
```bash
# Verify prerequisites are applied
psql $DATABASE_URL -c "\d core.supplier"
```

### Issue: "permission denied"
**Solution**: Ensure database user has proper privileges
```sql
GRANT CREATE ON SCHEMA core TO current_user;
GRANT USAGE ON SCHEMA core TO current_user;
```

## 📚 Migration Categories

### Schema Migrations
- Table creation/modification
- Column additions/changes
- Index creation
- Constraint management

### Data Migrations
- Data transformations
- Bulk updates
- Data cleanup
- Legacy data imports

### Performance Migrations
- Index optimization
- Query plan improvements
- Partitioning
- Archival strategies

### Security Migrations
- RLS policy creation
- Permission updates
- Audit trail setup
- Encryption enablement

## 🔐 Security Considerations

### RLS (Row-Level Security)
```sql
-- Enable RLS on table
ALTER TABLE core.my_table ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY my_policy ON core.my_table
  FOR SELECT
  USING (organization_id = current_setting('app.current_org_id')::INTEGER);
```

### Audit Logging
```sql
-- Add audit columns
ALTER TABLE core.my_table
ADD COLUMN created_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN created_by INTEGER REFERENCES core.user_account(user_id),
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW(),
ADD COLUMN updated_by INTEGER REFERENCES core.user_account(user_id);
```

## 📖 Best Practices

1. **Idempotency**: Always use `IF NOT EXISTS` and `IF EXISTS`
2. **Transactions**: Wrap migrations in `BEGIN`/`COMMIT`
3. **Verification**: Include verification blocks
4. **Rollback**: Document rollback procedures
5. **Backward Compatibility**: Support gradual rollout
6. **Performance**: Run on staging first
7. **Documentation**: Comment complex logic
8. **Testing**: Test with production-like data volume

## 🔗 Related Documentation

- [Deployment Quickstart](../DEPLOYMENT_QUICKSTART.md)
- [Schema Architecture](../schema/COMPREHENSIVE_ARCHITECTURE_DOCUMENTATION.md)
- [Migration Strategy](../schema/MIGRATION_STRATEGY.md)
- [API Integration](../schema/API_INTEGRATION_ARCHITECTURE.md)

## 📞 Support

For migration issues:
1. Check verification scripts output
2. Review PostgreSQL logs
3. Test on staging environment
4. Consult schema documentation
5. Contact database team

## 📝 NPM Scripts

Add these to `package.json`:

```json
{
  "scripts": {
    "db:migrate": "tsx scripts/run-migration.ts",
    "db:migrate:verify": "tsx scripts/verify-migration.ts",
    "db:migrate:status": "psql $DATABASE_URL -c 'SELECT * FROM core.schema_migrations ORDER BY version'",
    "db:deploy:critical": "tsx database/scripts/deploy-critical-fixes.ts",
    "db:verify:critical": "tsx database/scripts/verify-critical-fixes.ts"
  }
}
```

## ✅ Migration Checklist

Before deploying to production:

- [ ] Migration tested on local database
- [ ] Migration tested on staging database
- [ ] Verification script passes
- [ ] Rollback procedure documented
- [ ] Performance impact assessed
- [ ] Backup created
- [ ] Team notified
- [ ] Documentation updated
- [ ] Monitoring alerts configured
- [ ] Deployment window scheduled

---

**Last Updated**: 2025-10-28
**Maintainer**: Database Oracle
**Version**: 1.0.0
