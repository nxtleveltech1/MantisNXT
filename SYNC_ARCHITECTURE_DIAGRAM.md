# Customer Sync Queue Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    WooCommerce API                                   │
│  (Provides customer data, orders, profile information)               │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
                       │ OAuth 1.0a
                       │
┌──────────────────────▼──────────────────────────────────────────────┐
│         Next.js API Endpoint: /api/v1/integrations/woocommerce/sync  │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  POST /sync/customers                                       │   │
│  │  ├── Action: start  (create queue, fetch customers)        │   │
│  │  ├── Action: status (query queue progress)                 │   │
│  │  ├── Action: retry  (reset failed items, reprocess)        │   │
│  │  └── Action: force-done (cancel remaining items)           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                       │                                              │
│                       ▼                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │         CustomerSyncService (High-level)                    │   │
│  │  ├── startSync()           - Create queue, fetch customers  │   │
│  │  ├── processQueue()        - Process batches with retry     │   │
│  │  ├── getStatus()           - Query progress                 │   │
│  │  ├── retryFailed()         - Retry < 3 attempts            │   │
│  │  ├── forceDone()           - Cancel remaining              │   │
│  │  └── getActivityLog()      - Audit trail                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                       │                                              │
│                       ▼                                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │       WooCommerceSyncQueue (Low-level)                      │   │
│  │  ├── createQueue()         - Create new queue              │   │
│  │  ├── addToQueue()          - Add customer (idempotent)     │   │
│  │  ├── getNextBatch()        - Get draft lines               │   │
│  │  ├── markLines*()          - State transitions             │   │
│  │  ├── logActivity()         - Audit trail                   │   │
│  │  └── forceDone()           - Cancel remaining              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────┬──────────────────────────────────────────────┘
                      │
                      │ SQL Queries
                      │
┌─────────────────────▼──────────────────────────────────────────────┐
│                PostgreSQL Database                                   │
│                                                                      │
│  ┌───────────────────────────┐  ┌──────────────────────────┐       │
│  │ woo_customer_sync_queue   │  │ woo_customer_sync_queue  │       │
│  ├───────────────────────────┤  │      _line               │       │
│  │ id (UUID, PK)             │  ├──────────────────────────┤       │
│  │ org_id (FK)               │  │ id (UUID, PK)            │       │
│  │ queue_name                │  │ queue_id (FK)            │       │
│  │ state (draft/processing)  │  │ woo_customer_id          │       │
│  │ total_count               │  │ customer_data (JSONB)    │       │
│  │ draft_count               │  │ state (draft/done/...)   │       │
│  │ done_count                │  │ process_count            │       │
│  │ failed_count              │  │ error_message            │       │
│  │ process_count             │  │ result_customer_id (FK)  │       │
│  │ is_action_required        │  │ was_update               │       │
│  │ batch_size                │  │ idempotency_token (UQ)   │       │
│  │ batch_delay_ms            │  │ created_at / updated_at  │       │
│  │ idempotency_key (UQ)      │  └──────────────────────────┘       │
│  │ created_at / updated_at   │                                      │
│  └───────────────────────────┘  ┌──────────────────────────┐       │
│          │                       │  woo_sync_activity       │       │
│          │ (Computed trigger)    ├──────────────────────────┤       │
│          └──────────────────┐    │ id (UUID, PK)            │       │
│                             │    │ queue_id (FK)            │       │
│                             ▼    │ queue_line_id (FK)       │       │
│                        State     │ activity_type            │       │
│                       Machine    │ status                   │       │
│                                  │ message                  │       │
│                                  │ details (JSONB)          │       │
│                                  │ created_at               │       │
│                                  └──────────────────────────┘       │
└──────────────────────────────────────────────────────────────────────┘
                      │
                      │ SQL Writes
                      │
┌─────────────────────▼──────────────────────────────────────────────┐
│                  Customer Table                                      │
│  ├── id (UUID, PK)                                                  │
│  ├── org_id (FK)                                                    │
│  ├── name, email, phone, company                                    │
│  ├── segment, status, lifetime_value                                │
│  ├── acquisition_date, last_interaction_date                        │
│  ├── address (JSONB)                                                │
│  ├── metadata (JSONB) - includes woocommerce_id reference           │
│  ├── tags []                                                        │
│  └── created_at / updated_at                                        │
└──────────────────────────────────────────────────────────────────────┘
```

## Queue State Machine

```
        ┌─────────────┐
        │   DRAFT     │
        │             │
        │ (customers  │
        │  queued)    │
        └──────┬──────┘
               │
           (process)
               │
               ▼
        ┌─────────────┐
        │ PROCESSING  │
        │             │
        │ (batch in   │
        │  progress)  │
        └──────┬──────┘
               │
        ┌──────┴───────────────────────────────┐
        │                                       │
    (success)                            (failure)
        │                                       │
        ▼                                       ▼
   ┌──────────┐                         ┌──────────────┐
   │   DONE   │    ┌─────────────┐     │    FAILED    │
   │          │    │            │     │              │
   │ (item    │    │  PARTIAL   │     │ (item       │
   │  synced) │    │            │     │  failed,    │
   └──────────┘    │ (some done,│     │  < 3 retry) │
                   │  some fail)│     │              │
                   └─────────────┘     └──────┬───────┘
                         │                    │
                         │              (retry)
                         │                    │
                         │              (reset
                         │               to draft)
                         │                    │
                         └────────┬───────────┘
                                  │
                         ┌─────────▼────────────────┐
                         │                          │
                    (all done or     (max retry
                     > 3 retries)     exceeded)
                         │                 │
                         ▼                 ▼
                      ┌──────┐      ┌──────────────┐
                      │ DONE │      │ ACTION REQ.  │
                      └──────┘      │              │
                                    │ (manual      │
                                    │  intervention│
                                    │  needed)     │
                                    └──────────────┘
```

## Batch Processing Flow

```
┌────────────────────────────────────────────────────────────────┐
│  Customer Sync Start                                            │
│  - WooCommerce has 797 customers                               │
└────────────┬─────────────────────────────────────────────────┘
             │
             ▼
    ┌─────────────────┐
    │ Create Queue    │  (1) Create woo_customer_sync_queue
    └────────┬────────┘      - state: draft
             │               - total_count: 0
             │
             ▼
    ┌──────────────────────┐
    │ Fetch Customers      │  (2) Fetch from WooCommerce API
    │ from WooCommerce     │      per_page: 100, paginated
    └────────┬─────────────┘
             │
             ▼
    ┌──────────────────────┐
    │ Add to Queue         │  (3) INSERT into queue_line
    │ (idempotent)         │      - Dedup by woo_customer_id
    └────────┬─────────────┘      - total_count: 797
             │
             ▼
    ┌──────────────────────────────────────────────────────────┐
    │ Process Queue (Batch Loop)                               │
    └────────┬─────────────────────────────────────────────────┘
             │
             ├─── Batch 1 ───────────────────────┐
             │                                    │
             │  ┌──────────────────────────────┐ │
             │  │ Get 50 draft lines           │ │
             │  └──────┬───────────────────────┘ │
             │         ▼                         │
             │  ┌──────────────────────────────┐ │
             │  │ Mark as processing (atomic)  │ │
             │  └──────┬───────────────────────┘ │
             │         ▼                         │
             │  ┌──────────────────────────────┐ │
             │  │ Process each customer        │ │
             │  │ (with retry backoff)         │ │
             │  │                              │ │
             │  │ For each customer:           │ │
             │  │  - Fetch WooCommerce data   │ │
             │  │  - Fetch customer's orders  │ │
             │  │  - Map to MantisNXT schema  │ │
             │  │  - Check if exists (email)  │ │
             │  │  - Insert or Update         │ │
             │  │  - Mark done or failed      │ │
             │  └──────┬───────────────────────┘ │
             │         ▼                         │
             │  ┌──────────────────────────────┐ │
             │  │ Wait 2000ms (batch delay)    │ │
             │  └──────────────────────────────┘ │
             │                                    │
             └────────────┬─────────────────────┘
                          │
             ├─── Batch 2 ───────────────────────┐
             │  (Same process for items 51-100)  │
             └────────────┬─────────────────────┘
                          │
             ├─── Batch 3 ───────────────────────┐
             │  (Same process for items 101-150) │
             └────────────┬─────────────────────┘
                          │
                         ...
                          │
             ├─── Batch 16 ──────────────────────┐
             │  (Items 751-797, only 47 items)  │
             │  (No delay after last batch)      │
             └────────────┬─────────────────────┘
                          │
                          ▼
             ┌──────────────────────────────────┐
             │ Check if action required         │
             │ (if process_count > 3)           │
             └──────┬───────────────────────────┘
                    │
                    ▼
          ┌──────────────────────────────────┐
          │ Return sync status               │
          │ - Total: 797                     │
          │ - Done: 780                      │
          │ - Failed: 17                     │
          │ - Progress: 100%                 │
          └──────────────────────────────────┘
```

## Data Flow: Single Customer

```
WooCommerce Customer
      │
      │ (GET /customers/{id})
      │
      ▼
┌─────────────────────────┐
│ WooCustomer Object      │
│ {                       │
│   id: 123,              │
│   email: user@ex.com,   │
│   first_name: John,     │
│   billing: {...},       │
│   shipping: {...},      │
│   meta_data: [...]      │
│ }                       │
└────────┬────────────────┘
         │
         │ (GET /orders?customer=123)
         │
         ▼
┌─────────────────────────┐
│ Customer Orders Array   │
│ [                       │
│   { id: 1, total: 100 },│
│   { id: 2, total: 50 }, │
│   ...                   │
│ ]                       │
└────────┬────────────────┘
         │
         │ (mapWooCustomerToMantis)
         │
         ▼
┌──────────────────────────────────────────────┐
│ MantisNXT Customer Object                    │
│ {                                            │
│   name: "John Smith",                        │
│   email: "user@ex.com",                      │
│   phone: "555-1234",                         │
│   company: "ACME Inc",                       │
│   segment: "mid_market",  ◄─── based on LTV │
│   status: "active",       ◄─── based on orders
│   lifetime_value: 1500,                      │
│   acquisition_date: "2020-01-15",            │
│   last_interaction_date: "2025-11-05",       │
│   address: {...},                            │
│   metadata: {                                │
│     woocommerce_id: 123,                     │
│     total_orders: 3,                         │
│     completed_orders: 2,                     │
│     ...                                      │
│   },                                         │
│   tags: ["woocommerce", "mid-value", ...]   │
│ }                                            │
└────────┬─────────────────────────────────────┘
         │
         │ (Check if exists by email)
         │
    ┌────┴─────────────────┐
    │                      │
  EXISTS              NOT EXISTS
    │                      │
    ▼                      ▼
┌──────────────────┐  ┌──────────────────┐
│ UPDATE customer  │  │ INSERT customer  │
│ WHERE email=...  │  │ INTO customer... │
│                  │  │ RETURNING id     │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         ▼                     ▼
  Mark line as:         Mark line as:
  done (UPDATE)         done (INSERT)
  was_update: true      was_update: false
         │                     │
         └──────────┬──────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Log activity entry   │
         │ activity: sync_ok    │
         │ status: success      │
         └──────────────────────┘
```

## Error Handling Flow

```
Processing Customer
      │
      ▼
Try sync_single_customer()
      │
      ├─── Success ────────► Mark done, log success
      │
      └─── Error
           │
           ├─ Retry 1 (attempt 2)
           │  └─ Wait 1000ms exponential backoff
           │      │
           │      ├─── Success ────────► Mark done, log success
           │      │
           │      └─── Error
           │           │
           │           ├─ Retry 2 (attempt 3)
           │           │  └─ Wait 2000ms exponential backoff
           │           │      │
           │           │      ├─ Success ───► Mark done, log success
           │           │      │
           │           │      └─ Error
           │           │           │
           │           │           └─ Max retries exceeded
           │           │               │
           │           │               ▼
           │           │          Mark line as:
           │           │          - state: failed
           │           │          - error_message: "..."
           │           │          - error_count: 3
           │           │          - process_count: 3
           │           │               │
           │           │               ▼
           │           │          Log error activity
           │           │          activity: sync_error
           │           │          status: failed
           │           │               │
           │           │               ▼
           │           │          Check queue action required:
           │           │          if queue.process_count > 3
           │           │            → is_action_required = true
           │           │
           └───────────┘

Human intervention needed:
- Review error_message
- Fix underlying issue
- Retry with action: "retry"
- Or force-done to skip
```

## Performance Metrics

```
┌─────────────────────────────────────────┐
│ 797 Customers Sync Performance          │
├─────────────────────────────────────────┤
│ Batch Size: 50 customers/batch          │
│ Number of batches: 16                   │
│ Batch delay: 2 seconds                  │
│                                         │
│ Processing time per customer: ~2 sec    │
│  - Fetch WooCommerce data: 0.5s         │
│  - Fetch customer orders: 0.8s          │
│  - Map and transform: 0.2s              │
│  - Database insert/update: 0.5s         │
│                                         │
│ Total estimated time:                   │
│  - Base processing: 1594 seconds        │
│  - Batch delays: 30 seconds (15 x 2s)   │
│  - Total: ~1624 seconds (~27 minutes)   │
│                                         │
│ Optimizations possible:                 │
│  - Parallel batch processing: 10-15min  │
│  - Bulk database operations: 15-20min   │
│  - Connection pooling: reduce overhead  │
└─────────────────────────────────────────┘
```

## Security Boundaries

```
┌──────────────────────────────────────────────────────────────┐
│ Organization A (org_id_a)                                    │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Queue A                                                 │ │
│ │ - woo_customer_sync_queue (org_id: org_id_a)           │ │
│ │ - woo_customer_sync_queue_line (org_id: org_id_a)      │ │
│ │ - woo_sync_activity (org_id: org_id_a)                 │ │
│ │                                                          │ │
│ │ ┌──────────────────────────────────────┐               │ │
│ │ │ Can only see/modify:                 │               │ │
│ │ │ - Their own queues (org_id match)    │               │ │
│ │ │ - Their own customers (org_id match) │               │ │
│ │ └──────────────────────────────────────┘               │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Organization B (org_id_b)                                    │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Queue B                                                 │ │
│ │ - woo_customer_sync_queue (org_id: org_id_b)           │ │
│ │ - woo_customer_sync_queue_line (org_id: org_id_b)      │ │
│ │ - woo_sync_activity (org_id: org_id_b)                 │ │
│ │                                                          │ │
│ │ ┌──────────────────────────────────────┐               │ │
│ │ │ ISOLATED from Organization A         │               │ │
│ │ │ Separate data, separate indexes,     │               │ │
│ │ │ separate audit trail                 │               │ │
│ │ └──────────────────────────────────────┘               │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Commit Information

```
Repository: MantisNXT
Branch: main
Commit: fb62c16
Date: 2025-11-05

Files Changed:
  database/migrations/0023_sync_infrastructure.sql  (157 lines)
  src/lib/services/WooCommerceSyncQueue.ts          (442 lines)
  src/lib/services/CustomerSyncService.ts           (508 lines)
  src/app/api/v1/.../woocommerce/sync/customers/   (234 lines)

Total: 1,341 lines of production code
```
