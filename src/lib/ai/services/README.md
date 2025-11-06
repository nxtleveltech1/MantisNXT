# AI Prediction Service

Production-ready AI Prediction Service for MantisNXT that replaces all mock implementations with real database integration.

## Overview

The `PredictionService` provides comprehensive AI prediction management with:
- ✅ Full database integration with `ai_prediction` and `ai_predictions` tables
- ✅ Caching with automatic expiration tracking
- ✅ Accuracy tracking with actual outcome comparison
- ✅ Integration with `AIDatabaseService` for AI-powered predictions
- ✅ Type-safe operations with comprehensive error handling
- ✅ Production-ready transaction support

## Architecture

```
┌─────────────────────────────────────────────────────┐
│           API Routes (Next.js)                      │
│  /api/v1/ai/predictions/*                          │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│        PredictionService (Singleton)                │
│  - listPredictions()                                │
│  - createPrediction()                               │
│  - getPredictionById()                              │
│  - updatePredictionAccuracy()                       │
│  - cleanupExpired()                                 │
│  - generateAIPrediction()                           │
└──────────────────┬──────────────────────────────────┘
                   │
                   ├─────────────────┐
                   ▼                 ▼
┌──────────────────────────┐  ┌──────────────────────┐
│  Database Layer          │  │  AIDatabaseService   │
│  - ai_prediction         │  │  - generatePredictions│
│  - ai_predictions        │  │  - AI Analysis        │
│  - Transactions          │  └──────────────────────┘
└──────────────────────────┘
```

## Database Schema

### ai_prediction (Primary Table)
```sql
CREATE TABLE ai_prediction (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  service_type ai_service_type NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  prediction_data JSONB NOT NULL,
  confidence_score DECIMAL(5, 4) NOT NULL,
  accuracy_score DECIMAL(5, 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  feedback_received BOOLEAN DEFAULT false,
  actual_outcome JSONB,
  metadata JSONB DEFAULT '{}'
);
```

### ai_predictions (Cache Table)
```sql
CREATE TABLE ai_predictions (
  id BIGSERIAL PRIMARY KEY,
  prediction_type VARCHAR(100) NOT NULL,
  target_id INTEGER,
  predictions JSONB NOT NULL,
  confidence DECIMAL(5,4) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

All endpoints are fully implemented and production-ready:

### GET /api/v1/ai/predictions
List predictions with filters and pagination.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `serviceType` - Filter by service type
- `predictionType` - Filter by prediction type
- `status` - Filter by status (pending, validated, expired)
- `entityType` - Filter by entity type (product, supplier, etc.)
- `entityId` - Filter by specific entity ID
- `startDate` - Filter by creation date range start
- `endDate` - Filter by creation date range end
- `minConfidence` - Minimum confidence score (0-1)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "org_id": "uuid",
      "service_type": "demand_forecasting",
      "entity_type": "product",
      "entity_id": "uuid",
      "prediction_type": "inventory_demand",
      "prediction_data": {...},
      "confidence_score": 0.87,
      "accuracy_score": 0.92,
      "created_at": "2025-11-04T...",
      "expires_at": "2025-12-04T...",
      "feedback_received": true,
      "actual_outcome": {...},
      "metadata": {...},
      "status": "validated"
    }
  ],
  "metadata": {
    "page": 1,
    "limit": 50,
    "total": 234,
    "hasMore": true
  }
}
```

### POST /api/v1/ai/predictions
Create a new prediction.

**Request Body:**
```json
{
  "serviceType": "demand_forecasting",
  "entityType": "product",
  "entityId": "uuid",
  "predictionType": "inventory_demand",
  "predictionData": {
    "predictions": [...],
    "factors": [...]
  },
  "confidence": 0.85,
  "metadata": {}
}
```

**Response:** 201 Created with prediction object.

### GET /api/v1/ai/predictions/:id
Get prediction details by ID.

**Response:** 200 OK with prediction object or 404 if not found.

### PATCH /api/v1/ai/predictions/:id
Update prediction with actual outcome for accuracy tracking.

**Request Body:**
```json
{
  "actualOutcome": {
    "value": 150,
    "actuals": [...]
  },
  "accuracy": 0.92,  // Optional - calculated automatically if not provided
  "notes": "Manual validation notes"
}
```

**Response:** 200 OK with updated prediction object.

### GET /api/v1/ai/predictions/by-entity
Get predictions filtered by entity.

**Query Parameters:**
- `entityType` (required) - Entity type
- `entityId` (required) - Entity ID
- `serviceType` - Optional service filter
- `status` - Optional status filter
- `page`, `limit` - Pagination

### GET /api/v1/ai/predictions/by-service
Get predictions filtered by service type.

**Query Parameters:**
- `serviceType` (required) - Service type
- `status` - Optional status filter
- `minConfidence` - Minimum confidence score
- `page`, `limit` - Pagination

### GET /api/v1/ai/predictions/accuracy
Get accuracy metrics and statistics.

**Query Parameters:**
- `serviceType` - Optional service filter
- `predictionType` - Optional prediction type filter
- `startDate`, `endDate` - Optional date range

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "totalPredictions": 1000,
      "pendingPredictions": 150,
      "validatedPredictions": 750,
      "expiredPredictions": 100,
      "averageConfidence": 0.87,
      "averageAccuracy": 0.89
    },
    "period": {
      "startDate": "2025-10-01T...",
      "endDate": "2025-11-04T..."
    },
    "filters": {...},
    "calculatedAt": "2025-11-04T..."
  }
}
```

### POST /api/v1/ai/predictions/cleanup
Clean up expired predictions.

**Request Body:**
```json
{
  "olderThan": "2025-10-01T00:00:00Z",
  "serviceType": "demand_forecasting",  // Optional
  "dryRun": true  // Set to false to actually delete
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dryRun": true,
    "deletedCount": 0,
    "affectedPredictions": [...],
    "cutoffDate": "2025-10-01T...",
    "executedAt": "2025-11-04T..."
  }
}
```

## Service Methods

### listPredictions(orgId, filters)
List predictions with comprehensive filtering and pagination.

```typescript
const result = await predictionService.listPredictions('org-id', {
  serviceType: 'demand_forecasting',
  status: 'pending',
  minConfidence: 0.8,
  limit: 50,
  offset: 0
});
```

### createPrediction(orgId, input)
Create a new prediction with automatic caching.

```typescript
const prediction = await predictionService.createPrediction('org-id', {
  serviceType: 'demand_forecasting',
  entityType: 'product',
  entityId: 'product-uuid',
  predictionType: 'inventory_demand',
  predictionData: { predictions: [...] },
  confidence: 0.87,
  expiresInDays: 30
});
```

### getPredictionById(id, orgId)
Retrieve a specific prediction with security validation.

```typescript
const prediction = await predictionService.getPredictionById(
  'prediction-id',
  'org-id'
);
```

### updatePredictionAccuracy(id, orgId, input)
Update prediction with actual outcome and calculate accuracy.

```typescript
const updated = await predictionService.updatePredictionAccuracy(
  'prediction-id',
  'org-id',
  {
    actualOutcome: { value: 150, actuals: [...] },
    notes: 'Validation complete'
  }
);
// Accuracy is automatically calculated using MAPE algorithm
```

### cleanupExpired(orgId?, daysOld)
Clean up expired predictions.

```typescript
const deletedCount = await predictionService.cleanupExpired('org-id', 30);
console.log(`Deleted ${deletedCount} expired predictions`);
```

### generateAIPrediction(orgId, entityType, entityId, predictionType, forecastDays)
Generate AI-powered prediction using AIDatabaseService.

```typescript
const prediction = await predictionService.generateAIPrediction(
  'org-id',
  'product',
  'product-uuid',
  'inventory_demand',
  30
);
```

### getPredictionStats(orgId)
Get comprehensive prediction statistics.

```typescript
const stats = await predictionService.getPredictionStats('org-id');
// Returns: total, pending, validated, expired, averageConfidence, averageAccuracy
```

## Accuracy Calculation

The service uses **Mean Absolute Percentage Error (MAPE)** to calculate accuracy:

```typescript
// For time-series predictions
accuracy = 1 - (Σ|actual - predicted| / |actual|) / n

// For single-value predictions
accuracy = 1 - |actual - predicted| / |actual|
```

Accuracy scores are clamped between 0 and 1.

## Status Derivation

Prediction status is automatically derived:
- **pending**: Not expired, no actual outcome
- **validated**: Has actual outcome
- **expired**: Past expiration date
- **rejected**: Feedback received but marked as invalid

## Error Handling

All methods throw `PredictionError` for:
- Database connection failures
- Invalid input data
- Permission violations
- Not found scenarios

```typescript
try {
  const prediction = await predictionService.getPredictionById(id, orgId);
} catch (error) {
  if (error instanceof PredictionError) {
    console.error('Prediction error:', error.message);
  }
}
```

## Transaction Safety

All write operations use database transactions:
- `createPrediction()` - Atomic creation + caching
- `updatePredictionAccuracy()` - Atomic update
- `cleanupExpired()` - Atomic batch delete

## Caching Strategy

Predictions are automatically cached in two tables:
1. **ai_prediction** - Full prediction record with metadata
2. **ai_predictions** - Lightweight cache for quick retrieval

Cache entries expire based on `expires_at` timestamp and are automatically cleaned up.

## Integration with AIDatabaseService

The service integrates with `AIDatabaseService` for AI-powered predictions:

```typescript
const prediction = await predictionService.generateAIPrediction(
  'org-id',
  'product',
  'product-uuid',
  'inventory_demand',
  30  // forecast days
);
```

This generates predictions using Claude AI and stores them with full tracking.

## Usage Examples

### Complete Prediction Lifecycle

```typescript
// 1. Create prediction
const prediction = await predictionService.createPrediction('org-id', {
  serviceType: 'demand_forecasting',
  entityType: 'product',
  entityId: 'product-123',
  predictionType: 'inventory_demand',
  predictionData: {
    predictions: [
      { date: '2025-11-05', value: 150, confidence: 0.87 }
    ]
  },
  confidence: 0.87,
  expiresInDays: 30
});

// 2. Check prediction
const retrieved = await predictionService.getPredictionById(
  prediction.id,
  'org-id'
);

// 3. Update with actual outcome
const validated = await predictionService.updatePredictionAccuracy(
  prediction.id,
  'org-id',
  {
    actualOutcome: { value: 148, actuals: [{ value: 148 }] },
    notes: 'Actual sales data'
  }
);
// accuracy_score is automatically calculated: ~0.987

// 4. Get stats
const stats = await predictionService.getPredictionStats('org-id');
console.log(`Accuracy: ${stats.averageAccuracy}`);

// 5. Cleanup old predictions
const deleted = await predictionService.cleanupExpired('org-id', 30);
```

## Testing

To test the service:

```bash
# Via API
curl http://localhost:3000/api/v1/ai/predictions \
  -H "Content-Type: application/json"

# Create prediction
curl -X POST http://localhost:3000/api/v1/ai/predictions \
  -H "Content-Type: application/json" \
  -d '{"serviceType":"demand_forecasting",...}'

# Update accuracy
curl -X PATCH http://localhost:3000/api/v1/ai/predictions/{id} \
  -H "Content-Type: application/json" \
  -d '{"actualOutcome":{...}}'
```

## Security

- All methods validate `org_id` to prevent cross-organization access
- Input validation via Zod schemas
- SQL injection protection via parameterized queries
- Transaction rollback on errors

## Performance

- Indexed queries on `org_id`, `entity_type`, `entity_id`, `service_type`
- Efficient pagination with `LIMIT/OFFSET`
- Automatic cleanup of expired predictions
- Two-tier caching strategy

## Migration Notes

This service **replaces all mock implementations** in:
- ✅ `src/app/api/v1/ai/predictions/route.ts`
- ✅ `src/app/api/v1/ai/predictions/[id]/route.ts`
- ✅ `src/app/api/v1/ai/predictions/by-entity/route.ts`
- ✅ `src/app/api/v1/ai/predictions/by-service/route.ts`
- ✅ `src/app/api/v1/ai/predictions/accuracy/route.ts`
- ✅ `src/app/api/v1/ai/predictions/cleanup/route.ts`

All TODO comments have been removed and replaced with production code.

## Future Enhancements

Potential improvements:
- Real-time prediction updates via WebSocket
- Prediction comparison and A/B testing
- Advanced accuracy metrics (R², MAE, RMSE)
- Prediction versioning and rollback
- Batch prediction operations
- Prediction recommendation engine

## Support

For issues or questions:
1. Check database migrations are applied
2. Verify environment variables are set
3. Review error logs in console
4. Check API response for detailed error messages

---

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: 2025-11-04
