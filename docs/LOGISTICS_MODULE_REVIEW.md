# Logistics Management Module - Comprehensive Review & Implementation Plan

## Executive Summary

This document provides a complete review of the courier/logistics management module located at `C:\00Project\Additional Modules\courier-delivery-system` and outlines the comprehensive plan for integrating it into the MantisNXT platform.

**Status**: Module exists as standalone Next.js application with basic courier management features. Requires significant enhancement and integration.

---

## 1. Current State Review

### 1.1 Architecture Overview

**Current Stack:**
- Next.js 15.2.4 (App Router)
- React 19
- TypeScript
- Tailwind CSS + shadcn/ui components
- Mock data (no database integration)
- Google Maps API integration (partial)
- WebSocket support (basic)

**Current Structure:**
```
courier-delivery-system/
├── app/
│   ├── api/
│   │   ├── couriers/route.ts          # Mock CRUD
│   │   ├── deliveries/route.ts        # Mock CRUD
│   │   ├── tracking/[trackingNumber]/route.ts
│   │   ├── maps/geocode/route.ts
│   │   └── websocket/route.ts
│   ├── dashboard/page.tsx             # Main dashboard
│   ├── couriers/page.tsx              # Courier management
│   ├── deliveries/page.tsx             # Delivery listing
│   └── tracking/[trackingNumber]/page.tsx
├── components/                        # UI components
└── hooks/                             # React hooks
```

### 1.2 Current Features

**✅ Implemented:**
1. Basic courier management UI
2. Delivery creation form
3. Dashboard with metrics
4. Live tracking map (Google Maps)
5. WebSocket infrastructure (skeleton)
6. South African location support
7. Delivery status widgets
8. Route planning UI

**❌ Missing Critical Features:**
1. **Database Integration** - All data is mock/in-memory
2. **Multi-Courier API Integration** - No external courier service providers
3. **Cost Calculation Engine** - No pricing/quotation integration
4. **Quotation/Sales Order Integration** - No connection to MantisNXT sales
5. **Inventory Allocation** - No stock management integration
6. **Dropshipping Workflow** - Not implemented
7. **Real-time Cost Quoting** - No dynamic pricing
8. **Customer Updates** - No notification system
9. **Payment Integration** - No billing/cost addition to orders
10. **Automated Workflows** - No end-to-end automation

### 1.3 Code Quality Assessment

**Strengths:**
- Clean component structure
- TypeScript usage
- Modern React patterns
- Good UI/UX foundation

**Weaknesses:**
- No database layer
- No service layer abstraction
- Mock data throughout
- No error handling
- No validation
- No authentication/authorization
- No integration points

---

## 2. Missing Capabilities & Features

### 2.1 Core Missing Features

#### A. Multi-Courier Service Provider Integration
**Requirement:** Support multiple courier APIs (e.g., PostNet, FastWay, CourierGuy, DHL, etc.)

**Missing:**
- Courier provider abstraction layer
- API client implementations
- Rate calculation from providers
- Service comparison engine
- Provider selection logic
- API credential management
- Rate caching/fallback mechanisms

#### B. Real-Time Cost Calculation
**Requirement:** Calculate delivery costs dynamically when creating quotations/sales orders

**Missing:**
- Cost calculation service
- Integration with quotation/SO creation flow
- Multi-provider rate comparison
- Weight/dimension-based pricing
- Distance-based pricing
- Service tier pricing (standard/express/urgent)
- Cost caching mechanism

#### C. Quotation/Sales Order Integration
**Requirement:** Seamlessly add delivery options and costs to quotations and sales orders

**Missing:**
- Integration hooks in QuotationService
- Integration hooks in SalesOrderService
- Delivery option selection UI in quotation/SO forms
- Cost line item addition
- Delivery address capture
- Delivery preference storage

#### D. Inventory Allocation Integration
**Requirement:** Allocate stock when delivery is confirmed, handle dropshipping scenarios

**Missing:**
- Integration with inventory_allocations table
- Stock reservation on delivery creation
- Dropshipping workflow (supplier direct shipping)
- Stock release on delivery cancellation
- Multi-warehouse support
- Allocation conflict resolution

#### E. Dropshipping Model Support
**Requirement:** Support supplier-direct shipping scenarios

**Missing:**
- Dropshipping flag/indicator
- Supplier shipping address management
- Supplier courier preference
- Dropshipping workflow automation
- Supplier notification system
- Tracking integration for supplier shipments

#### F. Customer Communication
**Requirement:** Automated updates to customers about delivery status

**Missing:**
- Email notification service
- SMS notification service (optional)
- Status update triggers
- Tracking link generation
- Delivery confirmation system
- Exception handling notifications

#### G. Payment Integration
**Requirement:** Add delivery costs to quotation/SO totals for payment processing

**Missing:**
- Cost line item addition to quotations
- Cost line item addition to sales orders
- Tax calculation on delivery costs
- Payment gateway integration
- Refund handling for cancelled deliveries

#### H. Automated Workflows
**Requirement:** End-to-end automation from order to delivery completion

**Missing:**
- Workflow orchestration engine
- State machine for delivery lifecycle
- Automated courier assignment
- Route optimization
- Exception handling workflows
- Retry mechanisms

### 2.2 Fringe Processes (Not Out of Scope)

#### A. Returns & Reverse Logistics
- Return label generation
- Return pickup scheduling
- Refund processing integration
- Return reason tracking

#### B. International Shipping
- Customs documentation
- International courier integration
- Duty/tax calculation
- Cross-border compliance

#### C. Bulk Shipping
- Batch delivery creation
- Consolidated shipping
- Pallet/container management
- Warehouse-to-warehouse transfers

#### D. Proof of Delivery
- Signature capture
- Photo proof
- GPS location verification
- Delivery time stamping

#### E. Insurance & Liability
- Package insurance options
- Value-based insurance calculation
- Claim processing workflow
- Liability management

---

## 3. Integration Requirements

### 3.1 MantisNXT Platform Integration Points

#### A. Quotation Integration
**Location:** `src/lib/services/sales/QuotationService.ts`

**Required Changes:**
1. Add `delivery_options` field to `Quotation` interface
2. Add `delivery_cost` to quotation totals
3. Add delivery address capture in quotation form
4. Integrate cost calculation API call during quotation creation
5. Store selected courier provider and service tier

**Integration Points:**
- `QuotationService.createQuotation()` - Add delivery cost calculation
- `QuotationService.updateQuotation()` - Update delivery options
- `app/sales/quotations/new/page.tsx` - Add delivery selection UI
- `app/sales/quotations/[id]/page.tsx` - Display delivery information

#### B. Sales Order Integration
**Location:** `src/lib/services/sales/SalesOrderService.ts`

**Required Changes:**
1. Add `delivery_options` field to `SalesOrder` interface
2. Add `delivery_cost` to sales order totals
3. Auto-create delivery record when SO is confirmed
4. Link delivery to sales order
5. Update delivery status when SO status changes

**Integration Points:**
- `SalesOrderService.createSalesOrder()` - Add delivery cost calculation
- `SalesOrderService.updateSalesOrder()` - Update delivery options
- `SalesOrderService.convertToInvoice()` - Preserve delivery information
- `app/sales/sales-orders/[id]/page.tsx` - Display delivery tracking

#### C. Inventory Allocation Integration
**Location:** `migrations/0202_inventory_allocations.sql`

**Required Changes:**
1. Create delivery-to-allocation mapping table
2. Reserve stock when delivery is created
3. Release stock when delivery is cancelled
4. Handle dropshipping (no allocation needed)
5. Support multi-item deliveries

**Integration Points:**
- `inventory_allocations` table - Link to deliveries
- Inventory service - Reserve/release stock
- Dropshipping detection - Skip allocation

#### D. Customer Integration
**Location:** Customer service and profile pages

**Required Changes:**
1. Add delivery address management to customer profiles
2. Store delivery preferences per customer
3. Customer-facing tracking page
4. Delivery history in customer portal

**Integration Points:**
- Customer service - Add delivery addresses
- Customer profile page - Display delivery history
- Customer portal - Tracking interface

### 3.2 Database Schema Requirements

See Section 4 for complete schema design.

---

## 4. Database Schema Design

### 4.1 Core Tables

#### A. `courier_providers`
Stores configured courier service providers and their API credentials.

```sql
CREATE TABLE courier_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "PostNet", "FastWay", "CourierGuy"
  provider_type TEXT NOT NULL, -- "postnet", "fastway", "courierguy", "dhl", "custom"
  api_endpoint TEXT,
  api_key TEXT, -- Encrypted
  api_secret TEXT, -- Encrypted
  is_active BOOLEAN DEFAULT true,
  supports_tracking BOOLEAN DEFAULT true,
  supports_quotes BOOLEAN DEFAULT true,
  default_service_tiers JSONB DEFAULT '[]', -- Available service tiers
  rate_card JSONB DEFAULT '{}', -- Rate card configuration
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, name)
);
```

#### B. `delivery_service_tiers`
Standard service tiers (standard, express, urgent) with time brackets.

```sql
CREATE TABLE delivery_service_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Standard", "Express", "Urgent"
  code TEXT NOT NULL, -- "standard", "express", "urgent"
  description TEXT,
  estimated_hours_min INTEGER, -- Minimum hours
  estimated_hours_max INTEGER, -- Maximum hours
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, code)
);
```

#### C. `deliveries`
Main delivery records linked to quotations/sales orders.

```sql
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  
  -- Source document links
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL,
  
  -- Customer information
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  
  -- Courier assignment
  courier_provider_id UUID REFERENCES courier_providers(id) ON DELETE SET NULL,
  courier_id UUID, -- Internal courier ID (if using in-house)
  service_tier_id UUID REFERENCES delivery_service_tiers(id),
  
  -- Addresses
  pickup_address JSONB NOT NULL, -- {street, city, province, postal_code, country, coordinates}
  delivery_address JSONB NOT NULL, -- Same structure
  
  -- Package details
  package_type TEXT, -- "documents", "electronics", "clothing", etc.
  weight_kg NUMERIC(10,3),
  dimensions_cm JSONB, -- {length, width, height}
  package_value NUMERIC(12,2),
  requires_signature BOOLEAN DEFAULT false,
  is_fragile BOOLEAN DEFAULT false,
  is_dropshipping BOOLEAN DEFAULT false, -- Supplier direct shipping
  dropship_supplier_id UUID REFERENCES supplier(id) ON DELETE SET NULL,
  
  -- Status and tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending, assigned, pickup, in_transit, delivered, failed, cancelled
  tracking_number TEXT,
  external_tracking_url TEXT,
  
  -- Pricing
  quoted_cost NUMERIC(12,2), -- Original quote
  actual_cost NUMERIC(12,2), -- Actual charged cost
  currency TEXT NOT NULL DEFAULT 'ZAR',
  
  -- Scheduling
  scheduled_pickup_at TIMESTAMPTZ,
  scheduled_delivery_at TIMESTAMPTZ,
  actual_pickup_at TIMESTAMPTZ,
  actual_delivery_at TIMESTAMPTZ,
  
  -- Additional info
  special_instructions TEXT,
  proof_of_delivery JSONB, -- {signature_url, photo_url, gps_location, delivered_by}
  notes TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users_extended(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users_extended(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_deliveries_org ON deliveries(org_id);
CREATE INDEX idx_deliveries_quotation ON deliveries(quotation_id);
CREATE INDEX idx_deliveries_sales_order ON deliveries(sales_order_id);
CREATE INDEX idx_deliveries_customer ON deliveries(customer_id);
CREATE INDEX idx_deliveries_status ON deliveries(status);
CREATE INDEX idx_deliveries_tracking ON deliveries(tracking_number);
CREATE INDEX idx_deliveries_courier_provider ON deliveries(courier_provider_id);
```

#### D. `delivery_items`
Link deliveries to specific products/items from quotations/sales orders.

```sql
CREATE TABLE delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  quotation_item_id UUID REFERENCES quotation_items(id) ON DELETE SET NULL,
  sales_order_item_id UUID REFERENCES sales_order_items(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  sku TEXT,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delivery_items_delivery ON delivery_items(delivery_id);
CREATE INDEX idx_delivery_items_product ON delivery_items(product_id);
```

#### E. `delivery_cost_quotes`
Store cost quotes from multiple providers for comparison.

```sql
CREATE TABLE delivery_cost_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE, -- Null if pre-selection quote
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
  sales_order_id UUID REFERENCES sales_orders(id) ON DELETE CASCADE,
  
  courier_provider_id UUID NOT NULL REFERENCES courier_providers(id),
  service_tier_id UUID REFERENCES delivery_service_tiers(id),
  
  -- Quote details
  cost NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  estimated_delivery_hours INTEGER,
  estimated_delivery_date TIMESTAMPTZ,
  
  -- Quote metadata
  quote_valid_until TIMESTAMPTZ,
  quote_response JSONB, -- Raw API response
  is_selected BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delivery_cost_quotes_delivery ON delivery_cost_quotes(delivery_id);
CREATE INDEX idx_delivery_cost_quotes_quotation ON delivery_cost_quotes(quotation_id);
CREATE INDEX idx_delivery_cost_quotes_sales_order ON delivery_cost_quotes(sales_order_id);
```

#### F. `delivery_status_history`
Track status changes and events.

```sql
CREATE TABLE delivery_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  status_message TEXT,
  location JSONB, -- {lat, lng, address}
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT, -- "api", "manual", "courier", "system"
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delivery_status_history_delivery ON delivery_status_history(delivery_id);
CREATE INDEX idx_delivery_status_history_timestamp ON delivery_status_history(event_timestamp);
```

#### G. `delivery_inventory_allocations`
Link deliveries to inventory allocations for stock management.

```sql
CREATE TABLE delivery_inventory_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  inventory_allocation_id UUID NOT NULL REFERENCES inventory_allocations(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(delivery_id, inventory_allocation_id)
);

CREATE INDEX idx_delivery_inv_alloc_delivery ON delivery_inventory_allocations(delivery_id);
CREATE INDEX idx_delivery_inv_alloc_allocation ON delivery_inventory_allocations(inventory_allocation_id);
```

### 4.2 Integration Tables

#### A. `quotation_delivery_options`
Store delivery preferences/options for quotations.

```sql
CREATE TABLE quotation_delivery_options (
  quotation_id UUID PRIMARY KEY REFERENCES quotations(id) ON DELETE CASCADE,
  delivery_required BOOLEAN DEFAULT false,
  preferred_service_tier_id UUID REFERENCES delivery_service_tiers(id),
  preferred_courier_provider_id UUID REFERENCES courier_providers(id),
  delivery_address JSONB,
  special_instructions TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### B. `sales_order_delivery_options`
Similar to quotation delivery options.

```sql
CREATE TABLE sales_order_delivery_options (
  sales_order_id UUID PRIMARY KEY REFERENCES sales_orders(id) ON DELETE CASCADE,
  delivery_required BOOLEAN DEFAULT false,
  service_tier_id UUID REFERENCES delivery_service_tiers(id),
  courier_provider_id UUID REFERENCES courier_providers(id),
  delivery_address JSONB,
  special_instructions TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.3 Views & Functions

#### A. `delivery_summary_view`
Aggregated view for dashboard and reporting.

```sql
CREATE OR REPLACE VIEW delivery_summary_view AS
SELECT 
  d.id,
  d.org_id,
  d.status,
  d.courier_provider_id,
  cp.name as courier_provider_name,
  d.service_tier_id,
  dst.name as service_tier_name,
  d.quotation_id,
  d.sales_order_id,
  d.customer_id,
  d.tracking_number,
  d.quoted_cost,
  d.actual_cost,
  d.scheduled_pickup_at,
  d.scheduled_delivery_at,
  d.actual_pickup_at,
  d.actual_delivery_at,
  d.created_at,
  COUNT(di.id) as item_count
FROM deliveries d
LEFT JOIN courier_providers cp ON d.courier_provider_id = cp.id
LEFT JOIN delivery_service_tiers dst ON d.service_tier_id = dst.id
LEFT JOIN delivery_items di ON d.id = di.delivery_id
GROUP BY d.id, cp.name, dst.name;
```

---

## 5. Implementation Plan

### Phase 1: Foundation & Database (Week 1-2)
1. ✅ Create database schema migrations
2. ✅ Set up base service layer structure
3. ✅ Create TypeScript types/interfaces
4. ✅ Set up database connection integration

### Phase 2: Courier Provider Integration (Week 2-3)
1. ✅ Build courier provider abstraction layer
2. ✅ Implement API client interfaces
3. ✅ Create provider implementations (PostNet, FastWay, etc.)
4. ✅ Build rate calculation engine
5. ✅ Implement quote comparison service

### Phase 3: Cost Calculation Engine (Week 3-4)
1. ✅ Build real-time cost calculation service
2. ✅ Integrate with quotation creation flow
3. ✅ Integrate with sales order creation flow
4. ✅ Build cost caching mechanism
5. ✅ Add cost line items to quotations/SOs

### Phase 4: Delivery Management (Week 4-5)
1. ✅ Build delivery CRUD services
2. ✅ Create delivery creation workflow
3. ✅ Implement status tracking
4. ✅ Build delivery dashboard
5. ✅ Implement WebSocket real-time updates

### Phase 5: Integration Points (Week 5-6)
1. ✅ Integrate with QuotationService
2. ✅ Integrate with SalesOrderService
3. ✅ Integrate with inventory allocation
4. ✅ Add delivery UI to quotation/SO forms
5. ✅ Build customer tracking interface

### Phase 6: Dropshipping Support (Week 6-7)
1. ✅ Implement dropshipping detection
2. ✅ Build supplier shipping workflow
3. ✅ Create supplier notification system
4. ✅ Handle dropshipping tracking

### Phase 7: Automation & Workflows (Week 7-8)
1. ✅ Build workflow orchestration
2. ✅ Implement automated courier assignment
3. ✅ Create exception handling
4. ✅ Build retry mechanisms
5. ✅ Implement customer notifications

### Phase 8: Testing & Migration (Week 8-9)
1. ✅ Comprehensive testing suite
2. ✅ Integration testing
3. ✅ Performance testing
4. ✅ Migrate code to MantisNXT
5. ✅ Remove standalone module folder

---

## 6. Technical Architecture

### 6.1 Service Layer Structure

```
src/lib/services/logistics/
├── CourierProviderService.ts          # Provider management
├── CourierProviderClients/
│   ├── BaseCourierClient.ts          # Abstract base
│   ├── PostNetClient.ts
│   ├── FastWayClient.ts
│   ├── CourierGuyClient.ts
│   └── DHLClient.ts
├── DeliveryCostService.ts            # Cost calculation
├── DeliveryService.ts                # Delivery CRUD
├── DeliveryTrackingService.ts        # Tracking integration
├── DeliveryWorkflowService.ts        # Workflow orchestration
└── DropshippingService.ts            # Dropshipping logic
```

### 6.2 API Routes

```
src/app/api/v1/logistics/
├── courier-providers/
│   ├── route.ts                      # List/create providers
│   └── [id]/route.ts                 # Get/update/delete
├── delivery-costs/
│   └── quote/route.ts                # Get cost quotes
├── deliveries/
│   ├── route.ts                      # List/create deliveries
│   ├── [id]/route.ts                 # Get/update/delete
│   ├── [id]/status/route.ts          # Update status
│   └── [id]/track/route.ts           # Get tracking info
└── service-tiers/
    └── route.ts                      # List service tiers
```

### 6.3 Component Structure

```
src/components/logistics/
├── DeliverySelector.tsx              # Delivery option selector
├── CourierProviderSelector.tsx       # Provider selection
├── ServiceTierSelector.tsx           # Service tier selection
├── CostComparison.tsx                # Cost quote comparison
├── DeliveryTracking.tsx               # Tracking display
├── DeliveryDashboard.tsx             # Main dashboard
└── DropshippingIndicator.tsx         # Dropshipping UI
```

---

## 7. Key Integration Points

### 7.1 Quotation Flow Integration

```typescript
// In QuotationService.createQuotation()
1. User creates quotation with items
2. User selects "Add Delivery" option
3. System calls DeliveryCostService.getQuotes() with:
   - Delivery address
   - Package details (weight, dimensions)
   - Service tier preferences
4. System displays cost options from multiple providers
5. User selects preferred option
6. Delivery cost added as line item to quotation
7. Delivery record created (status: pending)
8. Quotation total includes delivery cost
```

### 7.2 Sales Order Flow Integration

```typescript
// In SalesOrderService.createSalesOrder()
1. Sales order created from quotation or manually
2. If quotation had delivery options, auto-create delivery
3. If manual SO, prompt for delivery options
4. Reserve inventory allocations
5. Create delivery record
6. Assign courier (automated or manual)
7. Update SO status based on delivery status
```

### 7.3 Inventory Allocation Flow

```typescript
// When delivery is confirmed
1. Check if dropshipping (skip allocation)
2. For each delivery item:
   - Find inventory allocation
   - Reserve quantity
   - Link to delivery_inventory_allocations
3. When delivery completed:
   - Mark allocation as fulfilled
4. When delivery cancelled:
   - Release allocations
```

---

## 8. Dropshipping Model

### 8.1 Detection Logic

```typescript
// Dropshipping detected when:
1. Product has supplier_id
2. Supplier has dropshipping_enabled = true
3. Supplier has shipping_address configured
4. Product not in local inventory
```

### 8.2 Workflow

```typescript
1. Order created with dropshipping items
2. Create delivery record with:
   - is_dropshipping = true
   - dropship_supplier_id = supplier.id
   - pickup_address = supplier.shipping_address
3. Send notification to supplier
4. Supplier creates shipment with their courier
5. Supplier updates delivery with tracking number
6. System tracks delivery via supplier's courier API
7. Customer receives updates
```

---

## 9. Next Steps

1. **Review & Approval** - Review this document and approve approach
2. **Database Migration** - Create and run schema migrations
3. **Service Layer** - Build core services
4. **Provider Integration** - Integrate first courier provider (PostNet)
5. **UI Integration** - Add delivery selection to quotation/SO forms
6. **Testing** - Comprehensive testing
7. **Migration** - Move code to MantisNXT
8. **Deployment** - Deploy to production

---

## 10. Success Criteria

- ✅ Multiple courier providers integrated
- ✅ Real-time cost calculation working
- ✅ Seamless quotation/SO integration
- ✅ Inventory allocation working
- ✅ Dropshipping workflow functional
- ✅ Customer tracking available
- ✅ Automated workflows operational
- ✅ Module fully integrated into MantisNXT
- ✅ Standalone module folder removed

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-27  
**Status:** Ready for Implementation



