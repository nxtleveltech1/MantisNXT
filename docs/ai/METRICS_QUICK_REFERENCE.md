# AI Metrics Service - Quick Reference

## API Endpoints

### Get Metrics Summary
```bash
GET /api/v1/ai/metrics
```

### Get Metrics by Type
```bash
GET /api/v1/ai/metrics/{metricType}?period=daily&fresh=false
```

**Metric Types**: `sales`, `inventory`, `supplier_performance`, `customer_behavior`, `financial`, `operational`

**Periods**: `hourly`, `daily`, `weekly`, `monthly`, `quarterly`, `yearly`

### Get Metric by Key
```bash
GET /api/v1/ai/metrics/{metricType}/{key}
```

### Invalidate Cache
```bash
POST /api/v1/ai/metrics/invalidate
Content-Type: application/json

{
  "metricType": "sales"  // or omit for all
}
```

### Recalculate Metrics
```bash
POST /api/v1/ai/metrics/recalculate
Content-Type: application/json

{
  "metricType": "sales",  // or "all"
  "force": true
}
```

## Service Methods

```typescript
import { AIMetricsService } from '@/lib/ai/services/metrics-service';

// Get cached metrics
const metrics = await AIMetricsService.getMetrics(orgId, 'sales', {
  period: 'daily',
  fresh: false,
  cacheMaxAge: 300
});

// Calculate fresh metrics
const fresh = await AIMetricsService.calculateMetric(orgId, 'sales', {
  startDate: new Date('2025-10-01'),
  endDate: new Date('2025-11-01')
});

// Get by key
const value = await AIMetricsService.getMetricsByKey(
  orgId,
  'sales',
  'daily_sales_summary'
);

// Invalidate cache
const count = await AIMetricsService.invalidateMetricCache(orgId, 'sales');

// Recalculate
const results = await AIMetricsService.recalculateMetrics(
  orgId,
  ['sales', 'inventory']
);

// Get summary
const summary = await AIMetricsService.getMetricsSummary(orgId);
```

## Metric Keys

- **Sales**: `daily_sales_summary`
- **Inventory**: `inventory_snapshot`
- **Supplier Performance**: `supplier_performance_summary`
- **Customer Behavior**: `customer_behavior_summary`
- **Financial**: `financial_summary`
- **Operational**: `operational_summary`

## Response Format

```json
{
  "success": true,
  "data": {
    "metricType": "sales",
    "data": { /* metric values */ },
    "period": {
      "startDate": "2025-11-04T00:00:00Z",
      "endDate": "2025-11-04T23:59:59Z"
    },
    "calculatedAt": "2025-11-04T12:00:00Z",
    "cacheExpires": "2025-11-04T12:05:00Z"
  }
}
```

## Testing

```bash
# Integration tests
npx ts-node scripts/test-metrics-service.ts

# API tests
./scripts/test-metrics-api.sh

# Production verification
npx ts-node scripts/verify-metrics-production.ts
```

## Common Tasks

### Force Refresh All Metrics
```bash
curl -X POST http://localhost:3000/api/v1/ai/metrics/recalculate \
  -H "Content-Type: application/json" \
  -d '{"metricType":"all"}'
```

### Clear All Cache
```bash
curl -X POST http://localhost:3000/api/v1/ai/metrics/invalidate \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Get Fresh Sales Data
```bash
curl "http://localhost:3000/api/v1/ai/metrics/sales?period=daily&fresh=true"
```

## Cache Configuration

- **Default TTL**: 5 minutes (300 seconds)
- **Storage**: PostgreSQL JSONB
- **Invalidation**: Manual or TTL-based
- **Size**: ~5-50KB per entry

## Performance Tips

1. Use `fresh: false` (default) to leverage cache
2. Invalidate cache only when data changes
3. Use appropriate time periods (daily for most cases)
4. Batch recalculations during off-peak hours
5. Monitor cache hit rate (target >80%)

## Troubleshooting

### Cache Not Working
```typescript
// Check cache directly
const value = await AIMetricsService.getMetricsByKey(orgId, 'sales', 'daily_sales_summary');
console.log(value); // null if not cached
```

### Force Recalculation
```typescript
const fresh = await AIMetricsService.getMetrics(orgId, 'sales', { fresh: true });
```

### Check Database
```sql
SELECT * FROM analytics_metric_cache
WHERE org_id = 'your-org-id'
ORDER BY calculated_at DESC
LIMIT 10;
```

## Environment Variables

```bash
# Required
DEFAULT_ORG_ID=00000000-0000-0000-0000-000000000000

# Optional
NODE_ENV=production
```

## Error Codes

- `400` - Validation error
- `401` - Unauthorized
- `404` - Metric not found
- `500` - Internal server error

## Support

- Documentation: `docs/ai/metrics-service.md`
- Integration: `docs/ai/METRICS_PRODUCTION_SUMMARY.md`
- Code: `src/lib/ai/services/metrics-service.ts`
