# Fix: Missing metadata Column in stock_location Table

## Problem Summary

The `/api/inventory/locations` endpoint was returning 500 errors with the message:
```
column "metadata" does not exist
```

## Root Cause

The `LocationService` (src/lib/services/LocationService.ts) queries for a `metadata` JSONB column in the `core.stock_location` table, but this column doesn't exist in the database.

The migration file `0033_create_stock_locations.sql` defines this column, but uses `CREATE TABLE IF NOT EXISTS`, which doesn't modify existing tables. Since the table already exists (other columns work fine), the metadata column was never added.

## Solution

Created migration `0034_add_metadata_to_stock_location.sql` which uses `ALTER TABLE` to add the missing column to the existing table.

## How to Apply the Fix

### Option 1: Using the API Endpoint (Easiest)

1. Start your development server:
   ```bash
   npm run dev:raw
   ```

2. In another terminal, run:
   ```bash
   curl -X POST http://localhost:3000/api/admin/add-metadata-column
   ```

3. You should see a response like:
   ```json
   {
     "success": true,
     "message": "metadata column added successfully",
     "column": {
       "column_name": "metadata",
       "data_type": "jsonb"
     }
   }
   ```

4. **Delete the temporary API endpoint after running:**
   ```bash
   rm -rf src/app/api/admin/add-metadata-column
   ```

### Option 2: Using the TypeScript Migration Script

```bash
DATABASE_URL="postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/mantis_issoh?sslmode=require&channel_binding=require" npx tsx scripts/apply-migration-0034.ts
```

### Option 3: Manual SQL Execution

Run the SQL from `database/migrations/0034_add_metadata_to_stock_location.sql` directly in your database client or using psql.

## Verification

After running the migration:

1. Start your dev server (if not already running):
   ```bash
   npm run dev:raw
   ```

2. Navigate to: http://localhost:3000/inventory/locations

3. The page should load without errors and display the locations table.

## What Changed

- **Added Column**: `metadata` JSONB with default value `'{}'::jsonb`
- **Table**: `core.stock_location`
- **Impact**: Non-breaking change (adds missing column that code already expects)

## Files Modified

- `database/migrations/0034_add_metadata_to_stock_location.sql` - SQL migration
- `scripts/apply-migration-0034.ts` - TypeScript migration runner
- `scripts/quick-add-metadata.ts` - Alternative approach
- `add-metadata-column.js` - Simple Node.js version
- `src/app/api/admin/add-metadata-column/route.ts` - Temporary API endpoint

## Related Code

The metadata column is used in LocationService.ts at lines:
- 158: INSERT INTO with metadata
- 182, 203, 281, 392, 435: SELECT queries including metadata
- 260: UPDATE with metadata

## Next Steps

1. Apply the migration using one of the methods above
2. Test the locations page
3. Delete the temporary API endpoint file
4. Commit any cleanup if needed

---

**Branch**: `claude/fix-missing-metadata-column-011CV38qCuhZzqMEk9NjJ81r`
**Commit**: 831679f
