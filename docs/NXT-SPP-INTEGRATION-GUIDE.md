# NXT-SPP Integration Guide for Development Team

## Overview

This guide provides step-by-step instructions for integrating the NXT-SPP (Supplier Inventory Portfolio) system into the existing MantisNXT application.

## Prerequisites

- MantisNXT development environment set up
- Node.js 18+ installed
- Access to Neon database (proud-mud-50346856)
- Familiarity with Next.js App Router
- TypeScript knowledge

## Phase 1: Database Setup (30 minutes)

### Step 1.1: Get Neon Credentials

1. Access Neon Console: https://console.neon.tech
2. Select project: "NXT-SPP-Supplier Inventory Portfolio" (proud-mud-50346856)
3. Copy connection string from project dashboard
4. Note: Database name should be `nxt-spp-supplier-inventory-portfolio`

### Step 1.2: Configure Environment

Add to `.env.local`:

```env
# Neon Database for NXT-SPP
NEON_DATABASE_URL=postgresql://[user]:[password]@proud-mud-50346856.us-east-2.aws.neon.tech/nxt-spp-supplier-inventory-portfolio?sslmode=require
NEON_POOL_MIN=2
NEON_POOL_MAX=10
NEON_POOL_IDLE_TIMEOUT=30000
NEON_POOL_CONNECTION_TIMEOUT=10000

# Feature Flags
ENABLE_NEON_DATABASE=true
ENABLE_PRICELIST_UPLOAD=true
```

### Step 1.3: Run Migrations

```bash
# Connect to Neon database
psql $NEON_DATABASE_URL

# Run migrations in order
\i database/migrations/neon/001_create_spp_schema.sql
\i database/migrations/neon/002_create_core_schema.sql
\i database/migrations/neon/003_create_serve_schema.sql

# Verify
\dn  # Should show: spp, core, serve schemas
```

### Step 1.4: Test Connection

```bash
npm run dev
curl http://localhost:3000/api/health/database
```

Expected: `{"success": true, "connected": true, "latency": <number>}`

## Phase 2: Backend Integration (2-3 hours)

### Step 2.1: Import Services

In your component or API route:

```typescript
// Import services
import { pricelistService } from '@/lib/services/PricelistService';
import { supplierProductService } from '@/lib/services/SupplierProductService';
import { inventorySelectionService } from '@/lib/services/InventorySelectionService';
import { stockService } from '@/lib/services/StockService';

// Import types
import {
  PricelistUpload,
  SupplierProduct,
  InventorySelection,
  StockOnHand
} from '@/types/nxt-spp';
```

### Step 2.2: Database Connection

Two connection options:

**Option A: Use Neon connection (recommended for NXT-SPP)**
```typescript
import { neonDb, query, withTransaction } from '@/lib/database/neon-connection';
```

**Option B: Use existing connection (for legacy tables)**
```typescript
import { db } from '@/lib/database/connection';
```

### Step 2.3: Authentication Integration

Add authentication middleware to API routes:

```typescript
// Example: Protect upload endpoint
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth'; // Your existing auth

export async function POST(request: NextRequest) {
  // Verify authentication
  const user = await verifyAuth(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Your NXT-SPP logic here
  const upload = await pricelistService.createUpload({
    supplier_id: request.body.supplier_id,
    // ... other fields
  });

  return NextResponse.json({ success: true, upload });
}
```

### Step 2.4: Add Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

// For upload endpoints
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many uploads, please try again later'
});

// Apply to routes
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  rateLimit: uploadLimiter
};
```

## Phase 3: Frontend Integration (4-6 hours)

### Step 3.1: Create Pricelist Upload Component

```typescript
// components/nxt-spp/PricelistUpload.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function PricelistUpload({ supplierId }: { supplierId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('supplier_id', supplierId);
    formData.append('currency', 'ZAR');
    formData.append('auto_validate', 'true');

    try {
      const response = await fetch('/api/spp/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Upload successful',
          description: `${data.rows_inserted} rows inserted`,
        });

        if (data.validation?.status === 'invalid') {
          toast({
            title: 'Validation errors',
            description: `${data.validation.invalid_rows} rows have errors`,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        disabled={uploading}
      />
      <Button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload Pricelist'}
      </Button>
    </div>
  );
}
```

### Step 3.2: Create Product Selection Component

```typescript
// components/nxt-spp/ProductSelection.tsx
'use client';

import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ProductTableBySupplier } from '@/types/nxt-spp';

export function ProductSelection({ supplierId }: { supplierId: string }) {
  const [products, setProducts] = useState<ProductTableBySupplier[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, [supplierId]);

  const fetchProducts = async () => {
    const response = await fetch(
      `/api/core/suppliers/products/table?supplier_id=${supplierId}`
    );
    const data = await response.json();
    setProducts(data.products);
    setLoading(false);
  };

  const handleSelect = (productId: string, checked: boolean) => {
    const newSelected = new Set(selected);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelected(newSelected);
  };

  const handleSaveSelection = async () => {
    const response = await fetch('/api/core/selections/workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selection_name: `Selection ${new Date().toISOString()}`,
        supplier_product_ids: Array.from(selected),
        action: 'select',
        selected_by: 'current-user-id', // Replace with actual user ID
      }),
    });

    const data = await response.json();
    if (data.success) {
      // Show success message
    }
  };

  if (loading) return <div>Loading products...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2>Select Products for Stocking</h2>
        <Button onClick={handleSaveSelection} disabled={selected.size === 0}>
          Save Selection ({selected.size})
        </Button>
      </div>

      <div className="grid gap-2">
        {products.map((product) => (
          <div key={product.supplier_product_id} className="flex items-center space-x-2 p-2 border rounded">
            <Checkbox
              checked={selected.has(product.supplier_product_id)}
              onCheckedChange={(checked) =>
                handleSelect(product.supplier_product_id, checked as boolean)
              }
            />
            <div className="flex-1">
              <div className="font-medium">{product.name_from_supplier}</div>
              <div className="text-sm text-muted-foreground">
                SKU: {product.supplier_sku} | Price: {product.current_price} {product.currency}
                {product.is_new && <span className="ml-2 text-green-600">NEW</span>}
                {product.is_selected && <span className="ml-2 text-blue-600">SELECTED</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Step 3.3: Create SOH Dashboard Component

```typescript
// components/nxt-spp/SOHDashboard.tsx
'use client';

import { useState, useEffect } from 'react';
import { SohBySupplier } from '@/types/nxt-spp';
import { Card } from '@/components/ui/card';

export function SOHDashboard({ supplierId }: { supplierId?: string }) {
  const [sohData, setSohData] = useState<SohBySupplier[]>([]);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    fetchSOHData();
    fetchTotalValue();
  }, [supplierId]);

  const fetchSOHData = async () => {
    const url = supplierId
      ? `/api/serve/soh?supplier_ids=${supplierId}`
      : '/api/serve/soh';
    const response = await fetch(url);
    const data = await response.json();
    setSohData(data.data);
  };

  const fetchTotalValue = async () => {
    const url = supplierId
      ? `/api/serve/soh/value?supplier_ids=${supplierId}`
      : '/api/serve/soh/value';
    const response = await fetch(url);
    const data = await response.json();
    setTotalValue(data.total_value);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-lg font-semibold">Total Inventory Value</h3>
        <p className="text-3xl font-bold">
          R {totalValue.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
        </p>
      </Card>

      <div className="grid gap-2">
        {sohData.map((item) => (
          <Card key={`${item.supplier_product_id}-${item.location_id}`} className="p-4">
            <div className="flex justify-between">
              <div>
                <div className="font-medium">{item.product_name}</div>
                <div className="text-sm text-muted-foreground">
                  {item.supplier_name} | {item.location_name}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{item.qty_on_hand} units</div>
                <div className="text-sm">
                  R {item.total_value.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

## Phase 4: Testing (2-3 hours)

### Step 4.1: Unit Tests

```typescript
// __tests__/services/PricelistService.test.ts
import { pricelistService } from '@/lib/services/PricelistService';
import { neonDb } from '@/lib/database/neon-connection';

describe('PricelistService', () => {
  it('should create upload record', async () => {
    const upload = await pricelistService.createUpload({
      supplier_id: 'test-supplier-id',
      file: Buffer.from('test'),
      filename: 'test.xlsx',
      currency: 'ZAR',
    });

    expect(upload.upload_id).toBeDefined();
    expect(upload.status).toBe('received');
  });

  it('should validate pricelist', async () => {
    // Test validation logic
  });
});
```

### Step 4.2: Integration Tests

```typescript
// __tests__/api/spp-upload.test.ts
import { POST } from '@/app/api/spp/upload/route';
import { NextRequest } from 'next/server';

describe('POST /api/spp/upload', () => {
  it('should upload pricelist file', async () => {
    const formData = new FormData();
    formData.append('file', new File(['test'], 'test.xlsx'));
    formData.append('supplier_id', 'test-id');

    const request = new NextRequest('http://localhost:3000/api/spp/upload', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.upload).toBeDefined();
  });
});
```

### Step 4.3: E2E Tests

```typescript
// tests/e2e/pricelist-workflow.spec.ts
import { test, expect } from '@playwright/test';

test('complete pricelist workflow', async ({ page }) => {
  // Navigate to supplier page
  await page.goto('/suppliers/test-supplier-id');

  // Upload pricelist
  await page.locator('input[type="file"]').setInputFiles('test-pricelist.xlsx');
  await page.locator('button:has-text("Upload")').click();

  // Wait for success message
  await expect(page.locator('text=Upload successful')).toBeVisible();

  // Navigate to selection
  await page.locator('a:has-text("Select Products")').click();

  // Select products
  await page.locator('input[type="checkbox"]').first().check();
  await page.locator('button:has-text("Save Selection")').click();

  // Verify selection saved
  await expect(page.locator('text=Selection saved')).toBeVisible();
});
```

## Phase 5: Deployment (1-2 hours)

### Step 5.1: Environment Variables

Set in production environment:

```env
NEON_DATABASE_URL=<production-connection-string>
ENABLE_NEON_DATABASE=true
ENABLE_PRICELIST_UPLOAD=true
API_RATE_LIMIT_UPLOAD=10
MAX_UPLOAD_SIZE_MB=10
```

### Step 5.2: Database Migration

```bash
# Production migration
psql $PRODUCTION_NEON_DATABASE_URL < database/migrations/neon/001_create_spp_schema.sql
psql $PRODUCTION_NEON_DATABASE_URL < database/migrations/neon/002_create_core_schema.sql
psql $PRODUCTION_NEON_DATABASE_URL < database/migrations/neon/003_create_serve_schema.sql
```

### Step 5.3: Deploy Application

```bash
# Build
npm run build

# Deploy to Vercel
vercel --prod

# Or deploy to your preferred platform
```

### Step 5.4: Post-Deployment Verification

```bash
# Test health endpoint
curl https://your-domain.com/api/health/database

# Test API endpoints
curl https://your-domain.com/api/core/suppliers/products
```

## Common Integration Patterns

### Pattern 1: Fetch and Display Data

```typescript
async function fetchSupplierProducts(supplierId: string) {
  const response = await fetch(
    `/api/core/suppliers/products/table?supplier_id=${supplierId}`
  );
  return response.json();
}
```

### Pattern 2: Error Handling

```typescript
try {
  const result = await pricelistService.mergePricelist(uploadId);
  if (result.success) {
    // Success handling
  }
} catch (error) {
  if (error instanceof ZodError) {
    // Validation error
  } else {
    // Other errors
  }
}
```

### Pattern 3: Real-time Updates

```typescript
// Use polling for updates
useEffect(() => {
  const interval = setInterval(() => {
    fetchUploadStatus(uploadId);
  }, 2000);

  return () => clearInterval(interval);
}, [uploadId]);
```

## Troubleshooting

### Issue: Connection timeout
**Solution**: Check Neon database status and increase `NEON_POOL_CONNECTION_TIMEOUT`

### Issue: Upload fails
**Solution**: Verify file format and column mappings in upload handler

### Issue: Validation errors
**Solution**: Check `errors_json` field in upload record for details

### Issue: Slow queries
**Solution**: Run `EXPLAIN ANALYZE` and check index usage

## Support

- Architecture: See `docs/NXT-SPP-ARCHITECTURE.md`
- Quick Start: See `docs/NXT-SPP-QUICKSTART.md`
- Implementation: See `docs/NXT-SPP-IMPLEMENTATION-SUMMARY.md`

## Checklist

- [ ] Phase 1: Database Setup
  - [ ] Environment configured
  - [ ] Migrations run
  - [ ] Connection tested
- [ ] Phase 2: Backend Integration
  - [ ] Services imported
  - [ ] Authentication added
  - [ ] Rate limiting configured
- [ ] Phase 3: Frontend Integration
  - [ ] Upload component created
  - [ ] Selection component created
  - [ ] SOH dashboard created
- [ ] Phase 4: Testing
  - [ ] Unit tests written
  - [ ] Integration tests written
  - [ ] E2E tests written
- [ ] Phase 5: Deployment
  - [ ] Environment variables set
  - [ ] Production migration run
  - [ ] Application deployed
  - [ ] Post-deployment verified

---

**Integration Guide Version**: 1.0
**Last Updated**: 2025-10-06
**Status**: Ready for Integration
