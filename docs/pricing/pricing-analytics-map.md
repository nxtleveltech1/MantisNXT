# Pricing & Analytics Data Map

Generated: 2026-02-06 00:51:27

## Pricing (Sell-Price) Core
- Pricing Rules
  - API: /api/v1/pricing/rules, /api/v1/pricing/rules/[id], /api/v1/pricing/rules/conflicts
  - Service: src/lib/services/PricingRuleService.ts
  - Tables: core.pricing_rule (canonical), compatibility views as needed
- Pricing Optimization Runs & Recommendations
  - API: /api/v1/pricing/optimization, /api/v1/pricing/optimization/[id], /api/v1/pricing/optimization/[id]/progress
  - Service: src/lib/services/PricingOptimizationService.ts
  - Tables: core.optimization_runs, core.optimization_recommendations, core.price_change_log
- Pricing Analytics
  - API: /api/v1/pricing/analytics?type=dashboard|trends|competitor|elasticity
  - Service: src/lib/services/PriceAnalyticsService.ts
  - Tables: core.price_history, core.price_change_log, core.competitor_pricing, core.price_elasticity, core.optimization_recommendations
- Competitor Price Import/Scrape
  - API: /api/v1/pricing/competitors/import, /api/v1/pricing/competitors/scrape
  - Service: src/lib/services/CompetitorPriceScrapingService.ts
  - Tables: core.competitor_pricing
- Pricing Automation Config
  - API: /api/v1/pricing/automation-config
  - Table: core.pricing_automation_config (canonical)

## Competitive Intelligence (Pricing Intel)
- Competitor Profiles
  - API: /api/v1/pricing-intel/competitors, /api/v1/pricing-intel/competitors/[competitorId]
  - Service: src/lib/services/pricing-intel/CompetitorProfileService.ts
  - Tables: core.competitor_profile, core.competitor_data_source
- Product Matching
  - API: /api/v1/pricing-intel/product-matches
  - Service: src/lib/services/pricing-intel/ProductMatchService.ts
  - Tables: core.competitor_product_match
- Scraping Jobs & Runs
  - API: /api/v1/pricing-intel/jobs, /api/v1/pricing-intel/jobs/[jobId]/runs
  - Service: src/lib/services/pricing-intel/ScrapingJobService.ts
  - Tables: core.market_intel_scrape_job, core.market_intel_scrape_run
- Snapshots, Trends, Alerts, Retention
  - API: /api/v1/pricing-intel/snapshots, /api/v1/pricing-intel/trends, /api/v1/pricing-intel/alerts, /api/v1/pricing-intel/data-retention
  - Service: src/lib/services/pricing-intel/MarketIntelligenceService.ts, AlertService.ts, DataRetentionService.ts
  - Tables: core.market_intel_snapshot, core.market_intel_alert, core.market_intel_data_policy, core.market_intel_webhook_subscription

## Platform Analytics
- Analytics Dashboard
  - API: /api/analytics/dashboard
  - UI: src/components/analytics/RealTimeAnalyticsDashboard.tsx
  - Tables: core.supplier, core.supplier_performance, core.stock_on_hand, core.stock_movement, core.analytics_*
- Anomalies
  - API: /api/analytics/anomalies
  - Tables: core.analytics_anomalies
- Predictions
  - API: /api/analytics/predictions
  - Tables: core.analytics_predictions
- Recommendations
  - API: /api/analytics/recommendations
  - Tables: core.analytics_recommendations
- Comprehensive Analytics
  - API: /api/analytics/comprehensive
  - Tables: core.analytics_cache, core.analytics_*, sales/order tables as applicable

## Notes
- Canonical schema is core.*. Public views may exist only for compatibility.
- All API routes must derive org_id from authenticated user context; no hardcoded org IDs.
