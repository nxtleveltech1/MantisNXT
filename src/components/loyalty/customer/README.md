# Customer Loyalty Portal Components

Complete suite of React components for customer-facing loyalty program interactions. Built with Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, React Query, and Framer Motion.

## Components Overview

### Main Components

#### 1. LoyaltyDashboard
**File**: `LoyaltyDashboard.tsx`

Main customer dashboard with animated points display, tier status, and recent activity.

**Features**:
- Animated points balance (large, prominent display)
- Current tier badge with icon
- Progress to next tier indicator
- Tier benefits breakdown
- Quick stats cards (total earned, redemptions, referrals, available rewards)
- Expiring points warning
- Recent activity feed
- Call-to-action buttons

**Props**:
```typescript
interface LoyaltyDashboardProps {
  customerId: string;
  onBrowseRewards?: () => void;
  onViewTransactions?: () => void;
}
```

**API**: `GET /api/v1/customers/[id]/loyalty/summary`

**Usage**:
```tsx
import { LoyaltyDashboard } from '@/components/loyalty/customer';

<LoyaltyDashboard
  customerId="customer-123"
  onBrowseRewards={() => setActiveTab('rewards')}
  onViewTransactions={() => setActiveTab('transactions')}
/>
```

---

#### 2. TierProgressTracker
**File**: `TierProgressTracker.tsx`

Visual tier progression with animated progress bar and benefits comparison.

**Features**:
- Large animated progress bar
- Current and next tier badges
- Points needed display
- Current tier benefits (expanded cards)
- Next tier benefits preview (with "New" badges)
- Milestone markers for all tiers
- Motivational messaging based on progress
- All tiers overview with unlock status

**Props**:
```typescript
interface TierProgressTrackerProps {
  customerId: string;
}
```

**API**: `GET /api/v1/customers/[id]/loyalty/summary`

**Usage**:
```tsx
import { TierProgressTracker } from '@/components/loyalty/customer';

<TierProgressTracker customerId="customer-123" />
```

---

#### 3. RewardCatalog
**File**: `RewardCatalog.tsx`

Browse and redeem rewards with filters, search, and sorting.

**Features**:
- Grid/list view toggle
- Search by name/description
- Filters: Reward type, points range (slider)
- Sort: Points (asc/desc), name
- Reward cards with image, description, points cost, stock
- "Redeem" button (disabled if insufficient points)
- Redemption confirmation modal
- Terms & conditions display
- Real-time points balance check

**Props**:
```typescript
interface RewardCatalogProps {
  customerId: string;
  currentPoints: number;
}
```

**APIs**:
- `GET /api/v1/customers/[id]/loyalty/rewards/available`
- `POST /api/v1/customers/[id]/loyalty/rewards/redeem`

**Usage**:
```tsx
import { RewardCatalog } from '@/components/loyalty/customer';

<RewardCatalog
  customerId="customer-123"
  currentPoints={8500}
/>
```

---

#### 4. TransactionHistory
**File**: `TransactionHistory.tsx`

Points transaction history with timeline view and filtering.

**Features**:
- Timeline view with activity feed items
- Filter by type (earn, redeem, expire, referral, bonus)
- Date range picker
- Search by description
- Transaction details popover (click to view)
- Running balance display
- Pagination (20 per page)
- Export to PDF/CSV (placeholder)

**Props**:
```typescript
interface TransactionHistoryProps {
  customerId: string;
}
```

**API**: `GET /api/v1/customers/[id]/loyalty/transactions`

**Usage**:
```tsx
import { TransactionHistory } from '@/components/loyalty/customer';

<TransactionHistory customerId="customer-123" />
```

---

#### 5. RedemptionStatus
**File**: `RedemptionStatus.tsx`

Track reward redemptions with status updates and progress stepper.

**Features**:
- List of redemptions with status badges
- Redemption code with one-click copy
- Progress stepper (Submitted → Approved → Fulfilled)
- Expected fulfillment date
- Status-specific messaging (pending, approved, fulfilled, cancelled)
- Filter by status
- Contact support link
- Detailed cancellation reason display

**Props**:
```typescript
interface RedemptionStatusProps {
  customerId: string;
}
```

**API**: `GET /api/v1/customers/[id]/loyalty/redemptions`

**Usage**:
```tsx
import { RedemptionStatus } from '@/components/loyalty/customer';

<RedemptionStatus customerId="customer-123" />
```

---

#### 6. ReferralProgram
**File**: `ReferralProgram.tsx`

Referral management with sharing and tracking.

**Features**:
- Unique referral link display
- One-click copy button
- Share buttons (Email, Twitter, LinkedIn, Facebook)
- Stats overview (total, successful, pending, points earned)
- Direct email invitation form
- Referral history table with status
- How it works FAQ (accordion)
- Points earned per referral display

**Props**:
```typescript
interface ReferralProgramProps {
  customerId: string;
}
```

**APIs**:
- `GET /api/v1/customers/[id]/loyalty/referrals`
- `POST /api/v1/customers/[id]/loyalty/referrals`

**Usage**:
```tsx
import { ReferralProgram } from '@/components/loyalty/customer';

<ReferralProgram customerId="customer-123" />
```

---

### Shared Components

#### PointsDisplay
**File**: `shared/PointsDisplay.tsx`

Animated points counter with smooth count-up animation.

**Props**:
```typescript
interface PointsDisplayProps {
  points: number;
  animated?: boolean;
  className?: string;
  showLabel?: boolean;
  variant?: 'default' | 'compact';
}
```

**Usage**:
```tsx
import { PointsDisplay } from '@/components/loyalty/customer/shared/PointsDisplay';

<PointsDisplay points={1250} animated className="text-4xl" />
<PointsDisplay points={500} variant="compact" showLabel={false} />
```

---

#### TierBadge
**File**: `shared/TierBadge.tsx`

Consistent tier badges with icons and colors.

**Props**:
```typescript
interface TierBadgeProps {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}
```

**Usage**:
```tsx
import { TierBadge } from '@/components/loyalty/customer/shared/TierBadge';

<TierBadge tier="gold" size="lg" />
<TierBadge tier="platinum" size="sm" showIcon={false} />
```

---

#### ActivityFeedItem
**File**: `shared/ActivityFeedItem.tsx`

Activity timeline items for transaction history.

**Props**:
```typescript
interface ActivityFeedItemProps {
  type: 'earn' | 'redeem' | 'expire' | 'referral' | 'bonus' | 'purchase';
  points: number;
  description: string;
  date: string;
  className?: string;
}
```

**Usage**:
```tsx
import { ActivityFeedItem } from '@/components/loyalty/customer/shared/ActivityFeedItem';

<ActivityFeedItem
  type="earn"
  points={100}
  description="Order #1234"
  date="2025-01-15"
/>
```

---

## Installation

All dependencies are already included in the project:

```json
{
  "@tanstack/react-query": "^5.90.2",
  "framer-motion": "^12.23.21",
  "@radix-ui/react-slider": "^1.2.1",
  "date-fns": "^4.1.0",
  "sonner": "^2.0.7"
}
```

## Complete Example

See `src/app/customers/[id]/loyalty/page.tsx` for a full integration example with tabs.

```tsx
import { LoyaltyDashboard } from '@/components/loyalty/customer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function LoyaltyPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <LoyaltyDashboard
        customerId="customer-123"
        onBrowseRewards={() => console.log('Browse rewards')}
      />
    </QueryClientProvider>
  );
}
```

## Design System

### Colors
- **Primary**: Main brand color for CTAs, badges, highlights
- **Green**: Positive actions (earned points, completed)
- **Yellow**: Warnings (pending, expiring points)
- **Red**: Negative actions (redeemed, cancelled, expired)
- **Blue**: Informational (approved status, next tier)

### Typography
- **Headings**: Bold, clear hierarchy
- **Body**: Readable, consistent spacing
- **Mono**: Codes, IDs, technical data

### Animations
- **Entrance**: Stagger children, fade + slide up
- **Points Counter**: Smooth spring animation
- **Progress Bars**: Ease-out, 1s duration
- **Transitions**: Smooth hover states, consistent timing

### Responsive Design
- **Mobile-first**: Stack on small screens
- **Breakpoints**: sm (640px), md (768px), lg (1024px)
- **Touch-friendly**: Large tap targets, accessible controls
- **Grid layouts**: Auto-responsive with CSS Grid

## API Integration

All components use React Query for data fetching with:
- **Automatic caching**: 1-minute stale time
- **Loading states**: Skeleton screens and spinners
- **Error handling**: User-friendly error messages
- **Optimistic updates**: Immediate UI feedback
- **Query invalidation**: Refresh on mutations

## Accessibility

- ✅ Semantic HTML5 elements
- ✅ ARIA labels and roles
- ✅ Keyboard navigation support
- ✅ Focus indicators
- ✅ Screen reader compatible
- ✅ Color contrast compliance (WCAG AA)

## Performance

- ✅ Code splitting ready
- ✅ Lazy loading images
- ✅ Memoized components where needed
- ✅ Optimized animations (GPU-accelerated)
- ✅ Virtual scrolling ready (for large lists)
- ✅ Bundle size optimized

## File Structure

```
src/components/loyalty/customer/
├── LoyaltyDashboard.tsx           # Main dashboard
├── TierProgressTracker.tsx        # Tier progression
├── RewardCatalog.tsx              # Browse/redeem rewards
├── TransactionHistory.tsx         # Points history
├── RedemptionStatus.tsx           # Track redemptions
├── ReferralProgram.tsx            # Referrals
├── shared/
│   ├── PointsDisplay.tsx          # Animated points counter
│   ├── TierBadge.tsx              # Tier badges
│   └── ActivityFeedItem.tsx       # Activity timeline item
├── index.ts                       # Barrel exports
└── README.md                      # This file
```

## TypeScript Support

All components are fully typed with TypeScript for:
- Props interfaces
- API response types
- Query keys
- Mutation parameters

## Testing Recommendations

### Unit Tests
- Test component rendering
- Test user interactions (clicks, form submissions)
- Test API error states
- Test loading states

### Integration Tests
- Test complete user flows (browse → redeem → track)
- Test filter and search combinations
- Test pagination
- Test referral sharing

### E2E Tests
- Test full redemption flow
- Test referral invitation flow
- Test tier progression simulation

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## License

MIT

## Author

Team G - Customer Loyalty Portal
Generated with Claude Code
