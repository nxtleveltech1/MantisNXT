# Loyalty & Rewards Admin Components

Complete production-ready admin interface for managing the loyalty and rewards system.

## Components Overview

### 1. ProgramConfiguration.tsx
**Multi-step loyalty program configuration**

**Features:**
- 5-step wizard: Basic Info → Tier Thresholds → Tier Benefits → Points Expiry → Review
- Visual stepper with progress tracking
- Real-time validation with Zod schema
- JSON editor with visual preview for tiers
- Full CRUD operations for loyalty programs
- Responsive design with mobile support

**Usage:**
```tsx
import { ProgramConfiguration } from '@/components/loyalty/admin'

<ProgramConfiguration
  programId="optional-for-editing"
  onSuccess={() => console.log('Program saved')}
  onCancel={() => console.log('Cancelled')}
/>
```

**API Integration:**
- GET `/api/v1/admin/loyalty/programs/:id` - Fetch program
- POST `/api/v1/admin/loyalty/programs` - Create program
- PUT `/api/v1/admin/loyalty/programs/:id` - Update program

---

### 2. RewardCatalogManager.tsx
**Complete reward catalog management**

**Features:**
- Sortable, filterable rewards DataTable
- Create/Edit reward dialog with full form validation
- Stock management with low-stock alerts
- Image upload support
- Bulk activate/deactivate operations
- Reward analytics view with metrics
- Delete confirmation with safety checks
- Export to CSV

**Usage:**
```tsx
import { RewardCatalogManager } from '@/components/loyalty/admin'

<RewardCatalogManager />
```

**API Integration:**
- GET `/api/v1/admin/loyalty/rewards` - List rewards
- POST `/api/v1/admin/loyalty/rewards` - Create reward
- PUT `/api/v1/admin/loyalty/rewards/:id` - Update reward
- DELETE `/api/v1/admin/loyalty/rewards/:id` - Delete reward
- PUT `/api/v1/admin/loyalty/rewards/:id/stock` - Update stock
- GET `/api/v1/admin/loyalty/rewards/:id/analytics` - View analytics

---

### 3. RuleEngineBuilder.tsx
**Visual loyalty rule builder**

**Features:**
- Draggable rule list with priority ordering
- Create rule wizard with trigger selection
- Visual condition builder (order amount, tier, count)
- Points multiplier and bonus configuration
- Test sandbox with sample data
- Enable/disable toggles with instant updates
- Date-based rule validity

**Usage:**
```tsx
import { RuleEngineBuilder } from '@/components/loyalty/admin'

<RuleEngineBuilder />
```

**API Integration:**
- GET `/api/v1/admin/loyalty/rules` - List rules
- POST `/api/v1/admin/loyalty/rules` - Create rule
- PUT `/api/v1/admin/loyalty/rules/:id` - Update rule
- DELETE `/api/v1/admin/loyalty/rules/:id` - Delete rule
- POST `/api/v1/admin/loyalty/rules/:id/toggle` - Toggle active
- POST `/api/v1/admin/loyalty/rules/:id/test` - Test rule

---

### 4. RedemptionQueue.tsx
**Redemption workflow management**

**Features:**
- Real-time redemption queue with status filters
- Bulk selection and operations
- Approve workflow with confirmation
- Fulfill workflow with notes
- Cancel with reason and auto-refund
- Customer info popover
- Pagination with configurable page size
- Stats dashboard (pending, approved, fulfilled)

**Usage:**
```tsx
import { RedemptionQueue } from '@/components/loyalty/admin'

<RedemptionQueue />
```

**API Integration:**
- GET `/api/v1/admin/loyalty/redemptions` - List redemptions
- POST `/api/v1/admin/loyalty/redemptions/bulk/approve` - Bulk approve
- POST `/api/v1/admin/loyalty/redemptions/bulk/fulfill` - Bulk fulfill
- POST `/api/v1/admin/loyalty/redemptions/bulk/cancel` - Bulk cancel

---

### 5. LoyaltyLeaderboard.tsx
**Gamification leaderboard**

**Features:**
- Top customers ranking table
- Period selector (month, quarter, year, all-time)
- Tier filter
- Rank badges with medals (gold, silver, bronze)
- Points earned display with period breakdown
- Export to CSV
- Animated rank indicators
- Tier distribution stats

**Usage:**
```tsx
import { LoyaltyLeaderboard } from '@/components/loyalty/admin'

<LoyaltyLeaderboard />
```

**API Integration:**
- GET `/api/v1/admin/loyalty/analytics/leaderboard` - Fetch leaderboard

**Query Parameters:**
- `period`: month | quarter | year | all
- `tier`: bronze | silver | gold | platinum | diamond
- `limit`: number (25, 50, 100, 250)

---

### 6. LoyaltyAnalytics.tsx
**Comprehensive analytics dashboard**

**Features:**
- KPI cards: Points issued, redeemed, customers, redemption rate
- Line chart: Points flow over time with dual axis
- Pie chart: Tier distribution with color coding
- Bar chart: Top 10 rewards by redemptions
- Date range selector (7d, 30d, 90d, month)
- Export reports (JSON format)
- Recent activity breakdown
- Program summary statistics

**Usage:**
```tsx
import { LoyaltyAnalytics } from '@/components/loyalty/admin'

<LoyaltyAnalytics />
```

**API Integration:**
- GET `/api/v1/admin/loyalty/analytics/metrics/:programId` - Program metrics
- GET `/api/v1/admin/loyalty/analytics/points-flow/:programId` - Points flow data
- GET `/api/v1/admin/loyalty/analytics/tier-distribution/:programId` - Tier data

**Charts Used:**
- Recharts LineChart for points flow
- Recharts PieChart for tier distribution
- Recharts BarChart for top rewards

---

### 7. CustomerLoyaltyProfile.tsx
**Individual customer loyalty view**

**Features:**
- Loyalty summary card with tier badge
- Tier progress bar with next tier calculation
- Transaction history table
- Redemption history with status
- Manual points adjustment form
- Activity timeline
- Benefits breakdown
- Lifetime value tracking

**Usage:**
```tsx
import { CustomerLoyaltyProfile } from '@/components/loyalty/admin'

<CustomerLoyaltyProfile customerId="customer-uuid" />
```

**API Integration:**
- GET `/api/v1/admin/loyalty/customers/:id` - Customer loyalty data
- GET `/api/v1/admin/loyalty/customers/:id/transactions` - Transaction history
- GET `/api/v1/admin/loyalty/customers/:id/redemptions` - Redemption history
- POST `/api/v1/admin/loyalty/customers/:id/adjust` - Adjust points

---

## Technical Stack

### Frontend
- **React 19** with hooks (useState, useEffect, useMemo)
- **Next.js 14** App Router
- **TypeScript** (strict mode)
- **Tailwind CSS** for styling
- **shadcn/ui** component library

### State Management
- **React Query** (TanStack Query v5)
  - Caching and synchronization
  - Optimistic updates
  - Automatic refetching

### Forms
- **React Hook Form** with Zod validation
- **@hookform/resolvers** for schema integration
- Type-safe form handling

### Charts
- **Recharts** library
  - LineChart, BarChart, PieChart
  - Responsive containers
  - Custom tooltips

### UI Components Used
- Button, Input, Textarea, Select, Checkbox, Switch
- Table, Dialog, Sheet, Popover, DropdownMenu
- Card, Badge, Avatar, Skeleton, Progress
- Form, Label, Tabs, Separator
- DatePicker (react-day-picker)

---

## File Structure

```
src/components/loyalty/admin/
├── ProgramConfiguration.tsx      (26KB - Multi-step wizard)
├── RewardCatalogManager.tsx      (36KB - Full CRUD + analytics)
├── RuleEngineBuilder.tsx         (32KB - Visual builder + testing)
├── RedemptionQueue.tsx           (27KB - Workflow management)
├── LoyaltyLeaderboard.tsx        (14KB - Rankings + export)
├── LoyaltyAnalytics.tsx          (20KB - Dashboard + charts)
├── CustomerLoyaltyProfile.tsx    (20KB - Customer detail view)
├── index.ts                      (Barrel exports)
└── README.md                     (This file)
```

---

## Quality Standards

### TypeScript
- ✅ Zero TypeScript errors
- ✅ Full type safety with imported types from `@/types/loyalty`
- ✅ Strict mode compliant

### Responsive Design
- ✅ Mobile-first approach
- ✅ Breakpoint handling (sm, md, lg, xl)
- ✅ Touch-friendly interactions

### Loading States
- ✅ Skeleton loaders during data fetching
- ✅ Disabled states during mutations
- ✅ Loading text indicators

### Error Handling
- ✅ Toast notifications (sonner)
- ✅ Try-catch in API calls
- ✅ Validation errors displayed inline

### Empty States
- ✅ Meaningful empty state messages
- ✅ Call-to-action buttons
- ✅ Helpful text

### Accessibility
- ✅ ARIA labels where needed
- ✅ Keyboard navigation support
- ✅ Focus management in dialogs
- ✅ Semantic HTML

### Performance
- ✅ Memoized computed values (useMemo)
- ✅ Optimistic updates where appropriate
- ✅ Query result caching
- ✅ Pagination for large datasets

---

## API Endpoint Reference

All endpoints are prefixed with `/api/v1/admin/loyalty/`

### Programs
- `GET /programs` - List all programs
- `GET /programs/:id` - Get program by ID
- `POST /programs` - Create program
- `PUT /programs/:id` - Update program
- `DELETE /programs/:id` - Delete program

### Rewards
- `GET /rewards` - List all rewards
- `GET /rewards/:id` - Get reward by ID
- `POST /rewards` - Create reward
- `PUT /rewards/:id` - Update reward
- `DELETE /rewards/:id` - Delete reward
- `PUT /rewards/:id/stock` - Update stock
- `GET /rewards/:id/analytics` - Get analytics

### Rules
- `GET /rules` - List all rules
- `GET /rules/:id` - Get rule by ID
- `POST /rules` - Create rule
- `PUT /rules/:id` - Update rule
- `DELETE /rules/:id` - Delete rule
- `POST /rules/:id/toggle` - Toggle active status
- `POST /rules/:id/test` - Test rule with sample data

### Redemptions
- `GET /redemptions` - List all redemptions
- `POST /redemptions/bulk/approve` - Bulk approve
- `POST /redemptions/bulk/fulfill` - Bulk fulfill
- `POST /redemptions/bulk/cancel` - Bulk cancel

### Analytics
- `GET /analytics/leaderboard` - Leaderboard data
- `GET /analytics/metrics/:programId` - Program metrics
- `GET /analytics/points-flow/:programId` - Points flow
- `GET /analytics/tier-distribution/:programId` - Tier distribution

### Customers
- `GET /customers/:id` - Customer loyalty data
- `GET /customers/:id/transactions` - Transaction history
- `GET /customers/:id/redemptions` - Redemption history
- `POST /customers/:id/adjust` - Adjust points

---

## Integration Example

```tsx
// app/admin/loyalty/page.tsx
import {
  ProgramConfiguration,
  RewardCatalogManager,
  RuleEngineBuilder,
  RedemptionQueue,
  LoyaltyLeaderboard,
  LoyaltyAnalytics,
  CustomerLoyaltyProfile,
} from '@/components/loyalty/admin'

export default function LoyaltyAdminPage() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="analytics">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <LoyaltyAnalytics />
        </TabsContent>

        <TabsContent value="programs">
          <ProgramConfiguration />
        </TabsContent>

        <TabsContent value="rewards">
          <RewardCatalogManager />
        </TabsContent>

        <TabsContent value="rules">
          <RuleEngineBuilder />
        </TabsContent>

        <TabsContent value="redemptions">
          <RedemptionQueue />
        </TabsContent>

        <TabsContent value="leaderboard">
          <LoyaltyLeaderboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

---

## Success Criteria

✅ **All 7 components built and working**
✅ **Full integration with API endpoints**
✅ **Beautiful, professional UI using shadcn/ui**
✅ **Zero console errors**
✅ **TypeScript strict mode compliant**
✅ **Production-ready code quality**
✅ **Comprehensive error handling**
✅ **Loading and empty states**
✅ **Responsive mobile design**
✅ **Accessibility compliant**

---

## Author
Built by Team F - Frontend Specialists
Date: 2025-11-02

## License
Internal use only - MantisNXT Platform
