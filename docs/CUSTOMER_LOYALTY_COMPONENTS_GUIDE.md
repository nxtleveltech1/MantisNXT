# Customer Loyalty Components - Visual Guide

A comprehensive visual guide to all customer-facing loyalty components.

---

## 🏆 Component Overview

### 1. LoyaltyDashboard

**Purpose**: Main hub for customer loyalty information

```
┌─────────────────────────────────────────────────────┐
│  🎯 Your Points Balance                             │
│                                                     │
│              8,500 points                           │
│              ⏰ 100 pending                         │
│                                                     │
│              🥇 GOLD TIER                           │
│                                                     │
│  [Browse Rewards →]  [View Activity]               │
└─────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  ✨ Next Tier: Platinum                              │
│  ████████████░░░░░░  56.7%                          │
│  6,500 points to platinum                           │
└──────────────────────────────────────────────────────┘

┌──────┬──────┬──────┬──────┐
│📈    │🎁    │👥    │🏆    │
│15,000│  13  │   2  │  12  │
│Earned│Redemp│Refer │Avail │
└──────┴──────┴──────┴──────┘

┌─────────────────────────────┐
│ Your Gold Benefits          │
│ 1.5x   10%    Free Shipping│
└─────────────────────────────┘

⚠️ 100 points expiring on Dec 15, 2025
```

**Key Features**:
- Large animated points display
- Tier badge with icon
- Progress to next tier
- Quick stats grid
- Benefits breakdown
- Expiring points alert

---

### 2. TierProgressTracker

**Purpose**: Visualize tier progression and benefits

```
┌──────────────────────────────────────────────────────┐
│  🏆 Tier Progress                                    │
│                                                      │
│  Current: 🥇 GOLD        Next: 🔒 PLATINUM          │
│                                                      │
│  56.7% to platinum                                   │
│  ████████████████░░░░░░░░░                          │
│  6,500 points needed                                │
│                                                      │
│  ✨ Keep it up! Just 6,500 more points to unlock    │
│     platinum tier benefits!                         │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  ✅ Your Current Benefits                            │
│  ┌────┬────┬────┐                                   │
│  │1.5x│10% │Yes │                                   │
│  └────┴────┴────┘                                   │
│  ✓ Earn points on purchases                         │
│  ✓ Birthday bonus                                   │
│  ✓ 1.5x points multiplier                          │
│  ✓ 10% discount                                     │
│  ✓ Free shipping                                    │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  📈 Unlock with platinum Tier                        │
│  ┌────┬────┬────┐                                   │
│  │ 2x │15% │Yes │                                   │
│  └────┴────┴────┘                                   │
│  ✨ 2x points multiplier         [NEW]              │
│  ✨ 15% discount                 [NEW]              │
│  ✨ Priority support              [NEW]              │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  All Tiers                                           │
│  ✅ 🥉 Bronze      0 pts      [Current]             │
│  ✅ 🥈 Silver      1,000 pts                        │
│  ✅ 🥇 Gold        5,000 pts                        │
│  🔒 💎 Platinum    15,000 pts                       │
│  🔒 💠 Diamond     50,000 pts                       │
└──────────────────────────────────────────────────────┘
```

**Key Features**:
- Animated progress bar
- Current vs next tier comparison
- Benefits breakdown with "NEW" badges
- All tiers overview
- Motivational messaging

---

### 3. RewardCatalog

**Purpose**: Browse and redeem loyalty rewards

```
┌──────────────────────────────────────────────────────┐
│  Reward Catalog          You have 8,500 points      │
│  [🔍 Search...]  [Filters ▼]   [⊞] [≡]             │
│                                                      │
│  ┌─────┬─────┬─────┐                               │
│  │Type │Sort │Max  │                               │
│  │All  │Pts↑ │8500 │  [Showing when expanded]     │
│  └─────┴─────┴─────┘                               │
└──────────────────────────────────────────────────────┘

Grid View:
┌───────────┬───────────┬───────────┐
│    🎁     │    🎁     │    🎁     │
│  Reward 1 │  Reward 2 │  Reward 3 │
│  Desc...  │  Desc...  │  Desc...  │
│           │           │           │
│  500 pts  │  1000 pts │  2000 pts │
│  5 left   │  10 left  │  FEATURED │
│           │           │           │
│ [Redeem]  │ [Redeem]  │ [Redeem]  │
└───────────┴───────────┴───────────┘

Redemption Modal:
┌──────────────────────────────────────┐
│  Confirm Redemption                  │
│                                      │
│  🎁 Premium Discount Code            │
│      10% off your next order         │
│                                      │
│  Points Cost:         500            │
│  Your Balance After:  8,000          │
│                                      │
│  Terms: Valid for 30 days...         │
│                                      │
│  [Cancel]  [✓ Confirm Redemption]   │
└──────────────────────────────────────┘
```

**Key Features**:
- Grid/list toggle
- Search and filters
- Stock tracking
- Redemption confirmation
- Insufficient points detection
- Featured rewards

---

### 4. TransactionHistory

**Purpose**: View all points activity

```
┌──────────────────────────────────────────────────────┐
│  Transaction History            [Download ⬇]         │
│                                                      │
│  [🔍 Search]  [Type: All ▼]  [📅 Date Range]        │
└──────────────────────────────────────────────────────┘

Timeline:
┌──────────────────────────────────────────────────────┐
│  📈  Order #1234                          +100       │
│      Earned • Nov 1, 2025                            │
├──────────────────────────────────────────────────────┤
│  🎁  Premium Discount                     -500       │
│      Redeemed • Oct 28, 2025                         │
├──────────────────────────────────────────────────────┤
│  👥  Referral Bonus                       +100       │
│      Referral • Oct 25, 2025                         │
├──────────────────────────────────────────────────────┤
│  💰  Purchase Bonus                       +250       │
│      Purchase • Oct 20, 2025                         │
└──────────────────────────────────────────────────────┘

[Click item for details popover]

Detail Popover:
┌─────────────────────────────┐
│  Transaction Details        │
│  Order #1234                │
│                             │
│  Type:     Earned           │
│  Points:   +100             │
│  Balance:  8,500            │
│  Ref:      ORD-123          │
│  Date:     Nov 1, 2025      │
└─────────────────────────────┘

[< Previous]  Page 1 of 5  [Next >]
```

**Key Features**:
- Timeline view
- Filter by type
- Date range selection
- Search transactions
- Detail popover on click
- Running balance
- Pagination

---

### 5. RedemptionStatus

**Purpose**: Track reward redemptions

```
┌──────────────────────────────────────────────────────┐
│  Redemption Status         [Status: All ▼]           │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  Premium Discount Code        [⏰ Pending]           │
│  500 points • Nov 1, 2025                            │
│                                                      │
│  Progress:                                           │
│  ● ━━━━ ○ ━━━━ ○                                   │
│  Submitted  Approved  Fulfilled                      │
│                                                      │
│  Redemption Code:                                    │
│  ┌─────────────────────────┐                        │
│  │  ABC123DEF456     [📋]  │                        │
│  └─────────────────────────┘                        │
│                                                      │
│  ⏰ Expected Fulfillment: Nov 5, 2025               │
│                                                      │
│  [✉ Contact Support]                                │
└──────────────────────────────────────────────────────┘

Status Variants:
┌────────────────────────┐
│ [⏰ Pending]           │  Yellow
│ [📦 Approved]          │  Blue
│ [✓ Fulfilled]          │  Green
│ [✗ Cancelled]          │  Red
└────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  ✉ Need Help?                                        │
│  If you have questions about your redemption,        │
│  our support team is here to help.                  │
│  [✉ Contact Support →]                              │
└──────────────────────────────────────────────────────┘
```

**Key Features**:
- Status badges
- Progress stepper
- Redemption code copy
- Expected dates
- Cancellation reasons
- Support contact

---

### 6. ReferralProgram

**Purpose**: Manage referrals and earn rewards

```
┌──────────────────────────────────────────────────────┐
│  Referral Program                                    │
│  Invite friends and earn rewards together           │
└──────────────────────────────────────────────────────┘

Stats:
┌─────┬─────┬─────┬─────┐
│👥   │✅   │⏰   │📈   │
│  3  │  2  │  1  │ 200 │
│Total│Succ │Pend │Pts  │
└─────┴─────┴─────┴─────┘

┌──────────────────────────────────────────────────────┐
│  🔗 Your Referral Link                               │
│  https://example.com/signup?ref=ABC123    [📋 Copy] │
│                                                      │
│  Share via:                                          │
│  [✉ Email] [🐦 Twitter] [💼 LinkedIn] [📘 FB]       │
│                                                      │
│  Or invite directly:                                 │
│  [➕ Send Invitation]                                │
└──────────────────────────────────────────────────────┘

Referral History Table:
┌────────────────────┬──────────┬────────┬────────────┐
│ Contact            │ Status   │ Points │ Date       │
├────────────────────┼──────────┼────────┼────────────┤
│ John Doe           │ ✅ Comp  │ +100   │ Oct 25     │
│ john@example.com   │          │        │            │
├────────────────────┼──────────┼────────┼────────────┤
│ Jane Smith         │ ⏰ Pend  │ -      │ Nov 1      │
│ jane@example.com   │          │        │            │
└────────────────────┴──────────┴────────┴────────────┘

┌──────────────────────────────────────────────────────┐
│  How It Works                                  [▼]   │
│  ───────────────────────────────────────────────     │
│  • How do I refer someone?                     [▼]   │
│  • What rewards do I earn?                     [▼]   │
│  • When will I receive my points?              [▼]   │
│  • Is there a referral limit?                  [▼]   │
└──────────────────────────────────────────────────────┘
```

**Key Features**:
- Referral link with copy
- Social sharing buttons
- Stats overview
- Direct invitation
- History table
- FAQ accordion

---

## 🎨 Shared Components

### PointsDisplay

```tsx
// Default variant (large)
<PointsDisplay points={8500} animated />
→  8,500 points  (animated count-up)

// Compact variant
<PointsDisplay points={100} variant="compact" />
→  100
```

### TierBadge

```tsx
<TierBadge tier="gold" size="lg" />
→  🥇 Gold  (yellow badge)

<TierBadge tier="platinum" size="sm" />
→  🏆 Platinum  (purple badge)
```

### ActivityFeedItem

```tsx
<ActivityFeedItem
  type="earn"
  points={100}
  description="Order #1234"
  date="2025-11-01"
/>

→  📈  Order #1234           +100
    Earned • Nov 1, 2025
```

---

## 🎯 Color System

### Status Colors

| Status | Color | Usage |
|--------|-------|-------|
| Positive | Green | Earned, completed, fulfilled |
| Warning | Yellow | Pending, expiring |
| Negative | Red | Redeemed, cancelled, expired |
| Info | Blue | Approved, processing |
| Primary | Brand | CTAs, highlights, tier badges |

### Tier Colors

| Tier | Color | Icon |
|------|-------|------|
| Bronze | Amber | 🏆 Award |
| Silver | Slate | ⭐ Star |
| Gold | Yellow | 👑 Crown |
| Platinum | Purple | 🏆 Trophy |
| Diamond | Blue | 💎 Gem |

---

## 📱 Responsive Design

### Mobile (< 640px)
```
┌─────────────┐
│ Full Width  │
│ Stacked     │
│ Cards       │
│             │
│ Single      │
│ Column      │
└─────────────┘
```

### Tablet (640px - 1024px)
```
┌──────────┬──────────┐
│  Card 1  │  Card 2  │
├──────────┼──────────┤
│  Card 3  │  Card 4  │
└──────────┴──────────┘
```

### Desktop (> 1024px)
```
┌──────┬──────┬──────┬──────┐
│Card 1│Card 2│Card 3│Card 4│
└──────┴──────┴──────┴──────┘
```

---

## ⚡ Animation Patterns

### Entrance
- Fade in + slide up (20px)
- Stagger children (0.1s delay)
- Opacity: 0 → 1

### Points Counter
- Spring physics
- Smooth count-up
- Duration: ~1s

### Progress Bars
- Ease-out timing
- Width: 0% → X%
- Duration: 1s

### Hover States
- Transform: scale(1.02)
- Shadow increase
- Duration: 200ms

---

## 🔧 Integration Example

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  LoyaltyDashboard,
  TierProgressTracker,
  RewardCatalog,
  TransactionHistory,
  RedemptionStatus,
  ReferralProgram,
} from '@/components/loyalty/customer';

const queryClient = new QueryClient();

export default function CustomerPortal() {
  const customerId = 'customer-123';

  return (
    <QueryClientProvider client={queryClient}>
      <Tabs>
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          {/* ... more tabs ... */}
        </TabsList>

        <TabsContent value="dashboard">
          <LoyaltyDashboard customerId={customerId} />
        </TabsContent>

        <TabsContent value="rewards">
          <RewardCatalog customerId={customerId} currentPoints={8500} />
        </TabsContent>

        {/* ... more content ... */}
      </Tabs>
    </QueryClientProvider>
  );
}
```

---

## 📊 Component Matrix

| Component | Lines | API Calls | Animations | Forms | Complexity |
|-----------|-------|-----------|------------|-------|------------|
| LoyaltyDashboard | 415 | 1 GET | High | No | Medium |
| TierProgressTracker | 493 | 1 GET | High | No | High |
| RewardCatalog | 619 | 1 GET, 1 POST | Medium | Yes | High |
| TransactionHistory | 500 | 1 GET | Low | No | Medium |
| RedemptionStatus | 563 | 1 GET | Medium | No | High |
| ReferralProgram | 687 | 1 GET, 1 POST | Low | Yes | High |

---

## 🎯 User Flows

### Redeem a Reward
1. View `LoyaltyDashboard` → See points balance
2. Click "Browse Rewards" → Navigate to `RewardCatalog`
3. Filter/search rewards → Find desired reward
4. Click "Redeem" → Open confirmation modal
5. Confirm redemption → POST to API
6. View `RedemptionStatus` → Track fulfillment

### Refer a Friend
1. Navigate to `ReferralProgram`
2. Copy referral link or use share buttons
3. Friend signs up using link
4. View referral in history table (pending)
5. Friend makes first purchase
6. Referral status changes to completed
7. Points credited to account

### Track Tier Progress
1. View `LoyaltyDashboard` → See current tier
2. Click on tier section → Navigate to `TierProgressTracker`
3. View progress bar and points needed
4. See next tier benefits preview
5. View "How to earn more" suggestions
6. Earn points → Progress bar updates
7. Reach threshold → Tier upgrade notification

---

## 📚 Additional Resources

- **Full Documentation**: `src/components/loyalty/customer/README.md`
- **Implementation Guide**: `CUSTOMER_LOYALTY_PORTAL_COMPLETE.md`
- **API Documentation**: Team D's API docs
- **Design System**: Project-wide design tokens

---

**Built with ❤️ by Team G - Customer Loyalty Portal**
