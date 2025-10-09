## MantisNXT - ADR-1 & ADR-4 Deployment Instructions

**Date**: 2025-10-09
**Author**: Data Oracle
**Phase**: DEVELOPMENT - P0 ADR Implementation
**Status**: Ready for Deployment

---

### Overview

This document provides step-by-step deployment instructions for:
- **ADR-4**: Purchase Orders Table Creation
- **ADR-1**: Logical Replication Setup (Neon → Postgres OLD)

**IMPORTANT**: Follow these instructions in the exact order specified.

---

### Prerequisites

#### Required Access

- [x] Neon database access (neondb_owner)
- [x] Postgres OLD database access (nxtdb_admin)
- [x] Network connectivity from Postgres OLD to Neon (port 5432)
- [x] Node.js installed for health check script

#### Required Files

All required files are in the repository:

```
database/
├── migrations/
│   ├── 004_create_purchase_orders.sql    (Purchase orders creation)
│   └── 004_rollback.sql                  (Rollback script)
├── replication/
│   ├── setup-publication.sql             (Neon publication setup)
│   ├── setup-subscription.sql            (Postgres OLD subscription)
│   ├── monitoring.sql                    (Monitoring queries)
│   └── REPLICATION_GUIDE.md              (Complete guide)
├── schema/
│   └── purchase_orders_schema.md         (Schema documentation)
└── tests/
    ├── test_purchase_orders.sql          (Purchase orders tests)
    └── test_replication.sql              (Replication tests)

scripts/
└── replication-health-check.js           (Automated health monitoring)
```

---

### Deployment Steps

#### Step 1: Pre-Deployment Verification

**1.1 Check Current Database Connections**

```bash
# Test Neon connection
psql "postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require" -c "SELECT version();"

# Test Postgres OLD connection
psql -h 62.169.20.53 -p 6600 -U nxtdb_admin -d nxtprod-db_001 -c "SELECT version();"
```

**Expected**: Both connections succeed with PostgreSQL version >= 10.

**1.2 Verify Schema Synchronization**

Ensure both databases have matching core schema from previous migrations:

```bash
# On Neon
psql "postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require" -c "\dt core.*"

# On Postgres OLD
psql -h 62.169.20.53 -p 6600 -U nxtdb_admin -d nxtprod-db_001 -c "\dt core.*"
```

**Expected**: Both show the same core schema tables (brand, supplier, product, etc.).

---

#### Step 2: Deploy Purchase Orders Table (ADR-4)

**2.1 Deploy on Neon (Primary)**

```bash
cd K:/00Project/MantisNXT

psql "postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require" \
  -f database/migrations/004_create_purchase_orders.sql
```

**Expected output:**
```
NOTICE:  Purchase Orders table exists: true
NOTICE:  Purchase Order Items table exists: true
NOTICE:  Indexes created: [count]
NOTICE:  Triggers created: [count]
         sample_po_number
---------------------------------
 PO-202510-0001
(1 row)

COMMIT
```

**2.2 Verify on Neon**

```bash
psql "postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require" -c "
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'core'
AND table_name IN ('purchase_orders', 'purchase_order_items')
ORDER BY table_name;
"
```

**Expected:**
```
     table_name
---------------------
 purchase_order_items
 purchase_orders
(2 rows)
```

**2.3 Deploy on Postgres OLD (Replica)**

```bash
psql -h 62.169.20.53 -p 6600 -U nxtdb_admin -d nxtprod-db_001 \
  -f database/migrations/004_create_purchase_orders.sql
```

**Expected**: Same output as Neon deployment.

**2.4 Run Purchase Orders Tests**

```bash
# Test on Neon
psql "postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require" \
  -f database/tests/test_purchase_orders.sql
```

**Expected:**
```
NOTICE:  TEST 1 PASSED: Table structure verification ✓
NOTICE:  TEST 2 PASSED: Foreign key constraints ✓
NOTICE:  TEST 3 PASSED: CHECK constraints ✓
NOTICE:  TEST 4 PASSED: Computed columns ✓
NOTICE:  TEST 5 PASSED: Trigger functions ✓
NOTICE:  TEST 6 PASSED: Helper functions ✓
NOTICE:  TEST 7 PASSED: Index verification ✓
NOTICE:  TEST 8 PASSED: Cascade deletes ✓
NOTICE:  ALL PURCHASE ORDERS TESTS PASSED ✓
ROLLBACK
```

**Repeat tests on Postgres OLD**.

---

#### Step 3: Set Up Logical Replication (ADR-1)

**3.1 Verify Neon Replication Support**

```bash
psql "postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require" -c "
SELECT name, setting FROM pg_settings
WHERE name IN ('wal_level', 'max_wal_senders', 'max_replication_slots');
"
```

**Expected:**
```
         name          | setting
-----------------------+---------
 wal_level             | logical
 max_wal_senders       | 10
 max_replication_slots | 10
```

**CRITICAL**: If `wal_level` is not `logical`, contact Neon support to enable logical replication before proceeding.

**3.2 Create Publication on Neon**

```bash
psql "postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require" \
  -f database/replication/setup-publication.sql
```

**Expected output:**
```
NOTICE:  WAL Level: logical (must be "logical")
NOTICE:  Max WAL Senders: 10 (should be > 0)
NOTICE:  Max Replication Slots: 10 (should be > 0)
NOTICE:  Publication exists: true
NOTICE:  Tables in publication: 11
NOTICE:  Publication setup completed successfully
```

**3.3 Verify Publication**

```bash
psql "postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require" -c "
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'mantisnxt_core_replication'
ORDER BY tablename;
"
```

**Expected**: 11 tables listed (including purchase_orders, purchase_order_items).

**3.4 Create Subscription on Postgres OLD**

**IMPORTANT**: Before running, verify the connection string in `setup-subscription.sql` is correct. Open the file and check line ~85:

```sql
CONNECTION 'host=ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech port=5432 dbname=neondb user=neondb_owner password=npg_84ELeCFbOcGA sslmode=require'
```

Deploy subscription:

```bash
psql -h 62.169.20.53 -p 6600 -U nxtdb_admin -d nxtprod-db_001 \
  -f database/replication/setup-subscription.sql
```

**Expected output:**
```
NOTICE:  PostgreSQL version: [version]
NOTICE:  All required tables exist on subscriber
NOTICE:  Subscription exists: true
NOTICE:  Subscription enabled: true
NOTICE:  Worker running: true
NOTICE:  Subscription setup completed
```

**3.5 Monitor Initial Sync**

Initial sync copies all existing data from Neon to Postgres OLD. Monitor progress:

```bash
psql -h 62.169.20.53 -p 6600 -U nxtdb_admin -d nxtprod-db_001 -c "
SELECT
  s.subname,
  srw.relid::regclass AS table_name,
  CASE srw.srsubstate
    WHEN 'i' THEN 'initializing'
    WHEN 'd' THEN 'data is being copied'
    WHEN 's' THEN 'synchronized'
    WHEN 'r' THEN 'ready (streaming)'
  END AS state
FROM pg_subscription_rel srw
JOIN pg_subscription s ON s.oid = srw.srsubid
WHERE s.subname = 'mantisnxt_from_neon'
ORDER BY srw.relid::regclass::text;
"
```

**Wait until all tables show state = `'ready (streaming)'`** before proceeding.

Typical sync time:
- Small dataset (<1GB): 1-5 minutes
- Medium dataset (1-10GB): 5-30 minutes
- Large dataset (>10GB): 30+ minutes

---

#### Step 4: Verify Replication is Working

**4.1 Run Automated Health Check**

```bash
cd K:/00Project/MantisNXT
node scripts/replication-health-check.js
```

**Expected output:**
```
====================================================================================
MANTISNXT REPLICATION HEALTH CHECK RESULTS
====================================================================================
Timestamp: 2025-10-09T...

PUBLISHER (Neon) HEALTH:
  Status: OK
  Publication Exists: ✓
  Active Senders: 1

SUBSCRIBER (Postgres OLD) HEALTH:
  Status: OK
  Subscription Exists: ✓
  Worker Running: ✓
  Replication Lag: 0.12s
  Lag Bytes: 0 Bytes
  Tables Ready: 11/11

DATA CONSISTENCY:
  Status: OK
  Table Counts:
    ✓ analytics_events: Publisher=X, Subscriber=X
    ✓ brand: Publisher=Y, Subscriber=Y
    ...

====================================================================================
OVERALL STATUS: HEALTHY ✓
====================================================================================
```

**Exit code 0 = healthy**

**4.2 Run Replication Tests**

Test publisher:

```bash
psql "postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require" \
  -f database/tests/test_replication.sql
```

**Expected**: All Part A tests pass.

Test subscriber:

Edit `test_replication.sql` and uncomment Part B section, then:

```bash
psql -h 62.169.20.53 -p 6600 -U nxtdb_admin -d nxtprod-db_001 \
  -f database/tests/test_replication.sql
```

**Expected**: All Part B tests pass with lag <5 seconds.

**4.3 Live Replication Test**

Insert test data on Neon:

```bash
psql "postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require" -c "
INSERT INTO core.brand (name, code, description)
VALUES ('REPLICATION_TEST_BRAND', 'REPTEST', 'Test brand for replication verification')
RETURNING brand_id, name, code;
"
```

Wait 5 seconds, then verify on Postgres OLD:

```bash
psql -h 62.169.20.53 -p 6600 -U nxtdb_admin -d nxtprod-db_001 -c "
SELECT brand_id, name, code FROM core.brand WHERE code = 'REPTEST';
"
```

**Expected**: Same brand_id and data appears on Postgres OLD.

Delete test data on Neon:

```bash
psql "postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require" -c "
DELETE FROM core.brand WHERE code = 'REPTEST';
"
```

Verify deletion replicated to Postgres OLD:

```bash
psql -h 62.169.20.53 -p 6600 -U nxtdb_admin -d nxtprod-db_001 -c "
SELECT COUNT(*) FROM core.brand WHERE code = 'REPTEST';
"
```

**Expected**: COUNT = 0 (deleted on subscriber).

---

#### Step 5: Set Up Monitoring

**5.1 Create Cron Job for Health Checks (Optional)**

Linux/Mac:

```bash
# Add to crontab
crontab -e

# Add this line (run health check every 5 minutes):
*/5 * * * * cd /path/to/MantisNXT && node scripts/replication-health-check.js >> logs/replication-health.log 2>&1
```

Windows (Task Scheduler):

1. Open Task Scheduler
2. Create Basic Task: "MantisNXT Replication Health Check"
3. Trigger: Daily, repeat every 5 minutes
4. Action: Start a program
   - Program: `node`
   - Arguments: `K:\00Project\MantisNXT\scripts\replication-health-check.js`
   - Start in: `K:\00Project\MantisNXT`

**5.2 Set Up Alerts**

Configure alerts based on health check exit codes:

- Exit 0: Healthy (no alert)
- Exit 1: Warning (notify team)
- Exit 2: Critical (page on-call engineer)

Integration examples:
- Slack webhook
- Email via SMTP
- PagerDuty/Opsgenie
- Prometheus/Grafana

---

### Post-Deployment Verification

#### Verify ADR-4 (Purchase Orders)

1. [x] Tables created on both databases
2. [x] All indexes created (8+ on purchase_orders, 4+ on purchase_order_items)
3. [x] All triggers functional (4 triggers total)
4. [x] Helper functions working (generate_po_number, get_purchase_order_summary)
5. [x] All tests passing (8/8)

#### Verify ADR-1 (Replication)

1. [x] Publication created on Neon with 11 tables
2. [x] Subscription created on Postgres OLD
3. [x] All tables synchronized (state = 'r')
4. [x] Replication lag <5 seconds
5. [x] Worker running (pg_stat_subscription.pid IS NOT NULL)
6. [x] Data consistency verified (record counts match)
7. [x] Live replication test passed (INSERT/DELETE replicated)

---

### Rollback Procedures

#### Rollback Purchase Orders (ADR-4)

If purchase orders deployment fails:

```bash
# Rollback on Neon
psql "postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require" \
  -f database/migrations/004_rollback.sql

# Rollback on Postgres OLD
psql -h 62.169.20.53 -p 6600 -U nxtdb_admin -d nxtprod-db_001 \
  -f database/migrations/004_rollback.sql
```

#### Rollback Replication (ADR-1)

If replication setup fails:

```bash
# On Postgres OLD (Subscriber)
psql -h 62.169.20.53 -p 6600 -U nxtdb_admin -d nxtprod-db_001 -c "
DROP SUBSCRIPTION IF EXISTS mantisnxt_from_neon CASCADE;
"

# On Neon (Publisher)
psql "postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require" -c "
DROP PUBLICATION IF EXISTS mantisnxt_core_replication;
SELECT pg_drop_replication_slot('mantisnxt_replication_slot');
"
```

---

### Troubleshooting

#### Issue: Subscription worker not starting

**Symptoms**: pg_stat_subscription.pid IS NULL

**Solutions**:

1. Check PostgreSQL logs on Postgres OLD
2. Verify network connectivity: `telnet ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech 5432`
3. Verify connection string in subscription
4. Enable subscription: `ALTER SUBSCRIPTION mantisnxt_from_neon ENABLE;`

#### Issue: Replication lag high

**Symptoms**: Lag >10 seconds

**Solutions**:

1. Check network latency: `ping ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech`
2. Check subscriber load (CPU, disk I/O)
3. Check for long-running transactions on subscriber
4. Verify no writes happening on subscriber (replica must be READ-ONLY)

#### Issue: Data inconsistency

**Symptoms**: Record counts differ

**Solutions**:

1. Verify all tables in 'ready' state
2. Check for conflicts: `SELECT * FROM pg_stat_database_conflicts;`
3. Refresh subscription: `ALTER SUBSCRIPTION mantisnxt_from_neon REFRESH PUBLICATION WITH (copy_data = true);`

---

### Success Criteria

Deployment is successful when:

- [x] Purchase orders tables created on both databases
- [x] All tests passing (purchase orders: 8/8, replication: all parts)
- [x] Replication active with lag <5 seconds
- [x] Data consistency verified
- [x] Health check script returns exit code 0
- [x] Live replication test passed (INSERT/DELETE)

---

### Support

For issues during deployment:

- **Neon Support**: https://neon.tech/support
- **Internal Team**: Data Oracle / Database Team
- **Documentation**: `database/replication/REPLICATION_GUIDE.md`

---

**END OF DEPLOYMENT INSTRUCTIONS**
