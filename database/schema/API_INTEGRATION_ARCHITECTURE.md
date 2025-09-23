# MantisNXT API Integration Architecture

## Executive Summary

This document outlines the comprehensive API architecture for the MantisNXT platform, designed to support enterprise-grade integrations, real-time data synchronization, and scalable webhook management. The architecture follows REST and GraphQL standards while providing advanced features like real-time subscriptions, bulk operations, and comprehensive analytics.

## API Architecture Overview

### Design Principles

1. **API-First Design**: All functionality exposed through well-documented APIs
2. **Multi-Protocol Support**: REST, GraphQL, and WebSocket protocols
3. **Event-Driven Architecture**: Real-time updates via webhooks and subscriptions
4. **Security by Default**: OAuth 2.0, API keys, rate limiting, and audit trails
5. **Performance Optimized**: Caching, pagination, and bulk operations
6. **Developer Experience**: Comprehensive SDKs, documentation, and testing tools

### Technology Stack

- **REST API**: Express.js with OpenAPI 3.0 specification
- **GraphQL**: Apollo Server with real-time subscriptions
- **Authentication**: OAuth 2.0, JWT tokens, API keys
- **Rate Limiting**: Redis-based with sliding window algorithm
- **Caching**: Redis with intelligent cache invalidation
- **Documentation**: OpenAPI/Swagger with interactive playground
- **Monitoring**: Distributed tracing and comprehensive metrics

## REST API Architecture

### Base URL Structure
```
https://api.mantisnxt.com/v1/{resource}
https://api.mantisnxt.com/v1/organizations/{org_id}/{resource}
```

### Authentication Endpoints

#### OAuth 2.0 Flow
```http
POST /v1/auth/oauth/authorize
POST /v1/auth/oauth/token
POST /v1/auth/oauth/refresh
DELETE /v1/auth/oauth/revoke
```

#### API Key Management
```http
GET    /v1/auth/api-keys
POST   /v1/auth/api-keys
PUT    /v1/auth/api-keys/{key_id}
DELETE /v1/auth/api-keys/{key_id}
```

#### Session Management
```http
POST   /v1/auth/sessions
GET    /v1/auth/sessions/current
DELETE /v1/auth/sessions/{session_id}
GET    /v1/auth/sessions/{user_id}/devices
```

### Core Business Endpoints

#### Customer Management
```http
GET    /v1/organizations/{org_id}/customers
POST   /v1/organizations/{org_id}/customers
GET    /v1/organizations/{org_id}/customers/{customer_id}
PUT    /v1/organizations/{org_id}/customers/{customer_id}
DELETE /v1/organizations/{org_id}/customers/{customer_id}

# Customer Contacts
GET    /v1/organizations/{org_id}/customers/{customer_id}/contacts
POST   /v1/organizations/{org_id}/customers/{customer_id}/contacts
PUT    /v1/organizations/{org_id}/customers/{customer_id}/contacts/{contact_id}
DELETE /v1/organizations/{org_id}/customers/{customer_id}/contacts/{contact_id}

# Customer Analytics
GET    /v1/organizations/{org_id}/customers/{customer_id}/analytics
GET    /v1/organizations/{org_id}/customers/{customer_id}/interactions
GET    /v1/organizations/{org_id}/customers/{customer_id}/orders
```

#### Lead & Opportunity Management
```http
GET    /v1/organizations/{org_id}/leads
POST   /v1/organizations/{org_id}/leads
PUT    /v1/organizations/{org_id}/leads/{lead_id}
DELETE /v1/organizations/{org_id}/leads/{lead_id}
POST   /v1/organizations/{org_id}/leads/{lead_id}/convert

GET    /v1/organizations/{org_id}/opportunities
POST   /v1/organizations/{org_id}/opportunities
PUT    /v1/organizations/{org_id}/opportunities/{opportunity_id}
DELETE /v1/organizations/{org_id}/opportunities/{opportunity_id}
POST   /v1/organizations/{org_id}/opportunities/{opportunity_id}/stage
```

#### Sales Management
```http
GET    /v1/organizations/{org_id}/quotes
POST   /v1/organizations/{org_id}/quotes
GET    /v1/organizations/{org_id}/quotes/{quote_id}
PUT    /v1/organizations/{org_id}/quotes/{quote_id}
POST   /v1/organizations/{org_id}/quotes/{quote_id}/convert

GET    /v1/organizations/{org_id}/orders
POST   /v1/organizations/{org_id}/orders
GET    /v1/organizations/{org_id}/orders/{order_id}
PUT    /v1/organizations/{org_id}/orders/{order_id}
POST   /v1/organizations/{org_id}/orders/{order_id}/ship
```

#### Financial Management
```http
GET    /v1/organizations/{org_id}/invoices
POST   /v1/organizations/{org_id}/invoices
GET    /v1/organizations/{org_id}/invoices/{invoice_id}
PUT    /v1/organizations/{org_id}/invoices/{invoice_id}
POST   /v1/organizations/{org_id}/invoices/{invoice_id}/send

GET    /v1/organizations/{org_id}/payments
POST   /v1/organizations/{org_id}/payments
GET    /v1/organizations/{org_id}/payments/{payment_id}
PUT    /v1/organizations/{org_id}/payments/{payment_id}

GET    /v1/organizations/{org_id}/accounts
POST   /v1/organizations/{org_id}/accounts
GET    /v1/organizations/{org_id}/journal-entries
```

### Bulk Operations
```http
POST   /v1/organizations/{org_id}/customers/bulk
PUT    /v1/organizations/{org_id}/customers/bulk
DELETE /v1/organizations/{org_id}/customers/bulk

POST   /v1/organizations/{org_id}/products/bulk-import
GET    /v1/organizations/{org_id}/products/bulk-export
```

### Advanced Query Parameters

#### Filtering
```http
GET /v1/organizations/{org_id}/customers?
  status=active&
  segment=enterprise&
  created_after=2024-01-01&
  lifetime_value_gte=10000
```

#### Sorting
```http
GET /v1/organizations/{org_id}/customers?
  sort=created_at:desc,name:asc
```

#### Pagination
```http
GET /v1/organizations/{org_id}/customers?
  page=2&
  limit=50&
  cursor=eyJpZCI6IjEyMyJ9
```

#### Field Selection
```http
GET /v1/organizations/{org_id}/customers?
  fields=id,name,email,created_at&
  include=contacts,orders
```

### Response Format Standards

#### Success Response
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Acme Corporation",
    "email": "contact@acme.com",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "request_id": "req_123456789"
  }
}
```

#### Paginated Response
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 1250,
    "pages": 25,
    "has_next": true,
    "has_prev": true,
    "next_cursor": "eyJpZCI6IjE1MCJ9",
    "prev_cursor": "eyJpZCI6IjEwMCJ9"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "request_id": "req_123456789"
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "value": "invalid-email"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0",
    "request_id": "req_123456789"
  }
}
```

## GraphQL API Architecture

### Schema Design

#### Core Types
```graphql
type Organization {
  id: ID!
  name: String!
  slug: String!
  planType: OrganizationPlan!
  settings: JSON
  createdAt: DateTime!
  updatedAt: DateTime!

  # Relationships
  members: [Profile!]!
  customers: [Customer!]!
  products: [Product!]!
  orders: [SalesOrder!]!
}

type Customer {
  id: ID!
  name: String!
  email: String
  phone: String
  company: String
  segment: CustomerSegment!
  status: CustomerStatus!
  lifetimeValue: Float!
  createdAt: DateTime!
  updatedAt: DateTime!

  # Relationships
  contacts: [CustomerContact!]!
  interactions: [CustomerInteraction!]!
  orders: [SalesOrder!]!
  invoices: [Invoice!]!
  tickets: [SupportTicket!]!
  opportunities: [Opportunity!]!

  # Computed fields
  totalOrders: Int!
  totalSpent: Float!
  averageOrderValue: Float!
  lastOrderDate: DateTime
  nextExpectedOrder: DateTime
}

type SalesOrder {
  id: ID!
  orderNumber: String!
  status: SalesOrderStatus!
  currency: CurrencyCode!
  subtotal: Float!
  taxAmount: Float!
  shippingAmount: Float!
  discountAmount: Float!
  totalAmount: Float!
  orderDate: Date!
  requestedDeliveryDate: Date
  promisedDeliveryDate: Date
  actualDeliveryDate: Date
  createdAt: DateTime!
  updatedAt: DateTime!

  # Relationships
  customer: Customer!
  items: [SalesOrderItem!]!
  invoices: [Invoice!]!
  quote: SalesQuote

  # Computed fields
  isOverdue: Boolean!
  estimatedDelivery: DateTime
  fulfillmentStatus: String!
}
```

#### Query Operations
```graphql
type Query {
  # Customer queries
  customer(id: ID!): Customer
  customers(
    filter: CustomerFilter
    sort: [CustomerSort!]
    pagination: PaginationInput
  ): CustomerConnection!

  # Order queries
  order(id: ID!): SalesOrder
  orders(
    filter: SalesOrderFilter
    sort: [SalesOrderSort!]
    pagination: PaginationInput
  ): SalesOrderConnection!

  # Analytics queries
  customerAnalytics(
    customerId: ID!
    dateRange: DateRangeInput
  ): CustomerAnalytics!

  salesAnalytics(
    filter: SalesAnalyticsFilter
    groupBy: AnalyticsGroupBy!
    dateRange: DateRangeInput!
  ): SalesAnalytics!

  # Search queries
  search(
    query: String!
    types: [SearchType!]
    limit: Int = 10
  ): [SearchResult!]!
}
```

#### Mutation Operations
```graphql
type Mutation {
  # Customer mutations
  createCustomer(input: CreateCustomerInput!): Customer!
  updateCustomer(id: ID!, input: UpdateCustomerInput!): Customer!
  deleteCustomer(id: ID!): Boolean!

  # Order mutations
  createOrder(input: CreateOrderInput!): SalesOrder!
  updateOrder(id: ID!, input: UpdateOrderInput!): SalesOrder!
  fulfillOrder(id: ID!, input: FulfillOrderInput!): SalesOrder!
  cancelOrder(id: ID!, reason: String): SalesOrder!

  # Bulk mutations
  bulkCreateCustomers(input: [CreateCustomerInput!]!): BulkCustomerResult!
  bulkUpdateOrders(input: [BulkUpdateOrderInput!]!): BulkOrderResult!

  # Workflow mutations
  convertLeadToCustomer(
    leadId: ID!
    input: ConvertLeadInput!
  ): ConvertLeadResult!

  convertQuoteToOrder(
    quoteId: ID!
    input: ConvertQuoteInput!
  ): SalesOrder!
}
```

#### Subscription Operations
```graphql
type Subscription {
  # Real-time order updates
  orderStatusChanged(customerId: ID): SalesOrder!
  orderCreated(filters: OrderSubscriptionFilter): SalesOrder!

  # Customer activity
  customerInteraction(customerId: ID!): CustomerInteraction!

  # System notifications
  notification(userId: ID!): Notification!

  # Analytics updates
  salesMetricsUpdated(
    organizationId: ID!
    metrics: [MetricType!]
  ): SalesMetrics!
}
```

### Advanced GraphQL Features

#### Data Loader for N+1 Problem Prevention
```javascript
// Customer data loader
const customerLoader = new DataLoader(async (customerIds) => {
  const customers = await db.customer.findMany({
    where: { id: { in: customerIds } }
  });

  // Return customers in the same order as requested IDs
  return customerIds.map(id =>
    customers.find(customer => customer.id === id)
  );
});

// Usage in resolver
const resolvers = {
  SalesOrder: {
    customer: (order) => customerLoader.load(order.customerId)
  }
};
```

#### Query Complexity Analysis
```javascript
const depthLimit = require('graphql-depth-limit');
const costAnalysis = require('graphql-query-complexity');

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [
    depthLimit(10), // Max query depth of 10
    costAnalysis({
      maximumCost: 1000,
      defaultCost: 1,
      createError: (max, actual) => {
        return new Error(`Query cost ${actual} exceeds maximum cost ${max}`);
      }
    })
  ]
});
```

## Real-time Subscriptions

### WebSocket Architecture

#### Connection Management
```javascript
// WebSocket connection with authentication
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class SubscriptionServer {
  constructor() {
    this.clients = new Map();
    this.subscriptions = new Map();
  }

  authenticate(token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      return { userId: payload.sub, orgId: payload.org_id };
    } catch (error) {
      throw new Error('Invalid authentication token');
    }
  }

  subscribe(clientId, subscription) {
    if (!this.subscriptions.has(subscription.type)) {
      this.subscriptions.set(subscription.type, new Set());
    }
    this.subscriptions.get(subscription.type).add(clientId);
  }

  publish(event) {
    const subscribers = this.subscriptions.get(event.type) || new Set();
    subscribers.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(event));
      }
    });
  }
}
```

#### Event Publishing
```javascript
// Event publisher for database changes
class EventPublisher {
  constructor(redis) {
    this.redis = redis;
  }

  async publishOrderUpdate(order) {
    const event = {
      type: 'ORDER_STATUS_CHANGED',
      data: {
        id: order.id,
        status: order.status,
        customerId: order.customerId,
        organizationId: order.organizationId,
        timestamp: new Date().toISOString()
      }
    };

    await this.redis.publish('order_events', JSON.stringify(event));
  }

  async publishCustomerInteraction(interaction) {
    const event = {
      type: 'CUSTOMER_INTERACTION',
      data: {
        id: interaction.id,
        customerId: interaction.customerId,
        type: interaction.type,
        channel: interaction.channel,
        timestamp: interaction.timestamp
      }
    };

    await this.redis.publish('customer_events', JSON.stringify(event));
  }
}
```

## Webhook Architecture

### Webhook Management System

#### Webhook Registration
```http
POST /v1/organizations/{org_id}/webhooks
{
  "url": "https://customer-app.com/webhooks/mantis",
  "events": [
    "customer.created",
    "customer.updated",
    "order.status_changed",
    "invoice.paid"
  ],
  "secret": "webhook_secret_key",
  "is_active": true,
  "retry_config": {
    "max_retries": 3,
    "retry_delay": 5000,
    "backoff_multiplier": 2
  }
}
```

#### Event Payload Format
```json
{
  "id": "evt_1234567890",
  "type": "order.status_changed",
  "organization_id": "org_123",
  "created_at": "2024-01-15T10:30:00Z",
  "data": {
    "object": {
      "id": "order_456",
      "status": "shipped",
      "customer_id": "cust_789",
      "total_amount": 1299.99,
      "currency": "USD",
      "updated_at": "2024-01-15T10:30:00Z"
    },
    "previous_attributes": {
      "status": "processing"
    }
  }
}
```

#### Webhook Delivery System
```javascript
class WebhookDelivery {
  constructor(redis, queue) {
    this.redis = redis;
    this.queue = queue;
  }

  async deliverWebhook(webhookConfig, event) {
    const payload = this.buildPayload(event);
    const signature = this.generateSignature(payload, webhookConfig.secret);

    const job = {
      webhook_id: webhookConfig.id,
      url: webhookConfig.url,
      payload,
      signature,
      attempt: 1,
      max_retries: webhookConfig.retry_config.max_retries
    };

    await this.queue.add('webhook_delivery', job, {
      attempts: webhookConfig.retry_config.max_retries,
      backoff: {
        type: 'exponential',
        delay: webhookConfig.retry_config.retry_delay
      }
    });
  }

  generateSignature(payload, secret) {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  async processWebhookJob(job) {
    const { webhook_id, url, payload, signature, attempt } = job.data;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Mantis-Signature': `sha256=${signature}`,
          'X-Mantis-Event': payload.type,
          'User-Agent': 'MantisNXT-Webhook/1.0'
        },
        body: JSON.stringify(payload),
        timeout: 30000
      });

      if (response.ok) {
        await this.recordSuccess(webhook_id, attempt);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      await this.recordFailure(webhook_id, attempt, error.message);
      throw error; // Re-throw to trigger retry
    }
  }
}
```

### Event Types

#### Customer Events
- `customer.created`
- `customer.updated`
- `customer.deleted`
- `customer.status_changed`
- `customer_contact.created`
- `customer_contact.updated`

#### Sales Events
- `lead.created`
- `lead.qualified`
- `lead.converted`
- `opportunity.created`
- `opportunity.stage_changed`
- `opportunity.won`
- `opportunity.lost`
- `quote.created`
- `quote.sent`
- `quote.accepted`
- `order.created`
- `order.status_changed`
- `order.shipped`
- `order.delivered`
- `order.cancelled`

#### Financial Events
- `invoice.created`
- `invoice.sent`
- `invoice.viewed`
- `invoice.paid`
- `invoice.overdue`
- `payment.created`
- `payment.completed`
- `payment.failed`

#### System Events
- `user.login`
- `user.logout`
- `api_key.created`
- `api_key.revoked`
- `document.uploaded`
- `document.shared`

## API Security

### Authentication Methods

#### OAuth 2.0 Implementation
```javascript
// OAuth 2.0 Authorization Code Flow
app.get('/oauth/authorize', (req, res) => {
  const { client_id, redirect_uri, scope, state } = req.query;

  // Validate client_id and redirect_uri
  const client = await getClient(client_id);
  if (!client || !client.redirect_uris.includes(redirect_uri)) {
    return res.status(400).json({ error: 'invalid_client' });
  }

  // Generate authorization code
  const code = generateAuthCode(client_id, scope, req.user.id);

  res.redirect(`${redirect_uri}?code=${code}&state=${state}`);
});

app.post('/oauth/token', async (req, res) => {
  const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;

  if (grant_type === 'authorization_code') {
    // Validate authorization code
    const codeData = await validateAuthCode(code);
    if (!codeData) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    // Generate access token
    const accessToken = jwt.sign(
      {
        sub: codeData.user_id,
        org_id: codeData.org_id,
        scope: codeData.scope,
        iss: 'mantisnxt.com',
        aud: client_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = generateRefreshToken(codeData.user_id, client_id);

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600
    });
  }
});
```

#### API Key Authentication
```javascript
// API Key middleware
const authenticateApiKey = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const apiKey = authHeader.slice(7);
  const keyData = await validateApiKey(apiKey);

  if (!keyData) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Check if key is active and not expired
  if (!keyData.is_active || (keyData.expires_at && keyData.expires_at < new Date())) {
    return res.status(401).json({ error: 'API key is inactive or expired' });
  }

  // Check rate limits
  const rateLimitResult = await checkRateLimit(keyData.id, keyData.rate_limit_per_hour);
  if (rateLimitResult.exceeded) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retry_after: rateLimitResult.retry_after
    });
  }

  // Set context for downstream middleware
  req.auth = {
    type: 'api_key',
    key_id: keyData.id,
    user_id: keyData.user_id,
    org_id: keyData.org_id,
    scopes: keyData.scopes
  };

  // Update last used timestamp
  await updateApiKeyLastUsed(keyData.id);

  next();
};
```

### Rate Limiting

#### Redis-based Rate Limiter
```javascript
class RateLimiter {
  constructor(redis) {
    this.redis = redis;
  }

  async checkLimit(key, limit, windowMs) {
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const redisKey = `rate_limit:${key}:${window}`;

    const pipeline = this.redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.expire(redisKey, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();
    const count = results[0][1];

    if (count > limit) {
      const ttl = await this.redis.ttl(redisKey);
      return {
        allowed: false,
        count,
        limit,
        remaining: 0,
        reset: now + (ttl * 1000)
      };
    }

    return {
      allowed: true,
      count,
      limit,
      remaining: limit - count,
      reset: now + windowMs
    };
  }

  async getQuota(userId, endpoint) {
    // Different rate limits for different endpoints and user tiers
    const userTier = await getUserTier(userId);

    const quotas = {
      free: { requests: 1000, window: 3600000 }, // 1000/hour
      pro: { requests: 10000, window: 3600000 }, // 10,000/hour
      enterprise: { requests: 100000, window: 3600000 } // 100,000/hour
    };

    return quotas[userTier] || quotas.free;
  }
}
```

### Data Validation & Sanitization

#### Input Validation Middleware
```javascript
const { body, param, query, validationResult } = require('express-validator');

// Customer validation rules
const customerValidation = [
  body('name')
    .isLength({ min: 1, max: 200 })
    .trim()
    .escape()
    .withMessage('Name must be between 1 and 200 characters'),

  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),

  body('phone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Invalid phone number format'),

  body('segment')
    .isIn(['enterprise', 'mid_market', 'smb', 'startup', 'individual'])
    .withMessage('Invalid customer segment'),

  body('metadata')
    .optional()
    .isJSON()
    .withMessage('Metadata must be valid JSON')
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input parameters',
        details: errors.array()
      }
    });
  }
  next();
};
```

## Performance Optimization

### Caching Strategy

#### Multi-level Caching
```javascript
class CacheManager {
  constructor(redis, memcache) {
    this.redis = redis;
    this.memcache = memcache;
    this.localCache = new Map();
  }

  async get(key, options = {}) {
    const { ttl = 3600, refreshThreshold = 0.8 } = options;

    // L1: Local cache (fastest)
    if (this.localCache.has(key)) {
      const cached = this.localCache.get(key);
      if (cached.expires > Date.now()) {
        return cached.data;
      }
    }

    // L2: Redis cache
    const redisValue = await this.redis.get(key);
    if (redisValue) {
      const cached = JSON.parse(redisValue);

      // Store in local cache
      this.localCache.set(key, {
        data: cached.data,
        expires: Date.now() + (ttl * 1000)
      });

      // Check if we should refresh in background
      const age = Date.now() - cached.created;
      if (age > (ttl * refreshThreshold * 1000)) {
        this.refreshInBackground(key, options);
      }

      return cached.data;
    }

    return null;
  }

  async set(key, value, ttl = 3600) {
    const cached = {
      data: value,
      created: Date.now()
    };

    // Store in all cache levels
    this.localCache.set(key, {
      data: value,
      expires: Date.now() + (ttl * 1000)
    });

    await this.redis.setex(key, ttl, JSON.stringify(cached));
  }

  async invalidate(pattern) {
    // Invalidate local cache
    for (const key of this.localCache.keys()) {
      if (key.match(pattern)) {
        this.localCache.delete(key);
      }
    }

    // Invalidate Redis cache
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

#### Smart Cache Invalidation
```javascript
class CacheInvalidator {
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
    this.dependencyMap = new Map();
  }

  // Register cache dependencies
  registerDependency(cacheKey, dependencies) {
    dependencies.forEach(dep => {
      if (!this.dependencyMap.has(dep)) {
        this.dependencyMap.set(dep, new Set());
      }
      this.dependencyMap.get(dep).add(cacheKey);
    });
  }

  // Invalidate based on data changes
  async invalidateForEntity(entityType, entityId, action) {
    const patterns = [];

    switch (entityType) {
      case 'customer':
        patterns.push(
          `customer:${entityId}:*`,
          `customer_analytics:${entityId}:*`,
          `organization:*:customer_stats:*`
        );
        break;

      case 'order':
        const order = await getOrder(entityId);
        patterns.push(
          `order:${entityId}:*`,
          `customer:${order.customer_id}:orders:*`,
          `sales_analytics:*`,
          `organization:${order.org_id}:metrics:*`
        );
        break;

      case 'invoice':
        const invoice = await getInvoice(entityId);
        patterns.push(
          `invoice:${entityId}:*`,
          `customer:${invoice.customer_id}:invoices:*`,
          `financial_overview:*`
        );
        break;
    }

    // Invalidate all matching patterns
    for (const pattern of patterns) {
      await this.cacheManager.invalidate(pattern);
    }
  }
}
```

### Database Query Optimization

#### Query Builder with Caching
```javascript
class OptimizedQueryBuilder {
  constructor(db, cache) {
    this.db = db;
    this.cache = cache;
  }

  async getCustomerWithRelations(customerId, includes = []) {
    const cacheKey = `customer:${customerId}:${includes.sort().join(',')}`;

    // Try cache first
    let customer = await this.cache.get(cacheKey);
    if (customer) {
      return customer;
    }

    // Build optimized query based on includes
    const query = this.db.customer.findUnique({
      where: { id: customerId },
      include: this.buildIncludeMap(includes)
    });

    customer = await query;

    if (customer) {
      // Cache for 5 minutes
      await this.cache.set(cacheKey, customer, 300);
    }

    return customer;
  }

  buildIncludeMap(includes) {
    const includeMap = {};

    includes.forEach(include => {
      switch (include) {
        case 'contacts':
          includeMap.contacts = {
            where: { is_active: true },
            orderBy: { is_primary: 'desc' }
          };
          break;

        case 'orders':
          includeMap.orders = {
            take: 10,
            orderBy: { created_at: 'desc' },
            include: { items: true }
          };
          break;

        case 'analytics':
          includeMap._count = {
            select: {
              orders: true,
              interactions: true,
              tickets: true
            }
          };
          break;
      }
    });

    return includeMap;
  }
}
```

## SDK & Developer Experience

### Official SDKs

#### JavaScript/TypeScript SDK
```typescript
import MantisClient from '@mantisnxt/sdk';

const client = new MantisClient({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.mantisnxt.com/v1',
  organizationId: 'your_org_id'
});

// Type-safe customer operations
interface CreateCustomerRequest {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  segment: 'enterprise' | 'mid_market' | 'smb' | 'startup' | 'individual';
  metadata?: Record<string, any>;
}

// Async/await API
const customer = await client.customers.create({
  name: 'Acme Corporation',
  email: 'contact@acme.com',
  segment: 'enterprise'
});

// Promise-based API
client.customers.get(customer.id)
  .then(customer => console.log(customer))
  .catch(error => console.error(error));

// Bulk operations
const customers = await client.customers.bulkCreate([
  { name: 'Customer 1', segment: 'smb' },
  { name: 'Customer 2', segment: 'enterprise' }
]);

// Real-time subscriptions
const subscription = client.subscriptions.orderStatusChanged({
  customerId: customer.id,
  onData: (order) => {
    console.log(`Order ${order.id} status changed to ${order.status}`);
  },
  onError: (error) => {
    console.error('Subscription error:', error);
  }
});
```

#### Python SDK
```python
from mantisnxt import MantisClient
from mantisnxt.types import CreateCustomerRequest

client = MantisClient(
    api_key='your_api_key',
    base_url='https://api.mantisnxt.com/v1',
    organization_id='your_org_id'
)

# Synchronous operations
customer = client.customers.create(
    CreateCustomerRequest(
        name='Acme Corporation',
        email='contact@acme.com',
        segment='enterprise'
    )
)

# Asynchronous operations
import asyncio

async def create_customers():
    async with client.async_session() as session:
        customer = await session.customers.create(
            name='Async Customer',
            segment='smb'
        )
        return customer

# Bulk operations with pagination
customers = client.customers.list(
    filter={'segment': 'enterprise'},
    limit=100
)

for customer in customers.iter_all():
    print(f"Customer: {customer.name}")
```

### API Documentation

#### OpenAPI Specification
```yaml
openapi: 3.0.3
info:
  title: MantisNXT API
  description: Comprehensive enterprise platform API
  version: 1.0.0
  contact:
    name: MantisNXT Support
    url: https://docs.mantisnxt.com
    email: support@mantisnxt.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.mantisnxt.com/v1
    description: Production server
  - url: https://staging-api.mantisnxt.com/v1
    description: Staging server

paths:
  /organizations/{org_id}/customers:
    get:
      summary: List customers
      description: Retrieve a paginated list of customers for the organization
      parameters:
        - name: org_id
          in: path
          required: true
          schema:
            type: string
            format: uuid
        - name: status
          in: query
          schema:
            type: string
            enum: [active, inactive, prospect, churned, suspended]
        - name: segment
          in: query
          schema:
            type: string
            enum: [enterprise, mid_market, smb, startup, individual]
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 50
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CustomerListResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'

components:
  schemas:
    Customer:
      type: object
      required:
        - id
        - name
        - segment
        - status
        - created_at
        - updated_at
      properties:
        id:
          type: string
          format: uuid
          example: "123e4567-e89b-12d3-a456-426614174000"
        name:
          type: string
          minLength: 1
          maxLength: 200
          example: "Acme Corporation"
        email:
          type: string
          format: email
          example: "contact@acme.com"
        # ... other properties
```

## Monitoring & Analytics

### API Metrics Collection

#### Request Tracking
```javascript
const promClient = require('prom-client');

// Create metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'org_id']
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'org_id']
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['type'] // 'rest', 'graphql', 'websocket'
});

// Middleware for collecting metrics
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
      org_id: req.auth?.org_id || 'unknown'
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
  });

  next();
};
```

#### Error Tracking
```javascript
const Sentry = require('@sentry/node');

class ErrorTracker {
  constructor() {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      beforeSend(event) {
        // Filter sensitive data
        if (event.request) {
          delete event.request.headers?.authorization;
          delete event.request.headers?.['x-api-key'];
        }
        return event;
      }
    });
  }

  captureApiError(error, context) {
    Sentry.withScope(scope => {
      scope.setTag('component', 'api');
      scope.setLevel('error');

      if (context.user) {
        scope.setUser({
          id: context.user.id,
          organization: context.user.org_id
        });
      }

      if (context.request) {
        scope.setContext('request', {
          method: context.request.method,
          url: context.request.url,
          headers: this.sanitizeHeaders(context.request.headers)
        });
      }

      Sentry.captureException(error);
    });
  }

  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    delete sanitized.authorization;
    delete sanitized['x-api-key'];
    return sanitized;
  }
}
```

### Performance Analytics

#### Query Performance Tracking
```javascript
class QueryPerformanceTracker {
  constructor(db) {
    this.db = db;
    this.slowQueryThreshold = 1000; // 1 second
  }

  async trackQuery(queryName, queryFunc, context = {}) {
    const start = process.hrtime.bigint();

    try {
      const result = await queryFunc();
      const duration = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds

      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        console.warn(`Slow query detected: ${queryName}`, {
          duration,
          context,
          timestamp: new Date().toISOString()
        });
      }

      // Record metrics
      this.recordQueryMetrics(queryName, duration, 'success', context);

      return result;
    } catch (error) {
      const duration = Number(process.hrtime.bigint() - start) / 1000000;
      this.recordQueryMetrics(queryName, duration, 'error', context);
      throw error;
    }
  }

  recordQueryMetrics(queryName, duration, status, context) {
    // Send to monitoring system (Prometheus, DataDog, etc.)
    const labels = {
      query_name: queryName,
      status,
      org_id: context.org_id || 'unknown'
    };

    queryDurationHistogram.observe(labels, duration / 1000);
    queryCountCounter.inc(labels);
  }
}
```

## Conclusion

The MantisNXT API Integration Architecture provides a comprehensive, scalable, and secure foundation for enterprise-grade integrations. The architecture supports multiple protocols (REST, GraphQL, WebSocket), advanced security features, real-time capabilities, and extensive monitoring.

**Key Features Summary**:
- Multi-protocol API support (REST, GraphQL, WebSocket)
- Comprehensive authentication and authorization
- Real-time subscriptions and webhook system
- Advanced caching and performance optimization
- Enterprise-grade security and compliance
- Comprehensive monitoring and analytics
- Developer-friendly SDKs and documentation

**Next Steps for Implementation**:
1. Set up core API infrastructure with authentication
2. Implement REST endpoints for core business objects
3. Add GraphQL layer with real-time subscriptions
4. Build webhook delivery system
5. Create comprehensive monitoring and alerting
6. Develop official SDKs and documentation
7. Implement advanced features like bulk operations and analytics

This architecture ensures that the MantisNXT platform can scale to support large enterprise customers while maintaining performance, security, and developer experience standards.