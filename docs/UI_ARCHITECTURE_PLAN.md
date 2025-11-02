# UI Architecture Plan: Loyalty & Rewards + AI Services

## Executive Summary

This document outlines the architecture and implementation plan for two major UI feature sets:
1. **Customer Loyalty & Rewards System** - Admin and customer-facing interfaces
2. **AI Services Management** - Admin configuration and monitoring interfaces

## Technology Stack

### Framework & Libraries
- **Framework**: Next.js 14+ with App Router
- **UI Components**: shadcn/ui with Radix primitives
- **Styling**: Tailwind CSS
- **State Management**:
  - React Query (TanStack Query) for server state
  - Zustand for complex client state
  - React Context for UI state
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Dates**: date-fns
- **Icons**: lucide-react

### Existing Patterns Observed

1. **Data Fetching Pattern**:
   - Custom hooks in `/src/hooks/` (e.g., `useSuppliers.ts`, `useRealTimeDataFixed.ts`)
   - React Query for caching and optimistic updates
   - Real-time data with fallbacks

2. **Component Structure**:
   - Atomic design pattern
   - Comprehensive UI library in `/src/components/ui/`
   - Feature-specific components in `/src/components/[feature]/`
   - Bulletproof loading states and error boundaries

3. **Routing**:
   - App Router structure: `/src/app/[route]/`
   - API routes: `/src/app/api/[endpoint]/`
   - Colocation of related files

4. **Error Handling**:
   - `BulletproofErrorBoundary` wrapper
   - Granular error states
   - `errorLogger` utility for consistent logging

5. **Loading States**:
   - Skeleton components for all major UI sections
   - `ConditionalLoader` wrapper component
   - Suspense boundaries

6. **Type Safety**:
   - TypeScript throughout
   - Path aliases configured (`@/components/*`, `@/lib/*`)
   - Zod for runtime validation

## Part 1: Customer Loyalty & Rewards UI

### Database Schema Review

Tables:
- `loyalty_program` - Program configuration
- `customer_loyalty` - Customer enrollment and points
- `loyalty_transaction` - Points history
- `reward_catalog` - Available rewards
- `reward_redemption` - Redemption tracking
- `loyalty_rule` - Automated rules engine

Views:
- `loyalty_leaderboard` - Gamification rankings
- `reward_analytics` - Business intelligence

Functions:
- `calculate_points_for_order()`
- `redeem_reward()`
- `update_customer_tier()`
- `expire_points()`
- `get_customer_rewards_summary()`

### Admin Interface Structure

#### Route: `/src/app/loyalty-admin/`

```
loyalty-admin/
├── page.tsx                    # Dashboard overview
├── layout.tsx                  # Shared layout with navigation
├── programs/
│   ├── page.tsx               # Program list
│   ├── [id]/
│   │   ├── page.tsx           # Program details
│   │   └── edit/
│   │       └── page.tsx       # Edit program
│   └── new/
│       └── page.tsx           # Create program
├── rewards/
│   ├── page.tsx               # Reward catalog management
│   ├── [id]/
│   │   └── page.tsx           # Reward details
│   └── new/
│       └── page.tsx           # Create reward
├── redemptions/
│   ├── page.tsx               # Redemption queue
│   └── [id]/
│       └── page.tsx           # Redemption details
├── rules/
│   ├── page.tsx               # Rules list
│   └── new/
│       └── page.tsx           # Create rule
├── leaderboard/
│   └── page.tsx               # Leaderboard view
└── analytics/
    └── page.tsx               # Analytics dashboard
```

#### Component Structure: `/src/components/loyalty/admin/`

```
admin/
├── LoyaltyAdminDashboard.tsx          # Main dashboard
├── ProgramList.tsx                     # Programs table
├── ProgramForm.tsx                     # Multi-step program form
├── ProgramConfigStep.tsx               # Basic info step
├── TierConfigStep.tsx                  # Tier configuration
├── BenefitsEditor.tsx                  # JSON editor for benefits
├── RewardCatalog.tsx                   # Rewards data table
├── RewardForm.tsx                      # Reward creation/edit form
├── RewardCard.tsx                      # Reward display card
├── RedemptionQueue.tsx                 # Pending redemptions table
├── RedemptionDetailsModal.tsx          # Redemption workflow modal
├── RuleBuilder.tsx                     # Visual rule builder
├── RuleConditionBuilder.tsx            # Drag-and-drop conditions
├── RulePreview.tsx                     # Points calculation preview
├── LoyaltyLeaderboard.tsx              # Rankings table
├── LoyaltyAnalyticsDashboard.tsx       # Charts and metrics
├── PointsHistoryChart.tsx              # Line chart component
├── TierDistributionChart.tsx           # Pie chart component
├── RedemptionRateChart.tsx             # Bar chart component
└── TopRewardsTable.tsx                 # Performance table
```

### Customer Portal Structure

#### Route: `/src/app/customers/loyalty/`

```
customers/loyalty/
├── page.tsx                    # Main loyalty dashboard
├── rewards/
│   ├── page.tsx               # Browse rewards
│   └── [id]/
│       └── page.tsx           # Reward details
├── history/
│   └── page.tsx               # Transaction history
└── redemptions/
    └── page.tsx               # My redemptions
```

#### Component Structure: `/src/components/loyalty/customer/`

```
customer/
├── LoyaltyDashboard.tsx               # Hero section with points
├── TierProgressTracker.tsx            # Progress bar with tiers
├── RewardsBrowser.tsx                 # Filterable reward grid
├── RewardCard.tsx                     # Single reward display
├── RedemptionModal.tsx                # Redemption confirmation
├── TransactionTimeline.tsx            # Transaction history
├── TransactionItem.tsx                # Single transaction
├── RedemptionTracker.tsx              # My redemptions list
└── RedemptionStatusBadge.tsx          # Status indicator
```

### Shared Components: `/src/components/loyalty/shared/`

```
shared/
├── PointsDisplay.tsx                  # Formatted points display
├── TierBadge.tsx                      # Tier badge component
├── TierIcon.tsx                       # Tier-specific icons
└── RewardTypeIcon.tsx                 # Icons for reward types
```

### API Endpoints: `/src/app/api/v1/loyalty/`

```
loyalty/
├── programs/
│   ├── route.ts               # GET (list), POST (create)
│   └── [id]/
│       └── route.ts           # GET, PUT, DELETE
├── customers/
│   ├── [customerId]/
│   │   ├── summary/
│   │   │   └── route.ts       # GET customer summary
│   │   ├── transactions/
│   │   │   └── route.ts       # GET transactions list
│   │   └── redemptions/
│   │       └── route.ts       # GET redemptions list
│   └── enroll/
│       └── route.ts           # POST enroll customer
├── rewards/
│   ├── route.ts               # GET (list), POST (create)
│   ├── [id]/
│   │   └── route.ts           # GET, PUT, DELETE
│   └── redeem/
│       └── route.ts           # POST redeem reward
├── redemptions/
│   ├── route.ts               # GET (queue)
│   ├── [id]/
│   │   ├── route.ts           # GET details
│   │   └── fulfill/
│   │       └── route.ts       # POST fulfill
│   └── approve/
│       └── route.ts           # POST approve
├── rules/
│   ├── route.ts               # GET (list), POST (create)
│   └── [id]/
│       └── route.ts           # GET, PUT, DELETE
├── leaderboard/
│   └── route.ts               # GET leaderboard
└── analytics/
    ├── overview/
    │   └── route.ts           # GET overview metrics
    ├── points-trend/
    │   └── route.ts           # GET points over time
    ├── tier-distribution/
    │   └── route.ts           # GET tier breakdown
    └── reward-performance/
        └── route.ts           # GET reward metrics
```

### Services: `/src/lib/services/`

```typescript
// LoyaltyService.ts
export class LoyaltyService {
  async getPrograms(orgId: string): Promise<LoyaltyProgram[]>
  async createProgram(data: CreateProgramInput): Promise<LoyaltyProgram>
  async updateProgram(id: string, data: UpdateProgramInput): Promise<LoyaltyProgram>
  async deleteProgram(id: string): Promise<void>
  async getCustomerSummary(customerId: string): Promise<CustomerRewardsSummary>
  async enrollCustomer(customerId: string, programId: string): Promise<CustomerLoyalty>
  async awardPoints(data: AwardPointsInput): Promise<LoyaltyTransaction>
  async calculatePointsForOrder(orderId: string, customerId: string): Promise<PointsCalculation>
  async updateCustomerTier(customerId: string): Promise<TierUpdateResult>
}

// RewardService.ts
export class RewardService {
  async getRewards(filters: RewardFilters): Promise<Reward[]>
  async getRewardById(id: string): Promise<Reward>
  async createReward(data: CreateRewardInput): Promise<Reward>
  async updateReward(id: string, data: UpdateRewardInput): Promise<Reward>
  async deleteReward(id: string): Promise<void>
  async redeemReward(customerId: string, rewardId: string): Promise<RedemptionResult>
}

// RedemptionService.ts
export class RedemptionService {
  async getRedemptionQueue(filters: RedemptionFilters): Promise<Redemption[]>
  async getRedemptionById(id: string): Promise<Redemption>
  async approveRedemption(id: string): Promise<Redemption>
  async fulfillRedemption(id: string, notes: string): Promise<Redemption>
  async cancelRedemption(id: string, reason: string): Promise<Redemption>
}

// LoyaltyRuleService.ts
export class LoyaltyRuleService {
  async getRules(programId: string): Promise<LoyaltyRule[]>
  async createRule(data: CreateRuleInput): Promise<LoyaltyRule>
  async updateRule(id: string, data: UpdateRuleInput): Promise<LoyaltyRule>
  async deleteRule(id: string): Promise<void>
  async testRule(ruleData: RuleTestInput): Promise<RuleTestResult>
}

// LoyaltyAnalyticsService.ts
export class LoyaltyAnalyticsService {
  async getOverviewMetrics(orgId: string, dateRange: DateRange): Promise<OverviewMetrics>
  async getPointsTrend(orgId: string, period: Period): Promise<PointsTrendData[]>
  async getTierDistribution(orgId: string): Promise<TierDistribution>
  async getRewardPerformance(orgId: string): Promise<RewardPerformance[]>
  async getLeaderboard(orgId: string, filters: LeaderboardFilters): Promise<LeaderboardEntry[]>
}
```

### Custom Hooks: `/src/hooks/loyalty/`

```typescript
// useLoyaltyPrograms.ts
export function useLoyaltyPrograms(orgId: string) {
  return useQuery({
    queryKey: ['loyalty-programs', orgId],
    queryFn: () => loyaltyService.getPrograms(orgId),
  })
}

// useCustomerRewards.ts
export function useCustomerRewards(customerId: string) {
  return useQuery({
    queryKey: ['customer-rewards', customerId],
    queryFn: () => loyaltyService.getCustomerSummary(customerId),
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}

// useRewardCatalog.ts
export function useRewardCatalog(filters: RewardFilters) {
  return useQuery({
    queryKey: ['rewards', filters],
    queryFn: () => rewardService.getRewards(filters),
  })
}

// useRedemptionQueue.ts
export function useRedemptionQueue(filters: RedemptionFilters) {
  return useQuery({
    queryKey: ['redemption-queue', filters],
    queryFn: () => redemptionService.getRedemptionQueue(filters),
  })
}

// useLoyaltyMutations.ts
export function useLoyaltyMutations() {
  const queryClient = useQueryClient()

  const awardPoints = useMutation({
    mutationFn: (data: AwardPointsInput) => loyaltyService.awardPoints(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-rewards'] })
      toast.success('Points awarded successfully')
    },
  })

  const redeemReward = useMutation({
    mutationFn: (data: { customerId: string; rewardId: string }) =>
      rewardService.redeemReward(data.customerId, data.rewardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-rewards'] })
      queryClient.invalidateQueries({ queryKey: ['redemption-queue'] })
      toast.success('Reward redeemed successfully')
    },
  })

  return {
    awardPoints,
    redeemReward,
  }
}
```

### Type Definitions: `/src/types/loyalty.ts`

```typescript
export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
export type RewardType = 'points' | 'discount' | 'cashback' | 'free_shipping' | 'upgrade' | 'gift'
export type TransactionType = 'earn' | 'redeem' | 'expire' | 'adjust' | 'bonus'
export type RedemptionStatus = 'pending' | 'approved' | 'fulfilled' | 'cancelled' | 'expired'

export interface LoyaltyProgram {
  id: string
  orgId: string
  name: string
  description: string
  isActive: boolean
  isDefault: boolean
  earnRate: number
  tierThresholds: Record<LoyaltyTier, number>
  tierBenefits: Record<LoyaltyTier, TierBenefits>
  pointsExpiryDays: number | null
  createdAt: string
  updatedAt: string
}

export interface TierBenefits {
  multiplier: number
  discount?: number
  freeShipping?: boolean
  prioritySupport?: boolean
  dedicatedRep?: boolean
}

export interface CustomerLoyalty {
  id: string
  customerId: string
  programId: string
  currentTier: LoyaltyTier
  tierQualifiedDate: string
  totalPointsEarned: number
  totalPointsRedeemed: number
  pointsBalance: number
  pointsPending: number
  lifetimeValue: number
  referralCount: number
}

export interface CustomerRewardsSummary extends CustomerLoyalty {
  tierBenefits: TierBenefits
  nextTier: LoyaltyTier | null
  pointsToNextTier: number
  availableRewardsCount: number
  recentTransactions: LoyaltyTransaction[]
  recentRedemptions: Redemption[]
}

export interface LoyaltyTransaction {
  id: string
  customerId: string
  programId: string
  transactionType: TransactionType
  pointsAmount: number
  referenceType: string | null
  referenceId: string | null
  description: string
  metadata: Record<string, any>
  expiresAt: string | null
  createdAt: string
}

export interface Reward {
  id: string
  orgId: string
  programId: string | null
  name: string
  description: string
  rewardType: RewardType
  pointsRequired: number
  monetaryValue: number | null
  maxRedemptionsPerCustomer: number | null
  stockQuantity: number | null
  redemptionCount: number
  isActive: boolean
  isFeatured: boolean
  validFrom: string
  validUntil: string | null
  termsConditions: Record<string, any>
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface Redemption {
  id: string
  customerId: string
  rewardId: string
  pointsSpent: number
  monetaryValueUsed: number | null
  status: RedemptionStatus
  redemptionCode: string
  redeemedAt: string
  expiresAt: string | null
  fulfilledAt: string | null
  fulfilledBy: string | null
  fulfillmentNotes: string | null
  reward?: Reward
  customer?: { name: string; email: string }
}

export interface LoyaltyRule {
  id: string
  programId: string
  name: string
  description: string
  triggerType: string
  conditions: Record<string, any>
  pointsMultiplier: number
  bonusPoints: number
  isActive: boolean
  priority: number
  validFrom: string
  validUntil: string | null
}

export interface PointsCalculation {
  pointsAwarded: number
  basePoints: number
  tierBonus: number
  ruleBonus: number
  totalMultiplier: number
}

// Chart data types
export interface PointsTrendData {
  date: string
  pointsEarned: number
  pointsRedeemed: number
}

export interface TierDistribution {
  tier: LoyaltyTier
  customerCount: number
  avgPointsBalance: number
  avgLifetimeValue: number
  totalPointsLiability: number
}

export interface RewardPerformance {
  rewardId: string
  rewardName: string
  rewardType: RewardType
  totalRedemptions: number
  uniqueCustomers: number
  fulfilledRedemptions: number
  totalPointsSpent: number
  dailyRedemptionRate: number
}

export interface LeaderboardEntry {
  customerId: string
  customerName: string
  company: string
  currentTier: LoyaltyTier
  totalPointsEarned: number
  pointsBalance: number
  lifetimeValue: number
  referralCount: number
  tierRank: number
  overallRank: number
  pointsThisMonth: number
  pointsThisQuarter: number
}
```

## Part 2: AI Services UI

### Database Schema Review

Tables:
- `ai_service_config` - Service configuration per org
- `ai_prediction` - AI predictions with confidence
- `demand_forecast` - Demand forecasting data
- `analytics_dashboard` - Custom dashboards
- `analytics_widget` - Dashboard widgets
- `ai_alert` - AI-generated alerts
- `ai_conversation` - Chatbot history
- `analytics_metric_cache` - Pre-calculated metrics

Functions:
- `get_ai_service_health()`
- `get_forecast_accuracy_metrics()`
- `cleanup_expired_predictions()`

### Admin Interface Structure

#### Route: `/src/app/ai-admin/`

```
ai-admin/
├── page.tsx                    # AI Services dashboard
├── layout.tsx                  # Shared layout
├── config/
│   ├── page.tsx               # Service configuration list
│   └── [serviceType]/
│       └── page.tsx           # Configure specific service
├── predictions/
│   ├── page.tsx               # Predictions monitor
│   └── [id]/
│       └── page.tsx           # Prediction details
├── alerts/
│   ├── page.tsx               # AI alerts dashboard
│   └── [id]/
│       └── page.tsx           # Alert details
├── forecasting/
│   ├── page.tsx               # Demand forecasting viewer
│   └── [productId]/
│       └── page.tsx           # Product-specific forecast
├── dashboards/
│   ├── page.tsx               # Dashboard list
│   ├── [id]/
│   │   └── page.tsx           # View dashboard
│   └── builder/
│       └── page.tsx           # Dashboard editor
└── health/
    └── page.tsx               # AI service health monitor
```

#### Component Structure: `/src/components/ai/admin/`

```
admin/
├── AIServiceDashboard.tsx             # Main overview
├── ServiceConfigList.tsx              # Service cards with toggles
├── ServiceConfigForm.tsx              # Configuration form
├── ModelSelector.tsx                  # Model dropdown
├── APIEndpointEditor.tsx              # API config editor
├── PredictionsMonitor.tsx             # Predictions data table
├── PredictionDetailsModal.tsx         # Detailed view
├── ConfidenceDistributionChart.tsx    # Histogram chart
├── AccuracyTrackingChart.tsx          # Accuracy over time
├── AIAlertsDashboard.tsx              # Alert cards by severity
├── AlertDetailsModal.tsx              # Alert with recommendations
├── AlertTimelineView.tsx              # Chronological alerts
├── DemandForecastViewer.tsx           # Forecast display
├── ForecastChart.tsx                  # Line chart with confidence interval
├── ForecastAccuracyMetrics.tsx        # Accuracy indicators
├── DashboardList.tsx                  # User dashboards table
├── DashboardBuilder.tsx               # Drag-and-drop editor
├── WidgetLibrary.tsx                  # Available widgets sidebar
├── WidgetConfigPanel.tsx              # Widget settings panel
├── GridLayout.tsx                     # Grid system for widgets
├── WidgetRenderer.tsx                 # Render different widget types
├── ServiceHealthMonitor.tsx           # Health cards
├── ServiceMetricsCard.tsx             # Individual service metrics
└── RecentActivityLog.tsx              # Activity timeline
```

### Shared Widget Components: `/src/components/ai/widgets/`

```
widgets/
├── ChartWidget.tsx                    # Recharts wrapper
├── KPIWidget.tsx                      # Key metric display
├── TableWidget.tsx                    # Data table widget
├── MapWidget.tsx                      # Geographic visualization
├── TextWidget.tsx                     # Text/markdown display
└── CustomWidget.tsx                   # Extensible widget base
```

### API Endpoints: `/src/app/api/v1/ai/`

```
ai/
├── services/
│   ├── route.ts               # GET (list), POST (create)
│   ├── [serviceType]/
│   │   ├── route.ts           # GET, PUT
│   │   └── test/
│   │       └── route.ts       # POST test connection
│   └── health/
│       └── route.ts           # GET all services health
├── predictions/
│   ├── route.ts               # GET (list with filters)
│   ├── [id]/
│   │   └── route.ts           # GET details
│   └── stats/
│       └── route.ts           # GET statistics
├── forecasts/
│   ├── route.ts               # GET (list)
│   ├── [productId]/
│   │   └── route.ts           # GET product forecast
│   └── accuracy/
│       └── route.ts           # GET accuracy metrics
├── alerts/
│   ├── route.ts               # GET (list)
│   ├── [id]/
│   │   ├── route.ts           # GET details
│   │   ├── acknowledge/
│   │   │   └── route.ts       # POST acknowledge
│   │   └── resolve/
│   │       └── route.ts       # POST resolve
│   └── stats/
│       └── route.ts           # GET alert statistics
├── dashboards/
│   ├── route.ts               # GET (list), POST (create)
│   └── [id]/
│       ├── route.ts           # GET, PUT, DELETE
│       └── widgets/
│           ├── route.ts       # GET (list), POST (create)
│           └── [widgetId]/
│               └── route.ts   # GET, PUT, DELETE
└── metrics/
    └── route.ts               # GET cached metrics
```

### Services: `/src/lib/services/ai/`

```typescript
// AIServiceConfigService.ts
export class AIServiceConfigService {
  async getServices(orgId: string): Promise<AIServiceConfig[]>
  async getServiceConfig(orgId: string, serviceType: AIServiceType): Promise<AIServiceConfig>
  async updateServiceConfig(id: string, data: UpdateServiceConfigInput): Promise<AIServiceConfig>
  async testConnection(id: string): Promise<ConnectionTestResult>
  async getServiceHealth(orgId: string): Promise<ServiceHealthData[]>
}

// AIPredictionService.ts
export class AIPredictionService {
  async getPredictions(filters: PredictionFilters): Promise<Prediction[]>
  async getPredictionById(id: string): Promise<Prediction>
  async getPredictionStats(orgId: string, serviceType?: AIServiceType): Promise<PredictionStats>
}

// DemandForecastService.ts
export class DemandForecastService {
  async getForecasts(filters: ForecastFilters): Promise<DemandForecast[]>
  async getProductForecast(productId: string, horizon: ForecastHorizon): Promise<DemandForecast[]>
  async getAccuracyMetrics(orgId: string, days: number): Promise<AccuracyMetrics>
}

// AIAlertService.ts
export class AIAlertService {
  async getAlerts(filters: AlertFilters): Promise<AIAlert[]>
  async getAlertById(id: string): Promise<AIAlert>
  async acknowledgeAlert(id: string): Promise<AIAlert>
  async resolveAlert(id: string): Promise<AIAlert>
  async getAlertStats(orgId: string): Promise<AlertStats>
}

// AnalyticsDashboardService.ts
export class AnalyticsDashboardService {
  async getDashboards(orgId: string): Promise<AnalyticsDashboard[]>
  async getDashboardById(id: string): Promise<AnalyticsDashboard>
  async createDashboard(data: CreateDashboardInput): Promise<AnalyticsDashboard>
  async updateDashboard(id: string, data: UpdateDashboardInput): Promise<AnalyticsDashboard>
  async deleteDashboard(id: string): Promise<void>
}

// AnalyticsWidgetService.ts
export class AnalyticsWidgetService {
  async getWidgets(dashboardId: string): Promise<AnalyticsWidget[]>
  async getWidgetById(id: string): Promise<AnalyticsWidget>
  async createWidget(data: CreateWidgetInput): Promise<AnalyticsWidget>
  async updateWidget(id: string, data: UpdateWidgetInput): Promise<AnalyticsWidget>
  async deleteWidget(id: string): Promise<void>
  async getWidgetData(widgetId: string): Promise<any>
}
```

### Custom Hooks: `/src/hooks/ai/`

```typescript
// useAIServiceConfig.ts
export function useAIServiceConfig(orgId: string) {
  return useQuery({
    queryKey: ['ai-services', orgId],
    queryFn: () => aiServiceConfigService.getServices(orgId),
  })
}

// useAIPredictions.ts
export function useAIPredictions(filters: PredictionFilters) {
  return useQuery({
    queryKey: ['ai-predictions', filters],
    queryFn: () => aiPredictionService.getPredictions(filters),
  })
}

// useDemandForecasts.ts
export function useDemandForecasts(productId: string, horizon: ForecastHorizon) {
  return useQuery({
    queryKey: ['demand-forecasts', productId, horizon],
    queryFn: () => demandForecastService.getProductForecast(productId, horizon),
  })
}

// useAIAlerts.ts
export function useAIAlerts(filters: AlertFilters) {
  return useQuery({
    queryKey: ['ai-alerts', filters],
    queryFn: () => aiAlertService.getAlerts(filters),
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}

// useAnalyticsDashboards.ts
export function useAnalyticsDashboards(orgId: string) {
  return useQuery({
    queryKey: ['analytics-dashboards', orgId],
    queryFn: () => analyticsDashboardService.getDashboards(orgId),
  })
}

// useAIMutations.ts
export function useAIMutations() {
  const queryClient = useQueryClient()

  const acknowledgeAlert = useMutation({
    mutationFn: (id: string) => aiAlertService.acknowledgeAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] })
      toast.success('Alert acknowledged')
    },
  })

  const resolveAlert = useMutation({
    mutationFn: (id: string) => aiAlertService.resolveAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-alerts'] })
      toast.success('Alert resolved')
    },
  })

  return {
    acknowledgeAlert,
    resolveAlert,
  }
}
```

### Type Definitions: `/src/types/ai.ts`

```typescript
export type AIServiceType =
  | 'demand_forecasting'
  | 'supplier_scoring'
  | 'anomaly_detection'
  | 'sentiment_analysis'
  | 'recommendation_engine'
  | 'chatbot'
  | 'document_analysis'

export type AIProvider = 'openai' | 'anthropic' | 'azure_openai' | 'bedrock'

export type ForecastHorizon = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'urgent'

export interface AIServiceConfig {
  id: string
  orgId: string
  serviceType: AIServiceType
  isEnabled: boolean
  provider: AIProvider
  modelName: string
  apiEndpoint: string | null
  config: Record<string, any>
  rateLimitPerHour: number
  createdAt: string
  updatedAt: string
}

export interface Prediction {
  id: string
  orgId: string
  serviceType: AIServiceType
  entityType: string
  entityId: string
  predictionData: Record<string, any>
  confidenceScore: number
  accuracyScore: number | null
  createdAt: string
  expiresAt: string
  feedbackReceived: boolean
  actualOutcome: Record<string, any> | null
}

export interface DemandForecast {
  id: string
  orgId: string
  productId: string
  forecastDate: string
  forecastHorizon: ForecastHorizon
  predictedQuantity: number
  lowerBound: number
  upperBound: number
  confidenceInterval: number
  algorithmUsed: string
  actualQuantity: number | null
  accuracyScore: number | null
  metadata: Record<string, any>
  createdAt: string
}

export interface AIAlert {
  id: string
  orgId: string
  serviceType: AIServiceType
  severity: AlertSeverity
  title: string
  message: string
  recommendations: Recommendation[]
  entityType: string | null
  entityId: string | null
  isAcknowledged: boolean
  acknowledgedBy: string | null
  acknowledgedAt: string | null
  isResolved: boolean
  resolvedAt: string | null
  createdAt: string
  metadata: Record<string, any>
}

export interface Recommendation {
  action: string
  description: string
  priority: number
  estimatedImpact: string
}

export interface AnalyticsDashboard {
  id: string
  orgId: string
  name: string
  description: string
  layout: LayoutConfig[]
  filters: Record<string, any>
  isDefault: boolean
  isShared: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  widgets?: AnalyticsWidget[]
}

export interface LayoutConfig {
  widgetId: string
  x: number
  y: number
  w: number
  h: number
}

export interface AnalyticsWidget {
  id: string
  orgId: string
  dashboardId: string
  widgetType: 'chart' | 'kpi' | 'table' | 'map'
  metricType: string
  config: WidgetConfig
  query: WidgetQuery
  refreshIntervalSeconds: number
  positionX: number
  positionY: number
  width: number
  height: number
  createdAt: string
  updatedAt: string
}

export interface WidgetConfig {
  title: string
  chartType?: 'line' | 'bar' | 'pie' | 'area'
  colors?: string[]
  showLegend?: boolean
  showGrid?: boolean
}

export interface WidgetQuery {
  dataSource: string
  filters: Record<string, any>
  aggregations: Record<string, string>
  groupBy?: string[]
  orderBy?: string
  limit?: number
}

// Health and Stats types
export interface ServiceHealthData {
  serviceType: AIServiceType
  isEnabled: boolean
  totalPredictions: number
  avgConfidence: number
  activeAlerts: number
  lastPrediction: string | null
}

export interface PredictionStats {
  totalPredictions: number
  avgConfidence: number
  confidenceDistribution: { range: string; count: number }[]
  predictionsByType: { type: string; count: number }[]
}

export interface AccuracyMetrics {
  forecastHorizon: ForecastHorizon
  totalForecasts: number
  avgAccuracy: number
  medianAccuracy: number
  forecastsWithActuals: number
}

export interface AlertStats {
  totalAlerts: number
  unresolvedCount: number
  bySeverity: Record<AlertSeverity, number>
  avgResolutionTimeHours: number
}
```

## Implementation Strategy

### Phase 1: Foundation (Week 1-2)
1. Set up route structure for both features
2. Create base layout components
3. Implement service classes
4. Define TypeScript types
5. Set up API routes with placeholder responses
6. Create basic custom hooks

### Phase 2: Loyalty Admin UI (Week 3-4)
1. Loyalty dashboard with overview metrics
2. Program list and form
3. Reward catalog management
4. Redemption queue
5. Rule builder
6. Analytics dashboard with charts

### Phase 3: Loyalty Customer UI (Week 5)
1. Customer loyalty dashboard
2. Tier progress tracker
3. Rewards browser
4. Transaction history
5. Redemption tracker

### Phase 4: AI Services UI (Week 6-7)
1. AI service configuration
2. Predictions monitor
3. AI alerts dashboard
4. Demand forecasting viewer
5. Service health monitor

### Phase 5: Dashboard Builder (Week 8)
1. Dashboard list and CRUD
2. Widget library
3. Drag-and-drop editor
4. Widget configuration
5. Grid layout system
6. Widget rendering

### Phase 6: Polish & Optimization (Week 9-10)
1. Performance optimization
2. Accessibility audit
3. Mobile responsiveness
4. Error boundary improvements
5. Loading state refinements
6. Documentation and examples
7. Unit tests for critical components
8. E2E tests for key flows

## Performance Targets

- Initial page load: < 2 seconds
- Time to interactive: < 3 seconds
- Lighthouse performance score: > 90
- First Contentful Paint: < 1.5 seconds
- Largest Contentful Paint: < 2.5 seconds

## Accessibility Requirements

- WCAG 2.1 Level AA compliance
- Keyboard navigation for all interactive elements
- Screen reader support with proper ARIA labels
- Focus indicators on all focusable elements
- Color contrast ratios > 4.5:1
- Form validation with clear error messages
- Alt text for all images

## Testing Strategy

### Unit Tests
- Service classes
- Utility functions
- Custom hooks
- Form validation

### Integration Tests
- API route handlers
- Data fetching flows
- State management

### E2E Tests (Playwright)
- Loyalty program creation flow
- Reward redemption flow
- Dashboard creation flow
- Alert acknowledgment flow

## Security Considerations

- All API routes protected by authentication
- Organization-level data isolation (RLS)
- Input validation with Zod
- XSS protection via React's default escaping
- CSRF protection for mutations
- Rate limiting on API endpoints
- Audit logging for sensitive operations

## Monitoring & Analytics

- Error tracking with error boundaries
- Performance monitoring with Web Vitals
- User interaction analytics
- API response time tracking
- Client-side error logging

## Documentation Deliverables

1. **Component Library Storybook** - Interactive component examples
2. **API Documentation** - OpenAPI/Swagger specs
3. **User Guides** - Admin and customer-facing guides
4. **Developer Guides** - Architecture and patterns
5. **Deployment Guide** - Environment setup and deployment steps

## Next Steps

1. Review this plan with backend-architect and ai-engineer
2. Confirm API contracts and data structures
3. Create initial Figma designs (if needed)
4. Set up project tracking (GitHub Projects or similar)
5. Begin Phase 1 implementation

---

**Document Version**: 1.0
**Last Updated**: 2025-11-02
**Author**: Frontend Developer (Claude Agent)
**Status**: Pending Review
