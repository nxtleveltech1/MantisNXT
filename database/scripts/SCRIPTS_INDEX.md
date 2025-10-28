# Database Scripts Index

Complete reference for all database deployment and verification scripts.

## 📁 File Locations

All files are located in: `K:\00Project\MantisNXT\database\`

### Deployment Scripts
```
database/scripts/
├── deploy-critical-fixes.ts      # TypeScript deployment (recommended)
├── deploy-critical-fixes.sql     # Direct SQL deployment
├── deploy-critical-fixes.sh      # Shell script deployment (Linux/Mac)
└── deploy-critical-fixes.ps1     # PowerShell deployment (Windows)
```

### Verification Scripts
```
database/scripts/
├── verify-critical-fixes.ts           # Comprehensive verification
└── verify-rls-implementation.sql      # RLS policy verification
```

### Documentation
```
database/
├── DEPLOYMENT_QUICKSTART.md      # Quick deployment guide
└── migrations/
    └── README.md                  # Migration documentation
```

## 🎯 Purpose of Each File

### 1. deploy-critical-fixes.ts
**Language**: TypeScript
**Runtime**: Node.js with tsx
**Purpose**: Primary deployment script with comprehensive error handling
**Features**:
- ✅ Connection testing
- ✅ Transactional deployment
- ✅ Real-time progress reporting
- ✅ Automatic verification
- ✅ Colored terminal output
- ✅ Duration tracking

**Usage**:
```bash
tsx database/scripts/deploy-critical-fixes.ts
```

**Requirements**:
- Node.js 18+
- tsx (`npm install -g tsx`)
- pg package (`npm install pg`)
- DATABASE_URL or NEON_SPP_DATABASE_URL environment variable

---

### 2. deploy-critical-fixes.sql
**Language**: PostgreSQL SQL
**Runtime**: psql client
**Purpose**: Direct SQL deployment for maximum compatibility
**Features**:
- ✅ Single transaction
- ✅ Built-in verification
- ✅ Idempotent operations
- ✅ Inline documentation

**Usage**:
```bash
psql $DATABASE_URL -f database/scripts/deploy-critical-fixes.sql
```

**Requirements**:
- psql client installed
- DATABASE_URL environment variable

---

### 3. deploy-critical-fixes.sh
**Language**: Bash Shell Script
**Runtime**: Bash shell (Linux/Mac)
**Purpose**: Unix-style deployment with colored output
**Features**:
- ✅ Color-coded output
- ✅ Prerequisite checking
- ✅ Sequential deployment
- ✅ Automatic verification
- ✅ Duration tracking
- ✅ Exit code handling

**Usage**:
```bash
chmod +x database/scripts/deploy-critical-fixes.sh
./database/scripts/deploy-critical-fixes.sh
```

**Requirements**:
- Bash 4.0+
- psql client
- DATABASE_URL or NEON_SPP_DATABASE_URL

---

### 4. deploy-critical-fixes.ps1
**Language**: PowerShell
**Runtime**: PowerShell 5.1+ (Windows)
**Purpose**: Windows-native deployment script
**Features**:
- ✅ ANSI color support
- ✅ Error handling
- ✅ Progress reporting
- ✅ Verification integration
- ✅ Duration calculation

**Usage**:
```powershell
powershell -ExecutionPolicy Bypass -File .\database\scripts\deploy-critical-fixes.ps1
```

**Requirements**:
- PowerShell 5.1+
- psql client in PATH
- DATABASE_URL or NEON_SPP_DATABASE_URL

---

### 5. verify-critical-fixes.ts
**Language**: TypeScript
**Runtime**: Node.js with tsx
**Purpose**: Comprehensive post-deployment verification
**Features**:
- ✅ Database connection testing
- ✅ Sequence verification
- ✅ Auto-increment testing
- ✅ Column existence checks
- ✅ Index verification
- ✅ JSONB operation testing
- ✅ RLS policy inspection
- ✅ Detailed reporting
- ✅ Success metrics

**Usage**:
```bash
tsx database/scripts/verify-critical-fixes.ts
```

**What It Verifies**:
1. Database connectivity
2. Analytics sequences exist and work
3. contact_person column exists with correct type
4. GIN index on contact_person
5. JSONB insert/query operations
6. No NULL values in contact_person
7. RLS policy status (optional)

**Output**: Pass/fail for each test with detailed metrics

---

### 6. verify-rls-implementation.sql
**Language**: PostgreSQL SQL
**Runtime**: psql client
**Purpose**: RLS policy verification and analysis
**Features**:
- ✅ RLS status check per table
- ✅ Policy listing and analysis
- ✅ Coverage analysis (SELECT/INSERT/UPDATE/DELETE)
- ✅ Role-based policy review
- ✅ Complexity analysis
- ✅ Security recommendations

**Usage**:
```bash
psql $DATABASE_URL -f database/scripts/verify-rls-implementation.sql
```

**What It Reports**:
1. Tables with RLS enabled/disabled
2. Existing RLS policies
3. CRUD operation coverage
4. Role assignments
5. Policy complexity metrics
6. Security recommendations

---

### 7. DEPLOYMENT_QUICKSTART.md
**Type**: Documentation
**Purpose**: Rapid deployment reference guide
**Contents**:
- Quick deploy commands (all methods)
- Prerequisites checklist
- What gets deployed
- One-line deploy + verify
- Rollback procedures
- Expected output examples
- Troubleshooting guide
- NPM scripts reference

---

### 8. migrations/README.md
**Type**: Documentation
**Purpose**: Complete migration system documentation
**Contents**:
- Directory structure
- Execution order
- Critical migrations explanation
- Verification procedures
- Rollback procedures
- Migration templates
- Best practices
- Common issues and solutions

---

## 🚀 Quick Reference

### Deploy Everything (Recommended Flow)
```bash
# 1. Deploy critical fixes
tsx database/scripts/deploy-critical-fixes.ts

# 2. Verify deployment
tsx database/scripts/verify-critical-fixes.ts

# 3. Check RLS policies (optional)
psql $DATABASE_URL -f database/scripts/verify-rls-implementation.sql
```

### Deploy by Platform

**Windows (PowerShell)**:
```powershell
.\database\scripts\deploy-critical-fixes.ps1
tsx database\scripts\verify-critical-fixes.ts
```

**Linux/Mac (Bash)**:
```bash
./database/scripts/deploy-critical-fixes.sh
tsx database/scripts/verify-critical-fixes.ts
```

**Any Platform (SQL)**:
```bash
psql $DATABASE_URL -f database/scripts/deploy-critical-fixes.sql
psql $DATABASE_URL -f database/scripts/verify-rls-implementation.sql
```

**Any Platform (Node.js)**:
```bash
tsx database/scripts/deploy-critical-fixes.ts
tsx database/scripts/verify-critical-fixes.ts
```

## 📊 What Gets Fixed

### Migration 005: Analytics Sequences
**Problem**: Missing auto-increment sequences
**Tables Affected**:
- `core.analytics_anomalies`
- `core.analytics_predictions`

**What Happens**:
1. Creates sequences: `analytics_anomalies_anomaly_id_seq`, `analytics_predictions_prediction_id_seq`
2. Links sequences to primary key columns
3. Sets current value to max(id) + 1
4. Sets sequence ownership for auto-cleanup
5. Tests auto-increment with INSERT/DELETE

**Result**: INSERT operations work without explicit IDs

---

### Migration 006: Supplier Contact Person
**Problem**: Missing contact_person column
**Table Affected**: `core.supplier`

**What Happens**:
1. Adds `contact_person JSONB` column
2. Sets default to empty object `{}`
3. Creates GIN index for JSONB queries
4. Updates all existing rows to `{}`
5. Tests JSONB operations

**Result**: `/api/inventory/complete` route works correctly

---

## ✅ Success Indicators

After running deployment scripts, you should see:

### deploy-critical-fixes.ts Output
```
============================================================
  ✓ ALL CRITICAL FIXES DEPLOYED SUCCESSFULLY
============================================================

  Total Duration: ~500ms

  ✓ 005_fix_analytics_sequences.sql (234ms)
  ✓ 006_add_supplier_contact_person.sql (156ms)
```

### verify-critical-fixes.ts Output
```
============================================================
  VERIFICATION SUMMARY
============================================================

  Total Tests: 12-15
  Passed: 12-15
  Warnings: 0-2 (non-critical)
  Failed: 0
  Success Rate: 100.0%

  ✓ ALL CRITICAL VERIFICATIONS PASSED
```

### Database State After Success
```sql
-- Sequences exist and work
SELECT nextval('core.analytics_anomalies_anomaly_id_seq');  -- Returns: 1, 2, 3...
SELECT nextval('core.analytics_predictions_prediction_id_seq');  -- Returns: 1, 2, 3...

-- Column exists with correct type
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'supplier' AND column_name = 'contact_person';
-- Returns: contact_person | jsonb

-- Index exists
SELECT indexname FROM pg_indexes
WHERE tablename = 'supplier' AND indexname = 'idx_supplier_contact_person_gin';
-- Returns: idx_supplier_contact_person_gin
```

## 🚨 Failure Indicators

If you see these, something went wrong:

### Deployment Failures
```
✗ Database Connection Failed
✗ 005_fix_analytics_sequences.sql deployment failed
✗ 006_add_supplier_contact_person.sql deployment failed
```

**Action**: Check database connectivity, permissions, and review error messages

### Verification Failures
```
✗ Analytics Sequences Exist (Found 0/2 sequences)
✗ Contact Person Column Exists (Column not found)
✗ JSONB Operations (Data mismatch)
```

**Action**: Re-run deployment scripts or manually apply migrations

## 🔧 Troubleshooting

### Common Issues

1. **"psql: command not found"**
   - Install PostgreSQL client
   - Add to PATH

2. **"DATABASE_URL not set"**
   - Set environment variable
   - Or use `NEON_SPP_DATABASE_URL`

3. **"permission denied"**
   - Ensure database user has CREATE/ALTER privileges
   - Check schema ownership

4. **"relation already exists"**
   - Normal if migrations already applied
   - Scripts use `IF NOT EXISTS` clauses

5. **"tsx: command not found"**
   - Install tsx: `npm install -g tsx`
   - Or use npx: `npx tsx database/scripts/deploy-critical-fixes.ts`

## 📞 Support Resources

- **Deployment Guide**: [DEPLOYMENT_QUICKSTART.md](../DEPLOYMENT_QUICKSTART.md)
- **Migration Docs**: [migrations/README.md](../migrations/README.md)
- **Schema Docs**: [schema/COMPREHENSIVE_ARCHITECTURE_DOCUMENTATION.md](../schema/COMPREHENSIVE_ARCHITECTURE_DOCUMENTATION.md)
- **Database Oracle**: This document (you're reading it!)

## 🎯 Production Checklist

Before deploying to production:

- [ ] Scripts tested on staging
- [ ] Database backup created
- [ ] Maintenance window scheduled
- [ ] Team notified
- [ ] Rollback procedure ready
- [ ] Monitoring alerts configured
- [ ] Verification scripts ready
- [ ] Post-deployment tests planned

## 📝 Script Maintenance

These scripts are **production-ready** and require minimal maintenance. However:

- Update connection strings if database moves
- Adjust timeout values for slow connections
- Add new migrations to deployment scripts
- Keep verification tests in sync with schema changes

---

**Created**: 2025-10-28
**Last Updated**: 2025-10-28
**Maintainer**: Database Oracle
**Status**: Production Ready ✅
