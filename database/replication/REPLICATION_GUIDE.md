# MantisNXT Logical Replication Setup and Monitoring Guide

## Overview

This guide covers the complete setup and monitoring of logical replication between **Neon (Primary)** and **Postgres OLD (Replica)** for disaster recovery and data redundancy.

**ADR Reference**: ADR-1 (Logical Replication Configuration)
**Date**: 2025-10-09
**Author**: Data Oracle

---

## Architecture

```
┌─────────────────────────────────────────────┐
│         NEON PRIMARY (Publisher)            │
│  ep-steep-waterfall-a96wibpm-pooler...      │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │  Publication:                        │  │
│  │  mantisnxt_core_replication          │  │
│  │                                      │  │
│  │  Tables:                             │  │
│  │  - core.inventory_items              │  │
│  │  - core.product                      │  │
│  │  - core.supplier                     │  │
│  │  - core.supplier_product             │  │
│  │  - core.stock_movement               │  │
│  │  - core.stock_on_hand                │  │
│  │  - core.stock_location               │  │
│  │  - core.analytics_events             │  │
│  │  - core.brand                        │  │
│  │  - core.purchase_orders              │  │
│  │  - core.purchase_order_items         │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    │
                    │ Logical Replication
                    │ (Real-time streaming)
                    ↓
┌─────────────────────────────────────────────┐
│      POSTGRES OLD (Subscriber/Replica)      │
│         62.169.20.53:6600                   │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │  Subscription:                       │  │
│  │  mantisnxt_from_neon                 │  │
│  │                                      │  │
│  │  Mode: READ-ONLY                     │  │
│  │  Purpose: Disaster Recovery          │  │
│  │  Target Lag: <5 seconds              │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## Prerequisites

### 1. Database Requirements

**Neon Primary:**
- PostgreSQL version ≥ 10 (Neon typically runs PostgreSQL 15+)
- Logical replication enabled (`wal_level = logical`)
- Sufficient `max_wal_senders` and `max_replication_slots`
- User with replication privileges (neondb_owner)

**Postgres OLD:**
- PostgreSQL version ≥ 10
- Matching schema structure (all tables must exist)
- Network access to Neon endpoint (port 5432)
- User with superuser or replication privileges

### 2. Network Requirements

- Postgres OLD must be able to connect to Neon on port 5432
- SSL/TLS enabled for secure replication
- Firewall rules allowing outbound connections from Postgres OLD
- Neon IP allowlist (if configured) must include Postgres OLD IP

### 3. Schema Synchronization

**CRITICAL**: Before setting up replication, ensure both databases have identical schema:

```bash
# Run all migrations on BOTH databases
psql -h ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech -U neondb_owner -d neondb \
  -f database/migrations/003_critical_schema_fixes_CORRECTED.sql

psql -h 62.169.20.53 -p 6600 -U nxtdb_admin -d nxtprod-db_001 \
  -f database/migrations/003_critical_schema_fixes_CORRECTED.sql

psql -h ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech -U neondb_owner -d neondb \
  -f database/migrations/004_create_purchase_orders.sql

psql -h 62.169.20.53 -p 6600 -U nxtdb_admin -d nxtprod-db_001 \
  -f database/migrations/004_create_purchase_orders.sql
```

---

## Setup Instructions

### Step 1: Verify Neon Logical Replication Support

**Important**: Neon requires a paid plan for logical replication. Free tier does not support it.

Check Neon configuration:

```bash
psql -h ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech -U neondb_owner -d neondb \
  -c "SELECT name, setting FROM pg_settings WHERE name IN ('wal_level', 'max_wal_senders', 'max_replication_slots');"
```

Expected output:
```
         name          |  setting
-----------------------+-----------
 wal_level             | logical
 max_wal_senders       | 10
 max_replication_slots | 10
```

If `wal_level` is not `logical`, contact Neon support to enable logical replication.

### Step 2: Create Publication on Neon (Primary)

Run the publication setup script:

```bash
psql -h ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech -U neondb_owner -d neondb \
  -f database/replication/setup-publication.sql
```

Verify publication:

```sql
SELECT pubname, puballtables, pubinsert, pubupdate, pubdelete
FROM pg_publication
WHERE pubname = 'mantisnxt_core_replication';
```

Expected output:
```
          pubname          | puballtables | pubinsert | pubupdate | pubdelete
---------------------------+--------------+-----------+-----------+-----------
 mantisnxt_core_replication| f            | t         | t         | t
```

List tables in publication:

```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'mantisnxt_core_replication'
ORDER BY tablename;
```

Expected: 11 tables listed.

### Step 3: Create Subscription on Postgres OLD (Replica)

**Important**: Update connection string in `setup-subscription.sql` with correct Neon credentials if different from defaults.

Run the subscription setup script:

```bash
psql -h 62.169.20.53 -p 6600 -U nxtdb_admin -d nxtprod-db_001 \
  -f database/replication/setup-subscription.sql
```

This will:
1. Create subscription `mantisnxt_from_neon`
2. Create replication slot on Neon
3. Start initial data sync (copy_data = true)
4. Begin streaming replication

### Step 4: Monitor Initial Sync Progress

The initial sync copies all existing data from Neon to Postgres OLD. This may take time depending on data volume.

Check sync status:

```sql
-- On Postgres OLD
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
```

Wait until all tables show state `'r'` (ready).

### Step 5: Verify Replication is Working

Insert test data on Neon and verify it appears on Postgres OLD:

```sql
-- On Neon (Primary)
INSERT INTO core.brand (name, code, description)
VALUES ('Test Brand', 'TEST', 'Replication test entry');

-- Wait a few seconds, then on Postgres OLD (Replica)
SELECT * FROM core.brand WHERE code = 'TEST';
```

If the record appears on Postgres OLD, replication is working correctly.

Delete the test record:

```sql
-- On Neon
DELETE FROM core.brand WHERE code = 'TEST';
```

---

## Monitoring

### Automated Health Checks

Run the automated health check script:

```bash
node scripts/replication-health-check.js
```

This script:
- Checks publisher (Neon) and subscriber (Postgres OLD) health
- Measures replication lag (bytes and time)
- Verifies data consistency
- Logs results to `logs/replication-health.log`
- Generates alerts in `logs/replication-alerts.log`

**Exit codes:**
- `0` = Healthy (no issues)
- `1` = Warning (minor issues, review recommended)
- `2` = Critical (immediate action required)

### Manual Monitoring Queries

All monitoring queries are in `database/replication/monitoring.sql`.

**Key queries:**

1. **Check replication lag (Subscriber):**

```sql
SELECT * FROM core.replication_lag;
```

2. **Check subscription status (Subscriber):**

```sql
SELECT
  subname,
  subenabled,
  pid,
  received_lsn,
  latest_end_lsn,
  pg_size_pretty(pg_wal_lsn_diff(latest_end_lsn, received_lsn)) AS lag
FROM pg_stat_subscription
WHERE subname = 'mantisnxt_from_neon';
```

3. **Check replication slot lag (Publisher):**

```sql
SELECT
  slot_name,
  active,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS lag
FROM pg_replication_slots
WHERE slot_name LIKE '%mantisnxt%';
```

### Alerting Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Replication lag (time) | >5 seconds | >10 seconds | Investigate network/performance |
| Replication lag (bytes) | >10 MB | >100 MB | Check subscriber capacity |
| Worker status | Not running | Not running | Restart subscription |
| Table sync state | Not ready | Not ready | Check logs for errors |

---

## Troubleshooting

### Issue: Subscription worker not running

**Symptoms:**
- `pg_stat_subscription.pid IS NULL`
- No replication activity

**Solutions:**

1. Check subscription is enabled:

```sql
SELECT subname, subenabled FROM pg_subscription WHERE subname = 'mantisnxt_from_neon';
```

If disabled, enable it:

```sql
ALTER SUBSCRIPTION mantisnxt_from_neon ENABLE;
```

2. Check PostgreSQL logs on Postgres OLD for errors:

```bash
tail -f /var/log/postgresql/postgresql-*.log | grep "logical replication"
```

3. Verify network connectivity:

```bash
telnet ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech 5432
```

4. Restart subscription:

```sql
ALTER SUBSCRIPTION mantisnxt_from_neon DISABLE;
ALTER SUBSCRIPTION mantisnxt_from_neon ENABLE;
```

### Issue: High replication lag

**Symptoms:**
- Lag > 5 seconds consistently
- Data not appearing on replica quickly

**Solutions:**

1. Check network latency:

```bash
ping ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech
```

2. Check subscriber load:

```sql
-- On Postgres OLD
SELECT * FROM pg_stat_activity WHERE backend_type = 'logical replication worker';
```

3. Check for long-running transactions on subscriber (blocks replication):

```sql
SELECT pid, state, query_start, query
FROM pg_stat_activity
WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes';
```

4. Increase worker processes (if available):

```sql
-- Requires postgresql.conf change
max_logical_replication_workers = 8
```

### Issue: Data inconsistency

**Symptoms:**
- Record counts differ between publisher and subscriber
- Missing or duplicate records

**Solutions:**

1. Verify all tables are in 'ready' state:

```sql
SELECT * FROM pg_subscription_rel srw
JOIN pg_subscription s ON s.oid = srw.srsubid
WHERE s.subname = 'mantisnxt_from_neon' AND srw.srsubstate != 'r';
```

2. Check for conflicts (writes on replica):

```sql
-- On Postgres OLD
SELECT * FROM pg_stat_database_conflicts WHERE datname = 'nxtprod-db_001';
```

**CRITICAL**: Never write to replicated tables on Postgres OLD. Replica must be READ-ONLY.

3. Refresh subscription (re-sync data):

```sql
ALTER SUBSCRIPTION mantisnxt_from_neon REFRESH PUBLICATION WITH (copy_data = true);
```

### Issue: Replication slot lag growing

**Symptoms:**
- Replication slot lag > 100MB on publisher
- WAL accumulation on Neon

**Solutions:**

1. Check if subscriber is connected and consuming:

```sql
-- On Neon
SELECT * FROM pg_stat_replication;
```

If no results, subscriber is not connected.

2. Check subscriber subscription status:

```sql
-- On Postgres OLD
SELECT * FROM pg_stat_subscription WHERE subname = 'mantisnxt_from_neon';
```

3. If subscriber is permanently down, drop the replication slot to prevent WAL buildup:

```sql
-- On Neon (only if subscriber is permanently offline)
SELECT pg_drop_replication_slot('mantisnxt_replication_slot');
```

---

## Failover Procedure

If Neon (primary) becomes unavailable, promote Postgres OLD to primary:

### 1. Disable Subscription

```sql
-- On Postgres OLD
DROP SUBSCRIPTION mantisnxt_from_neon;
```

### 2. Enable Writes

Remove any READ-ONLY restrictions and allow application writes to Postgres OLD.

### 3. Update Application Connection

Update `.env.local` to point to Postgres OLD:

```env
DATABASE_URL=postgresql://nxtdb_admin:P@33w0rd-1@62.169.20.53:6600/nxtprod-db_001
DB_HOST=62.169.20.53
DB_PORT=6600
DB_USER=nxtdb_admin
DB_PASSWORD=P@33w0rd-1
DB_NAME=nxtprod-db_001
```

### 4. Restart Application

```bash
npm run build
npm start
```

### 5. When Neon Recovers (Failback)

To reverse replication direction:

1. Stop writes to Postgres OLD
2. Create publication on Postgres OLD
3. Create subscription on Neon
4. Wait for sync to complete
5. Switch application back to Neon
6. Drop reverse replication

**Note**: This is complex and should be tested in non-production first.

---

## Performance Considerations

### Publisher (Neon)

- Replication adds minimal overhead (~2-5%)
- WAL generation increases disk I/O
- Monitor WAL size to prevent storage issues

### Subscriber (Postgres OLD)

- Replication worker consumes CPU and memory
- Disk I/O for writes from replication stream
- No read overhead (replica can serve read queries)

### Network

- Bandwidth usage depends on write volume
- Typical: 10-100 KB/s for moderate write load
- Spikes during large batch inserts

---

## Security

### Connection Security

- Always use SSL/TLS (`sslmode=require`)
- Store passwords in environment variables, not code
- Use strong, unique passwords for replication users

### Network Security

- Restrict Neon IP allowlist to Postgres OLD IP only
- Use VPN or private network if possible
- Monitor connection attempts in logs

### Access Control

- Grant only necessary permissions to replication user
- Replica should be READ-ONLY (no writes)
- Regular security audits of replication users

---

## Maintenance

### Daily Tasks

1. Check replication lag: `SELECT * FROM core.replication_lag;`
2. Review alert logs: `tail -n 50 logs/replication-alerts.log`

### Weekly Tasks

1. Run full health check: `node scripts/replication-health-check.js`
2. Verify data consistency across key tables
3. Review replication slot size on Neon

### Monthly Tasks

1. Test failover procedure in staging environment
2. Review and update documentation
3. Analyze performance metrics and optimize

---

## Support and Resources

### Documentation

- **Neon Logical Replication**: https://neon.tech/docs/guides/logical-replication
- **PostgreSQL Logical Replication**: https://www.postgresql.org/docs/current/logical-replication.html

### Contact

For issues or questions:
- **Neon Support**: https://neon.tech/support
- **Internal Team**: Data Oracle / Database Team

---

## Appendix: File Reference

| File | Purpose |
|------|---------|
| `database/replication/setup-publication.sql` | Create publication on Neon |
| `database/replication/setup-subscription.sql` | Create subscription on Postgres OLD |
| `database/replication/monitoring.sql` | Comprehensive monitoring queries |
| `scripts/replication-health-check.js` | Automated health check script |
| `database/migrations/004_create_purchase_orders.sql` | Purchase orders table migration |
| `database/migrations/004_rollback.sql` | Purchase orders rollback script |

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-09 | 1.0 | Initial replication setup documentation |

---

**End of Replication Guide**
