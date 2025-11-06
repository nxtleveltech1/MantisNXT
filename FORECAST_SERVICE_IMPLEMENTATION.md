# Demand Forecast Service - Production Implementation

## Overview
Production-ready AI-powered demand forecasting service that replaces mock implementations with real database integration and AI predictions.

## Implementation Summary

### Files Created/Modified

#### 1. Core Service
**File**: `src/lib/ai/services/forecast-service.ts`
- **Class**: `DemandForecastService`
- **Integration**: AIDatabaseService.generatePredictions()
- **Database**: demand_forecast table (Postgres)

**Key Methods**:
```typescript
listForecasts(orgId, options): Promise<{forecasts, total}>
generateForecast(orgId, options): Promise<DemandForecast[]>
updateActualQuantity(forecastId, actualQty): Promise<DemandForecast>
getAccuracyMetrics(orgId, horizon): Promise<AccuracyMetrics[]>
getForecastById(forecastId): Promise<DemandForecast | null>
cleanupOldForecasts(orgId, olderThanDate): Promise<number>
```

#### 2. API Routes

**A. Main Routes** - `src/app/api/v1/ai/forecasts/route.ts`
- `GET /api/v1/ai/forecasts` - List forecasts with filters
- `POST /api/v1/ai/forecasts` - Generate new forecast

**B. Individual Forecast** - `src/app/api/v1/ai/forecasts/[id]/route.ts`
- `GET /api/v1/ai/forecasts/[id]` - Get forecast by ID
- `PATCH /api/v1/ai/forecasts/[id]` - Update actual quantity
- `DELETE /api/v1/ai/forecasts/[id]` - Delete forecast (admin)

**C. Metrics** - `src/app/api/v1/ai/forecasts/metrics/route.ts`
- `GET /api/v1/ai/forecasts/metrics` - Get accuracy metrics

## Features

### 1. AI-Powered Forecasting
- Integrates with Claude 3.5 Sonnet via AIDatabaseService
- Supports three horizons: daily, weekly, monthly
- Generates confidence intervals and bounds
- Historical data analysis (90-day lookback)

### 2. Accuracy Tracking
- Automatic accuracy score calculation when actual data provided
- Scoring methodology:
  - Perfect prediction (actual = predicted): 1.0
  - Within confidence bounds: 0.7 - 0.99
  - Outside bounds: 0.0 - 0.69
- Mean Absolute Error (MAE) and MAPE tracking

### 3. Database Integration
```sql
-- Table: demand_forecast
- id: UUID
- org_id: UUID
- product_id: UUID
- forecast_date: DATE
- forecast_horizon: ENUM (daily, weekly, monthly)
- predicted_quantity: DECIMAL
- lower_bound: DECIMAL
- upper_bound: DECIMAL
- confidence_interval: DECIMAL (default 0.95)
- algorithm_used: VARCHAR
- actual_quantity: DECIMAL (nullable)
- accuracy_score: DECIMAL (nullable, calculated)
- metadata: JSONB
- created_at: TIMESTAMP
```

### 4. Transaction Safety
- Uses database transactions for consistency
- UPSERT pattern (ON CONFLICT DO UPDATE)
- Automatic rollback on AI failures

### 5. Comprehensive Metrics
```typescript
interface AccuracyMetrics {
  horizon: ForecastHorizon;
  total_forecasts: number;
  forecasts_with_actuals: number;
  average_accuracy: number;
  median_accuracy: number;
  accuracy_by_range: {
    excellent: number;  // > 0.9
    good: number;       // 0.7 - 0.9
    fair: number;       // 0.5 - 0.7
    poor: number;       // < 0.5
  };
  mean_absolute_error: number;
  mean_absolute_percentage_error: number;
}
```

## API Usage Examples

### Generate Forecast
```bash
POST /api/v1/ai/forecasts
Content-Type: application/json

{
  "productId": "uuid-here",
  "horizon": 30,
  "granularity": "daily",
  "includeConfidenceIntervals": true,
  "metadata": {
    "seasonal_adjustment": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "forecast-uuid",
      "org_id": "org-uuid",
      "product_id": "product-uuid",
      "forecast_date": "2025-12-01",
      "forecast_horizon": "daily",
      "predicted_quantity": 150.00,
      "lower_bound": 140.50,
      "upper_bound": 159.50,
      "confidence_interval": 0.95,
      "algorithm_used": "claude-3.5-sonnet-forecasting",
      "actual_quantity": null,
      "accuracy_score": null,
      "metadata": {
        "ai_confidence": 0.87,
        "factors": [...],
        "recommendations": [...]
      },
      "created_at": "2025-11-04T10:00:00Z"
    }
  ]
}
```

### List Forecasts
```bash
GET /api/v1/ai/forecasts?productId=uuid&granularity=daily&startDate=2025-12-01&endDate=2025-12-31&limit=50&page=1
```

### Update Actual Quantity
```bash
PATCH /api/v1/ai/forecasts/:id
Content-Type: application/json

{
  "actualQuantity": 148.50
}
```

**Response** (with calculated accuracy):
```json
{
  "success": true,
  "data": {
    "id": "forecast-uuid",
    "accuracy_score": 0.9821,
    "actual_quantity": 148.50,
    ...
  },
  "message": "Actual quantity updated and accuracy score calculated"
}
```

### Get Accuracy Metrics
```bash
GET /api/v1/ai/forecasts/metrics?horizon=daily
```

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_forecasts": 1500,
      "total_with_actuals": 450,
      "overall_average_accuracy": 0.8542,
      "overall_mape": 0.1234,
      "horizons_analyzed": 3
    },
    "by_horizon": [
      {
        "horizon": "daily",
        "total_forecasts": 1000,
        "forecasts_with_actuals": 300,
        "average_accuracy": 0.8621,
        "median_accuracy": 0.8890,
        "accuracy_by_range": {
          "excellent": 150,
          "good": 100,
          "fair": 40,
          "poor": 10
        },
        "mean_absolute_error": 12.45,
        "mean_absolute_percentage_error": 0.0987
      }
    ]
  },
  "message": "Metrics for daily horizon"
}
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     API Layer                               │
│  /api/v1/ai/forecasts (GET, POST)                          │
│  /api/v1/ai/forecasts/[id] (GET, PATCH, DELETE)            │
│  /api/v1/ai/forecasts/metrics (GET)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│             DemandForecastService                           │
│  - listForecasts()                                          │
│  - generateForecast() ──────────┐                           │
│  - updateActualQuantity()       │                           │
│  - getAccuracyMetrics()         │                           │
│  - calculateAccuracyScore()     │                           │
└────────────┬───────────────────┬┘                           │
             │                   │                             │
             ▼                   ▼                             │
┌─────────────────────┐  ┌──────────────────────────┐        │
│  Database Layer     │  │  AIDatabaseService       │◄───────┘
│  demand_forecast    │  │  generatePredictions()   │
│  table (Postgres)   │  │  (Claude 3.5 Sonnet)     │
└─────────────────────┘  └──────────────────────────┘
```

## Accuracy Calculation Algorithm

The service uses a sophisticated accuracy scoring system:

```typescript
1. Perfect Match (actual === predicted): 1.0

2. Within Confidence Bounds:
   - Score: 0.7 to 0.99
   - Decreases linearly as distance from predicted increases
   - Formula: max(0.7, 0.99 - (distance/range) * 0.29)

3. Outside Confidence Bounds:
   - Score: 0.0 to 0.7
   - Decreases rapidly with distance from nearest bound
   - Formula: max(0.0, 0.7 - (outsideDistance/range) * 0.7)
```

This ensures:
- Perfect predictions get top score
- Predictions within confidence intervals get high scores
- Predictions far outside bounds get low scores
- Gradual degradation rather than binary success/fail

## Data Flow

### Forecast Generation
```
1. User requests forecast via POST /api/v1/ai/forecasts
2. Validate input (productId, horizon, granularity)
3. Call DemandForecastService.generateForecast()
4. Service calls AIDatabaseService.generatePredictions()
   - Fetches 90 days of historical stock movement data
   - Sends to Claude 3.5 Sonnet with forecasting prompt
   - Receives AI predictions with confidence scores
5. Transform AI output to database records
6. UPSERT to demand_forecast table (within transaction)
7. Return forecast records to user
```

### Accuracy Update
```
1. Actual quantity becomes available (e.g., end of day)
2. User sends PATCH /api/v1/ai/forecasts/:id
3. Service retrieves forecast from database
4. Calculates accuracy score using algorithm
5. Updates actual_quantity and accuracy_score fields
6. Returns updated forecast with calculated accuracy
```

### Metrics Retrieval
```
1. User requests GET /api/v1/ai/forecasts/metrics
2. Service aggregates data by horizon using SQL:
   - COUNT total forecasts
   - COUNT forecasts with actuals
   - AVG/MEDIAN accuracy scores
   - Distribution across accuracy ranges
   - MAE and MAPE calculations
3. Return comprehensive metrics by horizon
```

## Edge Cases Handled

1. **Insufficient Historical Data**
   - AI service handles gracefully with lower confidence
   - Metadata includes warning flags

2. **Concurrent Forecast Generation**
   - UPSERT pattern prevents duplicates
   - Unique constraint: (org_id, product_id, forecast_date, horizon)

3. **Division by Zero in Accuracy**
   - Protected with null checks
   - Returns 1.0 if both predicted and actual are 0
   - Returns 0.0 if predicted is 0 but actual is not

4. **Invalid Date Ranges**
   - Validation in route handlers
   - Zod schema validation for all inputs

5. **Missing Organization ID**
   - Authentication middleware provides default org_id
   - Fails gracefully with proper error messages

## Performance Optimizations

1. **Database Indexes**
   ```sql
   CREATE INDEX idx_demand_forecast_org_product
     ON demand_forecast(org_id, product_id, forecast_date);

   CREATE INDEX idx_demand_forecast_horizon
     ON demand_forecast(org_id, forecast_horizon, created_at);
   ```

2. **Pagination**
   - All list endpoints support limit/offset
   - Default limit: 50 records

3. **Query Optimization**
   - Single query for counts and data
   - Aggregate functions for metrics

4. **Transaction Batching**
   - Multiple forecast inserts in single transaction
   - Reduces database round-trips

## Testing Recommendations

### Unit Tests
```typescript
describe('DemandForecastService', () => {
  describe('calculateAccuracyScore', () => {
    it('should return 1.0 for perfect prediction');
    it('should return high score within bounds');
    it('should return low score outside bounds');
    it('should handle zero division');
  });

  describe('generateForecast', () => {
    it('should generate forecasts for valid input');
    it('should reject invalid horizon');
    it('should handle AI service failures');
  });
});
```

### Integration Tests
```typescript
describe('Forecast API', () => {
  it('should create forecast and calculate accuracy', async () => {
    const forecast = await POST('/api/v1/ai/forecasts', {...});
    await PATCH(`/api/v1/ai/forecasts/${forecast.id}`, { actualQuantity: 150 });
    expect(forecast.accuracy_score).toBeGreaterThan(0);
  });
});
```

## Security Considerations

1. **Authentication**
   - All endpoints require authentication
   - Org-level data isolation

2. **Authorization**
   - DELETE requires admin role (to be implemented)
   - Data scoped to authenticated org

3. **Input Validation**
   - Zod schemas for all inputs
   - SQL injection prevention via parameterized queries

4. **Rate Limiting**
   - Ready for rate limiting middleware
   - Computationally expensive operations tracked

## Migration Path

### Before (Mock)
```typescript
// Mock response structure
const forecast = {
  id: 'forecast-123',
  predictions: [
    { date: '2025-12-01', value: 150, confidence: 0.87 }
  ]
};
return createdResponse(forecast);
```

### After (Production)
```typescript
const forecasts = await demandForecastService.generateForecast(user.org_id, {
  productId: validated.productId,
  horizon: validated.granularity,
  days: validated.horizon,
  includeConfidenceIntervals: validated.includeConfidenceIntervals,
});
return createdResponse(forecasts);
```

## Next Steps

1. **Role-Based Access Control**
   - Implement admin-only DELETE endpoint
   - Add fine-grained permissions

2. **Caching Layer**
   - Cache recent forecasts
   - Redis integration for hot data

3. **Background Jobs**
   - Scheduled forecast generation
   - Automatic actual quantity updates from stock movements

4. **Notification System**
   - Alert on low accuracy scores
   - Weekly accuracy reports

5. **Advanced Analytics**
   - Forecast vs actual visualizations
   - Trend analysis dashboard
   - Seasonality detection

## Maintenance

### Database Cleanup
```typescript
// Clean up old forecasts (older than 1 year)
await demandForecastService.cleanupOldForecasts(
  orgId,
  new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
);
```

### Monitoring Metrics
- Forecast accuracy by horizon
- API response times
- AI service call success rate
- Database query performance

## Troubleshooting

### Issue: Low Accuracy Scores
**Diagnosis**: Check historical data quality and volume
**Solution**: Ensure minimum 90 days of historical data

### Issue: Slow Forecast Generation
**Diagnosis**: AI service latency
**Solution**: Implement async job queue for bulk forecasts

### Issue: Missing Forecasts in List
**Diagnosis**: Date range filters too narrow
**Solution**: Expand date range or remove filters

## Conclusion

This production implementation provides:
- ✅ AI-powered forecasting with Claude 3.5 Sonnet
- ✅ Database persistence with accuracy tracking
- ✅ Comprehensive metrics and reporting
- ✅ Transaction safety and error handling
- ✅ RESTful API design
- ✅ TypeScript type safety
- ✅ Production-ready architecture

All mock responses have been replaced with real, functional code that integrates with the existing MantisNXT infrastructure.
