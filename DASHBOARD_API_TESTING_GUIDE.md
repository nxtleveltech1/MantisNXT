# Dashboard Service API Testing Guide

## Quick Test Endpoints

### Prerequisites
```bash
# Set authentication token
export AUTH_TOKEN="your-jwt-token-here"
export BASE_URL="http://localhost:3000/api/v1/ai"
```

## Dashboard Endpoints

### 1. List Dashboards
```bash
curl -X GET "$BASE_URL/dashboards?limit=10&offset=0" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Create Dashboard
```bash
curl -X POST "$BASE_URL/dashboards" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Analytics Dashboard",
    "description": "My first dashboard",
    "layout": [
      {"i": "w1", "x": 0, "y": 0, "w": 6, "h": 4},
      {"i": "w2", "x": 6, "y": 0, "w": 6, "h": 4}
    ],
    "isPublic": false,
    "metadata": {
      "category": "analytics"
    }
  }'
```

### 3. Get Dashboard
```bash
# Replace {dashboard_id} with actual ID from create response
curl -X GET "$BASE_URL/dashboards/{dashboard_id}" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### 4. Update Dashboard
```bash
curl -X PATCH "$BASE_URL/dashboards/{dashboard_id}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Dashboard Name",
    "description": "Updated description"
  }'
```

### 5. Update Layout
```bash
curl -X PATCH "$BASE_URL/dashboards/{dashboard_id}/layout" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "layout": [
      {"i": "w1", "x": 0, "y": 0, "w": 12, "h": 6},
      {"i": "w2", "x": 0, "y": 6, "w": 6, "h": 4}
    ]
  }'
```

### 6. Share Dashboard
```bash
curl -X POST "$BASE_URL/dashboards/{dashboard_id}/share" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "makePublic": true
  }'
```

### 7. Unshare Dashboard
```bash
curl -X POST "$BASE_URL/dashboards/{dashboard_id}/unshare" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 8. Get Default Dashboard
```bash
curl -X GET "$BASE_URL/dashboards/default" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### 9. Delete Dashboard
```bash
curl -X DELETE "$BASE_URL/dashboards/{dashboard_id}" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

## Widget Endpoints

### 1. Create Widget
```bash
curl -X POST "$BASE_URL/widgets" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dashboardId": "{dashboard_id}",
    "type": "metric_card",
    "title": "Prediction Accuracy",
    "config": {
      "metricType": "operational",
      "format": "percentage",
      "showTrend": true
    },
    "dataSource": {
      "type": "ai_predictions",
      "params": {
        "serviceType": "demand_forecasting"
      }
    },
    "refreshInterval": 300
  }'
```

### 2. List Widgets
```bash
# All widgets
curl -X GET "$BASE_URL/widgets?limit=20" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Widgets for specific dashboard
curl -X GET "$BASE_URL/widgets?dashboardId={dashboard_id}" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Widgets by type
curl -X GET "$BASE_URL/widgets?type=metric_card" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### 3. Get Widget
```bash
curl -X GET "$BASE_URL/widgets/{widget_id}" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### 4. Update Widget
```bash
curl -X PATCH "$BASE_URL/widgets/{widget_id}" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Widget Title",
    "config": {
      "format": "decimal"
    }
  }'
```

### 5. Get Widget Data
```bash
curl -X GET "$BASE_URL/widgets/{widget_id}/data" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Force refresh
curl -X GET "$BASE_URL/widgets/{widget_id}/data?refresh=true" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### 6. Refresh Widget
```bash
curl -X POST "$BASE_URL/widgets/{widget_id}/refresh" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json"
```

### 7. Get Dashboard Widgets
```bash
curl -X GET "$BASE_URL/widgets/dashboard/{dashboard_id}" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

### 8. Delete Widget
```bash
curl -X DELETE "$BASE_URL/widgets/{widget_id}" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

## Complete Workflow Test

```bash
#!/bin/bash
# Complete dashboard workflow test

# 1. Create dashboard
echo "Creating dashboard..."
DASHBOARD=$(curl -s -X POST "$BASE_URL/dashboards" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Dashboard",
    "description": "Testing complete workflow",
    "layout": [],
    "isPublic": false
  }')

DASHBOARD_ID=$(echo $DASHBOARD | jq -r '.data.id')
echo "Dashboard created: $DASHBOARD_ID"

# 2. Add widgets
echo "Adding widgets..."
WIDGET1=$(curl -s -X POST "$BASE_URL/widgets" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"dashboardId\": \"$DASHBOARD_ID\",
    \"type\": \"metric_card\",
    \"title\": \"Sales This Month\",
    \"config\": {
      \"metricType\": \"sales\",
      \"format\": \"currency\"
    },
    \"dataSource\": {
      \"type\": \"sales_analytics\",
      \"params\": {}
    }
  }")

WIDGET1_ID=$(echo $WIDGET1 | jq -r '.data.id')
echo "Widget 1 created: $WIDGET1_ID"

WIDGET2=$(curl -s -X POST "$BASE_URL/widgets" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"dashboardId\": \"$DASHBOARD_ID\",
    \"type\": \"line_chart\",
    \"title\": \"Inventory Trend\",
    \"config\": {
      \"metricType\": \"inventory\"
    },
    \"dataSource\": {
      \"type\": \"inventory_analytics\",
      \"params\": {}
    }
  }")

WIDGET2_ID=$(echo $WIDGET2 | jq -r '.data.id')
echo "Widget 2 created: $WIDGET2_ID"

# 3. Update layout
echo "Updating dashboard layout..."
curl -s -X PATCH "$BASE_URL/dashboards/$DASHBOARD_ID/layout" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"layout\": [
      {\"i\": \"$WIDGET1_ID\", \"x\": 0, \"y\": 0, \"w\": 6, \"h\": 4},
      {\"i\": \"$WIDGET2_ID\", \"x\": 6, \"y\": 0, \"w\": 6, \"h\": 4}
    ]
  }"

# 4. Get widget data
echo "Fetching widget data..."
curl -s -X GET "$BASE_URL/widgets/$WIDGET1_ID/data" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.data'

# 5. List all widgets
echo "Listing all dashboard widgets..."
curl -s -X GET "$BASE_URL/widgets/dashboard/$DASHBOARD_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.data.widgets | length'

# 6. Share dashboard
echo "Sharing dashboard..."
curl -s -X POST "$BASE_URL/dashboards/$DASHBOARD_ID/share" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"makePublic": true}'

# 7. Get dashboard with widgets
echo "Fetching complete dashboard..."
curl -s -X GET "$BASE_URL/dashboards/$DASHBOARD_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.data'

echo "Test complete!"
```

## Response Examples

### Successful Dashboard Creation
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "org_id": "org-uuid",
    "name": "Test Analytics Dashboard",
    "description": "My first dashboard",
    "layout": [
      {"i": "w1", "x": 0, "y": 0, "w": 6, "h": 4}
    ],
    "filters": {},
    "is_default": false,
    "is_shared": false,
    "created_by": "user-uuid",
    "created_at": "2025-11-04T10:30:00Z",
    "updated_at": "2025-11-04T10:30:00Z"
  }
}
```

### Dashboard with Widgets
```json
{
  "success": true,
  "data": {
    "id": "dashboard-uuid",
    "name": "Analytics Dashboard",
    "widgets": [
      {
        "id": "widget-uuid",
        "widget_type": "metric_card",
        "metric_type": "sales",
        "config": {
          "format": "currency"
        }
      }
    ]
  }
}
```

### Widget Data Response
```json
{
  "success": true,
  "data": {
    "data": {
      "value": 0.87,
      "label": "Prediction Accuracy",
      "trend": "up",
      "change": 0.02
    },
    "metadata": {
      "widgetId": "widget-uuid",
      "widgetType": "metric_card",
      "lastRefresh": "2025-11-04T10:30:00Z"
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Dashboard not found"
}
```

## Testing Checklist

- [ ] Create dashboard
- [ ] List dashboards with pagination
- [ ] Get single dashboard
- [ ] Update dashboard properties
- [ ] Update dashboard layout
- [ ] Share/unshare dashboard
- [ ] Get default dashboard
- [ ] Delete dashboard
- [ ] Add widget to dashboard
- [ ] List widgets (all, by dashboard, by type)
- [ ] Get widget details
- [ ] Update widget
- [ ] Get widget data
- [ ] Refresh widget
- [ ] Delete widget
- [ ] Verify cascade delete (dashboard -> widgets)
- [ ] Test multi-tenant isolation
- [ ] Test authentication requirement
- [ ] Test validation errors

## Common Issues

### 401 Unauthorized
- Verify AUTH_TOKEN is set and valid
- Check token expiration
- Ensure user has proper permissions

### 404 Not Found
- Verify dashboard/widget ID is correct
- Check if resource was deleted
- Verify resource belongs to user's organization

### 400 Bad Request
- Validate request body against schema
- Check required fields are present
- Verify data types are correct

## Performance Testing

```bash
# Load test - create 100 widgets
for i in {1..100}; do
  curl -s -X POST "$BASE_URL/widgets" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"dashboardId\": \"$DASHBOARD_ID\",
      \"type\": \"metric_card\",
      \"title\": \"Widget $i\",
      \"config\": {},
      \"dataSource\": {\"type\": \"test\", \"params\": {}}
    }" &
done
wait
echo "100 widgets created"
```
