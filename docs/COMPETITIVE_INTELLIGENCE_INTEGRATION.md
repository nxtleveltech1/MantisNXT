# Competitive Market Intelligence - Integration Guide

## Overview

The Competitive Market Intelligence module provides comprehensive competitor tracking, price monitoring, and market analysis capabilities. This guide explains how to integrate these features with other parts of the system.

## API Endpoints

### Base URL
All endpoints are prefixed with `/api/v1/pricing-intel`

### Authentication
All requests require organization context. The `orgId` is extracted automatically from:
1. Request body (`orgId` field)
2. Headers (`x-org-id`, `x-organization-id`)
3. Query parameters (`orgId`)
4. Environment variable (`DEFAULT_ORG_ID`)
5. Database lookup (fallback)

### Competitor Management

#### List Competitors
```http
GET /api/v1/pricing-intel/competitors
```

**Response:**
```json
{
  "data": [
    {
      "competitor_id": "uuid",
      "company_name": "Competitor Inc",
      "website_url": "https://competitor.com",
      "default_currency": "USD",
      ...
    }
  ],
  "error": null
}
```

#### Create Competitor
```http
POST /api/v1/pricing-intel/competitors
Content-Type: application/json

{
  "orgId": "uuid",
  "company_name": "Competitor Inc",
  "website_url": "https://competitor.com",
  "default_currency": "USD",
  "notes": "Primary competitor"
}
```

### Product Matching

#### List Matches
```http
GET /api/v1/pricing-intel/product-matches?internalProductId=uuid
```

#### Create Match
```http
POST /api/v1/pricing-intel/product-matches
Content-Type: application/json

{
  "orgId": "uuid",
  "competitor_id": "uuid",
  "competitor_product_id": "product-123",
  "internal_product_id": "uuid",
  "match_confidence": 95,
  "match_method": "upc"
}
```

### Scraping Jobs

#### List Jobs
```http
GET /api/v1/pricing-intel/jobs
```

#### Create Job
```http
POST /api/v1/pricing-intel/jobs
Content-Type: application/json

{
  "orgId": "uuid",
  "job_name": "Daily Price Check",
  "competitor_id": "uuid",
  "schedule_type": "interval",
  "schedule_config": { "interval_hours": 24 },
  "priority": 5,
  "max_concurrency": 3,
  "rate_limit_per_min": 10
}
```

### Market Intelligence

#### Get Price Positioning
```http
GET /api/v1/pricing-intel/price-positioning?productId=uuid
```

**Response:**
```json
{
  "data": {
    "internalPrice": 99.99,
    "competitorPrices": [...],
    "rank": 2,
    "percentile": 67.5,
    "position": "above_median"
  },
  "error": null
}
```

#### Get Price History
```http
GET /api/v1/pricing-intel/price-history?productId=uuid&startDate=2024-01-01&endDate=2024-12-31
```

#### Get Trends & Forecast
```http
GET /api/v1/pricing-intel/trends?productId=uuid&forecastDays=30
```

### Alerts

#### List Alerts
```http
GET /api/v1/pricing-intel/alerts?status=open
```

#### Acknowledge Alert
```http
PATCH /api/v1/pricing-intel/alerts/{alertId}
Content-Type: application/json

{
  "action": "acknowledge"
}
```

### Exports

#### Export Snapshots
```http
GET /api/v1/pricing-intel/exports?format=excel&competitorId=uuid
```

Supported formats: `json`, `csv`, `excel`

## Webhooks

### Event Types

- `snapshot.created` - New market intelligence snapshot recorded
- `alert.triggered` - Competitive alert fired
- `price.breach` - Competitor price breach detected
- `map.violation` - MAP violation detected
- `new.product` - New competitor product detected

### Register Webhook
```http
POST /api/v1/pricing-intel/webhooks
Content-Type: application/json

{
  "orgId": "uuid",
  "event_type": "snapshot.created",
  "target_url": "https://your-app.com/webhooks/competitive-intel",
  "secret": "optional-webhook-secret"
}
```

### Webhook Payload Example
```json
{
  "event": "snapshot.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "org_id": "uuid",
  "data": {
    "snapshot_ids": ["uuid1", "uuid2"],
    "competitor_id": "uuid",
    "job_id": "uuid"
  }
}
```

## Integration with Pricing Optimization Engine

### Using Competitive Data in Pricing Rules

The competitive intelligence data can be accessed within pricing rules:

```typescript
import { MarketIntelligenceService } from '@/lib/services/pricing-intel/MarketIntelligenceService'

// In your pricing rule logic
const intelService = new MarketIntelligenceService()
const positioning = await intelService.getPricePositioning(orgId, productId, matchIds)

if (positioning?.position === 'highest') {
  // Adjust price based on competitive position
  recommendedPrice = marketMedian * 0.95 // 5% below median
}
```

### Triggering Automated Repricing

Use webhooks to trigger automated repricing when competitive events occur:

1. Register webhook for `price.breach` events
2. Webhook receives breach notification
3. Evaluate pricing rules against new competitive data
4. Generate pricing recommendations
5. Auto-apply if configured (with confidence thresholds)

### Example Integration Hook

```typescript
// In your pricing optimization service
export async function onCompetitivePriceBreach(webhookPayload: WebhookPayload) {
  const { snapshot_ids, competitor_id } = webhookPayload.data
  
  // Get affected products
  const snapshots = await intelService.listSnapshots(orgId, { competitorId: competitor_id })
  
  for (const snapshot of snapshots) {
    if (!snapshot.match_id) continue
    
    // Get our product ID
    const match = await productMatchService.get(snapshot.match_id)
    if (!match?.internal_product_id) continue
    
    // Re-evaluate pricing
    const recommendation = await pricingService.generateRecommendation({
      productId: match.internal_product_id,
      competitiveData: {
        competitorPrice: snapshot.pricing.sale_price,
        marketPosition: snapshot.price_position,
      }
    })
    
    // Auto-apply if configured
    if (recommendation.confidence >= AUTO_APPLY_THRESHOLD) {
      await pricingService.applyRecommendation(recommendation)
    }
  }
}
```

## Scheduled Jobs

### Running Scraping Jobs

The scraping jobs are executed by calling:

```typescript
import { runCompetitiveIntelJobs } from '@/lib/jobs/competitive-intel-scraper'

// Run all due jobs (typically called from cron)
await runCompetitiveIntelJobs(10) // Process up to 10 jobs
```

### Setting Up Cron Job

```typescript
// In your cron configuration
import cron from 'node-cron'

// Run every hour
cron.schedule('0 * * * *', async () => {
  await runCompetitiveIntelJobs(10)
})

// Execute retention policies daily
cron.schedule('0 2 * * *', async () => {
  const retentionService = new DataRetentionService()
  await retentionService.executeRetentionPolicy(orgId)
})
```

## Data Models

### MarketIntelSnapshot
Contains all competitive intelligence data for a product at a point in time:
- Pricing data (regular, sale, currency)
- Availability status
- Product details
- Promotions
- Shipping information
- Reviews
- Calculated fields (price position, market share, etc.)

### CompetitorProductMatch
Links competitor products to internal products:
- Match confidence (0-100)
- Match method (manual, UPC, fuzzy, AI)
- Status (pending, matched, rejected)

## Best Practices

1. **Rate Limiting**: Configure appropriate rate limits per competitor to avoid blocking
2. **Proxy Rotation**: Use proxy policies for high-volume scraping
3. **Error Handling**: Implement retry logic with exponential backoff
4. **Data Validation**: Validate scraped data before storing to catch anomalies
5. **Alert Thresholds**: Configure meaningful thresholds to avoid alert fatigue
6. **Retention Policies**: Set appropriate retention periods based on data value and compliance

## Example: Complete Integration Flow

```typescript
// 1. Create competitor
const competitor = await competitorService.create(orgId, {
  company_name: 'Competitor Inc',
  website_url: 'https://competitor.com',
})

// 2. Create product matches
const match = await productMatchService.createMatch(orgId, {
  competitor_id: competitor.competitor_id,
  competitor_product_id: 'PROD-123',
  internal_product_id: 'our-product-uuid',
  match_confidence: 95,
  match_method: 'upc',
})

// 3. Create scraping job
const job = await scrapingJobService.createJob(orgId, {
  job_name: 'Daily Price Check',
  competitor_id: competitor.competitor_id,
  schedule_type: 'interval',
  schedule_config: { interval_hours: 24 },
})

// 4. Jobs run automatically and create snapshots

// 5. Register webhook to receive notifications
await webhookDispatcher.register(orgId, {
  event_type: 'price.breach',
  target_url: 'https://your-app.com/webhooks/competitive-intel',
})

// 6. In your webhook handler, trigger repricing
app.post('/webhooks/competitive-intel', async (req, res) => {
  if (req.body.event === 'price.breach') {
    await onCompetitivePriceBreach(req.body)
  }
  res.status(200).json({ received: true })
})
```

## Dashboard Widgets

The competitive intelligence data can be consumed by other modules through API endpoints:

```typescript
// Get price positioning for dashboard widget
const positioning = await fetch('/api/v1/pricing-intel/price-positioning?productId=...')
  .then(r => r.json())

// Display in pricing dashboard
<PricingWidget data={positioning.data} />
```

## Error Handling

All endpoints return a consistent error format:

```json
{
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

Common error codes:
- `MISSING_PRODUCT_ID` - Product ID required but not provided
- `COMPETITOR_NOT_FOUND` - Competitor doesn't exist
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Unexpected server error






