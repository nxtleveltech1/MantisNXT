# Database Migration Status & Requirements

## ✅ Migration File Exists

The migration file `0226_supplier_json_feed.sql` exists and includes:

### Schema Changes Required:

1. **Supplier Table Columns** (added to `core.supplier`):
   - `json_feed_url` (TEXT)
   - `json_feed_enabled` (BOOLEAN, default: false)
   - `json_feed_interval_minutes` (INTEGER, default: 60)
   - `json_feed_last_sync` (TIMESTAMPTZ)
   - `json_feed_last_status` (JSONB)
   - `json_feed_type` (VARCHAR(50), default: 'woocommerce')
   - `base_discount_percent` (DECIMAL(5,2), default: 0)

2. **New Table Created** (`core.supplier_json_feed_log`):
   - `log_id` (UUID, primary key)
   - `supplier_id` (UUID, foreign key)
   - `sync_started_at` (TIMESTAMPTZ)
   - `sync_completed_at` (TIMESTAMPTZ)
   - `status` (VARCHAR(20): 'in_progress', 'success', 'error')
   - `products_fetched`, `products_updated`, `products_created`, `products_failed` (INTEGER)
   - `error_message` (TEXT)
   - `details` (JSONB)
   - `created_at` (TIMESTAMPTZ)

## ⚠️ Migration Status: UNKNOWN

**The migration may not have been run yet.** You need to verify and run it.

## 🔧 How to Run the Migration

### Option 1: Run All Pending Migrations
```bash
bun run db:migrate
```

### Option 2: Run Specific Migration
```bash
bun run db:migrate -- 0226_supplier_json_feed.sql
```

### Option 3: Verify Migration Status
```bash
bun run db:migrate:verify
```

## 🔍 How to Check if Migration Was Applied

The migration runner tracks applied migrations in the `schema_migrations` table. You can check:

```sql
SELECT migration_name, executed_at 
FROM schema_migrations 
WHERE migration_name = '0226_supplier_json_feed';
```

Or check if the columns exist:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'core' 
  AND table_name = 'supplier' 
  AND column_name LIKE 'json_feed%';
```

## 🐛 Related Issue: Sales Channels API Error

The error `GET /api/v1/sales-channels?channel_type=whatsapp 500` suggests the `core.sales_channel` table might also be missing. Check if migration `0214_sales_orders.sql` has been applied, which should create this table.

## 📋 Action Items

1. **Run the migration:**
   ```bash
   bun run db:migrate
   ```

2. **Verify the sync functionality works:**
   - Check that `core.supplier_json_feed_log` table exists
   - Check that supplier table has the new columns
   - Try running a sync from the UI

3. **Fix the sales-channels error:**
   - Check if `core.sales_channel` table exists
   - Run migration `0214_sales_orders.sql` if needed

## 🔗 Migration File Location

- **File:** `migrations/0226_supplier_json_feed.sql`
- **Runner:** `scripts/run-migration.ts`
- **Command:** `bun run db:migrate`

