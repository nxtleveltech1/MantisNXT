# AI-Powered Loyalty Analytics Service

## Overview

The AI-Powered Loyalty Analytics Service provides comprehensive, real-time analytics for loyalty programs using advanced AI models (Claude 3.5 Sonnet) and database integration. This service replaces all mock data with live database queries and AI-generated insights.

## Features

### 1. **Comprehensive Metrics** (`getMetrics`)
Real-time loyalty program metrics from database:
- **Overview**: Total members, active members, growth rate
- **Points**: Issued, redeemed, balance, pending, expired
- **Engagement**: Avg points per member, transaction frequency, redemption rate
- **Redemptions**: Status breakdown (pending, approved, fulfilled, cancelled)
- **Value**: Lifetime value metrics by tier
- **Trends**: Monthly historical data for members, points, and redemptions

### 2. **Churn Prediction** (`predictChurn`)
AI-powered customer retention analysis:
- **At-Risk Identification**: Customers by risk level (low, medium, high, critical)
- **Churn Probability**: Individual customer churn scores (0-1)
- **Risk Factors**: Primary factors contributing to churn
- **Interventions**: Recommended retention strategies per customer
- **Program Insights**: System-wide retention recommendations

**API Endpoint**: `GET /api/v1/admin/loyalty/analytics/churn`

### 3. **Engagement Scoring** (`calculateEngagementScores`)
AI-driven engagement analysis:
- **Overall Score**: Program-wide engagement (0-100)
- **Distribution**: Highly engaged, moderately engaged, low engagement, dormant
- **Top Performers**: Most engaged customers and their behaviors
- **Engagement Drivers**: Factors that increase engagement
- **Opportunities**: Actionable improvement suggestions

**API Endpoint**: `GET /api/v1/admin/loyalty/analytics/engagement`

### 4. **Reward Optimization** (`optimizeRewards`)
AI recommendations for reward catalog effectiveness:
- **Catalog Effectiveness**: Overall score (0-100)
- **Reward Performance**: Individual reward metrics and categories (star, strong, average, underperforming, dead)
- **Optimization Suggestions**: Pricing, inventory, promotion, removal recommendations
- **Trending Preferences**: Customer preference patterns
- **ROI Scoring**: Value delivered vs cost per reward

**API Endpoint**: `GET /api/v1/admin/loyalty/analytics/rewards`

### 5. **Tier Movement Prediction** (`predictTierMovements`)
AI-powered tier forecasting:
- **Movement Predictions**: Upgrade/downgrade probability per customer
- **Timing**: Estimated days to tier change
- **Tier Distribution**: Current vs predicted (30/90 days)
- **Recommended Actions**: Strategies to encourage upgrades or prevent downgrades
- **Tier Health Score**: Overall tier system health (0-100)

**API Endpoint**: `GET /api/v1/admin/loyalty/analytics/tier-prediction?forecast_days=30`

### 6. **ROI Analysis** (`analyzeROI`)
Comprehensive financial analysis:
- **Program ROI**: Overall ROI percentage
- **Financial Breakdown**: Revenue, costs, acquisition, retention, profit impact
- **ROI by Tier**: Performance metrics per tier
- **Cost Efficiency**: Cost per point, redemption, active member
- **Strategic Insights**: Opportunities, risks, efficiency improvements, growth areas
- **Points Liability**: Unredeemed points value

**API Endpoint**: `GET /api/v1/admin/loyalty/analytics/roi`

### 7. **Fraud Detection** (`detectFraudAndAbuse`)
AI-powered anomaly detection using `AIDatabaseService`:
- **Anomaly Types**: Data quality, statistical, business rule, security
- **Severity Levels**: Low, medium, high, critical
- **Detection Methods**: Pattern analysis, rule violations, statistical outliers
- **Suggested Fixes**: SQL and procedural fixes for issues
- **Health Score**: Overall data health (0-1)

**API Endpoint**: `GET /api/v1/admin/loyalty/analytics/fraud`

## Integration with AI Infrastructure

The service integrates deeply with the existing AI infrastructure:

### AIDatabaseService Integration
- **`analyzeData()`**: Used for engagement and reward insights
- **`detectAnomalies()`**: Fraud and abuse detection
- **`generatePredictions()`**: Tier movement forecasting
- **Natural Language Queries**: Future feature for ad-hoc analytics

### AI Models Used
- **Primary**: Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`)
  - Superior reasoning for financial analysis
  - Excellent at pattern detection
  - Strong structured output generation
- **Schemas**: Zod validation for type-safe AI outputs

## Database Schema

The service queries the following tables:
- `customer_loyalty`: Member profiles and points balances
- `loyalty_transaction`: Points earning, redemption, expiration events
- `loyalty_program`: Program configuration and tier thresholds
- `reward_catalog`: Reward offerings and metadata
- `reward_redemption`: Redemption history and status

## Usage Examples

### Basic Metrics
```typescript
import { loyaltyAnalytics } from '@/lib/loyalty/ai-analytics-service';

const metrics = await loyaltyAnalytics.getMetrics({
  organizationId: 'org-uuid',
  programId: 'program-uuid', // optional
  period: 30, // days
});
```

### Churn Prediction
```typescript
const churnAnalysis = await loyaltyAnalytics.predictChurn({
  organizationId: 'org-uuid',
  programId: 'program-uuid', // optional
});

// Access at-risk customers
const criticalRisk = churnAnalysis.at_risk_customers.filter(
  c => c.risk_level === 'critical'
);
```

### Engagement Scoring
```typescript
const engagement = await loyaltyAnalytics.calculateEngagementScores({
  organizationId: 'org-uuid',
  programId: 'program-uuid',
});

console.log(`Overall Engagement: ${engagement.overall_engagement_score}/100`);
```

### Reward Optimization
```typescript
const optimization = await loyaltyAnalytics.optimizeRewards({
  organizationId: 'org-uuid',
  programId: 'program-uuid',
});

// Find underperforming rewards
const underperforming = optimization.reward_performance.filter(
  r => r.performance_category === 'underperforming'
);
```

### Tier Movement Prediction
```typescript
const tierPrediction = await loyaltyAnalytics.predictTierMovements({
  organizationId: 'org-uuid',
  programId: 'program-uuid',
  forecastDays: 90,
});

// Find likely upgrades
const upgrades = tierPrediction.predicted_movements.filter(
  m => m.movement_type === 'upgrade' && m.probability > 0.7
);
```

### ROI Analysis
```typescript
const roi = await loyaltyAnalytics.analyzeROI({
  organizationId: 'org-uuid',
  programId: 'program-uuid',
});

console.log(`Program ROI: ${roi.program_roi}%`);
console.log(`Net Profit Impact: $${roi.roi_breakdown.net_profit_impact}`);
```

### Fraud Detection
```typescript
const fraudDetection = await loyaltyAnalytics.detectFraudAndAbuse({
  organizationId: 'org-uuid',
  programId: 'program-uuid',
});

// Critical anomalies
const critical = fraudDetection.anomalies.filter(
  a => a.severity === 'critical'
);
```

## API Authentication

All endpoints require:
1. **Authentication**: Valid user session
2. **Authorization**: Admin role (`requireAdmin`)

```typescript
// Example API call
const response = await fetch('/api/v1/admin/loyalty/analytics/churn', {
  headers: {
    'Authorization': 'Bearer <token>',
  },
});
```

## Performance Considerations

### Caching
- AI predictions are cached in `ai_predictions` table (24h expiry)
- Insights stored in `ai_insights` table
- Anomalies tracked in `ai_data_anomalies` table

### Query Optimization
- Queries limited to relevant data (100-500 rows for AI analysis)
- Aggregations performed in database
- Indexes on `org_id`, `program_id`, `customer_id`, `created_at`

### AI Model Costs
- Average tokens per analysis: 2,000-5,000
- Structured outputs reduce token usage
- Caching reduces redundant API calls

## Error Handling

All methods include comprehensive error handling:
```typescript
try {
  const result = await loyaltyAnalytics.predictChurn({ organizationId });
} catch (error) {
  // Errors are logged and thrown with context
  console.error('Churn prediction failed:', error);
}
```

API routes wrap calls in `handleError` middleware for consistent responses.

## Future Enhancements

### Planned Features
1. **Real-time Streaming**: Stream AI insights as they're generated
2. **Custom Metrics**: User-defined KPIs with AI analysis
3. **Predictive Alerts**: Automated notifications for at-risk customers
4. **A/B Testing**: AI-powered experiment analysis
5. **Natural Language Interface**: Query analytics in plain English
6. **Multi-model Ensemble**: Combine multiple AI models for better predictions

### Integration Opportunities
- **Marketing Automation**: Auto-trigger campaigns for at-risk customers
- **CRM Integration**: Sync insights with customer profiles
- **BI Dashboards**: Export AI insights to Tableau/PowerBI
- **Webhooks**: Real-time event streaming for anomalies

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   API Routes (Next.js)                      │
│  /metrics /churn /engagement /rewards /tier-prediction /roi │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│            LoyaltyAnalyticsService                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ getMetrics() predictChurn() calculateEngagement()    │   │
│  │ optimizeRewards() predictTiers() analyzeROI()        │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────┬──────────────────────────────────────┬───────────┘
           │                                      │
           ▼                                      ▼
┌──────────────────────┐              ┌──────────────────────┐
│  PostgreSQL Database │              │  AIDatabaseService   │
│  ┌────────────────┐  │              │  ┌────────────────┐  │
│  │customer_loyalty│  │              │  │analyzeData()   │  │
│  │loyalty_trans..│  │              │  │detectAnomalies()│ │
│  │reward_catalog │  │              │  │generatePred... │  │
│  │reward_redemp..│  │              │  └────────────────┘  │
│  └────────────────┘  │              └──────────┬───────────┘
└──────────────────────┘                         │
                                                 ▼
                                      ┌──────────────────────┐
                                      │ Anthropic Claude API │
                                      │ claude-3-5-sonnet    │
                                      └──────────────────────┘
```

## Testing

### Unit Tests
```typescript
// Example test
import { loyaltyAnalytics } from '@/lib/loyalty/ai-analytics-service';

describe('LoyaltyAnalyticsService', () => {
  it('should calculate metrics accurately', async () => {
    const result = await loyaltyAnalytics.getMetrics({
      organizationId: 'test-org',
      period: 30,
    });

    expect(result.overview.total_members).toBeGreaterThanOrEqual(0);
    expect(result.points.points_balance).toBeGreaterThanOrEqual(0);
  });
});
```

### Integration Tests
Test with real database and AI service in staging environment.

## Support

For issues or questions:
1. Check error logs in `ai_insights` table
2. Review AI model responses in database
3. Contact AI infrastructure team for model-related issues
4. Contact database team for query optimization

---

**Version**: 1.0.0
**Last Updated**: 2025-11-04
**Author**: Claude Code
**AI Model**: Claude 3.5 Sonnet (Anthropic)
