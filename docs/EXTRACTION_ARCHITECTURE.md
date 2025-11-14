# Extraction Pipeline - Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT REQUEST                               │
│                    POST /api/extraction/jobs                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  File Upload    │
                    │  Validation     │
                    └────────┬────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EXTRACTION JOB QUEUE                              │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Priority Queue (higher priority = processed first)         │    │
│  │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐             │    │
│  │  │ P:10│  │ P:5 │  │ P:5 │  │ P:0 │  │ P:0 │   ...        │    │
│  │  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘             │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Concurrency Control: Max 3 workers                                 │
│  Backpressure: Emit event when at capacity                          │
└──────────┬───────────────────────────────────────────────────┬──────┘
           │                                                    │
           │                                              ┌─────▼──────┐
           │                                              │  Monitor   │
           │                                              │  Events    │
           │                                              └────────────┘
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EXTRACTION WORKER POOL                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Worker #1   │  │  Worker #2   │  │  Worker #3   │              │
│  │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │              │
│  │  │ Job A  │  │  │  │ Job B  │  │  │  │ Job C  │  │              │
│  │  └────────┘  │  │  └────────┘  │  │  └────────┘  │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                  │                  │                      │
│         └──────────────────┴──────────────────┘                      │
│                            │                                         │
│                 ┌──────────▼──────────┐                              │
│                 │  Chunked Processing │                              │
│                 │  (100 rows/chunk)   │                              │
│                 └──────────┬──────────┘                              │
│                            │                                         │
│                 ┌──────────▼──────────┐                              │
│                 │ Progress Events     │                              │
│                 │ (every 100 rows)    │                              │
│                 └─────────────────────┘                              │
└──────────┬──────────────────────────────────────────────────────────┘
           │
           ▼
      ┌─────────┐
      │ Success?│
      └────┬────┘
           │
     ┌─────┴─────┐
     │           │
    YES         NO
     │           │
     │           ▼
     │    ┌──────────────┐
     │    │ Retry Logic  │
     │    │ (Exponential │
     │    │  Backoff)    │
     │    └──────┬───────┘
     │           │
     │      ┌────┴────┐
     │      │         │
     │     YES       NO (Max Retries)
     │      │         │
     │      │         ▼
     │      │    ┌─────────────────┐
     │      │    │ Dead Letter     │
     │      │    │ Queue (DLQ)     │
     │      │    │                 │
     │      │    │ - Error Details │
     │      │    │ - Retry Count   │
     │      │    │ - Reprocess     │
     │      │    └─────────────────┘
     │      │
     │      └─────┐
     │            │
     ▼            ▼
┌──────────────────────────────────────────────────────────────────┐
│                         RESULT STORAGE                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    CACHE LAYER                              │  │
│  │  ┌─────────────────────┐  ┌──────────────────────┐         │  │
│  │  │  Memory Cache       │  │  Database Cache      │         │  │
│  │  │  (5 min TTL)        │  │  (24 hour TTL)       │         │  │
│  │  │  <10ms access       │  │  Persistent          │         │  │
│  │  └─────────────────────┘  └──────────────────────┘         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                 DATABASE TABLES                             │  │
│  │  ┌─────────────────┐  ┌─────────────────┐                  │  │
│  │  │ extraction_jobs │  │ extraction_     │                  │  │
│  │  │ - status        │  │ results         │                  │  │
│  │  │ - progress      │  │ - products      │                  │  │
│  │  │ - result_ref    │  │ - summary       │                  │  │
│  │  └─────────────────┘  └─────────────────┘                  │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                       METRICS & MONITORING                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  extraction_metrics Table                                   │  │
│  │  - duration_ms                                              │  │
│  │  - rows_processed                                           │  │
│  │  - status (completed/failed/cancelled)                      │  │
│  │  - error_code                                               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  ExtractionMonitor (Health Checks every 30s)               │  │
│  │  - Queue size (threshold: 50)                              │  │
│  │  - DLQ size (threshold: 10)                                │  │
│  │  - Success rate (threshold: 90%)                           │  │
│  │  - Avg duration (threshold: 60s)                           │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Health Status: healthy | degraded | unhealthy                   │
└──────────────────────────┬────────────────────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Alerts &    │
                    │  Dashboards  │
                    └──────────────┘
```

---

## Data Flow Detail

### 1. Job Enqueue

```
Client Request
    ↓
Validation
    ↓
Create Job Record (status: queued)
    ↓
Insert into Priority Queue
    ↓
Emit 'job:queued' event
    ↓
Return { job_id, position, estimated_wait_ms }
```

---

### 2. Job Processing

```
Queue.processNext()
    ↓
Check Concurrency (active < max?)
    ↓
Dequeue Job
    ↓
Update Job Status (status: processing)
    ↓
Create Worker Instance
    ↓
Wire Event Listeners
    │
    ├─ progress → Update Progress State → Emit Event
    ├─ status   → Update Status Message → Emit Event
    └─ warning  → Log Warning → Emit Event
    ↓
Execute Worker.execute(job)
    ↓
┌────────────────────────────────┐
│  Worker Execution Pipeline     │
│  ┌──────────────────────────┐  │
│  │ 1. Check Cache           │  │
│  │    Cache Hit? → Return   │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ 2. Load File Metadata    │  │
│  │    (from file_uploads)   │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ 3. Validate File Size    │  │
│  │    Max: 100MB            │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ 4. Parse File            │  │
│  │    CSV:  Stream          │  │
│  │    Excel: Chunked        │  │
│  │    JSON:  Buffer         │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ 5. Extract Products      │  │
│  │    Process 100 rows/chunk│  │
│  │    Emit progress every   │  │
│  │    100 rows              │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ 6. Validate Products     │  │
│  │    Check duplicates      │  │
│  │    Query existing SKUs   │  │
│  │    (batch: 500)          │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ 7. Calculate Stats       │  │
│  │    Total, valid, invalid │  │
│  │    New, existing, dupes  │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ 8. Cache Result          │  │
│  │    Memory + Database     │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ 9. Update Job Record     │  │
│  │    status: completed     │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
    ↓
Success?
    │
    ├─ YES
    │   ↓
    │   Mark Completed
    │   ↓
    │   Record Metrics
    │   ↓
    │   Emit 'job:completed'
    │
    └─ NO
        ↓
        Should Retry?
        │
        ├─ YES (retry_count < max_attempts)
        │   ↓
        │   Calculate Backoff Delay
        │   (exponential + jitter)
        │   ↓
        │   Emit 'job:retry'
        │   ↓
        │   Re-enqueue after delay
        │
        └─ NO (max retries exceeded)
            ↓
            Move to DLQ
            ↓
            Mark Failed
            ↓
            Record Metrics
            ↓
            Emit 'job:failed' + 'job:dlq'
```

---

### 3. Progress Tracking

```
Worker Processing
    ↓
Every 100 Rows:
    ↓
Calculate Progress:
    percent_complete = (rows_processed / rows_total) * 100
    elapsed_ms = now() - started_at
    estimated_remaining_ms = (elapsed_ms / percent) * (100 - percent)
    ↓
Update Job State:
    {
      status: 'processing',
      progress: {
        percent_complete,
        current_step,
        rows_processed,
        rows_total,
        elapsed_ms,
        estimated_remaining_ms
      }
    }
    ↓
Emit Event:
    queue.emit('job:progress', job_id, progress)
    ↓
Client polls:
    GET /api/extraction/jobs/:job_id
    ↓
Return Current State
```

---

### 4. Retry Logic

```
Job Failed
    ↓
Check Error Type:
    FILE_NOT_FOUND?      → No Retry → DLQ
    INVALID_CONFIG?      → No Retry → DLQ
    VALIDATION_ERROR?    → No Retry → DLQ
    CANCELLED?           → No Retry → Done
    Other?               → Retry
    ↓
Check Retry Count:
    retry_count >= max_attempts? → DLQ
    ↓
Increment Retry Count
    ↓
Calculate Backoff:
    delay = min(
      base_delay * 2^(attempt-1),
      max_delay
    ) + jitter

    Example:
    Attempt 1: 1s + jitter
    Attempt 2: 2s + jitter
    Attempt 3: 4s + jitter
    ↓
Emit 'job:retry' Event
    ↓
setTimeout(() => {
  Re-insert into Queue
  Trigger processNext()
}, delay)
```

---

### 5. Dead Letter Queue

```
Job Failed (Max Retries)
    ↓
Insert into DLQ Table:
    {
      job_id,
      upload_id,
      config,
      org_id,
      retry_count,
      error_code,
      error_message,
      error_details,
      created_at
    }
    ↓
Update In-Memory DLQ:
    deadLetterQueue.push(job)
    ↓
Emit 'job:dlq' Event
    ↓
Monitor Checks:
    DLQ Size > 10?
        ↓
    Emit 'dlq:alert'
        ↓
    Send Notifications
        (Slack, Email, PagerDuty)
    ↓
Manual Intervention:
    Review DLQ entry
    Fix root cause
    Call reprocess_dlq_job()
        ↓
    Create new job (priority: 10)
    Mark DLQ entry as reprocessed
```

---

### 6. Monitoring & Health

```
ExtractionMonitor.start()
    ↓
Every 30 seconds:
    ↓
Get Queue Metrics:
    { queued, active, dlq, utilization }
    ↓
Get Performance Metrics:
    { jobs_last_hour, success_rate, avg_duration, throughput }
    ↓
Get Error Metrics:
    { total_errors_24h, top_errors }
    ↓
Get DLQ Metrics:
    { size, oldest_entry_age, entries_needing_attention }
    ↓
Check Thresholds:
    ├─ Queue > 50?           → queue_ok = false
    ├─ DLQ > 10?             → dlq_ok = false
    ├─ Success Rate < 90%?   → performance_ok = false
    └─ Avg Duration > 60s?   → performance_ok = false
    ↓
Determine Health Status:
    All OK?              → healthy
    1-2 Issues?          → degraded
    3+ Issues?           → unhealthy
    ↓
Status Changed?
    ↓
Emit Events:
    'health:status_change'
    'health:warning' (if degraded)
    'health:critical' (if unhealthy)
    ↓
Dashboard Updates:
    GET /api/extraction/monitor?view=dashboard
```

---

## Concurrency Control

```
┌─────────────────────────────────────────────────────────────┐
│  Queue State                                                 │
│                                                              │
│  Max Concurrency: 3                                         │
│                                                              │
│  Active Workers:                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ Worker 1 │  │ Worker 2 │  │ Worker 3 │                  │
│  │ Job A    │  │ Job B    │  │ Job C    │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                              │
│  Queued Jobs:                                               │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐                        │
│  │ P:5 │  │ P:5 │  │ P:0 │  │ P:0 │  ...                   │
│  └─────┘  └─────┘  └─────┘  └─────┘                        │
│                                                              │
│  processNext() called:                                      │
│    if (active.size >= max) {                                │
│      emit('queue:backpressure');                            │
│      return; // Wait for capacity                           │
│    }                                                         │
│                                                              │
│  Worker completes:                                          │
│    activeJobs.delete(job_id);                               │
│    setImmediate(() => processNext());                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Memory Management

```
Large File Processing (10,000 rows)
    ↓
Stream-based CSV parsing:
    Read file in chunks
    Parse incrementally
    Process 100 rows at a time
    ↓
Chunked processing:
    for (i = 0; i < total; i += 100) {
      chunk = data.slice(i, i + 100)
      process(chunk)

      // Yield to event loop every 500 rows
      if (i % 500 === 0) {
        await setImmediate()
      }
    }
    ↓
Batch database queries:
    Query 500 SKUs at a time
    Build Map for O(1) lookups
    ↓
Result:
    Memory stays < 200MB
    No blocking
    Progress events
```

---

## Cache Architecture

```
Request: Get Extraction Result
    ↓
┌────────────────────────────┐
│  Layer 1: Memory Cache     │
│  TTL: 5 minutes            │
│  Access: <10ms             │
└─────────┬──────────────────┘
          │
     Cache Hit? ──YES──> Return Result
          │
         NO
          ↓
┌────────────────────────────┐
│  Layer 2: Database Cache   │
│  TTL: 24 hours             │
│  Access: ~50ms             │
└─────────┬──────────────────┘
          │
     Cache Hit? ──YES──> Store in Memory → Return Result
          │
         NO
          ↓
     Cache Miss
          ↓
     Execute Extraction
          ↓
     Store in Both Layers
          ↓
     Return Result
```

---

## Event Flow

```
Queue Events:
    job:queued        → Log position and wait time
    job:progress      → Update UI progress bar
    job:status        → Show current step
    job:completed     → Notify user, show results
    job:failed        → Log error, alert if critical
    job:retry         → Log retry attempt
    job:cancelled     → Clean up resources
    job:dlq           → Alert operations team
    queue:backpressure → Warn about capacity
    queue:shutdown    → Log final stats

Monitor Events:
    health:status_change → Update dashboard
    health:critical      → Send PagerDuty alert
    health:warning       → Send Slack notification
    alert:backpressure   → Log capacity issue
    alert:dlq            → Email operations team
    alert:job_failed     → Log to error tracking
    alert:job_retry      → Debug logging
```

---

This architecture ensures:
- ✅ No blocking operations
- ✅ Controlled concurrency
- ✅ Memory efficiency
- ✅ Real-time progress
- ✅ Robust error handling
- ✅ Production monitoring
