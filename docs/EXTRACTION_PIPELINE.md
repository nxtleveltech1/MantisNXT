# Extraction Pipeline - Production Infrastructure

**Production-grade async extraction pipeline with proper queue management, performance optimizations, and robust error handling.**

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Components](#components)
- [Features](#features)
- [Performance Characteristics](#performance-characteristics)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Monitoring](#monitoring)
- [Error Handling](#error-handling)
- [Database Schema](#database-schema)

---

## Architecture Overview

```
┌──────────────────┐
│   File Upload    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ ExtractionQueue  │ ◄── Priority Queue (FIFO with priority)
│  (max 3 workers) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ ExtractionWorker │ ◄── Chunked processing (100 rows/chunk)
│  (async/await)   │     Progress events (every 100 rows)
└────────┬─────────┘
         │
         ├─── Success ──► Cache (24h TTL) ──► Database
         │
         └─── Failure ──► Retry (exponential backoff)
                          │
                          ├─── Success ──► Cache
                          │
                          └─── Max Retries ──► Dead Letter Queue (DLQ)
```

---

## Components

### 1. ExtractionJobQueue

**Purpose:** Manage job lifecycle with proper async/await, backpressure, and retry logic.

**Key Features:**
- Priority queue (higher priority = processed first)
- Concurrency control (max 3 workers by default)
- Automatic retry with exponential backoff
- Dead letter queue for failed jobs
- Graceful shutdown with timeout

**Configuration:**
```typescript
const queue = new ExtractionJobQueue(3); // Max 3 concurrent workers

// Retry configuration
{
  maxAttempts: 3,
  baseDelayMs: 1000,    // 1 second base delay
  maxDelayMs: 30000,    // 30 second max delay
  jitter: true          // Add random jitter to prevent thundering herd
}
```

**Events:**
- `job:queued` - Job added to queue
- `job:progress` - Progress update (every 100 rows)
- `job:status` - Status message
- `job:completed` - Job finished successfully
- `job:failed` - Job failed (after retries)
- `job:retry` - Job being retried
- `job:cancelled` - Job cancelled
- `job:dlq` - Job moved to dead letter queue
- `queue:backpressure` - Queue at capacity
- `queue:shutdown` - Queue shutting down

---

### 2. ExtractionWorker

**Purpose:** Execute extraction jobs with chunked processing and memory management.

**Key Features:**
- Chunked file reading (100 rows at a time)
- Streaming CSV parsing (memory efficient)
- Progress events every 100 rows
- Cancellation support
- Result caching (24-hour TTL)

**Performance Characteristics:**
- Max file size: 100MB
- Chunk size: 100 rows
- Progress interval: 100 rows
- Database batch size: 500 SKUs

**Supported File Types:**
- CSV (streaming)
- XLSX/XLS (chunked)
- JSON

---

### 3. ExtractionCache

**Purpose:** Multi-layer caching for extraction results.

**Layers:**
1. **Memory Cache** (5-minute TTL)
2. **Database Cache** (24-hour TTL)

**Operations:**
- `get(job_id)` - Retrieve cached result
- `set(job_id, result)` - Store result
- `invalidate(job_id)` - Remove result
- `cleanup()` - Remove expired entries (runs every 10 minutes)

---

### 4. ExtractionMetrics

**Purpose:** Track performance metrics for monitoring and alerting.

**Metrics Tracked:**
- Job duration (ms)
- Rows processed
- Success/failure rate
- Error codes
- Throughput (rows/sec)

**Dashboard Metrics:**
```typescript
{
  jobs_last_hour: number;
  jobs_last_24h: number;
  success_rate_24h: number;
  avg_duration_ms: number;
  rows_processed_24h: number;
  top_errors: Array<{ code: string; count: number }>;
}
```

---

### 5. ExtractionMonitor

**Purpose:** Real-time monitoring and health checks.

**Health Checks:**
- Queue size (threshold: 50)
- DLQ size (threshold: 10)
- Success rate (threshold: 90%)
- Average duration (threshold: 60 seconds)

**Health Status:**
```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy';
  queue_ok: boolean;
  performance_ok: boolean;
  dlq_ok: boolean;
  last_check: Date;
  issues: string[];
}
```

**Events:**
- `health:status_change` - Health status changed
- `health:critical` - System unhealthy
- `health:warning` - System degraded
- `health:check_failed` - Health check failed
- `alert:backpressure` - Queue at capacity
- `alert:dlq` - DLQ threshold exceeded
- `alert:job_failed` - Job failed
- `alert:job_retry` - Job being retried

---

## Features

### 1. Async/Await Processing

All operations use proper async/await patterns:

```typescript
// Worker execution
const result = await worker.execute(job);

// Database queries
const existingProducts = await query(sql, params);

// Cache operations
const cached = await cache.get(job_id);
```

### 2. Backpressure Handling

Queue automatically manages concurrency:

```typescript
if (activeJobs.size >= maxConcurrency) {
  emit('queue:backpressure', { active, queued, max });
  return; // Wait for capacity
}
```

### 3. Exponential Backoff

Retries use exponential backoff with jitter:

```typescript
// Attempt 1: 1s + jitter
// Attempt 2: 2s + jitter
// Attempt 3: 4s + jitter
// Max delay: 30s

const delay = Math.min(
  baseDelay * Math.pow(2, attempt - 1),
  maxDelay
) + jitter;
```

### 4. Progress Tracking

Real-time progress events:

```typescript
worker.on('progress', (percent) => {
  console.log(`Progress: ${percent}%`);
});

worker.on('status', (message) => {
  console.log(`Status: ${message}`);
});
```

### 5. Memory Management

Chunked processing prevents memory exhaustion:

```typescript
// Process 100 rows at a time
for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
  const chunk = rawData.slice(i, i + CHUNK_SIZE);
  await processChunk(chunk);

  // Yield to event loop every 500 rows
  if (i % 500 === 0) {
    await new Promise(resolve => setImmediate(resolve));
  }
}
```

### 6. Cancellation

Jobs can be cancelled at any time:

```typescript
// Cancel queued job
await queue.cancelJob(job_id);

// Cancel active job
worker.cancel(); // Throws cancellation error
```

---

## Performance Characteristics

### Throughput

- **CSV Streaming:** ~10,000 rows/second
- **Excel Chunked:** ~5,000 rows/second
- **Database Validation:** 500 SKUs/batch

### Memory Usage

- **Small files (<1MB):** ~50MB RAM
- **Medium files (1-10MB):** ~100MB RAM
- **Large files (10-100MB):** ~200MB RAM

### Latency

- **Cache hit:** <10ms
- **Small extraction (100 rows):** ~1-2 seconds
- **Medium extraction (1,000 rows):** ~5-10 seconds
- **Large extraction (10,000 rows):** ~30-60 seconds

---

## Configuration

### Environment Variables

```bash
# Queue Configuration
EXTRACTION_MAX_CONCURRENCY=3

# Retry Configuration
EXTRACTION_MAX_RETRIES=3
EXTRACTION_BASE_DELAY_MS=1000
EXTRACTION_MAX_DELAY_MS=30000

# Cache Configuration
EXTRACTION_CACHE_TTL_HOURS=24
EXTRACTION_MEM_CACHE_TTL_MS=300000

# File Configuration
EXTRACTION_MAX_FILE_SIZE_MB=100

# Monitoring Configuration
EXTRACTION_HEALTH_CHECK_INTERVAL_MS=30000
```

### Queue Configuration

```typescript
const queue = new ExtractionJobQueue(
  parseInt(process.env.EXTRACTION_MAX_CONCURRENCY || '3')
);
```

### Worker Configuration

```typescript
const CHUNK_SIZE = 100;           // Process 100 rows at a time
const PROGRESS_INTERVAL = 100;    // Emit progress every 100 rows
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
```

---

## API Reference

### POST /api/extraction/jobs

Create a new extraction job.

**Request:**
```json
{
  "upload_id": "uuid",
  "config": {
    "supplier_id": "uuid",
    "column_mapping": { "sku": "SKU", "price": "Price" },
    "transformations": [],
    "validation_mode": "strict"
  },
  "priority": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "uuid",
    "position": 1,
    "estimated_wait_ms": 0
  }
}
```

---

### GET /api/extraction/jobs/:job_id

Get job status and progress.

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "uuid",
    "status": "processing",
    "progress": {
      "percent_complete": 45,
      "current_step": "Validating products",
      "rows_processed": 450,
      "rows_total": 1000,
      "elapsed_ms": 5000,
      "estimated_remaining_ms": 5500
    }
  }
}
```

---

### DELETE /api/extraction/jobs/:job_id

Cancel a job.

**Response:**
```json
{
  "success": true,
  "data": {
    "cancelled": true
  }
}
```

---

### GET /api/extraction/monitor

Get monitoring dashboard.

**Query Parameters:**
- `view` - Dashboard view (dashboard, health, queue, performance, errors, dlq, recent-jobs, hourly-stats)

**Response (dashboard):**
```json
{
  "success": true,
  "data": {
    "health": {
      "status": "healthy",
      "queue_ok": true,
      "performance_ok": true,
      "dlq_ok": true,
      "last_check": "2025-01-14T10:00:00Z",
      "issues": []
    },
    "queue": {
      "queued": 5,
      "active": 2,
      "dlq": 1,
      "max_concurrency": 3,
      "utilization_percent": 67
    },
    "performance": {
      "jobs_last_hour": 10,
      "jobs_last_24h": 240,
      "success_rate_24h": 95.5,
      "avg_duration_ms": 15000,
      "rows_processed_24h": 50000,
      "throughput_rows_per_sec": 3.33
    },
    "errors": {
      "total_errors_24h": 10,
      "top_errors": [
        { "code": "FILE_NOT_FOUND", "count": 5 },
        { "code": "VALIDATION_ERROR", "count": 3 }
      ]
    },
    "dlq": {
      "size": 1,
      "oldest_entry_age_minutes": 120,
      "entries_needing_attention": 1
    }
  }
}
```

---

## Monitoring

### Health Checks

The monitor performs health checks every 30 seconds:

```typescript
const health = await extractionMonitor.performHealthCheck();

if (health.status === 'unhealthy') {
  // Alert operations team
  sendAlert(health.issues);
}
```

### Metrics Dashboard

Access real-time metrics:

```bash
GET /api/extraction/monitor?view=dashboard
GET /api/extraction/monitor?view=health
GET /api/extraction/monitor?view=queue
GET /api/extraction/monitor?view=performance
GET /api/extraction/monitor?view=errors
GET /api/extraction/monitor?view=dlq
GET /api/extraction/monitor?view=recent-jobs&limit=20
GET /api/extraction/monitor?view=hourly-stats
```

### Event Monitoring

Listen to queue events:

```typescript
extractionQueue.on('job:failed', (job_id, error) => {
  logger.error(`Job ${job_id} failed:`, error);
  sendSlackAlert(`Extraction job ${job_id} failed`);
});

extractionQueue.on('queue:backpressure', (data) => {
  logger.warn('Queue at capacity:', data);
});
```

---

## Error Handling

### Non-Retryable Errors

These errors skip retry logic and go directly to DLQ:

- `FILE_NOT_FOUND`
- `INVALID_CONFIG`
- `VALIDATION_ERROR`
- `CANCELLED`

### Retryable Errors

These errors trigger automatic retry with exponential backoff:

- `NETWORK_ERROR`
- `DATABASE_ERROR`
- `TIMEOUT_ERROR`
- `EXTRACTION_ERROR`

### Dead Letter Queue

Failed jobs (after max retries) are stored in DLQ for manual intervention:

```typescript
// Reprocess a DLQ job
const new_job_id = await reprocessDLQJob(dlq_id, user_id, notes);
```

### Error Metrics

Track error rates and patterns:

```sql
SELECT error_code, COUNT(*) as count
FROM spp.extraction_metrics
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_code
ORDER BY count DESC;
```

---

## Database Schema

### extraction_jobs

```sql
CREATE TABLE spp.extraction_jobs (
    job_id UUID PRIMARY KEY,
    upload_id UUID NOT NULL,
    org_id UUID NOT NULL,
    supplier_id UUID,
    config JSONB NOT NULL,
    status TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    retry_count INTEGER NOT NULL DEFAULT 0,
    result JSONB,
    result_cache_key TEXT,
    error JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);
```

### extraction_job_dlq

```sql
CREATE TABLE spp.extraction_job_dlq (
    dlq_id UUID PRIMARY KEY,
    job_id UUID NOT NULL,
    upload_id UUID NOT NULL,
    config JSONB NOT NULL,
    org_id UUID NOT NULL,
    retry_count INTEGER NOT NULL,
    error_code TEXT NOT NULL,
    error_message TEXT NOT NULL,
    error_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reprocessed_at TIMESTAMPTZ,
    reprocessed_by UUID,
    reprocess_notes TEXT
);
```

### extraction_metrics

```sql
CREATE TABLE spp.extraction_metrics (
    metric_id UUID PRIMARY KEY,
    job_id UUID NOT NULL,
    status TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    rows_processed INTEGER NOT NULL DEFAULT 0,
    error_code TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### extraction_results

```sql
CREATE TABLE spp.extraction_results (
    job_id UUID PRIMARY KEY,
    products JSONB NOT NULL,
    summary JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);
```

---

## Usage Examples

### Basic Extraction

```typescript
import { extractionQueue } from '@/lib/services/ExtractionJobQueue';

// Enqueue job
const { job_id, position, estimated_wait_ms } = await extractionQueue.enqueue(
  job_id,
  upload_id,
  config,
  org_id,
  priority
);

// Monitor progress
extractionQueue.on('job:progress', (id, progress) => {
  if (id === job_id) {
    console.log(`Progress: ${progress.percent_complete}%`);
  }
});

// Wait for completion
extractionQueue.on('job:completed', (id, result) => {
  if (id === job_id) {
    console.log('Extraction completed:', result);
  }
});
```

### Monitoring

```typescript
import { extractionMonitor } from '@/lib/services/ExtractionMonitor';

// Start monitoring
extractionMonitor.start();

// Listen to alerts
extractionMonitor.on('health:critical', (health) => {
  console.error('System unhealthy:', health.issues);
  sendPagerDutyAlert(health);
});

extractionMonitor.on('alert:dlq', (alert) => {
  console.warn('DLQ alert:', alert.message);
  sendSlackNotification(alert);
});

// Get dashboard data
const dashboard = await extractionMonitor.getDashboard();
console.log('Dashboard:', dashboard);
```

---

## Troubleshooting

### High Queue Size

**Symptoms:** Queue size exceeds 50 jobs

**Solutions:**
1. Increase concurrency: `EXTRACTION_MAX_CONCURRENCY=5`
2. Check for blocked workers
3. Review slow jobs in metrics

### Low Success Rate

**Symptoms:** Success rate below 90%

**Solutions:**
1. Review top error codes in metrics
2. Check DLQ for patterns
3. Validate file upload quality

### High Memory Usage

**Symptoms:** Worker memory exceeds 500MB

**Solutions:**
1. Reduce chunk size: `CHUNK_SIZE=50`
2. Check for large files
3. Monitor for memory leaks

### Slow Performance

**Symptoms:** Average duration exceeds 60 seconds

**Solutions:**
1. Optimize database queries
2. Increase chunk size: `CHUNK_SIZE=200`
3. Review file complexity
4. Check database indexes

---

## Maintenance

### Daily Tasks

1. **Cleanup expired results:**
   ```sql
   SELECT spp.cleanup_expired_extraction_results();
   ```

2. **Review DLQ entries:**
   ```sql
   SELECT * FROM spp.extraction_job_dlq
   WHERE reprocessed_at IS NULL
   ORDER BY created_at DESC;
   ```

3. **Check metrics:**
   ```bash
   curl http://localhost:3000/api/extraction/monitor?view=dashboard
   ```

### Weekly Tasks

1. **Analyze error patterns:**
   ```sql
   SELECT error_code, COUNT(*)
   FROM spp.extraction_metrics
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY error_code
   ORDER BY COUNT(*) DESC;
   ```

2. **Review performance trends:**
   ```sql
   SELECT
     DATE_TRUNC('day', created_at) AS day,
     AVG(duration_ms) AS avg_duration,
     COUNT(*) AS total_jobs
   FROM spp.extraction_metrics
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY day
   ORDER BY day DESC;
   ```

### Monthly Tasks

1. **Archive old metrics:**
   ```sql
   DELETE FROM spp.extraction_metrics
   WHERE created_at < NOW() - INTERVAL '90 days';
   ```

2. **Review capacity planning:**
   - Check average queue size
   - Review concurrency utilization
   - Plan scaling if needed

---

## Production Checklist

- [ ] Set `EXTRACTION_MAX_CONCURRENCY` based on CPU cores
- [ ] Configure monitoring alerts (Slack, PagerDuty)
- [ ] Set up daily cleanup cron job
- [ ] Enable database query logging
- [ ] Configure file upload limits
- [ ] Set up DLQ reprocessing workflow
- [ ] Document operational runbooks
- [ ] Test graceful shutdown
- [ ] Configure health check endpoints
- [ ] Set up metrics dashboards (Grafana)

---

## References

- [ExtractionJobQueue.ts](../src/lib/services/ExtractionJobQueue.ts)
- [ExtractionWorker.ts](../src/lib/services/ExtractionWorker.ts)
- [ExtractionMonitor.ts](../src/lib/services/ExtractionMonitor.ts)
- [Migration 0209](../migrations/0209_extraction_infrastructure.sql)
