# AI Metrics Service

Production-ready analytics metrics caching and calculation service for MantisNXT.

## Overview

The AI Metrics Service provides intelligent caching and real-time calculation of business analytics metrics across six key domains:

- **Sales**: Revenue, orders, AOV, top products, growth rates
- **Inventory**: Stock value, turnover, low/overstock alerts
- **Supplier Performance**: Delivery rates, scoring, risk assessment
- **Customer Behavior**: Retention, activity, order patterns
- **Financial**: Revenue, expenses, profit margins
- **Operational**: Order completion, processing times, efficiency

## Architecture

### Database Layer

**Table**: `analytics_metric_cache`

```sql
CREATE TABLE analytics_metric_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  metric_type analytics_metric_type NOT NULL,
  metric_key VARCHAR(255) NOT NULL,
  metric_value JSONB NOT NULL,
  time_period VARCHAR(50) NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_metric_cache UNIQUE (org_id, metric_type, metric_key, period_start)
);
```

**Supported Metric Types**:
- `sales`
- `inventory`
- `supplier_performance`
- `customer_behavior`
- `financial`
- `operational`

**Time Periods**:
- `hourly`
- `daily`
- `weekly`
- `monthly`
- `quarterly`
- `yearly`

### Service Layer

**Location**: `src/lib/ai/services/metrics-service.ts`

**Core Methods**:

#### `getMetrics(orgId, metricType, options)`
Retrieve metrics with intelligent caching.

```typescript
const metrics = await AIMetricsService.getMetrics(
  'org-uuid',
  'sales',
  {
    period: 'daily',
    fresh: false,        // Try cache first
    cacheMaxAge: 300     // 5 minutes
  }
);
```

**Options**:
- `period`: Time period granularity
- `fresh`: Force recalculation (bypass cache)
- `cacheMaxAge`: Maximum cache age in seconds (default: 300)

#### `calculateMetric(orgId, metricType, timeRange)`
Calculate metrics for a specific time range.

```typescript
const metrics = await AIMetricsService.calculateMetric(
  'org-uuid',
  'customer_behavior',
  {
    startDate: new Date('2025-10-01'),
    endDate: new Date('2025-11-01')
  }
);
```

#### `getMetricsByKey(orgId, metricType, key)`
Retrieve specific cached metric by key.

```typescript
const value = await AIMetricsService.getMetricsByKey(
  'org-uuid',
  'sales',
  'daily_sales_summary'
);
```

**Standard Metric Keys**:
- `sales`: `daily_sales_summary`
- `inventory`: `inventory_snapshot`
- `supplier_performance`: `supplier_performance_summary`
- `customer_behavior`: `customer_behavior_summary`
- `financial`: `financial_summary`
- `operational`: `operational_summary`

#### `invalidateMetricCache(orgId, metricType?)`
Invalidate cached metrics.

```typescript
// Invalidate specific metric type
const count = await AIMetricsService.invalidateMetricCache('org-uuid', 'sales');

// Invalidate all metrics for organization
const count = await AIMetricsService.invalidateMetricCache('org-uuid');
```

Returns: Number of cache entries invalidated

#### `recalculateMetrics(orgId, metricTypes[])`
Force recalculation of multiple metric types.

```typescript
const recalculated = await AIMetricsService.recalculateMetrics(
  'org-uuid',
  ['sales', 'inventory', 'supplier_performance']
);

// Returns:
// {
//   sales: { totalRevenue: 10000, ... },
//   inventory: { totalValue: 50000, ... },
//   supplier_performance: { averageScore: 85, ... }
// }
```

#### `getMetricsSummary(orgId, timeRange?)`
Get comprehensive AI metrics summary.

```typescript
const summary = await AIMetricsService.getMetricsSummary('org-uuid');

// Returns:
// {
//   summary: {
//     totalPredictions: 150,
//     averageAccuracy: 0.92,
//     activeAlerts: 5,
//     resolvedAlerts: 23
//   },
//   byService: { ... },
//   trends: { ... },
//   calculatedAt: "2025-11-04T...",
//   cacheExpires: "2025-11-04T..."
// }
```

## API Endpoints

### GET `/api/v1/ai/metrics`

Get comprehensive metrics summary.

**Query Parameters**:
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalPredictions": 150,
      "averageAccuracy": 0.92,
      "activeAlerts": 5,
      "resolvedAlerts": 23
    },
    "byService": { ... },
    "trends": { ... },
    "calculatedAt": "2025-11-04T12:00:00Z",
    "cacheExpires": "2025-11-04T12:05:00Z"
  }
}
```

### GET `/api/v1/ai/metrics/[metricType]`

Get cached metrics for a specific type.

**Path Parameters**:
- `metricType`: One of `sales`, `inventory`, `supplier_performance`, `customer_behavior`, `financial`, `operational`

**Query Parameters**:
- `period` (optional): `hourly`, `daily`, `weekly`, `monthly` (default: `daily`)
- `fresh` (optional): `true` to bypass cache (default: `false`)
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date

**Example**:
```bash
curl "http://localhost:3000/api/v1/ai/metrics/sales?period=daily&fresh=true"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "metricType": "sales",
    "data": {
      "totalRevenue": 125430.50,
      "totalOrders": 342,
      "averageOrderValue": 366.72,
      "topProducts": [...],
      "revenueByCategory": [...],
      "growthRate": 12.5
    },
    "period": {
      "startDate": "2025-11-04T00:00:00Z",
      "endDate": "2025-11-04T23:59:59Z"
    },
    "calculatedAt": "2025-11-04T12:00:00Z",
    "cacheExpires": "2025-11-04T12:05:00Z"
  }
}
```

### GET `/api/v1/ai/metrics/[metricType]/[key]`

Get specific metric by key.

**Path Parameters**:
- `metricType`: Metric type
- `key`: Metric key (e.g., `daily_sales_summary`)

**Example**:
```bash
curl "http://localhost:3000/api/v1/ai/metrics/sales/daily_sales_summary"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "metricType": "sales",
    "key": "daily_sales_summary",
    "value": { ... },
    "metadata": {},
    "calculatedAt": "2025-11-04T12:00:00Z",
    "cacheExpires": "2025-11-04T12:05:00Z"
  }
}
```

### POST `/api/v1/ai/metrics/invalidate`

Invalidate metrics cache.

**Request Body**:
```json
{
  "metricType": "sales",  // Optional: omit to invalidate all
  "key": "daily_sales_summary"  // Optional
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "invalidated": {
      "metricType": "sales",
      "key": null,
      "count": 15
    },
    "message": "Invalidated cache for sales (15 entries)",
    "timestamp": "2025-11-04T12:00:00Z"
  }
}
```

### POST `/api/v1/ai/metrics/recalculate`

Force recalculation of metrics.

**Request Body**:
```json
{
  "metricType": "sales",  // or "all" for all types
  "force": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "metricType": "sales",
    "recalculated": true,
    "data": {
      "totalRevenue": 125430.50,
      ...
    },
    "calculatedAt": "2025-11-04T12:00:00Z",
    "cacheExpires": "2025-11-04T12:05:00Z"
  }
}
```

## Metric Response Schemas

### Sales Metrics
```typescript
{
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  topProducts: Array<{
    productId: string;
    name: string;
    revenue: number;
    quantity: number;
  }>;
  revenueByCategory: Array<{
    category: string;
    revenue: number;
  }>;
  growthRate: number;  // Percentage
}
```

### Inventory Metrics
```typescript
{
  totalValue: number;
  itemCount: number;
  lowStockItems: number;
  overstockItems: number;
  turnoverRate: number;
  daysOfInventory: number;
  stockAccuracy: number;  // Percentage
}
```

### Supplier Performance Metrics
```typescript
{
  totalSuppliers: number;
  activeSuppliers: number;
  averageScore: number;  // 0-100
  onTimeDeliveryRate: number;  // Percentage
  topSuppliers: Array<{
    supplierId: string;
    name: string;
    score: number;
    totalOrders: number;
  }>;
  riskDistribution: Record<string, number>;
}
```

### Customer Behavior Metrics
```typescript
{
  totalCustomers: number;
  activeCustomers: number;
  totalOrders: number;
  avgOrderValue: number;
  retentionRate: number;  // Percentage
}
```

### Financial Metrics
```typescript
{
  revenue: number;
  expenses: number;
  profit: number;
  margin: number;  // Percentage
  orderCount: number;
  purchaseCount: number;
}
```

### Operational Metrics
```typescript
{
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  completionRate: number;  // Percentage
  cancellationRate: number;  // Percentage
  avgProcessingTime: number;  // Seconds
  efficiency: number;  // Percentage
}
```

## Caching Strategy

### Default Behavior

1. **Cache First**: When `fresh: false`, service checks cache before calculating
2. **TTL**: Default cache TTL is 5 minutes (300 seconds)
3. **Invalidation**: Manual invalidation via API or automatic on TTL expiration
4. **Unique Keys**: Cached by `(org_id, metric_type, metric_key, period_start)`

### Cache Hit Example

```typescript
// First request - calculates and caches
const metrics1 = await AIMetricsService.getMetrics('org-uuid', 'sales', { period: 'daily' });

// Second request within TTL - returns cached
const metrics2 = await AIMetricsService.getMetrics('org-uuid', 'sales', { period: 'daily' });

// Same data, no recalculation
```

### Force Recalculation

```typescript
// Bypass cache completely
const fresh = await AIMetricsService.getMetrics('org-uuid', 'sales', {
  period: 'daily',
  fresh: true
});
```

## Testing

### Unit Tests

```bash
# Run metrics service tests
npm run test -- metrics-service

# Run integration tests
npm run test:integration -- metrics
```

### API Tests

```bash
# Start dev server
npm run dev

# Run API tests
./scripts/test-metrics-api.sh

# Or manually
curl http://localhost:3000/api/v1/ai/metrics/sales?period=daily
```

### Database Tests

```bash
# Run database integration tests
npx ts-node scripts/test-metrics-service.ts
```

## Performance Considerations

### Indexing

The `analytics_metric_cache` table has optimized indexes:

```sql
CREATE INDEX idx_metric_cache_org ON analytics_metric_cache(org_id);
CREATE INDEX idx_metric_cache_type ON analytics_metric_cache(metric_type);
CREATE INDEX idx_metric_cache_period ON analytics_metric_cache(period_start, period_end);
CREATE INDEX idx_metric_cache_calculated ON analytics_metric_cache(calculated_at DESC);
CREATE INDEX idx_metric_cache_value ON analytics_metric_cache USING GIN (metric_value);
```

### Query Optimization

- Uses `EXPLAIN ANALYZE` to optimize database queries
- Implements efficient JOINs and aggregations
- Leverages JSONB indexes for fast value lookups

### Cache Sizing

- Typical cache entry: ~5-50KB
- Expected entries per org: ~100-500
- Total cache size per org: ~5-25MB
- Recommended cache cleanup: Weekly for entries > 30 days old

## Error Handling

All errors are handled through the `MetricsError` class:

```typescript
throw new MetricsError('Invalid metric type: xyz');
```

API responses include proper error codes:

- `400`: Validation error
- `401`: Unauthorized
- `404`: Metric not found
- `500`: Internal server error

## Security

- All endpoints require authentication
- Organization-scoped data access
- No SQL injection vulnerabilities (parameterized queries)
- JSONB validation and sanitization

## Monitoring

### Metrics to Monitor

- Cache hit rate
- Average calculation time per metric type
- Cache size and growth
- API response times
- Error rates

### Logging

All operations are logged with context:

```typescript
console.log('Calculating metric', {
  orgId,
  metricType,
  period,
  timeRange
});
```

## Migration Guide

### From Mock to Production

1. ✅ Database table created: `analytics_metric_cache`
2. ✅ Service implemented: `AIMetricsService`
3. ✅ API routes connected: All 5 endpoints
4. ✅ Validation schemas: Zod validation in place
5. ✅ Error handling: Production error classes
6. ✅ Testing: Integration and API tests

### Deployment Checklist

- [ ] Run database migration: `0008_ai_analytics_COMPAT.sql`
- [ ] Verify indexes are created
- [ ] Set `DEFAULT_ORG_ID` environment variable
- [ ] Configure cache TTL if needed
- [ ] Run integration tests
- [ ] Monitor first week for performance
- [ ] Set up cache cleanup job (optional)

## Support

For issues or questions:
- GitHub Issues: MantisNXT repository
- Documentation: `/docs/ai/`
- API Reference: This document
