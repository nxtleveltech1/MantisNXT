# Loyalty & Rewards API - Quick Reference

## Authentication

All endpoints require JWT authentication via Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Admin Endpoints

### Programs
```
GET    /api/v1/admin/loyalty/programs
POST   /api/v1/admin/loyalty/programs
GET    /api/v1/admin/loyalty/programs/:id
PATCH  /api/v1/admin/loyalty/programs/:id
DELETE /api/v1/admin/loyalty/programs/:id
GET    /api/v1/admin/loyalty/programs/:id/tiers
PATCH  /api/v1/admin/loyalty/programs/:id/tiers
GET    /api/v1/admin/loyalty/programs/:id/stats
GET    /api/v1/admin/loyalty/programs/:id/customers
```

### Rewards
```
GET    /api/v1/admin/loyalty/rewards
POST   /api/v1/admin/loyalty/rewards
GET    /api/v1/admin/loyalty/rewards/:id
PATCH  /api/v1/admin/loyalty/rewards/:id
DELETE /api/v1/admin/loyalty/rewards/:id
PATCH  /api/v1/admin/loyalty/rewards/:id/stock
GET    /api/v1/admin/loyalty/rewards/analytics
```

### Rules
```
GET    /api/v1/admin/loyalty/rules
POST   /api/v1/admin/loyalty/rules
GET    /api/v1/admin/loyalty/rules/:id
PATCH  /api/v1/admin/loyalty/rules/:id
DELETE /api/v1/admin/loyalty/rules/:id
POST   /api/v1/admin/loyalty/rules/:id/activate
POST   /api/v1/admin/loyalty/rules/:id/deactivate
POST   /api/v1/admin/loyalty/rules/:id/test
```

### Redemptions
```
GET   /api/v1/admin/loyalty/redemptions
GET   /api/v1/admin/loyalty/redemptions/:id
PATCH /api/v1/admin/loyalty/redemptions/:id
POST  /api/v1/admin/loyalty/redemptions/:id/approve
POST  /api/v1/admin/loyalty/redemptions/:id/fulfill
POST  /api/v1/admin/loyalty/redemptions/:id/cancel
POST  /api/v1/admin/loyalty/redemptions/bulk-approve
POST  /api/v1/admin/loyalty/redemptions/bulk-fulfill
```

### Analytics
```
GET  /api/v1/admin/loyalty/analytics/leaderboard
GET  /api/v1/admin/loyalty/analytics/metrics
GET  /api/v1/admin/loyalty/analytics/tier-distribution
GET  /api/v1/admin/loyalty/analytics/points-flow
POST /api/v1/admin/loyalty/analytics/expire-points
```

## Customer Endpoints

### Loyalty
```
GET  /api/v1/customers/:id/loyalty
POST /api/v1/customers/:id/loyalty/enroll
GET  /api/v1/customers/:id/loyalty/transactions
GET  /api/v1/customers/:id/loyalty/summary
```

### Rewards
```
GET  /api/v1/customers/:id/loyalty/rewards/available
POST /api/v1/customers/:id/loyalty/rewards/redeem
```

### Redemptions
```
GET /api/v1/customers/:id/loyalty/redemptions
GET /api/v1/customers/:id/loyalty/redemptions/:redemptionId
```

### Referrals
```
GET  /api/v1/customers/:id/loyalty/referrals
POST /api/v1/customers/:id/loyalty/referrals
```

## Common Query Parameters

### Pagination
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

### Filtering
- `is_active` - Filter by active status (true/false)
- `status` - Filter by status
- `from_date` - Start date filter (ISO 8601)
- `to_date` - End date filter (ISO 8601)
- `sort_by` - Sort field
- `sort_order` - Sort direction (asc/desc)

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasMore": true
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Example Requests

### Create Program
```bash
POST /api/v1/admin/loyalty/programs
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "VIP Loyalty Program",
  "description": "Exclusive program for top customers",
  "is_active": true,
  "earn_rate": 1.5,
  "points_expiry_days": 365
}
```

### Redeem Reward
```bash
POST /api/v1/customers/customer-123/loyalty/rewards/redeem
Authorization: Bearer <token>
Content-Type: application/json

{
  "reward_id": "reward-456"
}
```

### Get Leaderboard
```bash
GET /api/v1/admin/loyalty/analytics/leaderboard?tier=gold&limit=50
Authorization: Bearer <token>
```
