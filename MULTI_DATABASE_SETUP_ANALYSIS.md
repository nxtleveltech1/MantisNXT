# Multi-Database Setup Analysis & Fix

## Problem Identified

**UI Shows**: 5 test suppliers (Active Music Distribution, Decksaver AV Distribution, Pro Audio Imports, Test Enhanced Supplier Corp, Test Simple Supplier)

**Database Has**: 9 real suppliers in `mantis_issoh` database:
- Pro Audio Platinum (1,595 products)
- Active Music Distribution (325 products)
- Alpha Technologies
- Viva Afrika
- BCE Brands
- Audiolite
- Tuerk Music Technologies
- Acme Suppliers
- Plus 1 duplicate Active Music Distribution

**Root Cause**: Application is connecting to `neondb` database instead of `mantis_issoh` database.

## Database Connection Flow

### Current Connection Path

```
API Route (suppliers/route.ts)
  └─> unified-connection.ts
      └─> EnterpriseConnectionManager
          └─> Reads: ENTERPRISE_DATABASE_URL or DATABASE_URL
              └─> Connects to: neondb (WRONG!)
```

### Expected Connection Path

```
API Route (suppliers/route.ts)
  └─> unified-connection.ts
      └─> EnterpriseConnectionManager
          └─> Reads: ENTERPRISE_DATABASE_URL
              └─> Connects to: mantis_issoh (CORRECT!)
```

## Multi-Database Architecture

### Three Separate Databases

1. **`mantis_issoh`** - IS-SOH Database
   - **Purpose**: Core operational inventory data
   - **Connection**: `ENTERPRISE_DATABASE_URL`
   - **Contains**: Suppliers, products, stock on hand (1,921 products, 9 suppliers)
   - **Used By**: All supplier/product/inventory queries

2. **`mantis_spp`** - SPP Database
   - **Purpose**: Staging area for pricelist uploads
   - **Connection**: `NEON_SPP_DATABASE_URL`
   - **Contains**: Pricelist uploads, raw pricelist rows (45 uploads, 10,494 rows)
   - **Used By**: Pricelist upload/processing operations

3. **`neondb`** - Default Database
   - **Purpose**: General application data
   - **Connection**: `DATABASE_URL` (fallback)
   - **Contains**: Test/demo data (5 suppliers, 319 products)
   - **Used By**: Should NOT be used for supplier/product queries

## How My Changes Respect Multi-Database Setup

### ✅ 1. Separate Connection Managers

**File**: `lib/database/enterprise-connection-manager.ts`
- **Purpose**: Manages IS-SOH database connections
- **Uses**: `ENTERPRISE_DATABASE_URL`
- **Respects Architecture**: ✅ Dedicated connection for IS-SOH

**File**: `lib/database/spp-connection-manager.ts` (NEW)
- **Purpose**: Manages SPP database connections
- **Uses**: `NEON_SPP_DATABASE_URL`
- **Respects Architecture**: ✅ Dedicated connection for SPP

### ✅ 2. Explicit Database Selection

**File**: `lib/database/enterprise-connection-manager.ts`
- **Added**: `sppDbManager` and `sppQuery` helpers
- **Purpose**: Explicit SPP database operations
- **Respects Architecture**: ✅ Code explicitly chooses which database to use

**File**: `src/app/api/suppliers/pricelists/upload/live-route.ts`
- **Uses**: `sppQuery()` for staging tables
- **Uses**: `query()` (IS-SOH) for core inventory
- **Respects Architecture**: ✅ 
  - Staging data → SPP database
  - Canonical data → IS-SOH database

### ✅ 3. Schema Separation

**All Supplier/Product Queries**:
- Target `core.supplier`, `core.supplier_product`, `core.stock_on_hand`
- Use `ENTERPRISE_DATABASE_URL` (should point to `mantis_issoh`)
- **Respects Architecture**: ✅ All canonical data in IS-SOH

**All Pricelist Staging**:
- Target `spp.pricelist_upload`, `spp.pricelist_row`
- Use `NEON_SPP_DATABASE_URL` (points to `mantis_spp`)
- **Respects Architecture**: ✅ All staging data in SPP

### ✅ 4. FDW Support Maintained

**File**: `database/scripts/setup_fdw_*.sql`
- **Purpose**: Foreign Data Wrappers for cross-database queries
- **Status**: Not modified by my changes
- **Respects Architecture**: ✅ FDW bridging still works

## The Issue: Connection String Configuration

### Problem

The `ENTERPRISE_DATABASE_URL` environment variable likely:
1. Doesn't include the database name (`/mantis_issoh`)
2. Defaults to `neondb` database
3. Points to the wrong database

### Current State

```bash
# Likely current value (WRONG):
ENTERPRISE_DATABASE_URL=postgresql://neondb_owner:password@ep-xxx.neon.tech/neondb?sslmode=require

# Should be (CORRECT):
ENTERPRISE_DATABASE_URL=postgresql://neondb_owner:password@ep-xxx.neon.tech/mantis_issoh?sslmode=require
```

### Verification

Check your `.env.local` or environment variables:
```bash
echo $ENTERPRISE_DATABASE_URL
```

The connection string should end with `/mantis_issoh` not `/neondb`.

## Solution

### Step 1: Update Connection String

Update `ENTERPRISE_DATABASE_URL` to include database name:

```bash
# From:
postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/neondb?sslmode=require&channel_binding=require

# To:
postgresql://neondb_owner:npg_84ELeCFbOcGA@ep-steep-waterfall-a96wibpm-pooler.gwc.azure.neon.tech/mantis_issoh?sslmode=require&channel_binding=require
```

### Step 2: Verify Connection

After updating, verify the connection:
```typescript
// In your code or via API
const result = await query('SELECT current_database()');
console.log('Connected to:', result.rows[0].current_database);
// Should output: mantis_issoh
```

### Step 3: Restart Application

Restart your Next.js dev server to pick up the new connection string.

## Summary: Do My Changes Respect Multi-Database Setup?

### ✅ YES - Architecture Changes Are Correct

1. **Separate Connection Managers**: ✅ SPP and IS-SOH have dedicated managers
2. **Explicit Database Selection**: ✅ Code explicitly chooses which database
3. **Schema Separation**: ✅ `spp.*` for staging, `core.*` for canonical
4. **FDW Support**: ✅ Not broken, still works
5. **Connection String Parsing**: ✅ Correctly reads from environment variables

### ❌ NO - Configuration Issue

1. **Connection String**: ❌ Points to wrong database (`neondb` instead of `mantis_issoh`)
2. **Environment Variable**: ❌ Missing database name in connection string
3. **Default Behavior**: ❌ Falls back to `neondb` when database name missing

## Conclusion

**My changes DO respect the multi-database setup**, but the **connection string configuration is wrong**. The application needs `ENTERPRISE_DATABASE_URL` to point to `mantis_issoh` database, not `neondb`.

The architecture is correct, but the configuration needs to be fixed.

