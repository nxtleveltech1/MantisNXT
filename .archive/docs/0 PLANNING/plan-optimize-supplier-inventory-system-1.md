I have created the following plan after thorough exploration and analysis of the codebase. Follow the below plan verbatim. Trust the files and references. Do not re-verify what's written in the plan. Explore only when absolutely necessary. First implement all the proposed file changes and then I'll review all the changes together at the end.

### Observations

## Current State Assessment

The NXT-SPP system is **85% complete** with a production-ready backend but fragmented frontend:

**Backend (100% Complete)**:
- Three-layer database architecture (SPP → CORE → SERVE) fully deployed to Neon PostgreSQL
- 18 tables/views, 5 stored procedures, complete SCD Type-2 price history
- 4 complete TypeScript services with 14 API endpoints
- Full type system with Zod validation schemas

**Frontend (20% Complete)**:
- ✅ Complete type system (`src/types/nxt-spp.ts`)
- ✅ API client ready (`src/lib/api/supplier-portfolio-client.ts`)
- ✅ Production-ready `SupplierProductDataTable` component
- ❌ Three competing upload wizard implementations (fragmented, not integrated)
- ❌ Legacy `ProductSelectionWizard` using old endpoints
- ❌ Missing ISI Wizard, IS-SOH Reports, Portfolio Dashboard

**Critical Clarification from User**:
1. **Single Upload System**: There must be ONLY ONE upload system - the NXT-SPP supplier inventory portfolio upload
2. **Clear Workflow**: Upload Pricelist → ISI Selection → IS-SOH (Inventory Selected - Stock on Hand)
3. **IS-SOH Scope**: Stock reports show ONLY selected inventory, not all products

**Key Issues**:
1. Multiple upload wizards create confusion - need ONE canonical implementation
2. Legacy workflows bypass the new three-layer architecture
3. No clear distinction between "all products" vs "selected inventory"
4. Missing visualization for IS-SOH (selected stock only)


### Approach

## Strategic Approach

**Phase 1: Single Upload System** (8 hours)
- Create ONE unified `EnhancedPricelistUpload` component as THE canonical upload system
- Integrate with `/api/spp/upload` → `/api/spp/validate` → `/api/spp/merge` pipeline
- DELETE (not deprecate) all other upload wizards to eliminate confusion
- This is the ONLY way to upload supplier pricelists

**Phase 2: ISI Selection Wizard** (8 hours)
- Build `ISIWizard` component for selecting products from uploaded pricelists
- Use `/api/core/selections/*` endpoints for selection workflow
- Integrate `SupplierProductDataTable` for product display
- Clear workflow: Create selection → Select products → Activate selection

**Phase 3: IS-SOH Reports** (6 hours)
- Build `ISSohReports` component showing ONLY selected inventory stock levels
- Use `/api/serve/soh?selected_only=true` to filter for selected items only
- Visualizations show stock for selected products, not all products
- Clear distinction: This is "Inventory Selected - Stock on Hand"

**Phase 4: Portfolio Dashboard** (6 hours)
- Create unified dashboard orchestrating the workflow
- Clear navigation: Upload → Select → Stock
- Activity feed showing upload → selection → stock progression
- Metrics focused on selected inventory

**Phase 5: Cleanup & Integration** (2 hours)
- DELETE all legacy upload components (no deprecation warnings)
- Update all references to use new single upload system
- Create main integration page at `/app/nxt-spp/page.tsx`
- Remove old API routes that bypass the new architecture


### Reasoning

I explored the codebase systematically:
1. Read the orchestration report and architecture documentation to understand the target state
2. Listed directory structures to map existing components and API routes
3. Examined the database schemas to understand the three-layer architecture (SPP → CORE → SERVE)
4. Reviewed backend services to confirm API contracts
5. Inspected THREE different upload wizard implementations (fragmented system)
6. Analyzed `ProductSelectionWizard` to understand current workflow
7. Checked type definitions to ensure data contract alignment
8. Identified that no SOH components exist yet
9. User clarified: ONE upload system only, IS-SOH is for SELECTED inventory only


## Mermaid Diagram

sequenceDiagram
    participant User
    participant Dashboard as Portfolio Dashboard
    participant Upload as Enhanced Upload<br/>(SINGLE SYSTEM)
    participant ISI as ISI Wizard<br/>(Selection)
    participant ISSOH as IS-SOH Reports<br/>(Selected Only)
    participant API as Backend API
    participant DB as Neon Database

    Note over User,DB: SINGLE UPLOAD SYSTEM - ONE WAY TO UPLOAD

    User->>Dashboard: Navigate to /nxt-spp
    Dashboard->>API: GET metrics & activity
    API->>DB: Query spp, core, serve schemas
    DB-->>API: Return data
    API-->>Dashboard: Display dashboard

    Note over User,Upload: STEP 1: UPLOAD PRICELIST

    User->>Upload: Click "Upload Pricelist"
    Upload->>User: Show file upload dialog
    User->>Upload: Drop Excel file
    Upload->>API: POST /api/spp/upload
    API->>DB: INSERT spp.pricelist_upload & spp.pricelist_row
    DB-->>API: Return upload_id
    API-->>Upload: Upload created

    Upload->>API: POST /api/spp/validate
    API->>DB: Validate rows, check business rules
    DB-->>API: Validation result
    API-->>Upload: Display errors/warnings

    Upload->>API: POST /api/spp/merge
    API->>DB: UPSERT core.supplier_product<br/>UPDATE core.price_history (SCD Type-2)
    DB-->>API: Merge result
    API-->>Upload: Success: X created, Y updated
    Upload-->>Dashboard: Refresh metrics

    Note over User,ISI: STEP 2: SELECT PRODUCTS TO STOCK

    User->>ISI: Navigate to Selections tab
    ISI->>API: GET /api/core/suppliers/products/table
    API->>DB: Query serve.v_product_table_by_supplier
    DB-->>API: Return ALL uploaded products
    API-->>ISI: Display products in table

    User->>ISI: Select products (checkboxes)
    ISI->>API: POST /api/core/selections (create)
    API->>DB: INSERT core.inventory_selection
    DB-->>API: Return selection_id
    API-->>ISI: Selection created

    ISI->>API: POST /api/core/selections/workflow<br/>(action='select')
    API->>DB: INSERT core.inventory_selected_item
    DB-->>API: Items selected
    API-->>ISI: Show selection summary

    User->>ISI: Activate selection
    ISI->>API: PATCH /api/core/selections/{id}<br/>(status='active')
    API->>DB: UPDATE core.inventory_selection
    DB-->>API: Selection activated
    API-->>ISI: Confirmation
    ISI-->>Dashboard: Refresh metrics

    Note over User,ISSOH: STEP 3: VIEW STOCK (SELECTED ONLY)

    User->>ISSOH: Navigate to Stock Reports tab
    ISSOH->>API: GET /api/serve/soh?selected_only=true
    Note right of API: CRITICAL: selected_only=true<br/>ALWAYS set
    API->>DB: Query serve.v_soh_by_supplier<br/>WHERE is_selected=true
    DB-->>API: Return stock for SELECTED products only
    API-->>ISSOH: Display charts & tables

    User->>ISSOH: Filter by supplier
    ISSOH->>API: GET /api/serve/soh?supplier_ids=X&selected_only=true
    API->>DB: Query filtered SELECTED stock
    DB-->>API: Return filtered results
    API-->>ISSOH: Update visualizations

    User->>ISSOH: Export report
    ISSOH->>API: GET /api/serve/soh?format=csv&selected_only=true
    API->>DB: Query SELECTED stock data
    DB-->>API: Return data
    API-->>ISSOH: Generate CSV
    ISSOH-->>User: Download CSV

    Note over User,DB: IS-SOH shows ONLY selected inventory<br/>Not all products - by design

## Proposed File Changes

### src\components\supplier-portfolio\EnhancedPricelistUpload.tsx(NEW)

References: 

- src\types\nxt-spp.ts
- src\app\api\spp\upload\route.ts
- src\app\api\spp\validate\route.ts
- src\app\api\spp\merge\route.ts
- src\components\inventory\PricelistUploadWizard.tsx(DELETE)

Create THE SINGLE, CANONICAL pricelist upload wizard for the entire system. This is the ONLY way to upload supplier pricelists.

**Core Workflow**:
1. **File Upload**: Drag-and-drop or browse for Excel/CSV files
2. **Supplier Selection**: Choose which supplier this pricelist belongs to
3. **Field Mapping**: Automatic semantic mapping of columns (SKU, Name, Price, etc.)
4. **Validation**: Real-time validation with detailed error reporting
5. **Merge**: Merge validated data into CORE schema (supplier_product, price_history)

**API Integration**:
- `POST /api/spp/upload` - Upload file and create upload record
- `POST /api/spp/validate` - Validate uploaded data
- `POST /api/spp/merge` - Merge validated data to CORE schema
- Use types from `src/types/nxt-spp.ts`: `PricelistUploadRequest`, `PricelistValidationResult`, `MergeResult`

**Features**:
- Multi-step wizard with progress indicator (5 steps)
- Drag-and-drop file upload with file type validation (.xlsx, .xls, .csv)
- Automatic field mapping using semantic patterns (similar to existing `AdvancedSemanticMapper`)
- Real-time validation progress with percentage indicator
- Detailed validation error display with row-level details
- Filter validation errors by severity (error/warning)
- Display validation summary: new products, price changes, unmapped categories
- Option to auto-validate and auto-merge on upload
- Error recovery: download error report, fix file, re-upload
- Success state with merge statistics (products created/updated, prices updated)
- Next action: Navigate to ISI Wizard to select products

**UI Components**:
- Use shadcn/ui Dialog for modal wizard
- Progress component showing current step
- Card components for each step
- Alert components for errors/warnings
- Badge components for status indicators
- Button components for actions
- Animated transitions between steps

**Validation Display**:
- Show total rows, valid rows, invalid rows
- List errors with row number, field, and message
- List warnings separately from errors
- Show summary: X new products, Y price changes, Z unmapped categories
- Allow filtering errors by type

**Success Flow**:
- Display merge result: "Created X products, Updated Y products, Updated Z prices"
- Show duration in milliseconds
- Provide button to navigate to ISI Wizard to select products
- Provide button to view uploaded products in data table

**Accessibility**:
- WCAG AAA compliant
- Keyboard navigation (Tab, Enter, Escape)
- Screen reader support with ARIA labels
- Focus management between steps
- Error announcements for screen readers

### src\components\supplier-portfolio\ISIWizard.tsx(NEW)

References: 

- src\components\supplier-portfolio\SupplierProductDataTable.tsx
- src\types\nxt-spp.ts
- src\app\api\core\selections\route.ts
- src\app\api\core\selections\workflow\route.ts
- src\app\api\core\suppliers\products\table\route.ts

Create the Inventory Selection Interface (ISI) wizard for selecting which products to stock from uploaded pricelists.

**Purpose**: After pricelists are uploaded and merged, users select which products they want to actually stock. Only selected products will appear in IS-SOH reports.

**Workflow**:
1. **Create/Select Selection**: Create new inventory selection or continue existing draft
2. **View Products**: Display all supplier products from uploaded pricelists
3. **Filter & Search**: Filter by supplier, category, price range, new/existing
4. **Select Products**: Use checkboxes to select products to stock
5. **Review Selection**: Summary with count, total value, category breakdown
6. **Activate Selection**: Change status from 'draft' to 'active' (makes products available for IS-SOH)

**API Integration**:
- `POST /api/core/selections` - Create new inventory selection (use `InventorySelectionSchema`)
- `GET /api/core/suppliers/products/table` - Fetch products for selection UI
- `POST /api/core/selections/workflow` - Execute select/deselect actions (use `SelectionWorkflowRequest`)
- `PATCH /api/core/selections/{id}` - Update selection status to 'active'
- `GET /api/core/selections/catalog` - View currently active catalog

**Key Features**:
- Embed `SupplierProductDataTable` component from `src/components/supplier-portfolio/SupplierProductDataTable.tsx` for product display
- Add selection mode: checkboxes in first column
- Bulk select/deselect: "Select All", "Deselect All", "Select All in Category"
- Filter controls: Supplier dropdown, Category dropdown, Price range slider, New/Existing toggle
- Search bar: Filter by product name or SKU
- Selection summary panel (sticky footer): Show count, total value, category breakdown
- Side-by-side comparison: Current selection vs. new products
- Price change indicators: Highlight products with significant price changes (>10%)
- Category grouping: Group products by category for easier review
- Selection notes: Allow users to add notes per product
- Quantity planning: Optional fields for min/max quantities and reorder points (stored in `inventory_selected_item`)

**Selection Workflow**:
- User selects products using checkboxes
- Click "Add to Selection" button
- Call `POST /api/core/selections/workflow` with:
  - `selection_id`: UUID of current selection
  - `supplier_product_ids`: Array of selected product UUIDs
  - `action`: 'select'
  - `selected_by`: Current user UUID
- Backend inserts records into `core.inventory_selected_item`
- Display success message with count of items added

**Activation**:
- Review selection summary
- Click "Activate Selection" button
- Show confirmation dialog: "This will make X products available for stocking. Continue?"
- Call API to update selection status to 'active'
- Only active selections appear in IS-SOH reports
- Navigate to IS-SOH Reports to view stock levels

**UI Components**:
- Use `SupplierProductDataTable` for product display
- Add selection controls above table
- Sticky footer with selection summary
- Confirmation dialog for activation
- Progress indicator showing selection coverage
- Tabs for different views: By Supplier, By Category, All Products

**State Management**:
- Track selected product IDs in component state
- Track current selection ID
- Track filter state
- Use React Query for data fetching and caching

### src\components\supplier-portfolio\ISSohReports.tsx(NEW)

References: 

- src\types\nxt-spp.ts
- src\app\api\serve\soh\route.ts
- src\app\api\serve\soh\rolled-up\route.ts
- src\app\api\serve\soh\value\route.ts
- package.json

Create the IS-SOH (Inventory Selected - Stock on Hand) reporting component. This shows stock levels ONLY for products that have been selected in the ISI workflow.

**Critical Distinction**: This component shows stock for SELECTED inventory only, not all products. It answers the question: "What stock do we have for the products we chose to stock?"

**Report Types**:
1. **By Supplier View**: Stock levels for selected products, grouped by supplier
2. **Rolled-Up View**: Aggregated stock across suppliers for same selected product
3. **Inventory Value**: Total value of selected inventory

**API Integration**:
- `GET /api/serve/soh?selected_only=true` - Get stock for selected items only (CRITICAL: always use selected_only=true)
- `GET /api/serve/soh/rolled-up?selected_only=true` - Aggregated stock for selected items
- `GET /api/serve/soh/value?selected_only=true` - Total value of selected inventory
- Use `SohReportRequest` type with `selected_only: true` always set
- Handle `SohBySupplier` and `SohRolledUp` response types

**Visualizations** (using Recharts from `package.json`):
- **Bar Chart**: Stock quantity by supplier (horizontal bars, color-coded)
- **Pie Chart**: Inventory value distribution by supplier
- **Treemap**: Category-based stock value visualization
- **Data Table**: Detailed line-item view with sorting and filtering
- **Metric Cards**: Total Value, Total Items, Supplier Count, Low Stock Alerts

**Filters & Controls**:
- Supplier multi-select: Filter by one or more suppliers
- Location multi-select: Filter by warehouse/location
- Date picker: View historical snapshots (as_of_date parameter)
- Category filter: Filter by product category
- Search bar: Filter by product name or SKU
- Toggle: "Include Zero Stock" (show/hide out-of-stock items)
- Low stock threshold slider: Highlight items below threshold

**Key Features**:
- **Export**: Download report as CSV or Excel with all filters applied
- **Refresh**: Manual refresh button to reload latest stock data
- **Drill-down**: Click on chart segments to filter table view
- **Low Stock Alerts**: Highlight items below reorder point (from `inventory_selected_item.reorder_point`)
- **Value Metrics**: Total inventory value, average cost per item, value by supplier
- **Comparison Mode**: Compare stock levels between two dates
- **Empty State**: If no products selected, show message: "No products selected. Go to ISI Wizard to select products."

**Layout**:
- Top section: Filter controls and metric cards (4 cards in a row)
- Middle section: Tabbed interface with chart types (Bar Chart, Pie Chart, Treemap)
- Bottom section: Detailed data table with pagination
- Responsive: Stack vertically on mobile, side-by-side on desktop

**Data Table Columns**:
- Supplier Name
- Product Name (from supplier)
- SKU
- Category
- Location
- Quantity on Hand
- Unit Cost
- Total Value
- Last Updated (as_of_ts)
- Status (In Stock / Low Stock / Out of Stock)

**Important Notes**:
- This component ONLY shows selected inventory (selected_only=true in all API calls)
- If a product is not selected in ISI, it will NOT appear here
- This is the "Inventory Selected - Stock on Hand" view
- Users must complete ISI workflow before seeing data here

### src\components\supplier-portfolio\PortfolioDashboard.tsx(NEW)

References: 

- src\types\nxt-spp.ts
- src\app\api\spp\upload\route.ts
- src\app\api\core\suppliers\products\route.ts
- src\app\api\core\selections\route.ts
- src\app\api\serve\soh\value\route.ts

Create the unified Portfolio Dashboard that orchestrates the entire NXT-SPP workflow: Upload → Select → Stock.

**Purpose**: Main hub for the Supplier Inventory Portfolio system, showing the progression from upload to selection to stock.

**Dashboard Layout**:

1. **Header Section**:
   - Title: "NXT-SPP - Supplier Inventory Portfolio"
   - Subtitle: "Upload → Select → Stock"
   - Quick action buttons: "Upload Pricelist", "Manage Selections", "View Stock"

2. **Workflow Progress Indicator**:
   - Visual stepper showing: Upload → Validate → Merge → Select → Stock
   - Highlight current stage based on system state
   - Show counts at each stage (e.g., "5 uploads pending validation")

3. **Key Metrics Cards** (top row, 4 cards):
   - **Total Suppliers**: Count of active suppliers with uploaded pricelists
   - **Products in Catalog**: Total products from all uploads (from core.supplier_product)
   - **Selected Products**: Count of products selected for stocking (from core.inventory_selected_item where status='selected')
   - **Selected Inventory Value**: Total value of selected stock (from serve.v_soh_by_supplier where is_selected=true)

4. **Activity Feed** (left column, 60% width):
   - **Recent Uploads**: Last 10 pricelist uploads with status badges
     - Status: Received (blue), Validating (yellow), Validated (green), Merged (green), Failed (red)
     - Show: Supplier name, filename, upload date, row count, status
     - Actions: View details, Re-validate, Merge (if validated), View errors
   - **Recent Selections**: Last 10 selection changes
     - Show: Selection name, products added/removed, date, user
   - **Price Change Alerts**: Products with significant price changes (>10%)
     - Show: Product name, supplier, old price, new price, % change
   - **New Product Notifications**: Products flagged as is_new=true
     - Show: Product name, supplier, first seen date

5. **Quick Actions Panel** (right column, 40% width):
   - **Upload Pricelist** button → Opens `EnhancedPricelistUpload` dialog
   - **Manage Selections** button → Navigates to ISI Wizard tab
   - **View Stock Reports** button → Navigates to IS-SOH Reports tab
   - **Export Selected Catalog** button → Downloads CSV of selected products
   - **System Health** indicator → Shows database connection status

6. **Charts Section** (below activity feed):
   - **Upload Trend**: Line chart showing uploads per week (last 12 weeks)
   - **Selection Coverage**: Progress bar showing % of uploaded products that are selected
   - **Category Distribution**: Pie chart showing selected products by category
   - **Supplier Contribution**: Bar chart showing selected products per supplier

**API Integration**:
- `GET /api/spp/upload?limit=10` - Recent uploads
- `GET /api/core/suppliers/products?is_new=true&limit=20` - New products
- `GET /api/core/selections?status=active` - Active selections
- `GET /api/serve/soh/value?selected_only=true` - Selected inventory value
- `GET /api/core/suppliers?active=true` - Active supplier count
- Poll for status updates every 30 seconds when uploads are in progress

**State Management**:
- Use React Query for data fetching with 30-second stale time
- Implement polling for real-time updates during uploads
- Store user preferences (default view, filters) in localStorage

**Navigation**:
- Tabbed interface: Dashboard | Upload | Selections | Stock Reports
- Each tab loads corresponding component
- Maintain tab state in URL query params (?tab=dashboard)
- Use Next.js router for navigation

**Empty States**:
- No uploads: Show "Get started by uploading your first pricelist" with Upload button
- No selections: Show "Upload complete! Now select products to stock" with Selections button
- No stock data: Show "Select products first to see stock levels" with Selections button

**Responsive Design**:
- Desktop: Multi-column layout with side-by-side panels
- Tablet: Stack panels vertically, maintain chart visibility
- Mobile: Single column, collapsible sections, bottom navigation

### src\app\nxt-spp\page.tsx(NEW)

References: 

- src\components\supplier-portfolio\PortfolioDashboard.tsx(NEW)
- src\components\supplier-portfolio\EnhancedPricelistUpload.tsx(NEW)
- src\components\supplier-portfolio\ISIWizard.tsx(NEW)
- src\components\supplier-portfolio\ISSohReports.tsx(NEW)
- src\components\layout\SelfContainedLayout.tsx

Create the main integration page for the NXT-SPP system at `/nxt-spp`.

**Page Structure**:
- Use Next.js 15 App Router with 'use client' directive
- Wrap in `SelfContainedLayout` component (similar to other pages in the app)
- Implement tabbed navigation using shadcn/ui Tabs component

**Tabs**:
1. **Dashboard** (default): Render `PortfolioDashboard` component
2. **Upload**: Render `EnhancedPricelistUpload` component
3. **Selections**: Render `ISIWizard` component
4. **Stock Reports**: Render `ISSohReports` component

**URL State Management**:
- Use URL query params to persist active tab: `/nxt-spp?tab=upload`
- Use Next.js `useSearchParams()` to read current tab
- Use Next.js `useRouter()` to update tab on navigation
- Default to 'dashboard' tab if no query param

**Component Communication**:
- When `EnhancedPricelistUpload` completes successfully:
  - Show success toast notification
  - Switch to 'selections' tab automatically
  - Pass supplier_id to ISIWizard to pre-filter products
- When `ISIWizard` activates a selection:
  - Show success toast notification
  - Refresh `PortfolioDashboard` metrics
  - Optionally switch to 'stock-reports' tab
- When switching tabs, preserve filter state in URL params

**State Management**:
- Use React Context to share state between components:
  - Current supplier filter
  - Recent upload ID
  - Active selection ID
- Pass context values as props to child components

**Error Boundaries**:
- Wrap each tab content in React Error Boundary
- Display user-friendly error messages with retry buttons
- Log errors to console (or monitoring service if configured)
- Prevent one tab's error from crashing entire page

**Loading States**:
- Show skeleton screens while components load data
- Use React Suspense for code-splitting large components
- Display loading spinner during tab transitions

**Page Metadata**:
- Set page title: "NXT-SPP - Supplier Inventory Portfolio | MantisNXT"
- Add meta description: "Manage supplier pricelists, select inventory, and track stock levels"
- Use Next.js Metadata API for proper head tags

**Breadcrumb Navigation**:
- Show breadcrumb: Home > NXT-SPP > [Current Tab]
- Make breadcrumb clickable for easy navigation

**Permissions** (future-ready):
- Add permission checks for each tab (e.g., only admins can upload)
- Hide tabs user doesn't have access to
- Show "Access Denied" message if user tries to access restricted tab
- Integrate with existing auth system when available

**Example Structure**:
```typescript
'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SelfContainedLayout from '@/components/layout/SelfContainedLayout'
import { PortfolioDashboard } from '@/components/supplier-portfolio/PortfolioDashboard'
import { EnhancedPricelistUpload } from '@/components/supplier-portfolio/EnhancedPricelistUpload'
import { ISIWizard } from '@/components/supplier-portfolio/ISIWizard'
import { ISSohReports } from '@/components/supplier-portfolio/ISSohReports'

export default function NxtSppPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') || 'dashboard'

  const handleTabChange = (tab: string) => {
    router.push(`/nxt-spp?tab=${tab}`)
  }

  return (
    <SelfContainedLayout>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="selections">Selections</TabsTrigger>
          <TabsTrigger value="stock-reports">Stock Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
          <PortfolioDashboard />
        </TabsContent>
        <TabsContent value="upload">
          <EnhancedPricelistUpload />
        </TabsContent>
        <TabsContent value="selections">
          <ISIWizard />
        </TabsContent>
        <TabsContent value="stock-reports">
          <ISSohReports />
        </TabsContent>
      </Tabs>
    </SelfContainedLayout>
  )
}
```

### src\components\inventory\PricelistUploadWizard.tsx(DELETE)

References: 

- src\components\supplier-portfolio\EnhancedPricelistUpload.tsx(NEW)
- src\app\inventory\page.tsx(MODIFY)

DELETE this file entirely. This is one of the old upload wizards that is being replaced by the single canonical `EnhancedPricelistUpload` component.

Reason for deletion:
- User specified there should be ONLY ONE upload system
- This component uses old patterns and is not integrated with the new NXT-SPP API
- Keeping multiple upload wizards creates confusion
- The new `EnhancedPricelistUpload` component consolidates all upload functionality

Before deletion, ensure:
- Update `src/app/inventory/page.tsx` to use the new component
- Search codebase for any other imports of this component and update them
- Remove any tests that reference this component

### src\components\supplier\EnhancedPricelistUploadWizard.tsx(DELETE)

References: 

- src\components\supplier-portfolio\EnhancedPricelistUpload.tsx(NEW)

DELETE this file entirely. This is another old upload wizard that is being replaced by the single canonical `EnhancedPricelistUpload` component.

Reason for deletion:
- User specified there should be ONLY ONE upload system
- This component is not integrated with the new NXT-SPP API endpoints
- Having multiple upload wizards creates confusion and maintenance burden
- The new `EnhancedPricelistUpload` component is the single source of truth

Before deletion, ensure:
- Update `src/components/examples/ComprehensiveSupplierUI.tsx` if it references this component
- Search codebase for any other imports and update them
- Remove any tests that reference this component

### src\components\suppliers\ProductSelectionWizard.tsx(DELETE)

References: 

- src\components\supplier-portfolio\ISIWizard.tsx(NEW)
- src\app\suppliers\pricelists\[id]\promote\page.tsx(MODIFY)

DELETE this file entirely. This is the old product selection wizard that uses legacy API endpoints.

Reason for deletion:
- This component uses `/api/suppliers/pricelists/promote` which bypasses the new NXT-SPP architecture
- It promotes products directly to a product table instead of using the ISI workflow
- The new `ISIWizard` component implements the correct workflow using `/api/core/selections/*` endpoints
- Keeping both creates confusion about which workflow to use

Before deletion, ensure:
- Update `src/app/suppliers/pricelists/[id]/promote/page.tsx` to use the new `ISIWizard` component
- Search codebase for any other imports and update them
- Remove any tests that reference this component

The new workflow is:
1. Upload pricelist via `EnhancedPricelistUpload`
2. Select products via `ISIWizard` (creates inventory_selection and inventory_selected_item records)
3. View stock via `ISSohReports` (shows only selected products)

### src\app\suppliers\pricelists\[id]\promote\page.tsx(MODIFY)

References: 

- src\components\supplier-portfolio\ISIWizard.tsx(NEW)
- src\components\suppliers\ProductSelectionWizard.tsx(DELETE)

Update this page to use the new `ISIWizard` component instead of the old `ProductSelectionWizard`.

Replace the import:
```typescript
// OLD:
import ProductSelectionWizard from '@/components/suppliers/ProductSelectionWizard'

// NEW:
import { ISIWizard } from '@/components/supplier-portfolio/ISIWizard'
```

Update the component usage:
```typescript
// OLD:
<ProductSelectionWizard
  pricelistId={pricelistId}
  supplierId={supplierId}
  supplierName={supplierName}
  onComplete={handleComplete}
  onCancel={handleCancel}
/>

// NEW:
<ISIWizard
  defaultSupplierId={supplierId}
  onComplete={(selection) => {
    const message = `Successfully activated selection: ${selection.selection_name}`
    router.push(`/suppliers/${supplierId}?message=${encodeURIComponent(message)}`)
  }}
  onCancel={handleCancel}
/>
```

Note: The new `ISIWizard` doesn't need a `pricelistId` because it works with all uploaded products for a supplier, not just a single pricelist. The workflow is now:
1. Upload pricelist (creates supplier_product records)
2. Select products from all uploaded products (not tied to a single pricelist)
3. Activate selection (makes products available for IS-SOH)

Consider renaming this route from `/suppliers/pricelists/[id]/promote` to `/suppliers/[id]/select-inventory` to better reflect the new workflow, or redirect to `/nxt-spp?tab=selections&supplier={id}`.

### src\app\inventory\page.tsx(MODIFY)

References: 

- src\components\supplier-portfolio\EnhancedPricelistUpload.tsx(NEW)
- src\components\inventory\PricelistUploadWizard.tsx(DELETE)

Update the inventory page to use the new single upload system and add a prominent link to the NXT-SPP dashboard.

Add an informational banner at the top of the page:
```typescript
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'
import Link from 'next/link'

// At the top of the page content:
<Alert className="mb-6 border-blue-200 bg-blue-50">
  <Info className="h-4 w-4 text-blue-600" />
  <AlertDescription className="text-blue-900">
    <strong>New System Available:</strong> The NXT-SPP Supplier Inventory Portfolio system provides a streamlined workflow for uploading pricelists, selecting inventory, and tracking stock.
    <Link href="/nxt-spp" className="ml-2 underline font-semibold hover:text-blue-700">
      Go to NXT-SPP Dashboard →
    </Link>
  </AlertDescription>
</Alert>
```

Replace the upload wizard import:
```typescript
// OLD:
import PricelistUploadWizard from '@/components/inventory/PricelistUploadWizard'

// NEW:
import { EnhancedPricelistUpload } from '@/components/supplier-portfolio/EnhancedPricelistUpload'
```

Update the component usage:
```typescript
// OLD:
<PricelistUploadWizard
  onComplete={async (result) => {
    console.log('Upload completed:', result)
  }}
/>

// NEW:
<EnhancedPricelistUpload
  open={uploadOpen}
  onOpenChange={setUploadOpen}
  onComplete={async (result) => {
    console.log('Upload completed:', result)
    setUploadOpen(false)
    // Optionally redirect to NXT-SPP dashboard
    // router.push('/nxt-spp?tab=selections')
  }}
  autoValidate={true}
/>
```

Add state for controlling the upload dialog:
```typescript
const [uploadOpen, setUploadOpen] = useState(false)
```

Update the upload button to open the dialog:
```typescript
<Button onClick={() => setUploadOpen(true)}>
  Upload Pricelist
</Button>
```

This maintains the existing inventory page while integrating the new single upload system and guiding users to the full NXT-SPP experience.

### src\app\api\suppliers\pricelists\promote\route.ts(MODIFY)

References: 

- src\app\api\core\selections\workflow\route.ts
- docs\NXT-SPP-MIGRATION-GUIDE.md(NEW)

Add a deprecation notice to this legacy endpoint and redirect to the new workflow.

Add a deprecation warning at the top of the file:
```typescript
/**
 * @deprecated This endpoint is deprecated and will be removed in v2.0
 * Use the new NXT-SPP workflow instead:
 * 1. Upload via POST /api/spp/upload
 * 2. Validate via POST /api/spp/validate
 * 3. Merge via POST /api/spp/merge
 * 4. Select via POST /api/core/selections/workflow
 * See docs/NXT-SPP-MIGRATION-GUIDE.md for details
 */
```

Modify the POST handler to add deprecation headers and warning:
```typescript
export async function POST(request: NextRequest) {
  // Log deprecation warning
  console.warn(
    '[DEPRECATED] /api/suppliers/pricelists/promote called. ' +
    'This endpoint bypasses the NXT-SPP architecture. ' +
    'Migrate to /api/core/selections/workflow'
  )

  // Add deprecation headers to response
  const headers = {
    'X-API-Deprecated': 'true',
    'X-API-Deprecation-Date': '2025-12-31',
    'X-API-Replacement': '/api/core/selections/workflow',
    'X-Migration-Guide': '/docs/NXT-SPP-MIGRATION-GUIDE.md'
  }

  try {
    // ... existing logic ...

    return NextResponse.json(
      {
        success: true,
        deprecated: true,
        deprecation_message: 'This endpoint is deprecated. Use /api/core/selections/workflow instead.',
        migration_guide: '/docs/NXT-SPP-MIGRATION-GUIDE.md',
        data: result
      },
      { headers }
    )
  } catch (error) {
    // ... error handling ...
  }
}
```

Do NOT delete the endpoint yet to maintain backward compatibility, but clearly signal deprecation to all clients.

Consider adding a rate limit or usage tracking to monitor how many clients are still using this endpoint, which will help determine when it's safe to remove.

### src\lib\api\supplier-portfolio-client.ts(MODIFY)

References: 

- src\types\nxt-spp.ts
- src\app\api\spp\upload\route.ts
- src\app\api\spp\validate\route.ts
- src\app\api\spp\merge\route.ts
- src\app\api\core\selections\route.ts
- src\app\api\core\selections\workflow\route.ts
- src\app\api\serve\soh\route.ts

Enhance the API client to add convenience methods for the new UI components if they don't already exist.

**Add Upload Methods**:
```typescript
// Upload pricelist file
async uploadPricelist(
  file: File,
  supplierId: string,
  options?: { autoValidate?: boolean; autoMerge?: boolean; currency?: string }
): Promise<PricelistUpload>

// Validate uploaded pricelist
async validateUpload(uploadId: string): Promise<PricelistValidationResult>

// Merge validated pricelist to CORE
async mergePricelist(uploadId: string): Promise<MergeResult>

// Get upload status
async getUploadStatus(uploadId: string): Promise<PricelistUpload>

// List recent uploads for a supplier
async listUploads(supplierId: string, limit?: number): Promise<PricelistUpload[]>
```

**Add Selection Methods**:
```typescript
// Create new inventory selection
async createSelection(
  name: string,
  description: string,
  createdBy: string
): Promise<InventorySelection>

// Execute selection workflow (select/deselect products)
async executeWorkflow(
  request: SelectionWorkflowRequest
): Promise<{ success: boolean; items_affected: number }>

// Get items in a selection
async getSelectionItems(selectionId: string): Promise<InventorySelectedItem[]>

// Activate selection (change status to 'active')
async activateSelection(selectionId: string): Promise<InventorySelection>

// Get active catalog (all selected products)
async getActiveCatalog(filters?: {
  supplierId?: string;
  categoryId?: string;
  search?: string;
}): Promise<SelectedCatalog[]>
```

**Add SOH Methods**:
```typescript
// Get stock on hand by supplier (selected items only)
async getSohBySupplier(
  request: SohReportRequest & { selected_only: true }
): Promise<SohBySupplier[]>

// Get rolled-up stock (aggregated across suppliers, selected items only)
async getSohRolledUp(
  request: SohReportRequest & { selected_only: true }
): Promise<SohRolledUp[]>

// Get total inventory value (selected items only)
async getInventoryValue(
  supplierIds?: string[],
  selectedOnly?: boolean
): Promise<{ total_value: number; currency: string; item_count: number }>

// Export SOH report as CSV or Excel
async exportSohReport(
  request: SohReportRequest,
  format: 'csv' | 'excel'
): Promise<Blob>
```

**Add Dashboard Methods**:
```typescript
// Get dashboard metrics (aggregate call)
async getDashboardMetrics(): Promise<{
  total_suppliers: number;
  total_products: number;
  selected_products: number;
  selected_inventory_value: number;
  recent_uploads_count: number;
  price_changes_count: number;
}>

// Get recent activity feed
async getRecentActivity(limit?: number): Promise<Array<{
  type: 'upload' | 'selection' | 'price_change' | 'new_product';
  timestamp: Date;
  description: string;
  metadata: any;
}>>
```

**Error Handling**:
- Wrap all API calls in try-catch blocks
- Throw typed errors with status codes and messages
- Add retry logic for transient failures (network errors, 5xx responses)
- Log errors to console in development mode

**Type Safety**:
- Ensure all methods use types from `src/types/nxt-spp.ts`
- Add JSDoc comments for each method
- Export all types used by the client

**Important Note**:
For all SOH methods, ensure `selected_only: true` is ALWAYS set by default. This is critical because IS-SOH reports should only show selected inventory, not all products.

### docs\NXT-SPP-MIGRATION-GUIDE.md(NEW)

References: 

- docs\NXT-SPP-ARCHITECTURE.md
- docs\NXT-SPP-QUICKSTART.md
- docs\NXT-SPP-INTEGRATION-GUIDE.md
- docs\NXT-SPP-ORCHESTRATION-REPORT.md

Create a comprehensive migration guide for teams transitioning from old upload/selection workflows to the new NXT-SPP system.

**Document Structure**:

## 1. Overview
- Explain the single upload system: ONE way to upload pricelists
- Explain the workflow: Upload → Select → Stock (IS-SOH)
- Benefits: Three-layer architecture, SCD Type-2 history, isolation, performance
- Timeline: Legacy endpoints deprecated, will be removed in v2.0

## 2. Key Concepts

### Single Upload System
- There is ONLY ONE upload system: `EnhancedPricelistUpload` component
- All pricelists must be uploaded via `/api/spp/upload`
- Old upload wizards have been removed

### Three-Layer Architecture
- **SPP (Staging)**: Upload and validation quarantine
- **CORE (Canonical)**: Single source of truth for master data
- **SERVE (Reporting)**: Read-optimized views for UI

### IS-SOH (Inventory Selected - Stock on Hand)
- Stock reports show ONLY selected inventory
- Products must be selected via ISI workflow before appearing in stock reports
- This is different from showing all products - it's intentionally filtered

## 3. Workflow Comparison

### Old Workflow
1. Upload pricelist via various upload wizards
2. "Promote" products directly to product table
3. View all products in inventory

### New Workflow
1. **Upload**: Upload pricelist via `EnhancedPricelistUpload` → `/api/spp/upload`
2. **Validate**: Automatic validation → `/api/spp/validate`
3. **Merge**: Merge to CORE schema → `/api/spp/merge`
4. **Select**: Select products to stock via `ISIWizard` → `/api/core/selections/workflow`
5. **Stock**: View stock for selected products via `ISSohReports` → `/api/serve/soh?selected_only=true`

## 4. API Endpoint Mapping

| Old Endpoint | New Endpoint | Notes |
|--------------|--------------|-------|
| Various upload endpoints | `POST /api/spp/upload` | Single upload endpoint |
| `POST /api/suppliers/pricelists/promote` | `POST /api/core/selections/workflow` | Use action='select' |
| `GET /api/suppliers/{id}/inventory` | `GET /api/core/suppliers/products/table` | Includes price history |
| `GET /api/suppliers/{id}/stock` | `GET /api/serve/soh?supplier_ids={id}&selected_only=true` | Only selected items |

## 5. Component Migration

| Old Component | New Component | Status |
|---------------|---------------|--------|
| `PricelistUploadWizard` | `EnhancedPricelistUpload` | DELETED |
| `EnhancedPricelistUploadWizard` | `EnhancedPricelistUpload` | DELETED |
| `ProductSelectionWizard` | `ISIWizard` | DELETED |
| Various inventory views | `ISSohReports` | NEW |
| No dashboard | `PortfolioDashboard` | NEW |

## 6. Data Model Changes

### Supplier Products
- Now in `core.supplier_product` (not per-supplier tables)
- Linked to internal `core.product` via `product_id` (nullable)
- Tracks `first_seen_at`, `last_seen_at`, `is_new`, `is_active`

### Price History
- Uses SCD Type-2 temporal tracking in `core.price_history`
- Each price change creates new row with `valid_from` and `valid_to`
- Current price has `is_current=true` and `valid_to=NULL`
- Never updates existing rows - always inserts new ones

### Inventory Selection
- Explicit entities: `core.inventory_selection` and `core.inventory_selected_item`
- Selection has status: draft → active → archived
- Only active selections appear in IS-SOH reports
- Products must be explicitly selected (not implicit)

### Stock on Hand
- Snapshot-based in `core.stock_on_hand` (not real-time)
- Linked to `supplier_product_id` and `location_id`
- Includes `as_of_ts` for historical snapshots
- IS-SOH reports filter by `is_selected=true`

## 7. Step-by-Step Migration

### For Developers
- [ ] Update imports to use new components from `src/components/supplier-portfolio/`
- [ ] Replace API calls with methods from `src/lib/api/supplier-portfolio-client.ts`
- [ ] Update route paths to `/nxt-spp`
- [ ] Remove references to deleted components
- [ ] Update tests to use new components and API endpoints
- [ ] Test full workflow: Upload → Validate → Merge → Select → Stock

### For Users
- [ ] Navigate to `/nxt-spp` for all supplier inventory tasks
- [ ] Use Upload tab to upload pricelists (single upload system)
- [ ] Use Selections tab to choose which products to stock
- [ ] Use Stock Reports tab to view stock levels (selected items only)
- [ ] Note: Stock reports only show products you've selected

## 8. Breaking Changes

### Removed Components
- `PricelistUploadWizard` - Use `EnhancedPricelistUpload`
- `EnhancedPricelistUploadWizard` - Use `EnhancedPricelistUpload`
- `ProductSelectionWizard` - Use `ISIWizard`

### Changed Behavior
- Stock reports now show ONLY selected inventory (not all products)
- Selection is now an explicit workflow (not automatic)
- Price history is immutable (SCD Type-2)
- Uploads must go through validation before merge

### Deprecated Endpoints
- `POST /api/suppliers/pricelists/promote` - Use `/api/core/selections/workflow`
- Will be removed in v2.0 (2025-12-31)

## 9. Common Issues

### "I don't see any stock in IS-SOH reports"
- **Cause**: No products have been selected via ISI workflow
- **Solution**: Go to Selections tab and select products to stock
- **Note**: IS-SOH only shows selected inventory by design

### "My upload failed validation"
- **Cause**: Data quality issues (missing fields, invalid prices, etc.)
- **Solution**: Review validation errors, fix data in Excel, re-upload
- **Tip**: Download error report for row-level details

### "I can't find the old upload wizard"
- **Cause**: Old upload wizards have been removed
- **Solution**: Use the new single upload system at `/nxt-spp?tab=upload`

## 10. Support & Resources

- [Architecture Overview](./NXT-SPP-ARCHITECTURE.md)
- [Quick Start Guide](./NXT-SPP-QUICKSTART.md)
- [Integration Guide](./NXT-SPP-INTEGRATION-GUIDE.md)
- [UI Components Documentation](./NXT-SPP-UI-COMPONENTS.md)
- [Orchestration Report](./NXT-SPP-ORCHESTRATION-REPORT.md)

For questions or issues, contact the development team.

### docs\NXT-SPP-UI-COMPONENTS.md(NEW)

References: 

- src\components\supplier-portfolio\EnhancedPricelistUpload.tsx(NEW)
- src\components\supplier-portfolio\ISIWizard.tsx(NEW)
- src\components\supplier-portfolio\ISSohReports.tsx(NEW)
- src\components\supplier-portfolio\PortfolioDashboard.tsx(NEW)
- src\components\supplier-portfolio\SupplierProductDataTable.tsx

Create comprehensive documentation for the NXT-SPP UI components.

**Document Structure**:

## 1. Component Overview

The NXT-SPP system consists of 5 main UI components:

1. **EnhancedPricelistUpload**: THE single upload system for all pricelists
2. **ISIWizard**: Inventory Selection Interface for choosing products to stock
3. **ISSohReports**: Stock-on-Hand reports for selected inventory only
4. **PortfolioDashboard**: Main dashboard orchestrating the workflow
5. **SupplierProductDataTable**: Advanced data table (already complete)

## 2. EnhancedPricelistUpload

### Purpose
THE ONLY way to upload supplier pricelists. This is the single canonical upload system.

### Props
```typescript
interface EnhancedPricelistUploadProps {
  open?: boolean;                    // Control dialog visibility
  onOpenChange?: (open: boolean) => void;  // Dialog state change handler
  onComplete: (result: MergeResult) => Promise<void>;  // Called after successful merge
  defaultSupplierId?: string;        // Pre-select supplier
  autoValidate?: boolean;            // Auto-validate after upload (default: false)
  autoMerge?: boolean;               // Auto-merge after validation (default: false)
}
```

### Usage Example
```typescript
import { EnhancedPricelistUpload } from '@/components/supplier-portfolio/EnhancedPricelistUpload';

function MyComponent() {
  const [open, setOpen] = useState(false);
  
  const handleComplete = async (result) => {
    console.log(`Created ${result.products_created} products`);
    console.log(`Updated ${result.products_updated} products`);
    // Navigate to selections
    router.push('/nxt-spp?tab=selections');
  };
  
  return (
    <>
      <Button onClick={() => setOpen(true)}>Upload Pricelist</Button>
      <EnhancedPricelistUpload
        open={open}
        onOpenChange={setOpen}
        onComplete={handleComplete}
        autoValidate={true}
      />
    </>
  );
}
```

### Features
- Drag-and-drop file upload (Excel, CSV)
- Automatic semantic field mapping
- Real-time validation with progress indicator
- Detailed error reporting with row-level details
- Auto-validate and auto-merge options
- Success summary with merge statistics

### Workflow Steps
1. Upload file
2. Select supplier
3. Map fields (automatic)
4. Validate data
5. Review errors/warnings
6. Merge to CORE schema
7. Navigate to selections

## 3. ISIWizard

### Purpose
Select which products to stock from uploaded pricelists. Only selected products appear in IS-SOH reports.

### Props
```typescript
interface ISIWizardProps {
  defaultSupplierId?: string;        // Pre-filter by supplier
  defaultSelectionId?: string;       // Continue existing selection
  onComplete?: (selection: InventorySelection) => void;  // Called after activation
  onCancel?: () => void;             // Cancel handler
}
```

### Usage Example
```typescript
import { ISIWizard } from '@/components/supplier-portfolio/ISIWizard';

function MyComponent() {
  const handleComplete = (selection) => {
    console.log(`Activated selection: ${selection.selection_name}`);
    // Navigate to stock reports
    router.push('/nxt-spp?tab=stock-reports');
  };
  
  return (
    <ISIWizard
      defaultSupplierId="supplier-uuid"
      onComplete={handleComplete}
    />
  );
}
```

### Features
- View all uploaded products
- Filter by supplier, category, price range
- Search by product name or SKU
- Bulk select/deselect operations
- Price change indicators
- Selection summary with total value
- Activate selection (makes products available for IS-SOH)

### Workflow Steps
1. Create new selection or continue draft
2. View products from uploaded pricelists
3. Filter and search products
4. Select products using checkboxes
5. Review selection summary
6. Activate selection
7. Navigate to stock reports

## 4. ISSohReports

### Purpose
View stock levels for SELECTED inventory only. This is "Inventory Selected - Stock on Hand".

### Props
```typescript
interface ISSohReportsProps {
  defaultFilters?: SohReportRequest;  // Pre-apply filters
  onExport?: (data: any[], format: 'csv' | 'excel') => void;  // Export handler
}
```

### Usage Example
```typescript
import { ISSohReports } from '@/components/supplier-portfolio/ISSohReports';

function MyComponent() {
  return (
    <ISSohReports
      defaultFilters={{ selected_only: true }}  // Always true by default
    />
  );
}
```

### Features
- View stock for selected products only
- By-supplier and rolled-up views
- Interactive charts (bar, pie, treemap)
- Filter by supplier, location, category
- Export to CSV/Excel
- Low stock alerts
- Inventory value calculations

### Important Note
This component ONLY shows selected inventory. If no products are selected via ISI, no data will appear. This is by design.

## 5. PortfolioDashboard

### Purpose
Main hub for the NXT-SPP system, orchestrating the Upload → Select → Stock workflow.

### Props
```typescript
interface PortfolioDashboardProps {
  defaultTab?: 'dashboard' | 'upload' | 'selections' | 'stock-reports';  // Initial tab
}
```

### Usage Example
```typescript
import { PortfolioDashboard } from '@/components/supplier-portfolio/PortfolioDashboard';

function MyComponent() {
  return <PortfolioDashboard defaultTab="dashboard" />;
}
```

### Features
- Key metrics cards (suppliers, products, selections, value)
- Activity feed (uploads, selections, price changes)
- Quick actions (upload, select, view stock)
- Charts (upload trend, selection coverage, category distribution)
- Recent uploads table
- Workflow progress indicator

## 6. Integration Example

Complete workflow integration:

```typescript
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EnhancedPricelistUpload } from '@/components/supplier-portfolio/EnhancedPricelistUpload';
import { ISIWizard } from '@/components/supplier-portfolio/ISIWizard';
import { ISSohReports } from '@/components/supplier-portfolio/ISSohReports';
import { PortfolioDashboard } from '@/components/supplier-portfolio/PortfolioDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function NxtSppPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [currentSupplierId, setCurrentSupplierId] = useState<string>();

  const handleUploadComplete = async (result) => {
    console.log('Upload complete:', result);
    setUploadOpen(false);
    setActiveTab('selections');  // Navigate to selections
  };

  const handleSelectionComplete = (selection) => {
    console.log('Selection activated:', selection);
    setActiveTab('stock-reports');  // Navigate to stock reports
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        <TabsTrigger value="upload">Upload</TabsTrigger>
        <TabsTrigger value="selections">Selections</TabsTrigger>
        <TabsTrigger value="stock-reports">Stock Reports</TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard">
        <PortfolioDashboard />
      </TabsContent>

      <TabsContent value="upload">
        <EnhancedPricelistUpload
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onComplete={handleUploadComplete}
          autoValidate={true}
        />
      </TabsContent>

      <TabsContent value="selections">
        <ISIWizard
          defaultSupplierId={currentSupplierId}
          onComplete={handleSelectionComplete}
        />
      </TabsContent>

      <TabsContent value="stock-reports">
        <ISSohReports />
      </TabsContent>
    </Tabs>
  );
}
```

## 7. Styling & Theming

- All components use shadcn/ui primitives
- Tailwind CSS for styling
- Responsive design (mobile, tablet, desktop)
- Consistent color scheme (blue for primary, green for success, red for errors)
- Dark mode support (if enabled in theme)

## 8. Accessibility

- WCAG AAA compliant
- Keyboard navigation (Tab, Enter, Escape, Arrow keys)
- Screen reader support with ARIA labels
- Focus management between steps
- Error announcements for screen readers
- High contrast mode support

## 9. Testing

- Unit tests for each component
- Integration tests for workflows
- E2E tests for critical paths (upload → select → stock)
- Accessibility tests with axe-core
- Visual regression tests with Playwright

### README.md(MODIFY)

References: 

- docs\NXT-SPP-ARCHITECTURE.md
- docs\NXT-SPP-QUICKSTART.md
- docs\NXT-SPP-INTEGRATION-GUIDE.md
- docs\NXT-SPP-UI-COMPONENTS.md(NEW)
- docs\NXT-SPP-MIGRATION-GUIDE.md(NEW)

Update the main README to prominently feature the NXT-SPP system.

Add a new section near the top of the README (after project description):

## 🎯 NXT-SPP: Supplier Inventory Portfolio System

The NXT-SPP system provides a streamlined workflow for managing supplier pricelists, selecting inventory, and tracking stock levels.

### Quick Start

**Access the System**: Navigate to `/nxt-spp` in your browser

**Workflow**: Upload → Select → Stock

1. **Upload**: Upload supplier pricelists (Excel/CSV) - THE single upload system
2. **Select**: Choose which products to stock via ISI (Inventory Selection Interface)
3. **Stock**: View stock levels for selected products via IS-SOH (Inventory Selected - Stock on Hand)

### Key Features

- ✅ **Single Upload System**: ONE canonical way to upload all supplier pricelists
- ✅ **Three-Layer Architecture**: SPP (Staging) → CORE (Canonical) → SERVE (Reporting)
- ✅ **Price History Tracking**: SCD Type-2 temporal tracking of all price changes
- ✅ **Explicit Selection**: Choose which products to stock (not automatic)
- ✅ **IS-SOH Reports**: Stock reports for selected inventory only
- ✅ **Real-time Validation**: Upload validation with detailed error reporting

### Components

- **EnhancedPricelistUpload**: THE single upload wizard for all pricelists
- **ISIWizard**: Inventory Selection Interface for choosing products
- **ISSohReports**: Stock-on-Hand reports for selected inventory
- **PortfolioDashboard**: Main dashboard orchestrating the workflow

### Documentation

- [Architecture Overview](docs/NXT-SPP-ARCHITECTURE.md) - System design and data flow
- [Quick Start Guide](docs/NXT-SPP-QUICKSTART.md) - Get started in 5 minutes
- [Integration Guide](docs/NXT-SPP-INTEGRATION-GUIDE.md) - Developer integration
- [UI Components](docs/NXT-SPP-UI-COMPONENTS.md) - Component documentation
- [Migration Guide](docs/NXT-SPP-MIGRATION-GUIDE.md) - Migrate from old system

### API Endpoints

- **SPP Layer**: `/api/spp/*` - Upload, validate, merge pricelists
- **CORE Layer**: `/api/core/*` - Product catalog, selections, suppliers
- **SERVE Layer**: `/api/serve/*` - Stock reports, analytics

For detailed API documentation, see [NXT-SPP Architecture](docs/NXT-SPP-ARCHITECTURE.md).

### Database

Neon PostgreSQL with three schemas:
- `spp`: Staging/isolation for uploads
- `core`: Canonical master data (single source of truth)
- `serve`: Read-optimized views for reporting

For database schema details, see migration files in `database/migrations/neon/`.

### Important Notes

- **Single Upload System**: There is ONLY ONE way to upload pricelists - via the NXT-SPP system
- **IS-SOH Scope**: Stock reports show ONLY selected inventory (not all products)
- **Explicit Selection**: Products must be selected via ISI before appearing in stock reports
- **Legacy Endpoints**: Old upload/selection endpoints are deprecated and will be removed in v2.0

---

[Rest of existing README content...]