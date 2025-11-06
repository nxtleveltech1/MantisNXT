# Demand Forecast API Reference

## Base URL
```
/api/v1/ai/forecasts
```

## Authentication
All endpoints require authentication. Include authentication headers with each request.

---

## Endpoints

### 1. List Forecasts

**Endpoint**: `GET /api/v1/ai/forecasts`

**Description**: Retrieve a paginated list of demand forecasts with optional filters.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `productId` | UUID | No | Filter by product ID |
| `granularity` | string | No | Filter by horizon: `daily`, `weekly`, `monthly` |
| `startDate` | ISO 8601 | No | Filter forecasts on or after this date |
| `endDate` | ISO 8601 | No | Filter forecasts on or before this date |
| `limit` | integer | No | Number of results per page (default: 50, max: 100) |
| `page` | integer | No | Page number (default: 1) |

**Example Request**:
```bash
curl -X GET "https://api.mantisnxt.com/api/v1/ai/forecasts?productId=550e8400-e29b-41d4-a716-446655440000&granularity=daily&startDate=2025-12-01&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "org_id": "550e8400-e29b-41d4-a716-446655440000",
      "product_id": "660e8400-e29b-41d4-a716-446655440001",
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
        "factors": [
          {
            "name": "historical_trend",
            "impact": 0.6,
            "description": "Strong upward trend in past 30 days"
          }
        ],
        "recommendations": [
          "Consider increasing stock levels by 15%"
        ]
      },
      "created_at": "2025-11-04T10:00:00Z"
    }
  ],
  "metadata": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}
```

---

### 2. Generate Forecast

**Endpoint**: `POST /api/v1/ai/forecasts`

**Description**: Generate AI-powered demand forecast for a product.

**Request Body**:
```json
{
  "productId": "string (UUID, required)",
  "horizon": "number (1-365, required)",
  "granularity": "string (daily|weekly|monthly, required)",
  "includeConfidenceIntervals": "boolean (optional, default: true)",
  "metadata": "object (optional)"
}
```

**Example Request**:
```bash
curl -X POST "https://api.mantisnxt.com/api/v1/ai/forecasts" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "660e8400-e29b-41d4-a716-446655440001",
    "horizon": 30,
    "granularity": "daily",
    "includeConfidenceIntervals": true,
    "metadata": {
      "seasonal_adjustment": true,
      "campaign_id": "summer-2025"
    }
  }'
```

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "forecast-uuid-1",
      "org_id": "550e8400-e29b-41d4-a716-446655440000",
      "product_id": "660e8400-e29b-41d4-a716-446655440001",
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
        "seasonal_adjustment": true,
        "campaign_id": "summer-2025",
        "factors": [...],
        "recommendations": [...]
      },
      "created_at": "2025-11-04T10:00:00Z"
    },
    {
      "id": "forecast-uuid-2",
      "forecast_date": "2025-12-02",
      ...
    }
  ]
}
```

**Status Codes**:
- `201 Created` - Forecast(s) successfully generated
- `400 Bad Request` - Invalid input parameters
- `401 Unauthorized` - Missing or invalid authentication
- `500 Internal Server Error` - AI service or database error

---

### 3. Get Forecast by ID

**Endpoint**: `GET /api/v1/ai/forecasts/:id`

**Description**: Retrieve a specific forecast by its ID.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Forecast ID |

**Example Request**:
```bash
curl -X GET "https://api.mantisnxt.com/api/v1/ai/forecasts/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "org_id": "550e8400-e29b-41d4-a716-446655440000",
    "product_id": "660e8400-e29b-41d4-a716-446655440001",
    "forecast_date": "2025-12-01",
    "forecast_horizon": "daily",
    "predicted_quantity": 150.00,
    "lower_bound": 140.50,
    "upper_bound": 159.50,
    "confidence_interval": 0.95,
    "algorithm_used": "claude-3.5-sonnet-forecasting",
    "actual_quantity": 148.50,
    "accuracy_score": 0.9821,
    "metadata": {...},
    "created_at": "2025-11-04T10:00:00Z"
  }
}
```

**Status Codes**:
- `200 OK` - Forecast found
- `404 Not Found` - Forecast ID does not exist
- `401 Unauthorized` - Missing or invalid authentication

---

### 4. Update Actual Quantity

**Endpoint**: `PATCH /api/v1/ai/forecasts/:id`

**Description**: Update the actual quantity for a forecast and automatically calculate accuracy score.

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Forecast ID |

**Request Body**:
```json
{
  "actualQuantity": "number (required, >= 0)"
}
```

**Example Request**:
```bash
curl -X PATCH "https://api.mantisnxt.com/api/v1/ai/forecasts/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "actualQuantity": 148.50
  }'
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "org_id": "550e8400-e29b-41d4-a716-446655440000",
    "product_id": "660e8400-e29b-41d4-a716-446655440001",
    "forecast_date": "2025-12-01",
    "forecast_horizon": "daily",
    "predicted_quantity": 150.00,
    "lower_bound": 140.50,
    "upper_bound": 159.50,
    "confidence_interval": 0.95,
    "algorithm_used": "claude-3.5-sonnet-forecasting",
    "actual_quantity": 148.50,
    "accuracy_score": 0.9821,
    "metadata": {...},
    "created_at": "2025-11-04T10:00:00Z"
  },
  "message": "Actual quantity updated and accuracy score calculated"
}
```

**Accuracy Score Calculation**:
- `1.0` - Perfect prediction (actual === predicted)
- `0.7 - 0.99` - Within confidence bounds
- `0.0 - 0.69` - Outside confidence bounds

**Status Codes**:
- `200 OK` - Successfully updated
- `400 Bad Request` - Invalid actual quantity
- `404 Not Found` - Forecast ID does not exist
- `401 Unauthorized` - Missing or invalid authentication

---

### 5. Delete Forecast

**Endpoint**: `DELETE /api/v1/ai/forecasts/:id`

**Description**: Delete a forecast (admin only, typically for cleanup operations).

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Forecast ID |

**Example Request**:
```bash
curl -X DELETE "https://api.mantisnxt.com/api/v1/ai/forecasts/a1b2c3d4-e5f6-7890-abcd-ef1234567890" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "deleted": true,
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  },
  "message": "Forecast deleted successfully"
}
```

**Status Codes**:
- `200 OK` - Successfully deleted
- `404 Not Found` - Forecast ID does not exist
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions (future implementation)

---

### 6. Get Accuracy Metrics

**Endpoint**: `GET /api/v1/ai/forecasts/metrics`

**Description**: Retrieve comprehensive accuracy metrics and performance statistics.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `horizon` | string | No | Filter by specific horizon: `daily`, `weekly`, `monthly` |

**Example Request**:
```bash
curl -X GET "https://api.mantisnxt.com/api/v1/ai/forecasts/metrics?horizon=daily" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response**:
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
      },
      {
        "horizon": "weekly",
        "total_forecasts": 300,
        "forecasts_with_actuals": 100,
        "average_accuracy": 0.8312,
        "median_accuracy": 0.8654,
        "accuracy_by_range": {
          "excellent": 45,
          "good": 35,
          "fair": 15,
          "poor": 5
        },
        "mean_absolute_error": 28.67,
        "mean_absolute_percentage_error": 0.1123
      },
      {
        "horizon": "monthly",
        "total_forecasts": 200,
        "forecasts_with_actuals": 50,
        "average_accuracy": 0.7895,
        "median_accuracy": 0.8123,
        "accuracy_by_range": {
          "excellent": 18,
          "good": 20,
          "fair": 10,
          "poor": 2
        },
        "mean_absolute_error": 89.34,
        "mean_absolute_percentage_error": 0.1567
      }
    ]
  },
  "message": "Metrics for daily horizon"
}
```

**Accuracy Ranges**:
- **Excellent**: Score > 0.9
- **Good**: Score 0.7 - 0.9
- **Fair**: Score 0.5 - 0.7
- **Poor**: Score < 0.5

**Metrics Definitions**:
- **MAE (Mean Absolute Error)**: Average absolute difference between predicted and actual
- **MAPE (Mean Absolute Percentage Error)**: Average percentage error

**Status Codes**:
- `200 OK` - Metrics retrieved successfully
- `401 Unauthorized` - Missing or invalid authentication

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `AI_SERVICE_ERROR` | 503 | AI service unavailable |
| `DATABASE_ERROR` | 500 | Database operation failed |

---

## Rate Limits

- **Forecast Generation**: 100 requests per hour per organization
- **List/Get Operations**: 500 requests per hour per organization
- **Metrics**: 200 requests per hour per organization

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1699488000
```

---

## Data Types Reference

### ForecastHorizon
```typescript
type ForecastHorizon = 'daily' | 'weekly' | 'monthly';
```

### DemandForecast
```typescript
interface DemandForecast {
  id: string;                     // UUID
  org_id: string;                 // UUID
  product_id: string;             // UUID
  forecast_date: string;          // ISO 8601 date
  forecast_horizon: ForecastHorizon;
  predicted_quantity: number;     // Decimal
  lower_bound: number;            // Decimal
  upper_bound: number;            // Decimal
  confidence_interval: number;    // 0.0 - 1.0
  algorithm_used: string;
  actual_quantity: number | null; // Decimal, null until updated
  accuracy_score: number | null;  // 0.0 - 1.0, null until actual provided
  metadata: Record<string, any>;
  created_at: string;             // ISO 8601 timestamp
}
```

### AccuracyMetrics
```typescript
interface AccuracyMetrics {
  horizon: ForecastHorizon;
  total_forecasts: number;
  forecasts_with_actuals: number;
  average_accuracy: number;       // 0.0 - 1.0
  median_accuracy: number;        // 0.0 - 1.0
  accuracy_by_range: {
    excellent: number;            // Count of scores > 0.9
    good: number;                 // Count of scores 0.7 - 0.9
    fair: number;                 // Count of scores 0.5 - 0.7
    poor: number;                 // Count of scores < 0.5
  };
  mean_absolute_error: number;
  mean_absolute_percentage_error: number;
}
```

---

## Integration Examples

### JavaScript/TypeScript
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.mantisnxt.com',
  headers: {
    'Authorization': `Bearer ${process.env.API_TOKEN}`,
  },
});

// Generate forecast
const forecast = await api.post('/api/v1/ai/forecasts', {
  productId: 'product-uuid',
  horizon: 30,
  granularity: 'daily',
  includeConfidenceIntervals: true,
});

// Update actual quantity
const updated = await api.patch(`/api/v1/ai/forecasts/${forecast.data.data[0].id}`, {
  actualQuantity: 148.50,
});

console.log(`Accuracy: ${updated.data.data.accuracy_score}`);
```

### Python
```python
import requests

API_URL = 'https://api.mantisnxt.com'
headers = {'Authorization': f'Bearer {os.environ["API_TOKEN"]}'}

# Generate forecast
response = requests.post(
    f'{API_URL}/api/v1/ai/forecasts',
    headers=headers,
    json={
        'productId': 'product-uuid',
        'horizon': 30,
        'granularity': 'daily',
        'includeConfidenceIntervals': True,
    }
)
forecast = response.json()['data'][0]

# Update actual quantity
response = requests.patch(
    f'{API_URL}/api/v1/ai/forecasts/{forecast["id"]}',
    headers=headers,
    json={'actualQuantity': 148.50}
)
updated = response.json()['data']

print(f'Accuracy: {updated["accuracy_score"]}')
```

---

## Changelog

### Version 1.0.0 (2025-11-04)
- Initial production release
- AI-powered forecasting with Claude 3.5 Sonnet
- Accuracy tracking and metrics
- Support for daily, weekly, monthly horizons
- Confidence interval calculations
- RESTful API design

---

## Support

For API support, contact:
- Email: api-support@mantisnxt.com
- Documentation: https://docs.mantisnxt.com
- Status Page: https://status.mantisnxt.com
