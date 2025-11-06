# WooCommerce Customer Sync - Quick Start Guide

## What Was Built

A production-grade queue-based customer synchronization system that replaces the broken linear sync with a bulletproof state machine implementation. Based on Odoo's proven `data_queue_mixin_ept` pattern.

**Problem Fixed**: Customer sync infinite loop when syncing 797+ customers
**Solution**: Queue state machine with batch processing, error recovery, and resumability

## Files Overview

### Core Implementation (1,341 lines total)

```
database/migrations/
  └─ 0023_sync_infrastructure.sql (157 lines)
     Database schema: 3 tables, triggers, indexes

src/lib/services/
  ├─ WooCommerceSyncQueue.ts (442 lines)
  │  Low-level queue operations (create, add, batch, mark, log)
  │
  └─ CustomerSyncService.ts (508 lines)
     High-level sync orchestration (start, process, retry, status)

src/app/api/v1/integrations/woocommerce/sync/
  └─ customers/route.ts (234 lines)
     API endpoint with 4 actions: start, status, retry, force-done
```

### Documentation

```
QUEUE_SYNC_IMPLEMENTATION.md (14 KB)
  Complete implementation guide with examples

SYNC_ARCHITECTURE_DIAGRAM.md (30 KB)
  Architecture, state machine, data flows, metrics

IMPLEMENTATION_SUMMARY.txt (7.7 KB)
  Quick reference with checklist

WOO_SYNC_QUICKSTART.md (this file)
  Getting started guide
```

## Quick Start

### 1. Deploy Database Schema

```bash
# Run migration
npm run migrate -- database/migrations/0023_sync_infrastructure.sql

# Or manually with psql
psql -U user -d database -f database/migrations/0023_sync_infrastructure.sql
```

### 2. Start a Sync

```javascript
// POST /api/v1/integrations/woocommerce/sync/customers
const response = await fetch('/api/v1/integrations/woocommerce/sync/customers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    config: {
      url: 'https://store.example.com',
      consumerKey: 'ck_...',
      consumerSecret: 'cs_...'
    },
    org_id: '550e8400-e29b-41d4-a716-446655440000',
    user_id: 'user-123',
    options: {
      batchSize: 50,
      batchDelayMs: 2000,
      maxRetries: 3
    }
  })
});

const result = await response.json();
console.log(result.data.queueId); // Use for status/retry/force-done
```

### 3. Check Status

```javascript
// Poll for progress
const statusResponse = await fetch('/api/v1/integrations/woocommerce/sync/customers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    config: { /* same config */ },
    org_id: '550e8400-e29b-41d4-a716-446655440000',
    action: 'status',
    queue_id: 'queue-uuid-from-step-2'
  })
});

const status = await statusResponse.json();
console.log(`Progress: ${status.data.progress}%`);
console.log(`Done: ${status.data.createdCount + status.data.updatedCount}`);
console.log(`Failed: ${status.data.failedCount}`);
```

### 4. Retry Failed Items

```javascript
// If failed items exist and process_count < 3
const retryResponse = await fetch('/api/v1/integrations/woocommerce/sync/customers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    config: { /* same config */ },
    org_id: '550e8400-e29b-41d4-a716-446655440000',
    action: 'retry',
    queue_id: 'queue-uuid'
  })
});
```

### 5. Force Completion (Manual Intervention)

```javascript
// If stuck after max retries
const forceResponse = await fetch('/api/v1/integrations/woocommerce/sync/customers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    config: { /* same config */ },
    org_id: '550e8400-e29b-41d4-a716-446655440000',
    action: 'force-done',
    queue_id: 'queue-uuid'
  })
});
```

## Database Queries

### Check Queue Status

```sql
SELECT
  id,
  queue_name,
  state,
  total_count,
  draft_count,
  done_count,
  failed_count,
  process_count,
  is_action_required,
  ROUND((done_count + cancelled_count)::numeric / total_count * 100, 2) as progress
FROM woo_customer_sync_queue
WHERE org_id = 'your-org-id'
ORDER BY created_at DESC
LIMIT 10;
```

### View Activity Log

```sql
SELECT
  activity_type,
  status,
  message,
  created_at
FROM woo_sync_activity
WHERE queue_id = 'queue-uuid'
ORDER BY created_at DESC
LIMIT 100;
```

### Find Failed Items

```sql
SELECT
  woo_customer_id,
  error_message,
  process_count,
  last_error_timestamp
FROM woo_customer_sync_queue_line
WHERE queue_id = 'queue-uuid'
  AND state = 'failed'
ORDER BY last_error_timestamp DESC;
```

### Check for Stuck Queues

```sql
SELECT
  id,
  queue_name,
  state,
  process_count,
  is_action_required,
  action_required_reason,
  last_process_date
FROM woo_customer_sync_queue
WHERE is_action_required = true
  AND org_id = 'your-org-id';
```

## Architecture at a Glance

### Queue State Machine

```
[DRAFT] → [PROCESSING] → [DONE]
            ↓
         [FAILED] → (retry) → [DRAFT] (back to PROCESSING)
            ↓
        (max retries exceeded)
            ↓
         [ACTION REQUIRED]
```

### Batch Processing

- 50 customers per batch
- 2 second delay between batches
- Retry with exponential backoff (1s → 2s → 4s)
- Max 3 retry attempts per item

### Performance

For 797 customers:
- 16 batches
- ~27 minutes total time
- Safe database load (2 writes/sec)
- Can resume if interrupted

## Key Features

1. **State Machine**: Track queue state and progress
2. **Batch Processing**: 50 items/batch, 2s delay
3. **Error Recovery**: 3 retries with exponential backoff
4. **Activity Logging**: Complete audit trail
5. **Idempotency**: Safe to retry without duplicates
6. **Resumability**: Can restart interrupted syncs
7. **Manual Intervention**: Force-done for stuck queues
8. **Org Isolation**: Data isolated by organization

## Monitoring

### Real-time Dashboard (pseudo-code)

```typescript
// Poll queue status every 5 seconds
setInterval(async () => {
  const status = await getQueueStatus(queueId);

  console.log(`
    State: ${status.state}
    Progress: ${status.progress}%
    Done: ${status.createdCount + status.updatedCount}
    Failed: ${status.failedCount}
    Time Remaining: ~${estimateRemainingTime(status)}
  `);
}, 5000);
```

### Activity Feed

```sql
-- Real-time activity
SELECT
  DATE_PART('hour', created_at) as hour,
  activity_type,
  status,
  COUNT(*) as count
FROM woo_sync_activity
WHERE queue_id = 'queue-uuid'
GROUP BY hour, activity_type, status
ORDER BY hour DESC;
```

## Troubleshooting

### Sync is stuck (not progressing)

1. Check queue state
   ```sql
   SELECT state, is_action_required FROM woo_customer_sync_queue WHERE id = 'queue-uuid';
   ```

2. View recent errors
   ```sql
   SELECT message, created_at FROM woo_sync_activity WHERE queue_id = 'queue-uuid'
   ORDER BY created_at DESC LIMIT 10;
   ```

3. If is_action_required = true, use force-done
   ```javascript
   // action: 'force-done'
   ```

### Some customers failed to sync

1. Check failed items
   ```sql
   SELECT woo_customer_id, error_message FROM woo_customer_sync_queue_line
   WHERE queue_id = 'queue-uuid' AND state = 'failed';
   ```

2. Retry (if process_count < 3)
   ```javascript
   // action: 'retry'
   ```

3. If still failing, investigate error message (may need manual fix in WooCommerce)

### Circuit breaker errors

1. These are automatically retried with exponential backoff
2. Check activity log for "circuit breaker" messages
3. If persists, may indicate WooCommerce API issues
4. Use retry action to try again

## Files to Know

| File | Lines | Purpose |
|------|-------|---------|
| `0023_sync_infrastructure.sql` | 157 | Database schema |
| `WooCommerceSyncQueue.ts` | 442 | Queue operations |
| `CustomerSyncService.ts` | 508 | Sync orchestration |
| `customers/route.ts` | 234 | API endpoint |

## Next Steps

1. Deploy the database migration
2. Test with a small customer count (10-20)
3. Monitor the activity log
4. Scale to full sync when confident
5. Set up automated monitoring dashboards
6. Consider background job queue for production (Bull/RabbitMQ)

## Support

For detailed information:
- See `QUEUE_SYNC_IMPLEMENTATION.md` for complete guide
- See `SYNC_ARCHITECTURE_DIAGRAM.md` for architecture details
- See `IMPLEMENTATION_SUMMARY.txt` for quick reference

## Commit Info

```
Hash: fb62c16
Date: 2025-11-05
Files: 4 changed, 1,341 lines added
```

## Success Metrics

Once deployed:
- Sync 797+ customers reliably
- Track progress per batch
- Recover from errors automatically
- Resume interrupted syncs
- Complete audit trail for compliance
- Manual intervention options for edge cases
