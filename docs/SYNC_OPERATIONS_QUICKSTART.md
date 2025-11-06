# Sync Operations Quick Start Guide
**For developers integrating WooCommerce, Odoo, and other sync systems**

---

## Quick Reference

### 1. Start a Sync Job

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function startSync(orgId: string, userId: string) {
  const syncId = `sync-woo-${Date.now()}`;

  const { data, error } = await supabase
    .from('sync_progress')
    .insert({
      org_id: orgId,
      sync_id: syncId,
      entity_type: 'customer',
      total_items: 5000,
      initiated_by: userId,
      source_system: 'woocommerce'
    })
    .select();

  if (error) throw error;
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
  const { data, error } = await supabase
    .from('sync_progress')
    .update({
      processed_count: processedCount,
      failed_count: failedCount,
      current_item: processedCount + failedCount
    })
    .eq('org_id', orgId)
    .eq('sync_id', syncId)
    .select()
    .single();

  if (error) throw error;

  // Auto-calculated fields available:
  // - elapsed_seconds
  // - speed_items_per_min
  // - eta_seconds
  // - completed_at (if finished)

  return data;
}
```

### 3. Get Live Progress for Dashboard

```typescript
async function getLiveProgress(orgId: string) {
  const { data, error } = await supabase
    .from('sync_progress')
    .select('*')
    .eq('org_id', orgId)
    .is('completed_at', null)  // Only active syncs
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;

  // Example response:
  // [
  //   {
  //     sync_id: 'sync-woo-1234567890',
  //     entity_type: 'customer',
  //     processed_count: 2500,
  //     total_items: 5000,
  //     failed_count: 3,
  //     speed_items_per_min: 480.5,
  //     eta_seconds: 312,
  //     elapsed_seconds: 312,
  //     started_at: '2025-11-06T10:00:00Z',
  //     updated_at: '2025-11-06T10:05:12Z'
  //   }
  // ]
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

  const { data, error } = await supabase
    .from('sync_preview_cache')
    .insert({
      org_id: orgId,
      sync_type: syncType,
      delta_json: deltaData,
      computed_by: userId,
      cache_key: cacheKey,
      expires_at: new Date(Date.now() + 60 * 60 * 1000)  // 1 hour
    })
    .select();

  if (error) throw error;
  return data;
}

// Later: retrieve from cache
async function getPreviewDelta(cacheKey: string) {
  const { data, error } = await supabase
    .from('sync_preview_cache')
    .select('delta_json')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())  // Not expired
    .single();

  if (error && error.code !== 'PGRST116') throw error;  // PGRST116 = no rows
  return data?.delta_json || null;
}
```

### 5. Query Sync Audit Trail

```typescript
// Get all activity for an organization
async function getOrgActivity(
  orgId: string,
  days: number = 7
) {
  const { data, error } = await supabase
    .from('sync_activity_log')
    .select('*')
    .eq('org_id', orgId)
    .gt('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) throw error;
  return data;
}

// Get failed syncs only
async function getFailedSyncs(orgId: string, days: number = 30) {
  const { data, error } = await supabase
    .from('sync_activity_log')
    .select('*')
    .eq('org_id', orgId)
    .in('status', ['failed', 'completed_with_errors', 'timeout'])
    .gt('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Get activity by user
async function getUserActivity(orgId: string, userId: string) {
  const { data, error } = await supabase
    .from('sync_activity_log')
    .select('*')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data;
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

  const progress = await supabase
    .from('sync_progress')
    .insert({
      org_id: orgId,
      sync_id: syncId,
      entity_type: 'customer',
      total_items: customers.length,
      initiated_by: userId,
      source_system: 'woocommerce'
    })
    .select()
    .single();

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

          // Log individual error to activity log
          await supabase
            .from('sync_activity_log')
            .insert({
              org_id: orgId,
              sync_id: syncId,
              entity_type: 'customer',
              action: 'batch_process',
              status: 'completed_with_errors',
              record_count: 1,
              error_message: error.message,
              user_id: userId,
              created_at: new Date().toISOString()
            });
        }
      }

      // 3. Update progress (auto-calculates elapsed, speed, eta)
      const updated = await supabase
        .from('sync_progress')
        .update({
          processed_count: processedCount,
          failed_count: failedCount,
          current_item: processedCount + failedCount
        })
        .eq('org_id', orgId)
        .eq('sync_id', syncId)
        .select()
        .single();

      console.log(`Batch ${Math.ceil(i / BATCH_SIZE)}: ` +
        `${processedCount}/${customers.length} processed, ` +
        `${updated.speed_items_per_min.toFixed(1)} items/min, ` +
        `ETA: ${(updated.eta_seconds / 60).toFixed(1)} min`);

      // Delay between batches
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));

    } catch (error) {
      console.error(`Batch processing error:`, error);
      failedCount += batch.length;

      await supabase
        .from('sync_progress')
        .update({
          failed_count: failedCount
        })
        .eq('org_id', orgId)
        .eq('sync_id', syncId);
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
import { supabase } from '@/lib/supabase';

export function SyncProgressDashboard({ orgId }: { orgId: string }) {
  const [activeSyncs, setActiveSyncs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Poll for updates every 2 seconds
  useEffect(() => {
    const fetchProgress = async () => {
      const { data } = await supabase
        .from('sync_progress')
        .select('*')
        .eq('org_id', orgId)
        .is('completed_at', null)
        .order('updated_at', { ascending: false });

      setActiveSyncs(data || []);
      setLoading(false);
    };

    fetchProgress();
    const interval = setInterval(fetchProgress, 2000);
    return () => clearInterval(interval);
  }, [orgId]);

  return (
    <div className="space-y-4">
      {loading ? (
        <div>Loading...</div>
      ) : activeSyncs.length === 0 ? (
        <div>No active syncs</div>
      ) : (
        activeSyncs.map((sync) => (
          <SyncCard key={sync.sync_id} sync={sync} />
        ))
      )}
    </div>
  );
}

function SyncCard({ sync }) {
  const progressPercent = (sync.processed_count / sync.total_items) * 100;
  const etaMinutes = sync.eta_seconds ? (sync.eta_seconds / 60).toFixed(1) : '—';

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-bold">{sync.entity_type.toUpperCase()} Sync</h3>

      {/* Progress bar */}
      <div className="mt-2 bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Stats */}
      <div className="mt-3 grid grid-cols-4 gap-2 text-sm">
        <div>
          <div className="text-gray-600">Progress</div>
          <div className="font-mono">{sync.processed_count} / {sync.total_items}</div>
        </div>
        <div>
          <div className="text-gray-600">Speed</div>
          <div className="font-mono">{sync.speed_items_per_min?.toFixed(1) || '—'} items/min</div>
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

      {/* Errors */}
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
    const { data, error } = await supabase
      .from('sync_progress')
      .select('*')
      .eq('org_id', orgId);

    if (error?.code === 'PGRST100') {
      // Row-level security error - user not in org
      throw new Error('Access denied - you are not a member of this organization');
    }

    if (error) throw error;
    return data;

  } catch (error) {
    console.error('Sync error:', error.message);
    // Report to error tracking (Sentry, etc)
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
    const { data, error } = await supabase
      .from('sync_progress')
      .update({
        processed_count: processed,
        failed_count: failed
      })
      .eq('org_id', orgId)
      .eq('sync_id', syncId)
      .select()
      .single();

    if (error) throw error;
    return data;

  } catch (error) {
    if (error.message.includes('violates check constraint')) {
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
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Import client:

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

---

## Troubleshooting

### RLS Policy Denying Access

**Error:** `new row violates row-level security policy`

**Fix:** Ensure your user's `org_id` matches the record's `org_id`.

```typescript
// Debug helper
async function debugRLS(userId: string) {
  const { data } = await supabase
    .from('auth.users_extended')
    .select('id, org_id')
    .eq('id', userId)
    .single();

  console.log('User org_id:', data?.org_id);
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
const result = await supabase.rpc('auto_cleanup_preview_cache');
console.log(`Deleted ${result.data.deleted_count} expired caches`);
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
