# ForecastViewer Component Update - Production API Integration

## Summary
Updated `src/components/ai/admin/ForecastViewer.tsx` to connect to the new production forecast API endpoints and match the database schema from `forecast-service.ts`.

## Changes Made

### 1. Updated Type Definitions
- **Replaced** `Forecast` interface with `DemandForecast` matching `forecast-service.ts`
- **Updated** `AccuracyMetrics` to `AccuracyMetricsByHorizon` and `AccuracyMetricsResponse`
- **Changed** horizon type from 5 options to 3: `'daily' | 'weekly' | 'monthly'`

#### New Types
```typescript
interface DemandForecast {
  id: string;
  org_id: string;
  product_id: string;
  forecast_date: string;
  forecast_horizon: 'daily' | 'weekly' | 'monthly';
  predicted_quantity: number;
  lower_bound: number;
  upper_bound: number;
  confidence_interval: number;
  algorithm_used: string;
  actual_quantity: number | null;
  accuracy_score: number | null;
  metadata: Record<string, any>;
  created_at: string;
}
```

### 2. API Endpoint Updates

#### List Forecasts (GET)
- **Old**: `/api/v1/ai/forecasts/product/${productId}?granularity=${horizon}`
- **New**: `/api/v1/ai/forecasts?productId=${productId}&granularity=${horizon}&limit=100`
- **Returns**: `{ forecasts: DemandForecast[], total: number }`

#### Generate Forecast (POST)
- **Old**: `/api/v1/ai/forecasts/generate-bulk` (bulk generation)
- **New**: `/api/v1/ai/forecasts` (single product generation)
- **Payload**:
```json
{
  "productId": "string",
  "granularity": "daily|weekly|monthly",
  "horizon": 30,
  "includeConfidenceIntervals": true
}
```

#### Accuracy Metrics (GET)
- **Old**: `/api/v1/ai/forecasts/accuracy?productId=${productId}`
- **New**: `/api/v1/ai/forecasts/metrics?horizon=${horizon}`
- **Returns**: Comprehensive accuracy metrics by horizon with summary

### 3. Data Structure Transformations

#### Chart Data Mapping
```typescript
// Transform forecasts array into chart-compatible format
const chartData = forecastsData?.forecasts.map((f) => ({
  date: f.forecast_date,
  predicted_quantity: f.predicted_quantity,
  lower_bound: f.lower_bound,
  upper_bound: f.upper_bound,
  actual_quantity: f.actual_quantity,
})) || [];
```

#### Field Name Changes
- `confidence_lower` → `lower_bound`
- `confidence_upper` → `upper_bound`
- `forecast_data[]` → individual records in `forecasts[]`

### 4. UI Component Updates

#### Horizon Selector
- **Removed**: Quarterly and Yearly options
- **Kept**: Daily, Weekly, Monthly (matching database schema)
- **Updated**: Grid layout from 5 columns to 3

#### Accuracy Metrics Display
- **Average Accuracy**: From `currentMetrics.average_accuracy`
- **MAPE**: From `currentMetrics.mean_absolute_percentage_error`
- **MAE**: From `currentMetrics.mean_absolute_error` (replaced RMSE)
- **Added**: Forecast counts (with actuals / total)

#### Generate Button
- **Changed**: From "Generate Bulk Forecasts" to "Generate Forecast"
- **Behavior**: Now generates forecast for selected product only
- **Disabled**: When no product is selected

### 5. Export Functionality
Updated CSV export to include new fields:
- `accuracy_score` column
- Updated filename format: `forecast-${productId}-${horizon}-${date}.csv`

## New Features Added

### 1. Generate Forecast for Selected Product
```typescript
const generateForecastMutation = useMutation({
  mutationFn: async () => {
    const response = await fetch('/api/v1/ai/forecasts', {
      method: 'POST',
      body: JSON.stringify({
        productId: selectedProductId,
        granularity: selectedHorizon,
        horizon: selectedHorizon === 'daily' ? 30 : selectedHorizon === 'weekly' ? 12 : 6,
        includeConfidenceIntervals: true,
      }),
    });
    return response.json();
  },
});
```

### 2. Accuracy Metrics by Horizon
- Fetches organization-wide accuracy metrics
- Filters by selected horizon
- Displays comprehensive statistics:
  - Total forecasts
  - Forecasts with actual data
  - Average/median accuracy
  - MAE and MAPE
  - Distribution (excellent/good/fair/poor)

## API Endpoints Available (Not Yet Implemented in UI)

### Update Actual Quantity
```typescript
PATCH /api/v1/ai/forecasts/[id]
Body: { actualQuantity: number }
```
**Future Enhancement**: Add UI to update actual quantities and recalculate accuracy

### Get Single Forecast
```typescript
GET /api/v1/ai/forecasts/[id]
```
**Future Enhancement**: Detail view for individual forecast records

### Delete Forecast
```typescript
DELETE /api/v1/ai/forecasts/[id]
```
**Future Enhancement**: Admin capability to delete specific forecasts

## Testing Checklist

- [x] TypeScript compilation passes with no errors
- [ ] Product selection updates forecast data correctly
- [ ] Horizon tabs switch between daily/weekly/monthly
- [ ] Generate Forecast button creates new predictions
- [ ] Chart displays forecast data with confidence intervals
- [ ] Accuracy metrics load and display correctly
- [ ] Export functionality downloads CSV with correct data
- [ ] Loading states display during API calls
- [ ] Error states show appropriate messages

## Database Schema Reference

The component now aligns with the `demand_forecast` table:

```sql
CREATE TABLE demand_forecast (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  forecast_date DATE NOT NULL,
  forecast_horizon VARCHAR(20) NOT NULL,
  predicted_quantity NUMERIC(15,2) NOT NULL,
  lower_bound NUMERIC(15,2) NOT NULL,
  upper_bound NUMERIC(15,2) NOT NULL,
  confidence_interval NUMERIC(5,4) NOT NULL,
  algorithm_used VARCHAR(100) NOT NULL,
  actual_quantity NUMERIC(15,2),
  accuracy_score NUMERIC(5,4),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(org_id, product_id, forecast_date, forecast_horizon)
);
```

## Next Steps

1. **Test with real data**: Verify forecast generation works end-to-end
2. **Add actual quantity updates**: Implement UI for PATCH `/api/v1/ai/forecasts/[id]`
3. **Add forecast detail view**: Click on chart data point to see individual forecast
4. **Implement bulk operations**: Add bulk forecast generation for multiple products
5. **Add filtering**: Date range, accuracy threshold, product category filters
6. **Real product data**: Replace mock products with actual product API

## Files Modified

- `src/components/ai/admin/ForecastViewer.tsx` (Complete rewrite to match new API)

## Dependencies

- React Query (`@tanstack/react-query`)
- Recharts (charts)
- date-fns (date formatting)
- sonner (toast notifications)
- All dependencies remain the same
