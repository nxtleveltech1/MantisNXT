# Categories Module - Complete File Navigation

## Frontend Pages (View Layer)

### Main Dashboard
- **File**: `/home/user/MantisNXT/src/app/catalog/categories/(cmm)/page.tsx`
- **Lines**: 1812 total
- **Status**: ✅ Fully implemented
- **Purpose**: Main categorization dashboard with statistics
- **Features**: Stats overview, category list, recent updates, job tracking

### Tags Management
- **File**: `/home/user/MantisNXT/src/app/catalog/categories/(cmm)/tags/page.tsx`
- **Lines**: 503
- **Status**: ✅ Fully implemented
- **Purpose**: Complete tag lifecycle management
- **Features**: Create tags, assign to products, create rules, apply rules, predictive tagging
- **Imports**: AppLayout, Card, Button, Input, Label, Select, Badge, Toast

### Analytics & Insights
- **File**: `/home/user/MantisNXT/src/app/catalog/categories/(cmm)/analytics/page.tsx`
- **Lines**: 474
- **Status**: ✅ Fully implemented
- **Purpose**: Tag performance analytics and visualization
- **Features**: Bar charts, pie charts, line charts, seasonality analysis, detailed tables
- **Dependencies**: Recharts, Skeleton components, AppLayout

### Categories Management
- **File**: `/home/user/MantisNXT/src/app/catalog/categories/(cmm)/categories/page.tsx`
- **Lines**: 212
- **Status**: ✅ Fully implemented
- **Purpose**: Category CRUD operations
- **Features**: Create categories, list with hierarchy, parent-child relationships

### AI Categorization
- **File**: `/home/user/MantisNXT/src/app/catalog/categories/(cmm)/ai-categorization/page.tsx`
- **Lines**: 283
- **Status**: ✅ Fully implemented
- **Purpose**: AI-powered product categorization
- **Features**: Job management, progress tracking, batch categorization

### Exceptions Handling
- **File**: `/home/user/MantisNXT/src/app/catalog/categories/(cmm)/exceptions/page.tsx`
- **Lines**: 331
- **Status**: ✅ Fully implemented
- **Purpose**: Handle categorization exceptions and edge cases
- **Features**: Exception list, manual review interface

### Conflicts Resolution
- **File**: `/home/user/MantisNXT/src/app/catalog/categories/(cmm)/conflicts/page.tsx`
- **Lines**: 9
- **Status**: ❌ **STUB - NOT IMPLEMENTED**
- **Issue**: Just imports component, doesn't implement conflict detection
- **Component Used**: ConflictResolutionQueue (from @/components/cmm/)
- **Action Required**: Build actual conflict resolution UI

---

## API Routes (Backend Layer)

### Tags CRUD
- **File**: `/home/user/MantisNXT/src/app/api/tags/route.ts`
- **Methods**: GET (list), POST (create)
- **Status**: ✅ Working
- **Schema Support**: Core ✅, Legacy ✅, Demo ✅
- **Exports**: 
  - `listCoreTags()` - From tag-service-core
  - `createCoreTag()` - From tag-service-core
  - `listLegacyTags()` - From db-sql
  - `addLegacyTag()` - From db-sql

### Tag Assignment
- **File**: `/home/user/MantisNXT/src/app/api/tags/assign/route.ts`
- **Method**: POST
- **Status**: ✅ Core schema, ⚠️ Legacy schema (needs testing)
- **Imports**:
  - `assignCoreTag()` - From tag-service-core
  - `assignLegacyTag()` - From db-sql
- **Parameters**: sku, supplierProductId, tagId, tagName

### Tag Rules
- **File**: `/home/user/MantisNXT/src/app/api/tags/rules/route.ts`
- **Methods**: GET (list), POST (create)
- **Status**: ✅ Both schemas
- **Imports**:
  - `listCoreTagRules()` - From tag-service-core
  - `createCoreTagRule()` - From tag-service-core
  - `listLegacyRules()` - From db-sql
  - `addLegacyRule()` - From db-sql

### Tag Rules Apply
- **File**: `/home/user/MantisNXT/src/app/api/tags/rules/apply/route.ts`
- **Method**: POST
- **Status**: ✅ Both schemas
- **Imports**:
  - `applyCoreTagRules()` - From tag-service-core
  - `applyLegacyRules()` - From db-sql

### Predictive Tag Assignment
- **File**: `/home/user/MantisNXT/src/app/api/tags/predictive-assign/route.ts`
- **Method**: POST
- **Status**: ✅ Core schema, ❌ Legacy schema (TypeScript errors)
- **Error Location**: Lines 37-45
- **Broken Code**:
  ```typescript
  const fullProduct = {
    sku: product.sku,
    supplierId: product.supplierId ?? "unknown",    // ❌ MISSING
    stockType: product.stockType,                    // ❌ MISSING
    attributes: product.attributes ?? {},           // ❌ MISSING
    updatedAt: product.updatedAt ?? Date.now(),    // ❌ MISSING
  }
  ```
- **Imports**:
  - `predictiveAssignCoreTags()` - From tag-service-core
  - `predictiveTags()` - From db-sql (legacy)
- **Action Required**: Fix type mismatch

### Tag Analytics
- **File**: `/home/user/MantisNXT/src/app/api/tags/analytics/route.ts`
- **Method**: GET
- **Status**: ✅ Both schemas
- **Parameters**: tag (optional, defaults to "all")
- **Core Schema Queries**:
  - `core.ai_tag_assignment` with price history
  - `core.supplier_product` category breakdown
  - Monthly assignment trends
- **Legacy Schema Queries**:
  - `sales_analytics` with tag assignments
  - Product-based metrics
  - Historical sales trends
- **Response Fields**:
  - `tagAnalytics[]` - Tag performance metrics
  - `seasonalityData[]` - Monthly trends
  - `categoryData[]` - Category breakdown
  - `isDemoMode` - Data source indicator

### Categories Endpoints
- **File**: `/home/user/MantisNXT/src/app/api/categories/route.ts`
- **Methods**: GET (list), POST (create)
- **Status**: ✅ Both schemas
- **Core Schema Query**: `core.category` with product counts

### Categories Dashboard
- **File**: `/home/user/MantisNXT/src/app/api/categories/dashboard/route.ts`
- **Method**: GET
- **Status**: ✅ Both schemas
- **Response Fields**:
  - `categories` - Stats (total, visible, hidden, etc.)
  - `products` - Stats (total, categorized, uncategorized)
  - `topCategories[]` - By product count
  - `recentCategories[]` - By creation date

---

## Backend Services (Business Logic)

### Tag Service - Core Implementation
- **File**: `/home/user/MantisNXT/src/lib/cmm/tag-service-core.ts`
- **Lines**: 300+
- **Status**: ✅ Production-ready
- **Core Functions**:
  | Function | Status | Purpose |
  |----------|--------|---------|
  | `ensureCoreTagInfrastructure()` | ✅ | Create tables if missing |
  | `listCoreTags()` | ✅ | Get all tags with counts |
  | `createCoreTag()` | ✅ | Create new tag |
  | `assignCoreTag()` | ✅ | Assign tag to product |
  | `removeCoreTagAssignment()` | ✅ | Remove tag from product |
  | `listCoreTagRules()` | ✅ | Get all rules |
  | `createCoreTagRule()` | ✅ | Create keyword rule |
  | `applyCoreTagRules()` | ✅ | Apply all rules to products |
  | `predictiveAssignCoreTags()` | ✅ | Predictive tagging |

- **Database Tables Created**:
  - `core.ai_tag_library` - Tag definitions
  - `core.ai_tag_assignment` - Product-tag mappings
  - `core.ai_tag_rule` - Automation rules

### Database SQL Operations
- **File**: `/home/user/MantisNXT/src/lib/cmm/db-sql.ts`
- **Lines**: 200+
- **Status**: ✅ Legacy support
- **Functions**:
  | Function | Status | Purpose |
  |----------|--------|---------|
  | `getProduct()` | ✅ | Fetch single product |
  | `getProducts()` | ✅ | Fetch all products |
  | `getCategories()` | ✅ | Fetch categories |
  | `addTag()` | ✅ | Create tag |
  | `listTags()` | ✅ | List tags |
  | `assignTag()` | ✅ | Assign tag |
  | `removeTag()` | ✅ | Remove tag |
  | `listRules()` | ✅ | List rules |
  | `addRuleKeyword()` | ✅ | Create rule |
  | `applyRules()` | ✅ | Apply all rules |
  | `predictiveTags()` | ✅ | Generate tag suggestions |

### Schema Mode Detection
- **File**: `/home/user/MantisNXT/src/lib/cmm/db.ts`
- **Lines**: 100+
- **Status**: ✅ Production-ready
- **Key Functions**:
  | Function | Returns | Purpose |
  |----------|---------|---------|
  | `getSchemaMode()` | "core" \| "legacy" \| "none" | Detect database schema |
  | `probeSchema()` | "core" \| "legacy" \| "none" | Check what tables exist |
  | `checkDatabaseSchema()` | boolean | Simple schema check |
  | `getMockProducts()` | Product[] | Demo data |

- **Schema Detection Logic**:
  - **Core**: Checks for `core.supplier_product`, `core.category`, `core.ai_categorization_job`
  - **Legacy**: Checks for `products`, `categories`, `tags` in public schema
  - **None**: Demo mode with hardcoded data
  - **Cache TTL**: 5 minutes (configurable)

### Type Definitions
- **File**: `/home/user/MantisNXT/src/lib/cmm/types.ts`
- **Status**: ✅ Complete
- **Types Defined**:
  - `Product` - SKU-based product info
  - `Category` - Category hierarchy
  - `Tag` - Tag with type (seasonal/stock/custom)
  - `TagAssignment` - SKU + tag mapping
  - `Supplier` - Supplier info
  - `Conflict` - Data conflict record
  - `Rule` - Automation rule

---

## Database Migrations & Schema Files

### Core Schema Migration
- **Location**: Created dynamically by `ensureCoreTagInfrastructure()`
- **File**: `src/lib/cmm/tag-service-core.ts` (lines 10-38)
- **Tables**:
  ```sql
  core.ai_tag_library
  core.ai_tag_assignment
  core.ai_tag_rule
  ```
- **Indexes**: ✅ All defined
- **Action Required**: Convert to formal migration file

### Legacy Schema
- **Not explicitly created** - Assumed to exist
- **Tables**:
  - `public.tags`
  - `public.tag_assignments`
  - `public.products`
  - `public.categories`
  - `public.sales_analytics`

---

## Components Used (UI)

### Layout Components
- `AppLayout` - Page wrapper with breadcrumbs
- `Card` / `CardContent` / `CardHeader` / `CardTitle` - Content containers
- `CardDescription` - Subtitle text

### Form Components
- `Input` - Text input fields
- `Label` - Form labels
- `Select` / `SelectTrigger` / `SelectContent` / `SelectItem` - Dropdowns
- `Button` - Action buttons
- `Badge` - Tag/label display

### Data Display
- `Table` - Tabular data display (manual HTML in analytics)
- `Progress` - Progress bar
- `Skeleton` - Loading placeholder

### Charts
- `BarChart`, `Bar` - Recharts bar chart
- `PieChart`, `Pie`, `Cell` - Recharts pie chart
- `LineChart`, `Line` - Recharts line chart
- `ResponsiveContainer` - Responsive wrapper
- `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend` - Chart utilities

### Notification
- `toast` from "sonner" - Toast notifications

### Icons
- Lucide React icons:
  - `Plus` - Add action
  - `LucideTag` - Tag icon
  - `Zap` - Lightning/rules
  - `Target` - Targeting/assignment
  - `RefreshCcw` - Refresh
  - `TrendingUp` / `TrendingDown` - Trend indicators
  - `DollarSign` - Currency
  - `Package` - Products
  - `AlertCircle` - Alerts
  - `Database` - Schema mode
  - `GitBranch` - Hierarchy
  - `BarChart3` - Analytics

---

## External Dependencies

### Database
- `@/lib/database` - Database connection
- `@/lib/database/unified-connection` - Unified DB interface

### UI Framework
- React (hooks: useState, useEffect, useMemo, useCallback)
- Next.js (API routes, App Router)
- Recharts (charting library)
- Sonner (toast notifications)
- Lucide React (icons)

### Type Safety
- TypeScript types imported from `@/lib/cmm/types`

---

## Quick Navigation by Feature

### Want to work on Tags?
1. **Start Here**: `src/app/catalog/categories/(cmm)/tags/page.tsx`
2. **Backend**: `src/lib/cmm/tag-service-core.ts`
3. **API**: `src/app/api/tags/route.ts`

### Want to work on Analytics?
1. **Start Here**: `src/app/catalog/categories/(cmm)/analytics/page.tsx`
2. **API**: `src/app/api/tags/analytics/route.ts`
3. **Reference**: `src/lib/cmm/db.ts` for schema detection

### Want to fix Predictive Tagging?
1. **Broken File**: `src/app/api/tags/predictive-assign/route.ts` (lines 37-45)
2. **Type Definition**: `src/lib/cmm/types.ts` - Product type
3. **Legacy Logic**: `src/lib/cmm/db-sql.ts` - predictiveTags()
4. **Core Logic**: `src/lib/cmm/tag-service-core.ts` - predictiveAssignCoreTags()

### Want to build Conflicts Resolution?
1. **Stub File**: `src/app/catalog/categories/(cmm)/conflicts/page.tsx`
2. **Component**: Look for `ConflictResolutionQueue` in `src/components/cmm/`
3. **Reference**: `src/app/catalog/categories/(cmm)/exceptions/page.tsx` for UI pattern

### Want to implement tag Update/Delete?
1. **Frontend**: `src/app/catalog/categories/(cmm)/tags/page.tsx` (add UI buttons)
2. **API**: Create `src/app/api/tags/[tagId]/route.ts`
3. **Service**: Add to `src/lib/cmm/tag-service-core.ts`:
   - `updateCoreTag()`
   - `deleteCoreTag()`

---

## Common Import Paths

```typescript
// Services
import { getSchemaMode } from "@/lib/cmm/db"
import { listCoreTags, createCoreTag } from "@/lib/cmm/tag-service-core"
import { listTags, addTag } from "@/lib/cmm/db-sql"

// Database
import { query } from "@/lib/database"
import { query as dbQuery } from "@/lib/database/unified-connection"

// Components
import AppLayout from "@/components/layout/AppLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Utils
import { toast } from "sonner"
```

---

## Git Branch
- **Current**: `claude/refine-categories-tags-analytics-011CUzERaiPCccHdTfws2hpw`
- **Commits**: b6c3989 (feat: Implement analytics API...) and earlier

---

**Document Version**: 1.0
**Last Updated**: November 10, 2024
