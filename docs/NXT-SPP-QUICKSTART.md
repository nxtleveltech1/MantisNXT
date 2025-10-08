# NXT-SPP Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- Neon PostgreSQL database account
- Access to MantisNXT repository
- Basic understanding of Next.js and TypeScript

## Installation

### Step 1: Environment Configuration

1. Copy the example environment file:
```bash
cp .env.neon.example .env.local
```

2. Update `.env.local` with your Neon credentials:
```env
NEON_DATABASE_URL=postgresql://[user]:[password]@proud-mud-50346856.us-east-2.aws.neon.tech/nxt-spp-supplier-inventory-portfolio?sslmode=require
NEON_DATABASE_USER=your-user
NEON_DATABASE_PASSWORD=your-password
```

### Step 2: Database Setup

Run the migration scripts in order:

```bash
# Connect to Neon database
psql $NEON_DATABASE_URL

# Run migrations
\i database/migrations/neon/001_create_spp_schema.sql
\i database/migrations/neon/002_create_core_schema.sql
\i database/migrations/neon/003_create_serve_schema.sql

# Verify schemas created
\dn

# Expected output:
# spp   - Staging schema
# core  - Canonical schema
# serve - Reporting schema
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Step 5: Verify Installation

Test the database connection:

```bash
curl http://localhost:3000/api/health/database
```

Expected response:
```json
{
  "success": true,
  "connected": true,
  "latency": 45
}
```

## Basic Usage

### 1. Create a Supplier

```bash
curl -X POST http://localhost:3000/api/core/suppliers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Supplies",
    "code": "ACME001",
    "default_currency": "ZAR",
    "payment_terms": "Net 30"
  }'
```

### 2. Upload Price List

```bash
curl -X POST http://localhost:3000/api/spp/upload \
  -F "file=@pricelist.xlsx" \
  -F "supplier_id=<supplier-uuid>" \
  -F "currency=ZAR" \
  -F "auto_validate=true"
```

### 3. View Supplier Products

```bash
curl "http://localhost:3000/api/core/suppliers/products/table?supplier_id=<supplier-uuid>"
```

### 4. Create Inventory Selection

```bash
curl -X POST http://localhost:3000/api/core/selections \
  -H "Content-Type: application/json" \
  -d '{
    "selection_name": "Q1 2025 Selection",
    "created_by": "<user-uuid>",
    "status": "draft"
  }'
```

### 5. Select Products

```bash
curl -X POST http://localhost:3000/api/core/selections/workflow \
  -H "Content-Type: application/json" \
  -d '{
    "selection_id": "<selection-uuid>",
    "supplier_product_ids": ["<uuid1>", "<uuid2>"],
    "action": "select",
    "selected_by": "<user-uuid>"
  }'
```

### 6. View Stock on Hand

```bash
curl "http://localhost:3000/api/serve/soh?supplier_ids=<supplier-uuid>&selected_only=true"
```

## Development Workflow

### Pricelist Upload Flow

1. **Upload**: POST file to `/api/spp/upload`
2. **Validate**: POST to `/api/spp/validate` with `upload_id`
3. **Review**: Check validation results
4. **Merge**: POST to `/api/spp/merge` with `upload_id` if valid
5. **Refresh Views**: Call `SELECT serve.refresh_materialized_views()`

### Selection Workflow

1. **View Products**: GET `/api/core/suppliers/products/table`
2. **Create Selection**: POST `/api/core/selections`
3. **Select Items**: POST `/api/core/selections/workflow` with action "select"
4. **Approve**: POST `/api/core/selections/workflow` with action "approve"
5. **View Catalog**: GET `/api/core/selections/catalog`

### Stock Management

1. **Import Stock**: POST `/api/serve/soh/import` with stock array
2. **View by Supplier**: GET `/api/serve/soh`
3. **View Rolled Up**: GET `/api/serve/soh/rolled-up`
4. **Calculate Value**: GET `/api/serve/soh/value`

## Common Patterns

### TypeScript Usage

```typescript
import { pricelistService } from '@/lib/services/PricelistService';
import { supplierProductService } from '@/lib/services/SupplierProductService';
import { PricelistUploadRequest } from '@/types/nxt-spp';

// Upload and validate
const upload = await pricelistService.createUpload({
  supplier_id: supplierId,
  file: fileBuffer,
  filename: 'pricelist.xlsx',
  currency: 'ZAR',
  options: { auto_validate: true }
});

// Get product table
const products = await supplierProductService.getProductTable(supplierId);
```

### Database Queries

```typescript
import { query, withTransaction } from '@/lib/database/neon-connection';

// Simple query
const suppliers = await query(
  'SELECT * FROM core.supplier WHERE active = $1',
  [true]
);

// Transaction
await withTransaction(async (client) => {
  await client.query('UPDATE core.supplier_product SET is_active = false WHERE supplier_id = $1', [id]);
  await client.query('INSERT INTO audit_log...');
});
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### E2E Tests

```bash
npm run test:e2e
```

## Performance Tips

1. **Use Pagination**: Always use `limit` and `offset` parameters
2. **Filter Early**: Apply filters in queries rather than in code
3. **Batch Operations**: Use bulk import/update endpoints
4. **Refresh Views**: Run `serve.refresh_materialized_views()` after merges
5. **Monitor Queries**: Check logs for slow queries (>1000ms)

## Troubleshooting

### "Connection timeout"
- Verify Neon database is active
- Check connection string format
- Increase `NEON_POOL_CONNECTION_TIMEOUT`

### "File upload failed"
- Check file size (max 10MB)
- Verify file format (.xlsx, .xls, .csv)
- Review column mapping in upload handler

### "Validation errors"
- Check `errors_json` field in upload record
- Ensure required fields present: sku, name, price, uom
- Verify price values are positive numbers

### "Merge failed"
- Ensure upload status is 'validated'
- Check for duplicate SKUs
- Verify supplier_id exists in core.supplier

### "Slow queries"
- Run `EXPLAIN ANALYZE` on slow queries
- Check index usage
- Refresh materialized views
- Consider pagination

## Next Steps

1. **Integrate with UI**: Connect React components to APIs
2. **Add Authentication**: Implement JWT/session auth
3. **Set up Monitoring**: Configure health checks and metrics
4. **Deploy to Production**: Follow deployment guide
5. **Train Users**: Create user documentation

## API Reference

Full API documentation available at:
- Architecture: `docs/NXT-SPP-ARCHITECTURE.md`
- API Endpoints: See "API Endpoints" section in architecture doc
- Type Definitions: `src/types/nxt-spp.ts`

## Support

For issues:
1. Check this quick start guide
2. Review architecture documentation
3. Check service layer implementations
4. Review database schema migrations

## Resources

- Neon Database: https://neon.tech/docs
- Next.js: https://nextjs.org/docs
- Zod Validation: https://zod.dev
- PostgreSQL: https://www.postgresql.org/docs
