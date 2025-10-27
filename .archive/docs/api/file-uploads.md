# File Uploads API

The File Uploads API handles XLSX file processing for bulk data imports including suppliers, inventory items, purchase orders, and other business data.

## Supported File Types

- **XLSX** (Excel 2007+) - Primary format
- **CSV** - Basic comma-separated values
- **JSON** - Structured data imports

## Upload Endpoints

### Process XLSX Upload

```http
POST /rest/v1/rpc/process_xlsx_upload
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "file_data": "base64-encoded-xlsx-data",
  "import_type": "suppliers",
  "options": {
    "validate_only": false,
    "skip_duplicates": true,
    "update_existing": false,
    "sheet_name": "Sheet1"
  }
}
```

**Parameters:**
- `file_data`: Base64 encoded XLSX file content
- `import_type`: Type of data to import
- `options`: Processing options

**Import Types:**
- `suppliers` - Supplier data
- `inventory` - Inventory items
- `purchase_orders` - Purchase order data
- `customers` - Customer information
- `products` - Product catalog

**Response:**
```json
{
  "data": {
    "import_id": "uuid-of-import-process",
    "status": "completed",
    "processed_rows": 150,
    "successful_imports": 142,
    "failed_imports": 8,
    "validation_errors": [
      {
        "row": 15,
        "field": "vat_number",
        "error": "Invalid VAT number format",
        "value": "123456789"
      }
    ],
    "summary": {
      "total_records": 150,
      "created": 134,
      "updated": 8,
      "skipped": 8
    }
  }
}
```

## XLSX Template Formats

### Supplier Import Template

**Required Columns:**
```
Name | Email | Phone | Company Registration | VAT Number | BEE Level | Category | Address | City | Province | Postal Code
```

**Example Data:**
```
TechCorp Solutions | info@techcorp.co.za | +27 11 123 4567 | 2019/123456/07 | 4123456789 | 2 | technology | 123 Business Drive | Johannesburg | Gauteng | 2196
```

**Download Template:**
```http
GET /rest/v1/rpc/get_import_template?type=suppliers
Authorization: Bearer <token>
```

### Inventory Import Template

**Required Columns:**
```
SKU | Name | Description | Category | Unit Price | Currency | Stock Quantity | Reorder Level | Supplier Name
```

**Example Data:**
```
TECH-001 | Laptop Dell XPS | High-performance laptop | Technology | 15000.00 | ZAR | 25 | 5 | TechCorp Solutions
```

### Purchase Order Import Template

**Required Columns:**
```
PO Number | Supplier Name | Item SKU | Quantity | Unit Price | Currency | Delivery Date | Notes
```

## File Validation Rules

### Supplier Validation
- **Name**: Required, 1-200 characters
- **Email**: Required, valid email format
- **Company Registration**: SA format (yyyy/xxxxxx/xx)
- **VAT Number**: SA format (4xxxxxxxxx), optional
- **BEE Level**: Integer 1-8, optional
- **Province**: Must be valid SA province

### Inventory Validation
- **SKU**: Required, unique within organization
- **Unit Price**: Positive number
- **Currency**: Must be "ZAR" or supported currency
- **Stock Quantity**: Non-negative integer
- **Reorder Level**: Non-negative integer

### Data Type Validation
- **Dates**: ISO 8601 format (YYYY-MM-DD)
- **Currency**: ZAR amounts with up to 2 decimal places
- **Phone**: South African format (+27 xx xxx xxxx)
- **Email**: RFC 5322 compliant

## Processing Options

### Validation Only Mode

```json
{
  "validate_only": true
}
```

**Response:**
```json
{
  "data": {
    "validation_result": "success",
    "total_rows": 150,
    "validation_errors": [],
    "preview_data": [
      {
        "row": 1,
        "data": {
          "name": "TechCorp Solutions",
          "email": "info@techcorp.co.za"
        }
      }
    ]
  }
}
```

### Skip Duplicates

```json
{
  "skip_duplicates": true,
  "duplicate_check_fields": ["email", "vat_number"]
}
```

### Update Existing Records

```json
{
  "update_existing": true,
  "match_fields": ["company_registration"]
}
```

## Bulk Import Status Tracking

### Check Import Status

```http
GET /rest/v1/data_import?id=eq.<import-id>
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "import-uuid",
      "import_type": "suppliers",
      "status": "processing",
      "progress_percentage": 75,
      "total_rows": 150,
      "processed_rows": 112,
      "successful_rows": 108,
      "failed_rows": 4,
      "created_at": "2024-09-22T14:30:00.000Z",
      "completed_at": null,
      "error_log": [
        {
          "row": 15,
          "field": "vat_number",
          "error": "Invalid format"
        }
      ]
    }
  ]
}
```

### Import History

```http
GET /rest/v1/data_import?select=*&order=created_at.desc&limit=20
Authorization: Bearer <token>
```

## File Upload via Storage

### Direct File Upload

```http
POST /storage/v1/object/imports/suppliers-2024-09-22.xlsx
Authorization: Bearer <token>
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

### Process Uploaded File

```http
POST /rest/v1/rpc/process_storage_file
Authorization: Bearer <token>
Content-Type: application/json

{
  "file_path": "imports/suppliers-2024-09-22.xlsx",
  "import_type": "suppliers",
  "options": {
    "validate_only": false
  }
}
```

## Error Handling

### Common Validation Errors

**Invalid File Format:**
```json
{
  "error": {
    "code": "INVALID_FILE_FORMAT",
    "message": "File must be in XLSX format",
    "details": "Received file type: text/csv"
  }
}
```

**Missing Required Columns:**
```json
{
  "error": {
    "code": "MISSING_COLUMNS",
    "message": "Required columns are missing",
    "details": {
      "missing": ["Name", "Email"],
      "found": ["Company", "Contact"]
    }
  }
}
```

**Data Validation Errors:**
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Data validation failed for multiple rows",
    "details": {
      "error_count": 8,
      "sample_errors": [
        {
          "row": 5,
          "field": "email",
          "value": "invalid-email",
          "error": "Invalid email format"
        }
      ]
    }
  }
}
```

### File Size Limits

- **Maximum file size**: 10MB
- **Maximum rows**: 10,000 per import
- **Maximum columns**: 50 per sheet

## Advanced Features

### Custom Field Mapping

```json
{
  "field_mapping": {
    "Company Name": "name",
    "Contact Email": "email",
    "Registration No": "company_registration",
    "VAT Registration": "vat_number"
  }
}
```

### Conditional Import Rules

```json
{
  "import_rules": {
    "skip_if_empty": ["phone", "vat_number"],
    "default_values": {
      "status": "active",
      "payment_terms": 30
    },
    "transformations": {
      "province": "title_case",
      "email": "lowercase"
    }
  }
}
```

### Progress Notifications

```http
POST /rest/v1/rpc/subscribe_import_progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "import_id": "uuid",
  "webhook_url": "https://your-app.com/webhooks/import-progress"
}
```

## Integration Examples

### Frontend Upload (React)

```typescript
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key)

function FileUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)

    // Convert file to base64
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string
      const base64Content = base64Data.split(',')[1]

      try {
        const { data, error } = await supabase.rpc('process_xlsx_upload', {
          file_data: base64Content,
          import_type: 'suppliers',
          options: {
            validate_only: false,
            skip_duplicates: true
          }
        })

        if (error) throw error
        console.log('Import result:', data)
      } catch (error) {
        console.error('Upload failed:', error)
      } finally {
        setUploading(false)
      }
    }

    reader.readAsDataURL(file)
  }

  return (
    <div>
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  )
}
```

### Node.js Upload

```javascript
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

async function uploadXLSX(filePath, importType) {
  try {
    // Read file and convert to base64
    const fileBuffer = fs.readFileSync(filePath)
    const base64Data = fileBuffer.toString('base64')

    const { data, error } = await supabase.rpc('process_xlsx_upload', {
      file_data: base64Data,
      import_type: importType,
      options: {
        validate_only: false,
        skip_duplicates: true,
        update_existing: false
      }
    })

    if (error) throw error

    console.log('Import successful:', data)
    return data
  } catch (error) {
    console.error('Upload failed:', error)
    throw error
  }
}

// Usage
uploadXLSX('./suppliers.xlsx', 'suppliers')
```

## Best Practices

1. **Validate Before Import** - Always use `validate_only: true` first
2. **Chunk Large Files** - Split files >5,000 rows into smaller batches
3. **Handle Errors Gracefully** - Provide clear feedback on validation errors
4. **Progress Tracking** - Show upload progress for large files
5. **Template Downloads** - Provide users with correct template formats
6. **Data Backup** - Keep original files as backup before processing

## Next Steps

- [Suppliers API](./suppliers.md) - Working with imported supplier data
- [Inventory API](./inventory.md) - Managing imported inventory
- [Bulk Operations](./bulk-operations.md) - Advanced bulk processing
- [Webhooks](./webhooks.md) - Real-time import notifications