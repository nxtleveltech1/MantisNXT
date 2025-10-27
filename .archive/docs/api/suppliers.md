# Suppliers API

The Suppliers API manages supplier data, including company information, contact details, BEE compliance status, and performance metrics.

## Base Endpoint

```
/rest/v1/supplier
```

## Data Model

```typescript
interface Supplier {
  id: string                    // UUID
  org_id: string               // Organization UUID
  name: string                 // Company name
  company_registration: string // SA company registration (yyyy/xxxxxx/xx)
  vat_number?: string          // SA VAT number (4xxxxxxxxx)
  email: string                // Primary contact email
  phone?: string               // Contact phone number
  address: {                   // South African address
    street: string
    city: string
    province: string           // One of 9 SA provinces
    postal_code: string
    country: string            // "South Africa"
  }
  bee_level?: number          // BEE Level (1-8)
  bee_certificate_expiry?: string
  annual_spend: number        // ZAR amount
  payment_terms: number       // Days (e.g., 30)
  credit_limit: number        // ZAR amount
  supplier_category: string   // "technology" | "manufacturing" | etc.
  status: string              // "active" | "inactive" | "pending"
  performance_rating: number  // 1-5 scale
  created_at: string
  updated_at: string
}
```

## Endpoints

### List Suppliers

```http
GET /rest/v1/supplier
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` - Filter by status (active, inactive, pending)
- `bee_level` - Filter by BEE level (1-8)
- `province` - Filter by South African province
- `category` - Filter by supplier category
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset
- `order` - Sort order (e.g., `name.asc`, `annual_spend.desc`)

**Example Request:**
```http
GET /rest/v1/supplier?status=eq.active&bee_level=lte.4&order=annual_spend.desc&limit=20
```

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "org_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "TechCorp Solutions (Pty) Ltd",
      "company_registration": "2019/123456/07",
      "vat_number": "4123456789",
      "email": "info@techcorp.co.za",
      "phone": "+27 11 123 4567",
      "address": {
        "street": "123 Business Park Drive",
        "city": "Johannesburg",
        "province": "Gauteng",
        "postal_code": "2196",
        "country": "South Africa"
      },
      "bee_level": 2,
      "bee_certificate_expiry": "2025-03-31",
      "annual_spend": 12500000.00,
      "payment_terms": 30,
      "credit_limit": 5000000.00,
      "supplier_category": "technology",
      "status": "active",
      "performance_rating": 4.8,
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-09-22T14:20:00.000Z"
    }
  ],
  "count": 1,
  "error": null
}
```

### Get Supplier Details

```http
GET /rest/v1/supplier?id=eq.<supplier-id>&select=*,purchase_orders(count),invoices(count)
Authorization: Bearer <token>
```

**Response includes related data:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "TechCorp Solutions (Pty) Ltd",
      "purchase_orders": [{"count": 45}],
      "invoices": [{"count": 38}],
      // ... other supplier fields
    }
  ]
}
```

### Create Supplier

```http
POST /rest/v1/supplier
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "New Supplier (Pty) Ltd",
  "company_registration": "2023/789012/07",
  "vat_number": "4987654321",
  "email": "contact@newsupplier.co.za",
  "phone": "+27 21 987 6543",
  "address": {
    "street": "456 Industrial Avenue",
    "city": "Cape Town",
    "province": "Western Cape",
    "postal_code": "7500",
    "country": "South Africa"
  },
  "bee_level": 3,
  "bee_certificate_expiry": "2025-12-31",
  "annual_spend": 2500000.00,
  "payment_terms": 30,
  "credit_limit": 1000000.00,
  "supplier_category": "manufacturing",
  "status": "active"
}
```

**Response:**
```json
{
  "data": [
    {
      "id": "new-uuid-generated",
      "org_id": "current-org-id",
      "name": "New Supplier (Pty) Ltd",
      // ... all other fields with defaults applied
      "performance_rating": 0,
      "created_at": "2024-09-22T14:30:00.000Z",
      "updated_at": "2024-09-22T14:30:00.000Z"
    }
  ],
  "error": null
}
```

### Update Supplier

```http
PATCH /rest/v1/supplier?id=eq.<supplier-id>
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (partial update):**
```json
{
  "bee_level": 1,
  "bee_certificate_expiry": "2026-06-30",
  "performance_rating": 4.9,
  "annual_spend": 15000000.00
}
```

### Delete Supplier

```http
DELETE /rest/v1/supplier?id=eq.<supplier-id>
Authorization: Bearer <token>
```

**Note:** Soft delete only - sets status to "inactive"

## Advanced Queries

### BEE Compliance Report

```http
GET /rest/v1/supplier?select=bee_level,annual_spend,name&status=eq.active
```

### Suppliers by Province

```http
GET /rest/v1/supplier?select=address->>province,count()&group=address->>province
```

### Performance Dashboard

```http
GET /rest/v1/supplier?select=name,performance_rating,annual_spend&performance_rating=gte.4.0&order=annual_spend.desc
```

## RPC Functions

### Get Supplier Performance Metrics

```http
POST /rest/v1/rpc/get_supplier_metrics
Authorization: Bearer <token>
Content-Type: application/json

{
  "supplier_id": "550e8400-e29b-41d4-a716-446655440000",
  "period_months": 12
}
```

**Response:**
```json
{
  "data": {
    "supplier_id": "550e8400-e29b-41d4-a716-446655440000",
    "total_orders": 45,
    "total_spend": 12500000.00,
    "average_order_value": 277777.78,
    "on_time_delivery_rate": 92.5,
    "quality_score": 4.8,
    "payment_terms_compliance": 98.2,
    "bee_contribution": {
      "level": 2,
      "ownership_points": 25,
      "management_points": 18,
      "skills_development_points": 20
    }
  }
}
```

### Bulk Import Suppliers

```http
POST /rest/v1/rpc/bulk_import_suppliers
Authorization: Bearer <token>
Content-Type: application/json

{
  "suppliers_data": [
    {
      "name": "Supplier 1",
      "email": "supplier1@example.co.za",
      // ... other fields
    },
    {
      "name": "Supplier 2",
      "email": "supplier2@example.co.za",
      // ... other fields
    }
  ],
  "validate_only": false
}
```

### Get BEE Compliance Summary

```http
POST /rest/v1/rpc/get_bee_compliance_summary
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": {
    "total_suppliers": 247,
    "bee_compliant_suppliers": 198,
    "bee_compliance_percentage": 80.2,
    "spend_breakdown": {
      "level_1_2": {
        "suppliers": 62,
        "spend": 45000000.00,
        "percentage": 36.0
      },
      "level_3_4": {
        "suppliers": 89,
        "spend": 52500000.00,
        "percentage": 42.0
      },
      "level_5_8": {
        "suppliers": 47,
        "spend": 15000000.00,
        "percentage": 12.0
      },
      "non_bee": {
        "suppliers": 49,
        "spend": 12500000.00,
        "percentage": 10.0
      }
    },
    "provincial_distribution": {
      "Gauteng": {"suppliers": 89, "spend": 45000000.00},
      "Western Cape": {"suppliers": 52, "spend": 26250000.00},
      "KwaZulu-Natal": {"suppliers": 37, "spend": 18750000.00}
    }
  }
}
```

## Error Handling

### Common Errors

**Validation Error:**
```json
{
  "error": {
    "code": "23505",
    "message": "duplicate key value violates unique constraint",
    "details": "Key (vat_number)=(4123456789) already exists"
  }
}
```

**Permission Error:**
```json
{
  "error": {
    "code": "42501",
    "message": "new row violates row-level security policy for table supplier"
  }
}
```

**Invalid BEE Level:**
```json
{
  "error": {
    "code": "23514",
    "message": "new row violates check constraint bee_level_check",
    "details": "BEE level must be between 1 and 8"
  }
}
```

## Rate Limiting

- **GET requests**: 100 per minute
- **POST/PATCH requests**: 50 per minute
- **Bulk operations**: 10 per minute

## Field Validation

- **name**: Required, 1-200 characters
- **email**: Required, valid email format
- **company_registration**: SA format (yyyy/xxxxxx/xx)
- **vat_number**: SA format (4xxxxxxxxx), optional
- **bee_level**: Integer 1-8, optional
- **annual_spend**: Positive number, ZAR
- **payment_terms**: Positive integer (days)
- **province**: Must be valid SA province

## Next Steps

- [Purchase Orders API](./purchase-orders.md) - Creating orders with suppliers
- [Invoices API](./invoices.md) - Processing supplier invoices
- [Analytics API](./analytics.md) - Supplier performance analysis
- [File Uploads](./file-uploads.md) - Bulk supplier import via XLSX