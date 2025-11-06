# AI Anomaly Detection API - Quick Reference

## 🚀 Quick Start

```typescript
import { anomalyService } from '@/lib/ai/services/anomaly-service';

// Run detection
const result = await anomalyService.detectAnomalies({
  organizationId: 1,
  entityType: 'supplier',
  sensitivity: 'medium'
});

// List anomalies
const { anomalies, total } = await anomalyService.listAnomalies(1, {
  severity: 'high',
  status: 'active',
  limit: 50
});

// Get stats
const stats = await anomalyService.getAnomalyStats(1);
```

---

## 📡 API Endpoints

### Detection & Listing

```bash
# Run AI detection (authenticated)
POST /api/v1/ai/anomalies/detect
{
  "entityType": "supplier",
  "checkTypes": ["data_quality", "business_rule"],
  "sensitivity": "medium"
}

# List anomalies (authenticated)
GET /api/v1/ai/anomalies?severity=high&status=active&limit=50

# List for specific entity
GET /api/v1/ai/anomalies/by-entity?entityType=supplier&entityId=123
```

### Statistics & Analytics

```bash
# Get comprehensive stats
GET /api/v1/ai/anomalies/stats

# With filters
GET /api/v1/ai/anomalies/stats?startDate=2025-11-01&entityType=supplier
```

### Individual Anomaly Operations

```bash
# Get details
GET /api/v1/ai/anomalies/123

# Acknowledge
PATCH /api/v1/ai/anomalies/123
{"action": "acknowledge"}

# Resolve
PATCH /api/v1/ai/anomalies/123
{"action": "resolve", "resolutionNotes": "Fixed issue"}

# Mark false positive
DELETE /api/v1/ai/anomalies/123
{"notes": "Expected behavior"}
```

---

## 🔍 Query Parameters

### List Anomalies
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset
- `entityType` - Filter: supplier|product|inventory|purchase_order|system
- `entityId` - Specific entity ID
- `severity` - Filter: low|medium|high|critical
- `status` - Filter: active|acknowledged|resolved|false_positive
- `startDate` - ISO date string
- `endDate` - ISO date string

### Detection
- `entityType` - Target entity type
- `entityId` - Specific entity ID (optional)
- `checkTypes` - Array of check types (optional)
- `sensitivity` - low|medium|high (default: medium)

---

## 📊 Response Formats

### Detection Result
```json
{
  "success": true,
  "data": {
    "jobId": "anomaly-1730678400000",
    "status": "completed",
    "anomaliesDetected": 3,
    "overallHealthScore": 0.85,
    "recommendations": ["Fix data quality issues", "..."],
    "detectionTime": 1250,
    "detectedAnomalies": [...]
  }
}
```

### Anomaly List
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 234,
    "hasMore": true
  }
}
```

### Statistics
```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 234,
      "bySeverity": {"critical": 12, "high": 45, "medium": 98, "low": 79},
      "byStatus": {"active": 67, "acknowledged": 45, "resolved": 122}
    },
    "trends": {
      "weekOverWeek": {"change": -8.5, "direction": "decreasing"}
    },
    "topAnomalies": [...]
  }
}
```

---

## 🏷️ Types & Enums

### Anomaly Types
- `data_quality` - Missing values, invalid formats, duplicates
- `statistical` - Outliers, unexpected distributions
- `business_rule` - Business logic violations
- `security` - Suspicious patterns
- `delivery_performance` - Late deliveries
- `quality_issues` - Quality score drops
- `low_stock` - Stock alerts
- `price_variance` - Unusual price changes
- `supplier_risk` - Supplier reliability issues

### Severity Levels
- `critical` - Immediate action required
- `high` - Urgent attention needed
- `medium` - Should be addressed soon
- `low` - Minor issue

### Entity Types
- `supplier` - Supplier entities
- `product` - Product catalog
- `inventory` - Stock and inventory
- `purchase_order` - Purchase orders
- `system` - System-wide checks

### Status Values
- `active` - Newly detected, not acknowledged
- `acknowledged` - Team is investigating
- `resolved` - Issue has been fixed
- `false_positive` - Not a real issue

---

## 🔐 Authentication

All v1 endpoints require authentication:

```typescript
// Headers
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

Organization scoping is automatic based on authenticated user.

---

## ⚡ Performance Tips

1. **Use pagination** - Default limit is 50, max 100
2. **Filter by status** - Use `status=active` for current issues
3. **Date ranges** - Limit queries to specific time periods
4. **Entity-specific** - Use `/by-entity` for focused queries
5. **Cache stats** - Stats endpoint is optimized but cache results client-side

---

## 🐛 Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Detection job created |
| 400 | Bad request (validation error) |
| 401 | Unauthorized |
| 404 | Anomaly not found |
| 500 | Internal server error |

---

## 📝 Common Patterns

### Dashboard Widget
```typescript
async function loadAnomalyWidget() {
  const stats = await fetch('/api/v1/ai/anomalies/stats', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return stats.json();
}
```

### Active Alerts
```typescript
async function getActiveAlerts() {
  const { anomalies } = await anomalyService.listAnomalies(orgId, {
    status: 'active',
    severity: 'critical',
    limit: 10
  });
  return anomalies;
}
```

### Entity Health Check
```typescript
async function checkSupplierHealth(supplierId: number) {
  const result = await anomalyService.detectAnomalies({
    organizationId: orgId,
    entityType: 'supplier',
    entityId: supplierId,
    checkTypes: ['business_rule', 'data_quality'],
    sensitivity: 'high'
  });

  return {
    healthScore: result.overallHealthScore,
    issues: result.anomalies,
    recommendations: result.recommendations
  };
}
```

### Batch Resolution
```typescript
async function resolveAnomalies(anomalyIds: number[], userId: number) {
  const results = await Promise.all(
    anomalyIds.map(id =>
      anomalyService.markResolved(id, userId, 'Batch resolved')
    )
  );
  return results;
}
```

---

## 🔗 Related Services

- **AIDatabaseService** - `/src/lib/ai/database-integration.ts`
- **API Utils** - `/src/lib/ai/api-utils.ts`
- **Database Connection** - `/src/lib/database/connection.ts`

---

## 📚 Full Documentation

See `/docs/AI_ANOMALY_DETECTION_SERVICE.md` for complete documentation.

---

## 🆘 Troubleshooting

**No anomalies detected?**
- Check entity exists in database
- Verify organization ID
- Try lower sensitivity setting

**Authentication errors?**
- Verify token is valid
- Check user has proper permissions
- Ensure organization access

**Slow responses?**
- Use date range filters
- Reduce page size
- Check database indexes

**AI timeout?**
- Reduce data sample size
- Check Anthropic API key
- Verify network connectivity

---

**Version:** 1.0.0 | **Updated:** 2025-11-04
