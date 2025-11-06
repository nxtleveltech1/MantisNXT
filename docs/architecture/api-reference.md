# Admin Panel API Reference

## Base URL
```
Production: https://api.mantisnxt.com/v2/admin
Development: http://localhost:3000/api/v2/admin
```

## Authentication
All endpoints require authentication via Bearer token:
```
Authorization: Bearer <token>
```

## Rate Limits
Rate limits are applied per user:
- **Read operations**: 100 requests/minute
- **Write operations**: 50 requests/minute
- **Bulk operations**: 5 requests/minute
- **Export operations**: 5 requests/5 minutes

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

---

## User Management

### List Users
```http
GET /users
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number (offset pagination) |
| limit | number | 20 | Items per page (max 100) |
| cursor | string | null | Cursor for cursor-based pagination |
| search | string | null | Search query (name, email, department) |
| role | string | null | Filter by role |
| status | enum | all | Filter by status: `active`, `inactive`, `all` |
| sortBy | enum | name | Sort field: `name`, `email`, `createdAt`, `lastLogin` |
| sortOrder | enum | asc | Sort order: `asc`, `desc` |

**Response:**
```json
{
  "data": [
    {
      "id": "usr_123456789",
      "email": "john.doe@example.com",
      "name": "John Doe",
      "role": "user",
      "department": "Sales",
      "is_active": true,
      "two_factor_enabled": true,
      "profile_image": "https://...",
      "created_at": "2025-01-01T00:00:00Z",
      "last_login": "2025-11-04T10:30:00Z",
      "metadata": {}
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false,
    "nextCursor": "eyJpZCI6IjEyMyIsImNyZWF0ZWRBdCI6IjIwMjUtMDEtMDEifQ=="
  }
}
```

### Get User
```http
GET /users/:id
```

**Response:**
```json
{
  "id": "usr_123456789",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "role": "user",
  "department": "Sales",
  "is_active": true,
  "two_factor_enabled": true,
  "profile_image": "https://...",
  "phone": "+1234567890",
  "employment_equity": "black_african",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-15T12:00:00Z",
  "last_login": "2025-11-04T10:30:00Z",
  "metadata": {},
  "permissions": [
    "users.read",
    "products.read",
    "orders.create"
  ]
}
```

### Create User
```http
POST /users
```

**Request Body:**
```json
{
  "email": "jane.smith@example.com",
  "name": "Jane Smith",
  "role": "user",
  "department": "Marketing",
  "phone": "+1234567890",
  "employment_equity": "coloured",
  "send_invitation": true,
  "metadata": {}
}
```

**Response:**
```json
{
  "id": "usr_987654321",
  "email": "jane.smith@example.com",
  "name": "Jane Smith",
  "role": "user",
  "department": "Marketing",
  "is_active": true,
  "two_factor_enabled": false,
  "created_at": "2025-11-04T12:00:00Z",
  "invitation_sent": true
}
```

### Update User
```http
PUT /users/:id
```

**Request Body:**
```json
{
  "name": "Jane Smith-Johnson",
  "department": "Sales",
  "role": "manager",
  "is_active": true,
  "metadata": {
    "employee_id": "EMP123"
  }
}
```

**Response:**
```json
{
  "id": "usr_987654321",
  "email": "jane.smith@example.com",
  "name": "Jane Smith-Johnson",
  "role": "manager",
  "department": "Sales",
  "updated_at": "2025-11-04T13:00:00Z"
}
```

### Delete User
```http
DELETE /users/:id
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| hard | boolean | false | Permanently delete (cannot be undone) |

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "deleted_at": "2025-11-04T14:00:00Z"
}
```

### Bulk Import Users
```http
POST /users/bulk
```

**Request Body (multipart/form-data):**
```
file: users.csv or users.xlsx
validate_only: false
skip_duplicates: true
send_invitations: true
```

**Response:**
```json
{
  "job_id": "job_abc123",
  "status": "queued",
  "total_records": 500,
  "estimated_time": 120,
  "message": "Import job queued successfully"
}
```

**Check Job Status:**
```http
GET /jobs/:job_id
```

**Job Response:**
```json
{
  "job_id": "job_abc123",
  "status": "processing",
  "progress": {
    "total": 500,
    "processed": 250,
    "successful": 240,
    "failed": 10,
    "skipped": 0
  },
  "errors": [
    {
      "row": 15,
      "email": "invalid@",
      "error": "Invalid email format"
    }
  ],
  "started_at": "2025-11-04T14:00:00Z",
  "estimated_completion": "2025-11-04T14:02:00Z"
}
```

### Bulk Update Users
```http
PUT /users/bulk
```

**Request Body:**
```json
{
  "user_ids": ["usr_123", "usr_456", "usr_789"],
  "updates": {
    "department": "Sales",
    "role": "user"
  }
}
```

**Response:**
```json
{
  "job_id": "job_def456",
  "updated_count": 3,
  "message": "Bulk update completed"
}
```

### Bulk Delete Users
```http
DELETE /users/bulk
```

**Request Body:**
```json
{
  "user_ids": ["usr_123", "usr_456", "usr_789"],
  "hard": false
}
```

**Response:**
```json
{
  "job_id": "job_ghi789",
  "deleted_count": 3,
  "message": "Bulk delete completed"
}
```

### Export Users
```http
GET /users/export
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| format | enum | csv | Export format: `csv`, `xlsx`, `json` |
| search | string | null | Filter by search query |
| role | string | null | Filter by role |
| status | enum | all | Filter by status |
| fields | string[] | all | Fields to include |

**Response:**
```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="users-2025-11-04.csv"

[CSV/Excel/JSON content]
```

---

## Role Management

### List Roles
```http
GET /roles
```

**Response:**
```json
{
  "data": [
    {
      "id": "role_123",
      "name": "manager",
      "display_name": "Manager",
      "description": "Department manager with team oversight",
      "is_system": false,
      "permission_count": 25,
      "user_count": 15,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

### Get Role
```http
GET /roles/:id
```

**Response:**
```json
{
  "id": "role_123",
  "name": "manager",
  "display_name": "Manager",
  "description": "Department manager with team oversight",
  "is_system": false,
  "permissions": [
    {
      "id": "perm_1",
      "name": "users.read",
      "display_name": "View Users",
      "description": "Can view user list and details",
      "category": "users"
    },
    {
      "id": "perm_2",
      "name": "users.create",
      "display_name": "Create Users",
      "description": "Can create new users",
      "category": "users"
    }
  ],
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-15T12:00:00Z"
}
```

### Create Role
```http
POST /roles
```

**Request Body:**
```json
{
  "name": "custom_manager",
  "display_name": "Custom Manager",
  "description": "Custom manager role with specific permissions",
  "permission_ids": ["perm_1", "perm_2", "perm_3"]
}
```

**Response:**
```json
{
  "id": "role_456",
  "name": "custom_manager",
  "display_name": "Custom Manager",
  "created_at": "2025-11-04T15:00:00Z"
}
```

### Update Role
```http
PUT /roles/:id
```

**Request Body:**
```json
{
  "display_name": "Updated Manager",
  "description": "Updated description",
  "permission_ids": ["perm_1", "perm_2", "perm_3", "perm_4"]
}
```

**Response:**
```json
{
  "id": "role_456",
  "name": "custom_manager",
  "display_name": "Updated Manager",
  "updated_at": "2025-11-04T15:30:00Z"
}
```

### Delete Role
```http
DELETE /roles/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Role deleted successfully",
  "reassigned_users": 5
}
```

---

## Permission Management

### List Permissions
```http
GET /permissions
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| category | string | null | Filter by category |
| search | string | null | Search query |

**Response:**
```json
{
  "data": [
    {
      "id": "perm_1",
      "name": "users.read",
      "display_name": "View Users",
      "description": "Can view user list and details",
      "category": "users",
      "is_system": true
    }
  ],
  "categories": [
    "users",
    "roles",
    "products",
    "orders",
    "reports",
    "settings"
  ]
}
```

### Assign Permissions to Role
```http
POST /roles/:id/permissions
```

**Request Body:**
```json
{
  "permission_ids": ["perm_1", "perm_2", "perm_3"]
}
```

**Response:**
```json
{
  "success": true,
  "added_count": 3,
  "message": "Permissions assigned successfully"
}
```

### Remove Permissions from Role
```http
DELETE /roles/:id/permissions
```

**Request Body:**
```json
{
  "permission_ids": ["perm_2", "perm_3"]
}
```

**Response:**
```json
{
  "success": true,
  "removed_count": 2,
  "message": "Permissions removed successfully"
}
```

---

## Audit Logs

### List Audit Logs
```http
GET /audit-logs
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Items per page (max 100) |
| user_id | string | null | Filter by user |
| action | string | null | Filter by action |
| entity_type | string | null | Filter by entity type |
| start_date | string | null | Filter by start date (ISO 8601) |
| end_date | string | null | Filter by end date (ISO 8601) |

**Response:**
```json
{
  "data": [
    {
      "id": "log_123",
      "user_id": "usr_123",
      "user_name": "John Doe",
      "action": "users.update",
      "entity_type": "user",
      "entity_id": "usr_456",
      "changes": {
        "role": {
          "old": "user",
          "new": "manager"
        }
      },
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2025-11-04T16:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 500,
    "totalPages": 10
  }
}
```

### Export Audit Logs
```http
GET /audit-logs/export
```

**Query Parameters:**
Same as List Audit Logs, plus:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| format | enum | csv | Export format: `csv`, `xlsx`, `json` |

**Response:**
```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="audit-logs-2025-11-04.csv"
```

### Get Audit Log Statistics
```http
GET /audit-logs/stats
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| start_date | string | 30d ago | Start date (ISO 8601) |
| end_date | string | now | End date (ISO 8601) |
| group_by | enum | day | Group by: `hour`, `day`, `week`, `month` |

**Response:**
```json
{
  "total_logs": 5000,
  "by_action": {
    "users.create": 150,
    "users.update": 1200,
    "users.delete": 50,
    "roles.update": 30
  },
  "by_user": {
    "usr_123": 500,
    "usr_456": 350
  },
  "by_date": [
    {
      "date": "2025-11-01",
      "count": 250
    },
    {
      "date": "2025-11-02",
      "count": 300
    }
  ]
}
```

---

## Activity History

### Get User Activity
```http
GET /activities/user/:id
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (max 100) |
| type | string | null | Filter by activity type |
| start_date | string | null | Start date (ISO 8601) |
| end_date | string | null | End date (ISO 8601) |

**Response:**
```json
{
  "data": [
    {
      "id": "act_123",
      "user_id": "usr_123",
      "type": "login",
      "description": "User logged in",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "location": "San Francisco, CA",
      "metadata": {},
      "created_at": "2025-11-04T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

### Get Recent Activities
```http
GET /activities/recent
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 20 | Number of activities (max 100) |
| type | string | null | Filter by activity type |

**Response:**
```json
{
  "data": [
    {
      "id": "act_456",
      "user_id": "usr_456",
      "user_name": "Jane Smith",
      "type": "profile_update",
      "description": "Updated profile information",
      "created_at": "2025-11-04T16:45:00Z"
    }
  ]
}
```

### Get Activity Timeline
```http
GET /activities/timeline
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| start_date | string | 7d ago | Start date (ISO 8601) |
| end_date | string | now | End date (ISO 8601) |
| group_by | enum | hour | Group by: `hour`, `day`, `week` |

**Response:**
```json
{
  "timeline": [
    {
      "timestamp": "2025-11-04T10:00:00Z",
      "count": 50,
      "by_type": {
        "login": 30,
        "profile_update": 15,
        "logout": 5
      }
    }
  ]
}
```

---

## Session Management

### List Active Sessions
```http
GET /sessions
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| user_id | string | null | Filter by user |
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |

**Response:**
```json
{
  "data": [
    {
      "id": "sess_123",
      "user_id": "usr_123",
      "user_name": "John Doe",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "location": "San Francisco, CA",
      "device": "Desktop - Chrome",
      "created_at": "2025-11-04T10:00:00Z",
      "last_activity": "2025-11-04T16:30:00Z",
      "expires_at": "2025-11-11T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

### Terminate Session
```http
DELETE /sessions/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Session terminated successfully"
}
```

### Bulk Terminate Sessions
```http
POST /sessions/bulk-terminate
```

**Request Body:**
```json
{
  "user_id": "usr_123",
  "exclude_current": true
}
```

**Response:**
```json
{
  "success": true,
  "terminated_count": 3,
  "message": "Sessions terminated successfully"
}
```

---

## Notifications

### List Notifications
```http
GET /notifications
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| read | boolean | null | Filter by read status |
| type | string | null | Filter by notification type |

**Response:**
```json
{
  "data": [
    {
      "id": "notif_123",
      "type": "security_alert",
      "title": "New login from unrecognized device",
      "message": "A new login was detected from Chrome on Windows",
      "severity": "warning",
      "read": false,
      "created_at": "2025-11-04T17:00:00Z",
      "metadata": {
        "ip_address": "192.168.1.1",
        "location": "San Francisco, CA"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50
  },
  "unread_count": 10
}
```

### Mark Notification as Read
```http
PUT /notifications/:id/read
```

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### Send Notification
```http
POST /notifications/send
```

**Request Body:**
```json
{
  "user_ids": ["usr_123", "usr_456"],
  "type": "announcement",
  "title": "System Maintenance",
  "message": "Scheduled maintenance on Nov 10, 2025 at 2:00 AM",
  "severity": "info",
  "channels": ["in_app", "email"]
}
```

**Response:**
```json
{
  "success": true,
  "sent_count": 2,
  "message": "Notifications sent successfully"
}
```

### Delete Notification
```http
DELETE /notifications/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "request_id": "req_abc123"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTHENTICATION_ERROR` | 401 | Missing or invalid authentication token |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## WebSocket Events

### Connection
```javascript
const socket = io('wss://api.mantisnxt.com', {
  auth: {
    token: '<auth_token>'
  }
});
```

### Subscribe to User Updates
```javascript
socket.emit('subscribe:users');

socket.on('user:created', (data) => {
  console.log('New user created:', data);
});

socket.on('user:updated', (data) => {
  console.log('User updated:', data);
});

socket.on('user:deleted', (data) => {
  console.log('User deleted:', data);
});
```

### Subscribe to Activity Stream
```javascript
socket.emit('subscribe:activities');

socket.on('activity:new', (data) => {
  console.log('New activity:', data);
});
```

### Subscribe to Notifications
```javascript
socket.emit('subscribe:notifications');

socket.on('notification:new', (data) => {
  console.log('New notification:', data);
});
```

---

## Pagination Strategies

### Offset-based Pagination
Simple but less performant for large datasets:
```
GET /users?page=1&limit=20
```

### Cursor-based Pagination
More performant for large datasets:
```
GET /users?cursor=eyJpZCI6IjEyMyIsImNyZWF0ZWRBdCI6IjIwMjUtMDEtMDEifQ==&limit=20
```

Response includes `nextCursor` for fetching next page:
```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "eyJpZCI6IjQ1NiIsImNyZWF0ZWRBdCI6IjIwMjUtMDEtMDIifQ==",
    "hasMore": true
  }
}
```

---

## Best Practices

### 1. Always Use Pagination
Never fetch all records at once. Use appropriate page sizes:
- Lists: 20-50 items
- Dropdowns: 10-20 items
- Exports: Stream data instead of loading all

### 2. Cache Responses
Cache frequently accessed data:
- User profiles: 5 minutes
- Role permissions: 10 minutes
- Static lists: 1 hour

### 3. Handle Rate Limits
Implement exponential backoff when rate limited:
```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url);

    if (response.status !== 429) {
      return response;
    }

    const retryAfter = response.headers.get('Retry-After');
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, i) * 1000;

    await sleep(delay);
  }

  throw new Error('Max retries exceeded');
}
```

### 4. Use Bulk Operations
When modifying multiple records, use bulk endpoints instead of individual calls:
```javascript
// Bad
for (const userId of userIds) {
  await fetch(`/users/${userId}`, { method: 'DELETE' });
}

// Good
await fetch('/users/bulk', {
  method: 'DELETE',
  body: JSON.stringify({ user_ids: userIds })
});
```

### 5. Monitor Performance
Track API performance metrics:
- Response times
- Error rates
- Cache hit rates
- Rate limit usage

---

## SDK Examples

### JavaScript/TypeScript
```typescript
import { MantisNXTClient } from '@mantisnxt/sdk';

const client = new MantisNXTClient({
  apiKey: process.env.MANTISNXT_API_KEY,
  baseUrl: 'https://api.mantisnxt.com/v2/admin'
});

// List users
const users = await client.users.list({
  page: 1,
  limit: 20,
  search: 'john',
  role: 'user'
});

// Create user
const newUser = await client.users.create({
  email: 'jane@example.com',
  name: 'Jane Smith',
  role: 'user'
});

// Update user
const updatedUser = await client.users.update('usr_123', {
  name: 'Jane Doe',
  department: 'Sales'
});

// Delete user
await client.users.delete('usr_123');
```

### Python
```python
from mantisnxt import Client

client = Client(
    api_key=os.getenv('MANTISNXT_API_KEY'),
    base_url='https://api.mantisnxt.com/v2/admin'
)

# List users
users = client.users.list(
    page=1,
    limit=20,
    search='john',
    role='user'
)

# Create user
new_user = client.users.create(
    email='jane@example.com',
    name='Jane Smith',
    role='user'
)

# Update user
updated_user = client.users.update(
    'usr_123',
    name='Jane Doe',
    department='Sales'
)

# Delete user
client.users.delete('usr_123')
```

---

## Support

For API support, contact:
- Email: api-support@mantisnxt.com
- Slack: #api-support
- Documentation: https://docs.mantisnxt.com

Report bugs or request features at:
- GitHub Issues: https://github.com/mantisnxt/api/issues