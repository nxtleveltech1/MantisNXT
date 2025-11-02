# Loyalty Admin - Quick Reference Card

## Import Paths

```typescript
// Single import
import { ProgramConfiguration } from '@/components/loyalty/admin'

// Multiple imports
import {
  ProgramConfiguration,
  RewardCatalogManager,
  RuleEngineBuilder,
  RedemptionQueue,
  LoyaltyLeaderboard,
  LoyaltyAnalytics,
  CustomerLoyaltyProfile,
} from '@/components/loyalty/admin'
```

---

## Component Signatures

### 1. ProgramConfiguration
```typescript
interface ProgramConfigurationProps {
  programId?: string          // Optional: For editing existing program
  onSuccess?: () => void      // Callback after successful save
  onCancel?: () => void       // Callback on cancel
}

<ProgramConfiguration
  programId="uuid-optional"
  onSuccess={() => console.log('Saved')}
  onCancel={() => router.back()}
/>
```

### 2. RewardCatalogManager
```typescript
// No props - self-contained
<RewardCatalogManager />
```

### 3. RuleEngineBuilder
```typescript
// No props - self-contained
<RuleEngineBuilder />
```

### 4. RedemptionQueue
```typescript
// No props - self-contained
<RedemptionQueue />
```

### 5. LoyaltyLeaderboard
```typescript
// No props - self-contained
<LoyaltyLeaderboard />
```

### 6. LoyaltyAnalytics
```typescript
// No props - self-contained
<LoyaltyAnalytics />
```

### 7. CustomerLoyaltyProfile
```typescript
interface CustomerLoyaltyProfileProps {
  customerId: string          // Required: Customer UUID
}

<CustomerLoyaltyProfile customerId="customer-uuid" />
```

---

## API Endpoint Quick Reference

| Component | Primary Endpoint | Method |
|-----------|-----------------|--------|
| ProgramConfiguration | `/api/v1/admin/loyalty/programs` | GET, POST, PUT |
| RewardCatalogManager | `/api/v1/admin/loyalty/rewards` | GET, POST, PUT, DELETE |
| RuleEngineBuilder | `/api/v1/admin/loyalty/rules` | GET, POST, PUT, DELETE |
| RedemptionQueue | `/api/v1/admin/loyalty/redemptions` | GET, POST (bulk) |
| LoyaltyLeaderboard | `/api/v1/admin/loyalty/analytics/leaderboard` | GET |
| LoyaltyAnalytics | `/api/v1/admin/loyalty/analytics/metrics/:id` | GET |
| CustomerLoyaltyProfile | `/api/v1/admin/loyalty/customers/:id` | GET, POST |

---

## Common Patterns

### React Query Usage
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['loyalty-programs'],
  queryFn: async () => {
    const res = await fetch('/api/v1/admin/loyalty/programs')
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
  },
})
```

### Mutation with Toast
```typescript
const mutation = useMutation({
  mutationFn: async (data) => {
    const res = await fetch('/api/...', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Failed')
    return res.json()
  },
  onSuccess: () => {
    toast.success('Operation successful')
    queryClient.invalidateQueries({ queryKey: ['...'] })
  },
  onError: (error: Error) => {
    toast.error(error.message)
  },
})
```

### Form with Validation
```typescript
const schema = z.object({
  name: z.string().min(1),
  points: z.number().min(0),
})

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { name: '', points: 0 },
})

const onSubmit = (data) => {
  mutation.mutate(data)
}
```

---

## Type Imports

```typescript
import type {
  // Programs
  LoyaltyProgram,
  LoyaltyProgramInsert,
  TierThresholds,
  TierBenefits,
  LoyaltyTier,

  // Rewards
  RewardCatalog,
  RewardType,
  RewardAnalytics,

  // Rules
  LoyaltyRule,
  RuleTriggerType,
  LoyaltyRuleConditions,

  // Redemptions
  RewardRedemption,
  RedemptionStatus,

  // Customers
  CustomerLoyalty,
  LoyaltyTransaction,
  TransactionType,

  // Analytics
  LoyaltyLeaderboardEntry,
  LoyaltyProgramMetrics,
} from '@/types/loyalty'
```

---

## Component Sizes (for code splitting)

| Component | Size | Lines | Complexity |
|-----------|------|-------|------------|
| ProgramConfiguration | 28KB | 673 | High |
| RewardCatalogManager | 36KB | 958 | Very High |
| RuleEngineBuilder | 32KB | 890 | High |
| RedemptionQueue | 28KB | 680 | High |
| LoyaltyLeaderboard | 16KB | 390 | Medium |
| LoyaltyAnalytics | 20KB | 545 | Very High |
| CustomerLoyaltyProfile | 20KB | 580 | High |

**Recommendation:** Lazy load each component on separate routes

---

## Lazy Loading Example

```typescript
import dynamic from 'next/dynamic'

const ProgramConfiguration = dynamic(
  () => import('@/components/loyalty/admin').then(mod => mod.ProgramConfiguration),
  { loading: () => <Skeleton className="h-96 w-full" /> }
)

const RewardCatalogManager = dynamic(
  () => import('@/components/loyalty/admin').then(mod => mod.RewardCatalogManager),
  { loading: () => <Skeleton className="h-96 w-full" /> }
)
```

---

## Common Utilities

### Tier Colors
```typescript
const TIER_COLORS: Record<LoyaltyTier, string> = {
  bronze: 'bg-amber-600',
  silver: 'bg-gray-400',
  gold: 'bg-yellow-500',
  platinum: 'bg-blue-400',
  diamond: 'bg-purple-500',
}
```

### Date Formatting
```typescript
import { format } from 'date-fns'

// Display: Nov 02, 2025
format(new Date(date), 'MMM dd, yyyy')

// Display: 2025-11-02
format(new Date(date), 'yyyy-MM-dd')
```

### Number Formatting
```typescript
// Thousands separator
points.toLocaleString() // 1,234,567

// Currency
`$${amount.toLocaleString()}` // $1,234.56
```

---

## File Locations

```
src/
├── components/
│   └── loyalty/
│       └── admin/
│           ├── ProgramConfiguration.tsx
│           ├── RewardCatalogManager.tsx
│           ├── RuleEngineBuilder.tsx
│           ├── RedemptionQueue.tsx
│           ├── LoyaltyLeaderboard.tsx
│           ├── LoyaltyAnalytics.tsx
│           ├── CustomerLoyaltyProfile.tsx
│           ├── index.ts
│           └── README.md
│
├── types/
│   └── loyalty.ts
│
└── app/
    └── api/
        └── v1/
            └── admin/
                └── loyalty/
                    ├── programs/
                    ├── rewards/
                    ├── rules/
                    ├── redemptions/
                    ├── analytics/
                    └── customers/
```

---

## Troubleshooting

### Component Not Rendering
1. Check React Query provider is set up
2. Verify API endpoints are accessible
3. Check browser console for errors
4. Ensure types are imported correctly

### TypeScript Errors
1. Run `npm run type-check`
2. Ensure `@/types/loyalty` exists
3. Check import paths use `@/` alias
4. Verify all required props are passed

### API Integration Issues
1. Check network tab for failed requests
2. Verify backend endpoints are running
3. Check CORS settings
4. Ensure auth tokens are valid

### Styling Issues
1. Verify Tailwind CSS is configured
2. Check shadcn/ui components are installed
3. Ensure global styles are imported
4. Check for CSS conflicts

---

## Performance Tips

1. **Use React Query caching**
   - Default stale time: 5 minutes
   - Refetch on window focus: enabled

2. **Implement pagination**
   - Default page size: 20-50 items
   - Virtual scrolling for 100+ items

3. **Lazy load charts**
   - Use `dynamic` import for Recharts
   - Load on tab activation

4. **Memoize calculations**
   - Use `useMemo` for expensive operations
   - Use `useCallback` for event handlers

5. **Optimize images**
   - Use Next.js Image component
   - Lazy load reward images

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Tab | Navigate between fields |
| Enter | Submit form / Confirm action |
| Esc | Close dialog / Cancel |
| ↑↓ | Navigate table rows |
| Space | Toggle checkbox |
| Ctrl/Cmd + S | Save (in forms) |

---

## Accessibility

- All forms have proper labels
- Keyboard navigation fully supported
- Screen reader announcements
- Focus management in dialogs
- ARIA labels on icons
- Color contrast WCAG AA compliant

---

## Quick Start Checklist

- [ ] Install dependencies: `npm install`
- [ ] Verify types exist: `src/types/loyalty.ts`
- [ ] Check API endpoints are running
- [ ] Configure React Query provider
- [ ] Import components in your app
- [ ] Test with development data
- [ ] Review and customize styling
- [ ] Run TypeScript check: `npm run type-check`
- [ ] Test in all target browsers
- [ ] Deploy to staging

---

**Last Updated:** November 2, 2025
**Version:** 1.0.0
**Status:** Production Ready ✅
