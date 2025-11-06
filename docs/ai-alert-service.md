# AI Alert Service Documentation

## Overview

The AI Alert Service is a production-ready service for managing AI-generated alerts in the MantisNXT system. It provides comprehensive functionality for creating, managing, and analyzing alerts from various AI services.

## Features

- **Full CRUD operations** for AI alerts
- **Advanced filtering** by severity, status, service type, and date range
- **Pagination support** for efficient data retrieval
- **Alert acknowledgment** and resolution workflows
- **Statistics and aggregations** for monitoring
- **Tenant isolation** via Row-Level Security (RLS)
- **Transaction support** for data integrity
- **Type-safe** TypeScript implementation

## Database Schema

The service uses the `ai_alert` table with the following structure:

```sql
CREATE TABLE ai_alert (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_type ai_service_type NOT NULL,
  severity alert_severity NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  recommendations JSONB DEFAULT '[]'::jsonb,
  entity_type VARCHAR(50),
  entity_id UUID,
  is_acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);
```

## Service Methods

### listAlerts(orgId, filters?)

List alerts with optional filtering and pagination.

**Parameters:**
- `orgId` (string): Organization ID for tenant isolation
- `filters` (object, optional):
  - `severity`: AlertSeverity | AlertSeverity[] - Filter by severity level(s)
  - `status`: AlertStatus - Filter by status (pending, acknowledged, resolved)
  - `serviceType`: AIServiceType - Filter by AI service type
  - `startDate`: Date - Filter alerts created after this date
  - `endDate`: Date - Filter alerts created before this date
  - `limit`: number - Maximum results per page (default: 50)
  - `offset`: number - Number of results to skip (default: 0)

**Returns:**
```typescript
{
  alerts: Alert[];
  total: number;
}
```

**Example:**
```typescript
const result = await alertService.listAlerts(orgId, {
  severity: ['critical', 'high'],
  status: 'pending',
  limit: 20,
  offset: 0,
});
```

### getAlertById(alertId, orgId)

Retrieve a single alert by ID.

**Parameters:**
- `alertId` (string): UUID of the alert
- `orgId` (string): Organization ID for validation

**Returns:** `Alert`

**Throws:** `AlertError` if alert not found

**Example:**
```typescript
const alert = await alertService.getAlertById(alertId, orgId);
```

### createAlert(orgId, data)

Create a new alert.

**Parameters:**
- `orgId` (string): Organization ID
- `data` (CreateAlertInput):
  - `serviceType`: AIServiceType - Source AI service
  - `severity`: AlertSeverity - Alert severity level
  - `title`: string - Alert title (max 255 chars)
  - `message`: string - Detailed alert message
  - `entityType?`: string - Related entity type (e.g., 'product', 'supplier')
  - `entityId?`: string - Related entity UUID
  - `metadata?`: object - Additional metadata
  - `recommendations?`: object[] - Array of recommendation objects

**Returns:** `Alert`

**Example:**
```typescript
const alert = await alertService.createAlert(orgId, {
  serviceType: 'anomaly_detection',
  severity: 'critical',
  title: 'Stock Anomaly Detected',
  message: 'Unusual stock movement detected in warehouse A',
  entityType: 'product',
  entityId: productId,
  metadata: { warehouse: 'A', variance: 45.2 },
  recommendations: [
    {
      action: 'verify_stock',
      priority: 'high',
      description: 'Perform physical stock count',
    },
  ],
});
```

### acknowledgeAlert(alertId, userId, orgId)

Acknowledge an alert.

**Parameters:**
- `alertId` (string): UUID of the alert
- `userId` (string): UUID of the user acknowledging
- `orgId` (string): Organization ID for validation

**Returns:** `Alert`

**Throws:** 
- `AlertError` if alert not found
- `AlertError` if alert already acknowledged

**Example:**
```typescript
const alert = await alertService.acknowledgeAlert(alertId, userId, orgId);
```

### resolveAlert(alertId, orgId)

Resolve an alert.

**Parameters:**
- `alertId` (string): UUID of the alert
- `orgId` (string): Organization ID for validation

**Returns:** `Alert`

**Throws:**
- `AlertError` if alert not found
- `AlertError` if alert already resolved

**Example:**
```typescript
const alert = await alertService.resolveAlert(alertId, orgId);
```

### getAlertStats(orgId)

Get comprehensive alert statistics for an organization.

**Parameters:**
- `orgId` (string): Organization ID

**Returns:**
```typescript
{
  total: number;
  by_severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  by_status: {
    pending: number;
    acknowledged: number;
    resolved: number;
  };
  by_service: Record<string, number>;
  unresolved_count: number;
  acknowledged_count: number;
}
```

**Example:**
```typescript
const stats = await alertService.getAlertStats(orgId);
console.log(`Total alerts: ${stats.total}`);
console.log(`Unresolved: ${stats.unresolved_count}`);
```

### deleteAlert(alertId, orgId)

Delete an alert (admin only).

**Parameters:**
- `alertId` (string): UUID of the alert
- `orgId` (string): Organization ID for validation

**Returns:** `void`

**Throws:** `AlertError` if alert not found

### batchAcknowledgeAlerts(alertIds, userId, orgId)

Acknowledge multiple alerts in a single operation.

**Parameters:**
- `alertIds` (string[]): Array of alert UUIDs
- `userId` (string): UUID of the user acknowledging
- `orgId` (string): Organization ID for validation

**Returns:** `number` - Count of alerts acknowledged

**Example:**
```typescript
const count = await alertService.batchAcknowledgeAlerts(
  [alertId1, alertId2, alertId3],
  userId,
  orgId
);
```

### batchResolveAlerts(alertIds, orgId)

Resolve multiple alerts in a single operation.

**Parameters:**
- `alertIds` (string[]): Array of alert UUIDs
- `orgId` (string): Organization ID for validation

**Returns:** `number` - Count of alerts resolved

## API Endpoints

### GET /api/v1/ai/alerts

List alerts with optional filters.

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 50)
- `severity`: 'critical' | 'high' | 'medium' | 'low'
- `status`: 'pending' | 'acknowledged' | 'resolved' | 'dismissed'
- `serviceType`: 'demand_forecasting' | 'anomaly_detection' | 'supplier_scoring' | 'assistant'
- `startDate`: ISO 8601 date string
- `endDate`: ISO 8601 date string

**Response:**
```json
{
  "success": true,
  "data": [...],
  "metadata": {
    "page": 1,
    "limit": 50,
    "total": 127,
    "hasMore": true
  }
}
```

### POST /api/v1/ai/alerts

Create a new alert.

**Request Body:**
```json
{
  "serviceType": "anomaly_detection",
  "severity": "high",
  "title": "Stock Anomaly Detected",
  "message": "Unusual stock movement in warehouse A",
  "entityType": "product",
  "entityId": "uuid",
  "metadata": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "org_id": "uuid",
    "service_type": "anomaly_detection",
    ...
  }
}
```

### GET /api/v1/ai/alerts/:id

Get a specific alert by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Stock Anomaly Detected",
    ...
  }
}
```

### PATCH /api/v1/ai/alerts/:id

Update an alert (acknowledge or resolve).

**Request Body (Acknowledge):**
```json
{
  "action": "acknowledge"
}
```

**Request Body (Resolve):**
```json
{
  "action": "resolve"
}
```

### DELETE /api/v1/ai/alerts/:id

Delete an alert.

**Response:** 204 No Content

### GET /api/v1/ai/alerts/stats

Get alert statistics for the organization.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 127,
    "unresolved_count": 45,
    "acknowledged_count": 23,
    "by_severity": {
      "critical": 12,
      "high": 34,
      "medium": 56,
      "low": 25
    },
    "by_status": {
      "pending": 22,
      "acknowledged": 23,
      "resolved": 82
    },
    "by_service": {
      "anomaly_detection": 67,
      "demand_forecasting": 45,
      "supplier_scoring": 15
    }
  }
}
```

## Types

### AlertSeverity
```typescript
type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
```

### AlertStatus
```typescript
type AlertStatus = 'pending' | 'acknowledged' | 'resolved' | 'dismissed';
```

### AIServiceType
```typescript
type AIServiceType = 
  | 'demand_forecasting'
  | 'anomaly_detection'
  | 'supplier_scoring'
  | 'assistant';
```

### Alert
```typescript
interface Alert {
  id: string;
  org_id: string;
  service_type: AIServiceType;
  severity: AlertSeverity;
  title: string;
  message: string;
  recommendations?: Record<string, any>[];
  entity_type?: string;
  entity_id?: string;
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: Date;
  is_resolved: boolean;
  resolved_at?: Date;
  created_at: Date;
  metadata?: Record<string, any>;
}
```

## Error Handling

All service methods throw `AlertError` on failure:

```typescript
try {
  const alert = await alertService.getAlertById(alertId, orgId);
} catch (error) {
  if (error instanceof AlertError) {
    console.error('Alert error:', error.message);
  }
}
```

## Security

- **Tenant Isolation**: All queries are filtered by `org_id` to ensure data isolation
- **Row-Level Security**: Database RLS policies enforce organization-level access control
- **Transaction Safety**: Critical operations use database transactions
- **Input Validation**: All inputs are validated using Zod schemas

## Testing

Run the test script:

```bash
npx tsx scripts/test-alert-service.ts
```

The test script validates:
- Alert creation
- Alert retrieval
- Alert listing with filters
- Alert acknowledgment
- Alert resolution
- Statistics aggregation
- Error handling
- Data cleanup

## Best Practices

1. **Always filter by org_id** to maintain tenant isolation
2. **Use transactions** for operations that modify multiple records
3. **Validate inputs** before calling service methods
4. **Handle errors gracefully** with try-catch blocks
5. **Use pagination** for large result sets
6. **Monitor statistics** to track alert trends
7. **Clean up resolved alerts** periodically to maintain performance

## Performance Considerations

- Database indexes on `org_id`, `severity`, `created_at`, and `is_resolved`
- Pagination to limit result set sizes
- Statistics queries use aggregation functions
- Batch operations for multiple alerts

## Future Enhancements

- [ ] Alert notification system (email, SMS, Slack)
- [ ] Alert escalation rules
- [ ] Alert templates
- [ ] Alert history tracking
- [ ] Advanced analytics and reporting
- [ ] ML-based alert prioritization
