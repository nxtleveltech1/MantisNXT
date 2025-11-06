# SyncOrchestrator & ConflictResolver - Production Implementation Guide

## Overview

This document describes the production-ready sync orchestration system for multi-system data synchronization (WooCommerce ↔ Odoo) with comprehensive conflict resolution and recovery capabilities.

## Architecture

### Core Components

1. **SyncOrchestrator** (`src/lib/services/SyncOrchestrator.ts`)
   - Queue-based state machine managing sync lifecycle
   - Batch processing with configurable batch sizes and delays
   - Supports multiple entity types and concurrent syncs
   - Transaction-safe processing with idempotency guarantees
   - Rate limiting and circuit breaker patterns

2. **ConflictResolver** (`src/lib/services/ConflictResolver.ts`)
   - Detects 5 conflict types: DataMismatch, DuplicateKey, ValidationError, AuthError, RetryExhausted
   - Implements 3 resolution strategies: AutoRetry, Manual, Skip
   - Exponential backoff with jitter for retries
   - Maintains audit trail of all conflicts

3. **API Endpoint** (`src/app/api/v1/integrations/sync/orchestrate/route.ts`)
   - REST interface for sync orchestration
   - Actions: start, status, pause, resume, cancel, conflicts, resolve-conflict
   - In-memory orchestrator tracking with database fallback
   - Rate limited (10 requests/minute per organization)

### Database Tables

Created by migration `0023_sync_orchestration_tables.sql`:

- `sync_orchestration`: Main orchestration records with status and config
- `sync_idempotency_log`: Prevents duplicate processing on retries
- `sync_conflict`: Tracks unresolved conflicts for manual review
- `sync_activity_log`: Complete audit trail of all operations

## Sync Orchestration Flow

### Phase 1: Initialization
```
POST /api/v1/integrations/sync/orchestrate?action=start
├── Verify auth & organization membership
├── Validate request parameters (systems, entityTypes, config)
├── Check concurrent sync limits (max 5 per org)
├── Create SyncOrchestrator instance
├── Return syncId (status: 'queued')
└── Start background processing
```

### Phase 2: Processing
```
SyncOrchestrator.orchestrateCombinedSync()
├── Create sync record in DB (status: 'processing')
├── Log activity: SYNC_STARTED
│
├── For each system (WooCommerce first, then Odoo):
│  ├── For each entity type:
│  │  ├── Fetch items to sync (status: 'pending' or 'failed')
│  │  ├── Create batches (default: 50 items per batch)
│  │  │
│  │  └── For each batch:
│  │     ├── BEGIN TRANSACTION (SERIALIZABLE isolation)
│  │     │
│  │     ├── For each item:
│  │     │  ├── Check idempotency (prevent duplicates)
│  │     │  ├── Rate limit (token bucket)
│  │     │  ├── Resolve conflicts:
│  │     │  │  ├── Detect conflict type
│  │     │  │  ├── Get resolution strategy
│  │     │  │  ├── AutoRetry: Exponential backoff (1s→2s→4s→8s→16s)
│  │     │  │  ├── Manual: Stop, log for review
│  │     │  │  └── Skip: Continue, mark skipped
│  │     │  │
│  │     │  ├── Process item (call external API)
│  │     │  ├── Record idempotency key
│  │     │  └── Update status: 'completed', 'failed', or 'skipped'
│  │     │
│  │     ├── COMMIT (all or nothing)
│  │     └── Log batch completion
│  │
│  └── Inter-batch delay (2s default)
│
├── Log activity: SYNC_COMPLETED
├── Update sync record (status: 'done', 'partial', or 'failed')
└── Cleanup (remove from active orchestrators)
```

### Phase 3: Conflict Resolution

**Conflict Detection:**
```
ConflictResolver.detectConflictType()
├── Check for data mismatches in fields
├── Check for duplicate keys
├── Validate data against schema
├── Return conflict type
```

**Resolution Strategy Decision Tree:**
```
DataMismatch + retry < 3?         → AutoRetry
DataMismatch + retry >= 3?        → Manual
ValidationError?                   → Manual
AuthError?                         → Manual
DuplicateKey?                      → Skip
RetryExhausted?                    → Manual
```

**AutoRetry Implementation:**
```
1. Calculate backoff: delay = baseDelay * 2^retryCount (max 16s)
2. Add jitter: delay += random(0, 1000ms)
3. Wait before retry
4. Merge source+target data (remote as source of truth)
5. Return resolved data for retry
```

**Manual Intervention:**
```
1. Record conflict to sync_conflict table
2. Stop current batch (preserve transaction)
3. Expose conflict via GET /conflicts endpoint
4. Allow user to accept/reject/provide custom resolution
5. Resume after resolution
```

### Phase 4: Status Queries

```
GET /api/v1/integrations/sync/orchestrate?action=status&syncId=...
├── Check active orchestrators (in-memory)
├── If not found, fetch from database
├── Aggregate queue statistics:
│  ├── WooCommerce: total, processed, failed, skipped, pending
│  └── Odoo: total, processed, failed, skipped, pending
├── Get unresolved conflicts
├── Calculate progress:
│  ├── percentComplete = (processed / total) * 100
│  └── estimatedTimeRemaining = (remaining * avgTimePerItem)
└── Return full status
```

## API Endpoints

### Start Sync
```bash
curl -X POST http://localhost:3000/api/v1/integrations/sync/orchestrate \
  -H "Authorization: Bearer {token}" \
  -H "x-user-id: {userId}" \
  -H "x-org-id: {orgId}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start",
    "systems": ["woocommerce", "odoo"],
    "entityTypes": ["customers", "products"],
    "syncConfig": {
      "conflictStrategy": "auto-retry",
      "batchSize": 50,
      "maxRetries": 3,
      "rateLimit": 10,
      "interBatchDelayMs": 2000
    }
  }'
```

Response:
```json
{
  "success": true,
  "syncId": "sync-uuid-1234",
  "status": "queued",
  "message": "Sync orchestration started"
}
```

### Get Status
```bash
curl -X POST http://localhost:3000/api/v1/integrations/sync/orchestrate \
  -H "Authorization: Bearer {token}" \
  -H "x-user-id: {userId}" \
  -H "x-org-id: {orgId}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "status",
    "syncId": "sync-uuid-1234"
  }'
```

Response:
```json
{
  "success": true,
  "syncId": "sync-uuid-1234",
  "status": "processing",
  "orgId": "org-123",
  "systems": ["woocommerce", "odoo"],
  "entityTypes": ["customers", "products"],
  "queues": {
    "woocommerce": {
      "total": 500,
      "processed": 250,
      "failed": 5,
      "skipped": 10,
      "pending": 235
    },
    "odoo": {
      "total": 300,
      "processed": 100,
      "failed": 2,
      "skipped": 5,
      "pending": 193
    }
  },
  "conflicts": {
    "count": 3,
    "manualReview": [
      {
        "id": "conflict-uuid",
        "type": "ValidationError",
        "reason": "Invalid email format"
      }
    ]
  },
  "startedAt": "2025-11-06T12:00:00Z",
  "progress": {
    "percentComplete": 52,
    "estimatedTimeRemainingMs": 125000
  }
}
```

### Pause/Resume/Cancel
```bash
# Pause
curl -X POST http://localhost:3000/api/v1/integrations/sync/orchestrate \
  -d '{"action": "pause", "syncId": "sync-uuid-1234"}'

# Resume
curl -X POST http://localhost:3000/api/v1/integrations/sync/orchestrate \
  -d '{"action": "resume", "syncId": "sync-uuid-1234"}'

# Cancel
curl -X POST http://localhost:3000/api/v1/integrations/sync/orchestrate \
  -d '{"action": "cancel", "syncId": "sync-uuid-1234"}'
```

### Get Conflicts
```bash
curl -X POST http://localhost:3000/api/v1/integrations/sync/orchestrate \
  -d '{
    "action": "conflicts",
    "syncId": "sync-uuid-1234"
  }'
```

Response:
```json
{
  "success": true,
  "syncId": "sync-uuid-1234",
  "stats": {
    "totalConflicts": 5,
    "unresolvedCount": 3,
    "byType": {
      "ValidationError": 2,
      "DataMismatch": 1
    }
  },
  "conflicts": [
    {
      "id": "conflict-uuid",
      "itemId": "item-123",
      "type": "ValidationError",
      "data": { ... }
    }
  ]
}
```

### Resolve Conflict
```bash
curl -X POST http://localhost:3000/api/v1/integrations/sync/orchestrate \
  -d '{
    "action": "resolve-conflict",
    "conflictId": "conflict-uuid",
    "resolution": "accept",
    "customData": { ... }
  }'
```

## Key Features

### Idempotency
- Every item gets unique `idempotency_key`
- Keys logged in `sync_idempotency_log` upon processing
- Prevents duplicate processing on retries
- Checks before processing each item

### Transaction Safety
- Each batch = one SERIALIZABLE transaction
- Rollback on error (partial batch)
- Maintains data consistency across systems

### Rate Limiting
- Token bucket algorithm per organization
- Respects WooCommerce/Odoo API limits
- Exponential backoff for 429 responses

### Concurrent Sync Support
- Max 5 concurrent syncs per organization
- In-memory orchestrator tracking
- Redis-ready for multi-instance deployment

### Recovery & Resilience
- Pause/Resume capability
- Graceful cancellation
- Network failure recovery via idempotency
- Circuit breaker on repeated failures

### Audit Trail
- Complete activity logging in `sync_activity_log`
- Tracks all major milestones (SYNC_STARTED, BATCH_PROCESSED, SYNC_ERROR)
- Conflict resolution history
- Performance metrics

## Performance Considerations

- **Batch Size**: 50 items default (configurable max 200)
- **Inter-Batch Delay**: 2000ms default (reduces API pressure)
- **Rate Limit**: 10 requests/min default per org (configurable max 50)
- **Retry Strategy**: Exponential backoff prevents thundering herd
- **Database Indexes**: Optimized for sync lookups and status queries

## Error Handling

### Graceful Degradation
- Partial sync success still commits processed items
- Failed items retained in queue for manual retry
- Conflicts logged for user review

### Failure Scenarios
1. **Network Error**: Item marked as 'pending', retry on next batch
2. **Validation Error**: Item marked as 'failed', conflict recorded
3. **Auth Error**: Batch stops, requires manual intervention
4. **Rate Limit (429)**: Exponential backoff + circuit breaker
5. **Transaction Rollback**: Entire batch discarded, items stay pending

## Usage Examples

### Full Sync Workflow
```typescript
// 1. Start sync
const syncRes = await fetch('/api/v1/integrations/sync/orchestrate', {
  method: 'POST',
  body: JSON.stringify({
    action: 'start',
    systems: ['woocommerce', 'odoo'],
    entityTypes: ['customers', 'products'],
    syncConfig: { batchSize: 100, maxRetries: 3 }
  })
});
const { syncId } = await syncRes.json();

// 2. Poll for status
const statusRes = await fetch('/api/v1/integrations/sync/orchestrate', {
  method: 'POST',
  body: JSON.stringify({
    action: 'status',
    syncId
  })
});
const status = await statusRes.json();
console.log(`Progress: ${status.progress.percentComplete}%`);

// 3. Handle conflicts if any
if (status.conflicts.count > 0) {
  const conflictsRes = await fetch('/api/v1/integrations/sync/orchestrate', {
    method: 'POST',
    body: JSON.stringify({
      action: 'conflicts',
      syncId
    })
  });
  const conflicts = await conflictsRes.json();
  // ... user review and resolution
}
```

## Database Schema

All required tables created in migration `0023_sync_orchestration_tables.sql`:
- Indexes optimized for query performance
- JSONB columns for flexible conflict/config storage
- Proper relationships with organization isolation

## Testing

Run integration tests:
```bash
npm test -- sync-orchestration.test.ts
npm test -- conflict-resolver.test.ts
```

## Future Enhancements

1. **Redis Integration**: Replace in-memory orchestrator store for multi-instance
2. **Webhook Notifications**: Real-time sync status updates
3. **Advanced Scheduling**: Cron-based automated syncs
4. **Machine Learning**: Conflict prediction and auto-resolution
5. **Parallel System Processing**: Process WooCommerce & Odoo simultaneously
6. **Incremental Syncs**: Delta-based partial syncs
