# Queue-Based Customer Sync Infrastructure

## Overview

Replaced the broken linear customer sync with a production-grade queue state machine pattern based on the Odoo `data_queue_mixin_ept` implementation. This fixes the customer sync loop bug and enables reliable, resumable synchronization of 797+ customers.

## Problem Fixed

**Original Issue**: Synchronous loop that crashed on large datasets
- Simple for-loop processed all customers sequentially
- No batch boundaries or progress tracking
- No error recovery or idempotency
- Circuit breaker failures caused complete sync failures
- Could not resume interrupted syncs
- No audit trail for debugging

**Root Cause**: Stateless, non-resumable sync architecture

## Solution Architecture

### 1. Database Infrastructure

Created queue-based schema in `database/migrations/0023_sync_infrastructure.sql`:

```sql
woo_customer_sync_queue
├── State machine (draft → processing → partial/done/failed/cancelled)
├── Batch configuration (batch_size, batch_delay_ms)
├── Process count tracking (max 3 retries)
├── Error tracking (last_error_message, error_count)
└── Idempotency support (idempotency_key, resume_from_line)

woo_customer_sync_queue_line
├── Individual customer item (woo_customer_id)
├── Customer data (JSON cached from WooCommerce)
├── Processing state (draft/processing/done/failed/cancelled)
├── Result tracking (result_customer_id, was_update)
├── Error details (error_message, error_count, last_error_timestamp)
└── Idempotency token (unique per line)

woo_sync_activity
├── Activity type (customer_sync, force_done, sync_error)
├── Status and message
├── Contextual details (JSON)
└── Audit trail (created_at, queue_id, queue_line_id)
```

**Indexes**:
- `idx_woo_sync_queue_org_state`: Query by org and state
- `idx_woo_sync_queue_processing`: Find processing queues
- `idx_woo_queue_line_state`: Get draft lines by queue
- `idx_woo_queue_line_idempotency`: Prevent duplicates
- `idx_woo_sync_activity_queue`: Activity audit trail

**Triggers**:
- Auto-update parent queue state based on line states
- Compute draft/done/failed counts from lines

### 2. WooCommerceSyncQueue Service

Low-level queue operations in `src/lib/services/WooCommerceSyncQueue.ts`:

```typescript
WooCommerceSyncQueue
├── createQueue(params)                     // Create new queue
├── addToQueue(queueId, ...)               // Add customer (idempotent)
├── getNextBatch(queueId, batchSize)       // Get draft lines
├── markLinesProcessing(lineIds)           // Atomic state update
├── markLineDone(lineId, result, ...)      // Success completion
├── markLineFailed(lineId, error, ...)     // Failure with logging
├── getQueueStatus(queueId)                // Full status + progress
├── checkQueueActionRequired(queueId)      // Detect stuck queues
├── forceDone(queueId)                     // Cancel remaining items
├── logActivity(...)                       // Audit trail
├── getActivityLog(queueId)                // Query activity
├── getRetryableFailed(queueId)            // Get items < max retries
├── incrementQueueProcessCount(queueId)    // Track process attempts
├── setQueueProcessing(queueId, bool)      // Lock during processing
└── getQueueByIdempotencyKey(...)          // Resume existing syncs
```

**Key Features**:
- Idempotent add (duplicate woo_customer_id returns existing)
- Atomic line transitions (prevents race conditions)
- Computed queue state (derived from line states)
- Process count limits (3 retries, then mark action_required)
- Activity logging (every state change tracked)

### 3. CustomerSyncService

High-level orchestration in `src/lib/services/CustomerSyncService.ts`:

```typescript
CustomerSyncService
├── startSync(wooService, orgId, ...)
│   ├── Generate idempotency key
│   ├── Check if sync already running
│   ├── Fetch customers from WooCommerce
│   ├── Create queue
│   └── Add all customers (idempotent)
│
├── processQueue(wooService, queueId, ...)
│   ├── Mark queue as processing
│   ├── Increment process_count
│   ├── For each batch:
│   │   ├── Get next draft lines
│   │   ├── Mark as processing
│   │   └── For each customer:
│   │       ├── Retry loop with exponential backoff
│   │       ├── Map WooCommerce → MantisNXT
│   │       ├── Check if exists (by email)
│   │       ├── Create or update
│   │       └── Mark done/failed
│   ├── Delay between batches
│   └── Check if action required
│
├── getStatus(queueId)          // Get progress
├── retryFailed(queueId, ...)   // Retry < 3 attempts
├── forceDone(queueId)          // Cancel remaining
└── getActivityLog(queueId)     // Audit trail
```

**Retry Logic**:
```
attempt 1: immediate
attempt 2: wait 1000ms (initial backoff)
attempt 3: wait 2000ms (backoff * 2)
attempt 4: mark failed (max 3 retries)
```

**Batch Processing**:
```
Batch 1 (50 items) → Process → Wait 2000ms
Batch 2 (50 items) → Process → Wait 2000ms
Batch 3 (50 items) → Process → (no delay, last batch)
```

### 4. API Endpoint

Updated `src/app/api/v1/integrations/woocommerce/sync/customers/route.ts`:

```typescript
POST /api/v1/integrations/woocommerce/sync/customers

Actions:
├── start (default)
│   ├── Body: {config, org_id, user_id, options}
│   ├── Creates new queue
│   ├── Fires off async processing
│   └── Returns: queueId, status, progress
│
├── status
│   ├── Query: {queue_id}
│   └── Returns: full queue status + progress
│
├── retry
│   ├── Query: {queue_id}
│   ├── Resets failed lines to draft
│   ├── Restarts processing
│   └── Returns: updated progress
│
└── force-done
    ├── Query: {queue_id}
    ├── Cancels remaining draft/failed lines
    ├── Marks queue as done
    └── Returns: final status
```

**Async Processing**:
- Returns immediately with queue info
- Uses `setImmediate()` to fire async processing
- In production, queue to background job processor (Bull, RabbitMQ, etc.)
- Captures errors and logs to activity trail

## Production Patterns Extracted

From Odoo WooCommerce EPT module:

| Pattern | Implementation |
|---------|----------------|
| Queue state machine | draft→processing→done/partial/failed/cancelled |
| Batch boundaries | 50 items per batch, 2s delay |
| Process tracking | queue_process_count, max 3 retries |
| Error recovery | Exponential backoff on retry |
| Manual intervention | is_action_required flag + activity notification |
| Idempotency | idempotency_key + line-level deduplication |
| Activity logging | Detailed audit trail of all state changes |
| Computed state | Parent queue state derived from line states |
| Resumability | Can restart failed batches without side effects |

## Key Improvements

### Before (Broken)
```
[Simple Loop]
├── Single batch of ALL customers
├── No progress tracking
├── No error recovery
├── No resumability
├── Circuit breaker failure = complete failure
└── Could only succeed or fail entirely
```

### After (Production-Grade)
```
[Queue State Machine]
├── Configurable batch size (default 50)
├── Progress per batch
├── Exponential backoff retry (3 attempts)
├── Resume from last successful item
├── Circuit breaker failure = retry with backoff
├── Partial success, manual intervention for stuck items
├── Complete audit trail
└── Safe for 797+ customers
```

## Usage Examples

### Start a new sync
```typescript
POST /api/v1/integrations/woocommerce/sync/customers
{
  "config": {
    "url": "https://store.example.com",
    "consumerKey": "...",
    "consumerSecret": "..."
  },
  "org_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-123",
  "options": {
    "batchSize": 50,
    "batchDelayMs": 2000,
    "maxRetries": 3
  }
}

Response:
{
  "success": true,
  "data": {
    "queueId": "queue-uuid",
    "queueName": "Customer Sync - 2025-11-05...",
    "totalCustomers": 797,
    "processedCount": 0,
    "failedCount": 0,
    "state": "draft",
    "progress": 0,
    "message": "Sync queue created and processing started"
  }
}
```

### Check sync status
```typescript
POST /api/v1/integrations/woocommerce/sync/customers
{
  "config": {...},
  "org_id": "...",
  "action": "status",
  "queue_id": "queue-uuid"
}

Response:
{
  "success": true,
  "data": {
    "queueId": "queue-uuid",
    "queueName": "Customer Sync - 2025-11-05...",
    "totalCustomers": 797,
    "processedCount": 350,
    "createdCount": 280,
    "updatedCount": 70,
    "failedCount": 5,
    "state": "partial",
    "progress": 44
  }
}
```

### Retry failed items
```typescript
POST /api/v1/integrations/woocommerce/sync/customers
{
  "config": {...},
  "org_id": "...",
  "action": "retry",
  "queue_id": "queue-uuid"
}
```

### Force completion (cancel remaining)
```typescript
POST /api/v1/integrations/woocommerce/sync/customers
{
  "config": {...},
  "org_id": "...",
  "action": "force-done",
  "queue_id": "queue-uuid"
}
```

## Database Deployment

Run migration to create infrastructure:
```bash
npm run migrate -- database/migrations/0023_sync_infrastructure.sql
```

Or manually with psql:
```bash
psql -U user -d database -f database/migrations/0023_sync_infrastructure.sql
```

## Testing

### Create test queue
```sql
INSERT INTO woo_customer_sync_queue (org_id, queue_name, created_by, state)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Test Queue', 'system', 'draft')
RETURNING id;
```

### Add test customers
```sql
INSERT INTO woo_customer_sync_queue_line (
  queue_id, org_id, woo_customer_id, customer_data, state
) VALUES
('queue-id', 'org-id', 1, '{"email": "test@example.com"}', 'draft'),
('queue-id', 'org-id', 2, '{"email": "user@example.com"}', 'draft');
```

### Query progress
```sql
SELECT id, state, total_count, done_count, failed_count, process_count
FROM woo_customer_sync_queue
WHERE id = 'queue-id';
```

### View activity log
```sql
SELECT activity_type, status, message, created_at
FROM woo_sync_activity
WHERE queue_id = 'queue-id'
ORDER BY created_at DESC;
```

## Migration Path

If you have existing stuck syncs:

1. Create new queue with `startSync()`
2. Let it process batch-by-batch
3. Check status with `getStatus()`
4. If failed items, retry with `retryFailed()`
5. If still stuck after 3 retries, `forceDone()` to cancel

## Monitoring & Debugging

### Check for stuck queues
```sql
SELECT id, queue_name, state, process_count, is_action_required
FROM woo_customer_sync_queue
WHERE is_action_required = true;
```

### Find error patterns
```sql
SELECT
  woo_customer_id,
  error_message,
  COUNT(*) as attempt_count
FROM woo_customer_sync_queue_line
WHERE state = 'failed'
GROUP BY woo_customer_id, error_message
ORDER BY attempt_count DESC;
```

### View detailed activity
```sql
SELECT
  sl.woo_customer_id,
  sa.activity_type,
  sa.status,
  sa.message,
  sa.created_at
FROM woo_sync_activity sa
LEFT JOIN woo_customer_sync_queue_line sl ON sa.queue_line_id = sl.id
WHERE sa.queue_id = 'queue-id'
ORDER BY sa.created_at DESC;
```

## Performance

- **Batch size**: 50 items per batch (default, configurable)
- **Batch delay**: 2 seconds between batches (prevents DB overload)
- **Retry backoff**: 1s → 2s → 4s exponential (for failures)
- **Indexes**: All critical queries have dedicated indexes
- **Cleanup**: Auto-remove old queues (30-day retention)

**Estimated time for 797 customers**:
- 797 items / 50 per batch = 16 batches
- 16 batches * 2 seconds = 32 seconds + processing time
- With 2s processing per customer = ~1600 seconds (~27 minutes total)

## Security

- Org isolation (org_id in all queries)
- Idempotency prevents duplicate operations
- Activity logging enables audit trail
- User tracking (created_by field)
- No sensitive data stored in metadata (only IDs and mapping info)

## Future Improvements

1. **Background Job Queue**: Use Bull/RabbitMQ instead of `setImmediate()`
2. **Webhook Integration**: Listen to WooCommerce webhooks for real-time updates
3. **Bulk Export**: Export sync status/activity to CSV
4. **Scheduled Syncs**: Cron-based periodic syncs
5. **Webhook Payload Caching**: Cache webhook data before queue processing
6. **Custom Field Mapping**: Allow field mapping configuration per org
7. **Delta Sync**: Only sync changed customers (requires tracking last sync date)

## Files Modified

- `database/migrations/0023_sync_infrastructure.sql` - Database schema (157 lines)
- `src/lib/services/WooCommerceSyncQueue.ts` - Queue operations (442 lines)
- `src/lib/services/CustomerSyncService.ts` - Sync orchestration (508 lines)
- `src/app/api/v1/integrations/woocommerce/sync/customers/route.ts` - API endpoint (235 lines)

**Total**: 1,342 lines of production-ready code

## Commit

```
feat: Queue-based customer sync infrastructure (production pattern)
Based on Odoo data_queue_mixin_ept pattern. Implements state machine,
batch processing, idempotent retry logic, and activity logging.
Fixes infinite loop bug and enables reliable sync of 797+ customers.
```

**Hash**: `fb62c16`
