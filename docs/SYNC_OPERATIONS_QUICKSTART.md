# Sync Operations Quick Start Guide
**For developers integrating WooCommerce, Odoo, and other sync systems**

---

## Quick Reference

### 1. Start a Sync Job

```typescript
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL });

async function startSync(orgId: string, userId: string) {
  const syncId = `sync-woo-${Date.now()}`;
  await pool.query(
    `
      INSERT INTO sync_progress (
        id, org_id, sync_id, entity_type, total_items, initiated_by, source_system
      )
      VALUES (gen_random_uuid(), $1, $2, 'customer', 5000, $3, 'woocommerce')
    `,
    [orgId, syncId, userId]
  );
  return syncId;
}
```

### 2. Update Progress During Sync

```typescript
async function updateSyncProgress(
  orgId: string,
  syncId: string,
  processedCount: number,
  failedCount: number = 0
) {
  const result = await pool.query(
    `
      UPDATE sync_progress
         SET processed_count = $1,
             failed_count = $2,
             current_item = $3,
             updated_at = NOW()
       WHERE org_id = $4 AND sync_id = $5
       RETURNING *
    `,
    [processedCount, failedCount, processedCount + failedCount, orgId, syncId]
  );

  return result.rows[0];
}
```

### 3. Get Live Progress for Dashboard

```typescript
async function getLiveProgress(orgId: string) {
  const { rows } = await pool.query(
    `
      SELECT *
        FROM sync_progress
       WHERE org_id = $1
         AND completed_at IS NULL
       ORDER BY updated_at DESC
    `,
    [orgId]
  );

  return rows;
}
```

### 4. Cache Preview Delta (1-hour TTL)

```typescript
async function cachePreviewDelta(
  orgId: string,
  syncType: 'woocommerce' | 'odoo',
  deltaData: any,
  userId: string
) {
  const cacheKey = hashInputs({ syncType, ...filterParams });

  await pool.query(
    `
      INSERT INTO sync_preview_cache (
        org_id, sync_type, delta_data, computed_by, cache_key, expires_at
      )
      VALUES ($1, $2, $3::jsonb, $4, $5, NOW() + INTERVAL '1 hour')
      ON CONFLICT (org_id, sync_type, entity_type)
      DO UPDATE SET delta_data = EXCLUDED.delta_data,
                    computed_at = NOW(),
                    expires_at = EXCLUDED.expires_at
    `,
    [orgId, syncType, JSON.stringify(deltaData), userId, cacheKey]
  );
}

// Later: retrieve from cache
async function getPreviewDelta(cacheKey: string) {
  const { rows } = await pool.query(
    `
      SELECT delta_data
        FROM sync_preview_cache
       WHERE cache_key = $1
         AND expires_at > NOW()
       LIMIT 1
    `,
    [cacheKey]
  );
  return rows.at(0)?.delta_data ?? null;
}
```

### 5. Query Sync Audit Trail

```typescript
// Get all activity for an organization
async function getOrgActivity(
  orgId: string,
  days: number = 7
) {
  const { rows } = await pool.query(
    `
      SELECT *
        FROM sync_activity_log
       WHERE org_id = $1
         AND created_at > NOW() - ($2 || ' days')::interval
       ORDER BY created_at DESC
       LIMIT 1000
    `,
    [orgId, days]
  );
  return rows;
}

// Get failed syncs only
async function getFailedSyncs(orgId: string, days: number = 30) {
  const { rows } = await pool.query(
    `
      SELECT *
        FROM sync_activity_log
       WHERE org_id = $1
         AND status IN ('failed', 'completed_with_errors', 'timeout')
         AND created_at > NOW() - ($2 || ' days')::interval
       ORDER BY created_at DESC
    `,
    [orgId, days]
  );
  return rows;
}

// Get activity by user
async function getUserActivity(orgId: string, userId: string) {
  const { rows } = await pool.query(
    `
      SELECT *
        FROM sync_activity_log
       WHERE org_id = $1
         AND user_id = $2
       ORDER BY created_at DESC
       LIMIT 100
    `,
    [orgId, userId]
  );
  return rows;
}
```

---

## Workflow: Complete Sync Example

```typescript
/**
 * Complete workflow for syncing WooCommerce customers
 */

async function syncWooCommerceCustomers(orgId: string, userId: string) {
  console.log('Starting WooCommerce customer sync...');

  // 1. Initialize progress tracking
  const syncId = `sync-woo-${Date.now()}`;
  const customers = await fetchWooCommerceCustomers();
  const BATCH_SIZE = 100;
  await pool.query(
    `
      INSERT INTO sync_progress (
        id, org_id, sync_id, entity_type, total_items, initiated_by, source_system
      )
      VALUES (gen_random_uuid(), $1, $2, 'customer', $3, $4, 'woocommerce')
    `,
    [orgId, syncId, customers.length, userId]
  );

  console.log(`Syncing ${customers.length} customers`);

  let processedCount = 0;
  let failedCount = 0;
  const BATCH_DELAY = 2000;  // ms between batches

  // 2. Process in batches
  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    const batch = customers.slice(i, i + BATCH_SIZE);

    try {
      // Process each customer
      for (const customer of batch) {
        try {
          await createOrUpdateCustomer(orgId, customer);
          processedCount++;
        } catch (error) {
          console.error(`Failed to sync customer ${customer.id}:`, error.message);
          failedCount++;

          await pool.query(
            `
              INSERT INTO sync_activity_log (
                org_id, sync_id, entity_type, activity_type, status, details, user_id
              )
              VALUES ($1, $2, 'customer', 'batch_process', 'completed_with_errors', $3::jsonb, $4)
            `,
            [
              orgId,
              syncId,
              JSON.stringify({ customerId: customer.id, error: error.message }),
              userId,
            ]
          );
        }
      }

      // 3. Update progress (auto-calculates elapsed, speed, eta)
      const { rows } = await pool.query(
        `
          UPDATE sync_progress
             SET processed_count = $1,
                 failed_count = $2,
                 current_item = $3,
                 updated_at = NOW()
           WHERE org_id = $4 AND sync_id = $5
           RETURNING *
        `,
        [processedCount, failedCount, processedCount + failedCount, orgId, syncId]
      );

      const updated = rows[0];
      console.log(
        `Batch ${Math.ceil(i / BATCH_SIZE)}: ${processedCount}/${customers.length} processed, ` +
        `${updated.speed_items_per_min?.toFixed(1) ?? '-'} items/min, ` +
        `ETA: ${updated.eta_seconds ? (updated.eta_seconds / 60).toFixed(1) : '-'} min`
      );

      // Delay between batches
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));

    } catch (error) {
      console.error(`Batch processing error:`, error);
      failedCount += batch.length;

      await pool.query(
        `
          UPDATE sync_progress
             SET failed_count = $1,
                 updated_at = NOW()
           WHERE org_id = $2 AND sync_id = $3
        `,
        [failedCount, orgId, syncId]
      );
    }
  }

  console.log(`Sync complete: ${processedCount} succeeded, ${failedCount} failed`);

  // 4. Trigger automatically logs completion to sync_activity_log
  // No manual logging needed - trigger handles it!

  return {
    syncId,
    processedCount,
    failedCount,
    status: failedCount === 0 ? 'completed' : 'completed_with_errors'
  };
}
```

---

## React Component: Live Sync Dashboard

```typescript
import { useEffect, useState } from 'react';

type SyncRow = {
  sync_id: string;
  entity_type: string;
  processed_count: number;
  total_items: number;
  failed_count: number;
  speed_items_per_min: number | null;
  eta_seconds: number | null;
};

export function SyncProgressDashboard({ orgId }: { orgId: string }) {
  const [activeSyncs, setActiveSyncs] = useState<SyncRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      const res = await fetch(`/api/sync/progress?orgId=${orgId}`);
      const data = await res.json();
      setActiveSyncs(data);
      setLoading(false);
    };

    fetchProgress();
    const interval = setInterval(fetchProgress, 2000);
    return () => clearInterval(interval);
  }, [orgId]);

  if (loading) return <div>Loading...</div>;
  if (!activeSyncs.length) return <div>No active syncs</div>;

  return (
    <div className="space-y-4">
      {activeSyncs.map((sync) => (
        <SyncCard key={sync.sync_id} sync={sync} />
      ))}
    </div>
  );
}

function SyncCard({ sync }: { sync: SyncRow }) {
  const progressPercent = (sync.processed_count / sync.total_items) * 100;
  const etaMinutes = sync.eta_seconds ? (sync.eta_seconds / 60).toFixed(1) : '-';

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-bold">{sync.entity_type.toUpperCase()} Sync</h3>
      <div className="mt-2 bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-sm">
        <div>
          <div className="text-gray-600">Progress</div>
          <div className="font-mono">
            {sync.processed_count} / {sync.total_items}
          </div>
        </div>
        <div>
          <div className="text-gray-600">Speed</div>
          <div className="font-mono">
            {sync.speed_items_per_min?.toFixed(1) ?? '-'} items/min
          </div>
        </div>
        <div>
          <div className="text-gray-600">Failed</div>
          <div className="font-mono text-red-600">{sync.failed_count}</div>
        </div>
        <div>
          <div className="text-gray-600">ETA</div>
          <div className="font-mono">{etaMinutes} min</div>
        </div>
      </div>
      {sync.failed_count > 0 && (
        <div className="mt-3 text-sm text-orange-600">
          {sync.failed_count} items failed - review logs for details
        </div>
      )}
    </div>
  );
}
```

---

## Error Handling Best Practices

### Handle RLS Errors

```typescript
async function syncWithErrorHandling(orgId: string) {
  try {
    const { rows } = await pool.query(
      `
        SELECT *
          FROM sync_progress
         WHERE org_id = $1
      `,
      [orgId]
    );
    return rows;
  } catch (error: any) {
    if (error.message?.includes('policy')) {
      throw new Error('Access denied - confirm app.current_org_id is set before querying Neon');
    }
    console.error('Sync error:', error.message);
    // Report to error tracking (Sentry, etc)
    throw error;
  }
}
```

### Handle Validation Errors

```typescript
async function updateProgressSafely(
  orgId: string,
  syncId: string,
  processed: number,
  failed: number,
  total: number
) {
  // Validation: ensure counts don't exceed total
  if (processed + failed > total) {
    throw new Error(
      `Invalid counts: ${processed} + ${failed} > ${total}`
    );
  }

  try {
    const { rows } = await pool.query(
      `
        UPDATE sync_progress
           SET processed_count = $1,
               failed_count = $2,
               current_item = $1 + $2,
               updated_at = NOW()
         WHERE org_id = $3 AND sync_id = $4
         RETURNING *
      `,
      [processed, failed, orgId, syncId]
    );
    return rows[0];

  } catch (error: any) {
    if (error.message?.includes('check constraint')) {
      console.error('Progress validation failed', { processed, failed, total });
      // Handle as data quality issue
    }
    throw error;
  }
}
```

---

## Common Queries

### Find Slow Syncs

```sql
-- Syncs with low speed (< 10 items/min)
SELECT
  sync_id,
  entity_type,
  processed_count,
  speed_items_per_min,
  elapsed_seconds,
  (elapsed_seconds::numeric / processed_count) AS seconds_per_item
FROM sync_progress
WHERE org_id = 'org-123'
AND speed_items_per_min > 0
AND speed_items_per_min < 10
ORDER BY speed_items_per_min ASC;
```

### Find Failed Syncs

```sql
-- Failed syncs with error details
SELECT
  sal.sync_id,
  sal.entity_type,
  sal.status,
  COUNT(*) AS error_count,
  sal.error_message
FROM sync_activity_log sal
WHERE sal.org_id = 'org-123'
AND sal.status IN ('failed', 'completed_with_errors')
AND sal.created_at > NOW() - INTERVAL '30 days'
GROUP BY sal.sync_id, sal.entity_type, sal.status, sal.error_message
ORDER BY sal.created_at DESC;
```

### Sync Duration Trends

```sql
-- Average sync duration by entity type (last 30 days)
SELECT
  entity_type,
  COUNT(*) AS sync_count,
  AVG(duration_seconds) AS avg_duration_sec,
  MAX(duration_seconds) AS max_duration_sec,
  SUM(record_count) AS total_records
FROM sync_activity_log
WHERE org_id = 'org-123'
AND created_at > NOW() - INTERVAL '30 days'
AND status IN ('completed', 'completed_with_errors')
GROUP BY entity_type
ORDER BY entity_type;
```

---

## Environment Setup

Add to `.env.local`:

```bash
NEON_DATABASE_URL=postgres://user:pass@ep-some-host.aws.neon.tech/neondb
```

Create a shared pool (Node/Edge):

```typescript
// lib/db/pool.ts
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  max: 10,
});
```

---

## Troubleshooting

### RLS Policy Denying Access

**Error:** `new row violates row-level security policy`

**Fix:** Ensure your user's `org_id` matches the record's `org_id`.

```typescript
// Debug helper
async function debugRLS(userId: string) {
  const { rows } = await pool.query(
    `SELECT id, org_id FROM auth.users_extended WHERE id = $1`,
    [userId]
  );
  console.log('User org_id:', rows[0]?.org_id);
  // Must match the org_id of the record you're trying to access
}
```

### Partition Not Found Error

**Error:** `relation "sync_activity_log_2025_11" does not exist`

**Fix:** Partitions may not be auto-created. Create manually:

```sql
CREATE TABLE IF NOT EXISTS sync_activity_log_2025_11 PARTITION OF sync_activity_log
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
```

### Preview Cache Not Expiring

**Error:** Preview cache entries older than 1 hour still exist

**Fix:** Call cleanup function manually or set up scheduled job:

```typescript
// Manual cleanup
const { rows } = await pool.query(`SELECT auto_cleanup_preview_cache() AS deleted_count`);
console.log(`Deleted ${rows[0].deleted_count} expired caches`);
```

---

## Performance Tips

1. **Batch updates:** Update progress every 100-500 items, not every single item
2. **Cache deltas:** Use `sync_preview_cache` for frequently-accessed deltas
3. **Partition queries:** Always filter by `org_id` for optimal performance
4. **Monitor speed:** Set baseline speed for your sync type (customer syncs typically 400-600 items/min)

---

**Last Updated:** 2025-11-06
**Status:** Ready for Development
