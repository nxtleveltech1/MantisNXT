# API Overview

MantisNXT provides a comprehensive REST API built on Supabase's auto-generated endpoints with custom RPC functions for complex operations.

## Base URL

```
https://your-project-ref.supabase.co/rest/v1/
```

## Authentication

All API requests require authentication using Supabase JWT tokens:

```http
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

## Response Format

All API responses follow a consistent format:

```json
{
  "data": [...],
  "error": null,
  "count": 100,
  "status": 200,
  "statusText": "OK"
}
```

## Error Handling

API errors return structured error responses:

```json
{
  "error": {
    "code": "PGRST116",
    "details": "The result contains 0 rows",
    "hint": null,
    "message": "JSON object requested, multiple (or no) rows returned"
  },
  "data": null,
  "count": null,
  "status": 406,
  "statusText": "Not Acceptable"
}
```

## Rate Limiting

- **Authenticated requests**: 100 requests per second per user
- **Anonymous requests**: 30 requests per second per IP
- **RPC functions**: 20 requests per second per user

## API Modules

### Core Management
- [Organizations](./organizations.md) - Organization management
- [Users](./users.md) - User and profile management
- [Audit Logs](./audit-logs.md) - System audit trails

### Supply Chain
- [Suppliers](./suppliers.md) - Supplier management
- [Inventory](./inventory.md) - Inventory tracking
- [Purchase Orders](./purchase-orders.md) - PO processing
- [Invoices](./invoices.md) - Invoice management
- [Payments](./payments.md) - Payment processing

### Analytics & Reporting
- [Dashboards](./dashboards.md) - Dashboard management
- [Reports](./reports.md) - Report generation
- [Metrics](./metrics.md) - System metrics

### Integration & Automation
- [Integrations](./integrations.md) - Third-party integrations
- [Webhooks](./webhooks.md) - Event notifications
- [File Uploads](./file-uploads.md) - XLSX and document processing

## Quick Examples

### Get Organization Overview
```http
GET /rest/v1/v_organization_overview
Authorization: Bearer <token>
```

### Create Purchase Order
```http
POST /rest/v1/purchase_order
Authorization: Bearer <token>
Content-Type: application/json

{
  "supplier_id": "uuid",
  "total_amount": 125000.00,
  "currency": "ZAR",
  "items": [...]
}
```

### Upload XLSX File
```http
POST /rest/v1/rpc/process_xlsx_upload
Authorization: Bearer <token>
Content-Type: application/json

{
  "file_data": "base64-encoded-data",
  "import_type": "suppliers"
}
```

## SDK and Client Libraries

### JavaScript/TypeScript (Supabase Client)
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
)

// Get suppliers
const { data, error } = await supabase
  .from('supplier')
  .select('*')
  .eq('active', true)
```

### cURL Examples
```bash
# Get suppliers
curl -X GET "https://your-project.supabase.co/rest/v1/supplier" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"

# Create invoice
curl -X POST "https://your-project.supabase.co/rest/v1/invoice" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"supplier_id":"uuid","amount":50000,"currency":"ZAR"}'
```

## Testing

### Postman Collection
Import our Postman collection for easy API testing:
- [Download Collection](../assets/MantisNXT-API.postman_collection.json)

### API Testing Environment
```json
{
  "base_url": "https://your-project.supabase.co/rest/v1",
  "auth_token": "your-jwt-token",
  "organization_id": "your-org-uuid"
}
```

## Pagination

Use standard query parameters for pagination:

```http
GET /rest/v1/supplier?limit=50&offset=100&order=created_at.desc
```

## Filtering

Supabase provides powerful filtering options:

```http
# Exact match
GET /rest/v1/supplier?status=eq.active

# Pattern matching
GET /rest/v1/supplier?name=ilike.*tech*

# Multiple values
GET /rest/v1/supplier?category=in.(technology,manufacturing)

# Date ranges
GET /rest/v1/invoice?created_at=gte.2024-01-01&created_at=lt.2024-12-31
```

## Best Practices

1. **Use RLS (Row Level Security)** - All tables have RLS enabled
2. **Batch Operations** - Use bulk endpoints for multiple records
3. **Caching** - Implement client-side caching for frequently accessed data
4. **Error Handling** - Always handle API errors gracefully
5. **Rate Limiting** - Implement exponential backoff for rate limit errors

## Next Steps

- Explore [Suppliers API](./suppliers.md) for supplier management
- See [Purchase Orders API](./purchase-orders.md) for procurement workflows
- Check [File Uploads](./file-uploads.md) for XLSX processing
- Review [Authentication](./authentication.md) for user management