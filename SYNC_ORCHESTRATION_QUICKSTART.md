# Sync Orchestration - Quick Reference

## Quick Links
- Full Documentation: `SYNC_ORCHESTRATION_GUIDE.md`
- Deliverables Summary: `DELIVERABLES_SYNC_ORCHESTRATION.md`
- Service Code: `src/lib/services/SyncOrchestrator.ts` (705 lines)
- Conflict Resolution: `src/lib/services/ConflictResolver.ts` (475 lines)
- API Endpoint: `src/app/api/v1/integrations/sync/orchestrate/route.ts` (625 lines)
- Database Migration: `database/migrations/0023_sync_orchestration_tables.sql`

---

## 1-Minute Overview

**What It Does**:
- Synchronizes data between WooCommerce and Odoo
- Handles conflicts automatically or escalates for manual review
- Processes data in batches with automatic retry
- Provides status updates and pause/resume capability

**Key Numbers**:
- **1,805** lines of production-ready TypeScript
- **5** concurrent syncs per organization
- **50** items per batch (configurable)
- **3** retry attempts with exponential backoff
- **10** requests/minute rate limit per org

---

## Setup in 3 Steps

### 1. Run Migration
```bash
npm run db:migrate
# Creates tables: sync_orchestration, sync_conflict, sync_activity_log, sync_idempotency_log
```

### 2. Start a Sync
```bash
curl -X POST http://localhost:3000/api/v1/integrations/sync/orchestrate \
  -H "Authorization: Bearer {token}" \
  -H "x-user-id: {userId}" \
  -H "x-org-id: {orgId}" \
  -d '{
    "action": "start",
    "systems": ["woocommerce", "odoo"],
    "entityTypes": ["customers"],
    "syncConfig": {"batchSize": 50, "maxRetries": 3, "rateLimit": 10}
  }'
```

Response:
```json
{
  "success": true,
  "syncId": "sync-1234",
  "status": "queued"
}
```

### 3. Check Status
```bash
curl -X POST http://localhost:3000/api/v1/integrations/sync/orchestrate \
  -d '{"action": "status", "syncId": "sync-1234"}'
```

---

## API Actions

| Action | Method | Purpose |
|--------|--------|---------|
| `start` | POST | Initiate sync |
| `status` | POST | Get real-time progress |
| `pause` | POST | Pause running sync |
| `resume` | POST | Resume paused sync |
| `cancel` | POST | Cancel sync gracefully |
| `conflicts` | POST | Get unresolved conflicts |
| `resolve-conflict` | POST | Manually resolve conflict |

---

## Conflict Resolution

### Automatic (No Action Needed)
- DataMismatch (retry < 3) → AutoRetry
- DuplicateKey → Skip

### Manual Review Required
- ValidationError → Review data
- AuthError → Check permissions
- RetryExhausted → Fix & retry

**Example: Resolve a conflict**
```bash
curl -X POST http://localhost:3000/api/v1/integrations/sync/orchestrate \
  -d '{
    "action": "resolve-conflict",
    "conflictId": "conflict-xyz",
    "resolution": "accept"
  }'
```

---

## Monitoring

### Status Fields
- `percentComplete`: 0-100
- `estimatedTimeRemainingMs`: Milliseconds
- `status`: processing | done | partial | failed

### Queue Stats
- `total`: Items to sync
- `processed`: Completed successfully
- `failed`: Errors (failed retries)
- `skipped`: Intentionally skipped
- `pending`: Awaiting processing

### Conflict Stats
- `totalConflicts`: Total detected
- `unresolvedCount`: Awaiting action
- `byType`: Count per conflict type

---

## Common Scenarios

### Start & Monitor
```javascript
// 1. Start sync
const start = await fetch('/api/v1/integrations/sync/orchestrate', {
  method: 'POST',
  body: JSON.stringify({
    action: 'start',
    systems: ['woocommerce', 'odoo'],
    entityTypes: ['customers']
  })
});
const { syncId } = await start.json();

// 2. Poll status every 5 seconds
const pollStatus = setInterval(async () => {
  const res = await fetch('/api/v1/integrations/sync/orchestrate', {
    method: 'POST',
    body: JSON.stringify({ action: 'status', syncId })
  });
  const { progress, conflicts } = await res.json();

  console.log(`${progress.percentComplete}% complete`);

  if (conflicts.count > 0) {
    // Handle conflicts
    clearInterval(pollStatus);
  }

  if (progress.percentComplete === 100) {
    clearInterval(pollStatus);
  }
}, 5000);
```

### Handle Long Syncs
```javascript
// Pause for user review
await fetch('/api/v1/integrations/sync/orchestrate', {
  method: 'POST',
  body: JSON.stringify({ action: 'pause', syncId })
});

// ... user reviews conflicts ...

// Resume
await fetch('/api/v1/integrations/sync/orchestrate', {
  method: 'POST',
  body: JSON.stringify({ action: 'resume', syncId })
});
```

---

## Performance Tips

1. **Batch Size**: Increase to 100+ for large datasets
2. **Rate Limit**: Adjust based on API capacity
3. **Inter-Batch Delay**: Reduce if no API throttling
4. **Concurrent Syncs**: Max 5 per org (limit reached)

---

## Troubleshooting

### Sync Stuck
1. Check status: `GET /status?syncId=...`
2. If paused: `POST /resume?syncId=...`
3. If too long: `POST /cancel?syncId=...`

### High Failure Rate
1. Check conflicts: `GET /conflicts?syncId=...`
2. Review error messages in `sync_activity_log`
3. Verify API credentials
4. Check rate limits

### Memory Issues
- Reduce batch size (25-50)
- Increase inter-batch delay (3000+ms)
- Process smaller entity types first

---

## Database Tables

Created by migration:

**sync_orchestration**
- Tracks sync lifecycle
- Status: draft → queued → processing → done/partial/failed

**sync_conflict**
- Conflict records
- Manual resolution tracking
- Audit trail

**sync_idempotency_log**
- Prevents duplicate processing
- Supports safe retries

**sync_activity_log**
- Complete audit trail
- Performance metrics
- Error tracking

---

## Key Metrics

| Metric | Default | Max |
|--------|---------|-----|
| Batch Size | 50 | 200 |
| Max Retries | 3 | 5 |
| Rate Limit (req/min) | 10 | 50 |
| Concurrent Syncs | 5 | 5 |
| Retry Backoff | 1-16s | - |
| Inter-Batch Delay | 2000ms | - |

---

## Code Locations

```
Project Root/
├── src/lib/services/
│   ├── SyncOrchestrator.ts          ← Main orchestrator
│   └── ConflictResolver.ts          ← Conflict detection & resolution
├── src/app/api/v1/integrations/sync/orchestrate/
│   └── route.ts                     ← REST API endpoints
├── database/migrations/
│   └── 0023_sync_orchestration_tables.sql  ← DB schema
└── Docs/
    ├── SYNC_ORCHESTRATION_GUIDE.md  ← Full documentation
    └── DELIVERABLES_SYNC_ORCHESTRATION.md  ← Delivery summary
```

---

## Next Steps

- [ ] Run database migration
- [ ] Test with staging data
- [ ] Configure monitoring/alerts
- [ ] Write integration tests
- [ ] Deploy to production
- [ ] Monitor sync activity

---

**Support**: See full documentation at `SYNC_ORCHESTRATION_GUIDE.md`
