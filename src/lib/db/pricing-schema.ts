// @ts-nocheck

/**
 * Pricing Optimization Database Schema Definitions
 *
 * Defines types and constants for pricing optimization tables
 * following the schema contract pattern used in the project
 *
 * Author: Aster (Principal Full-Stack & Architecture Expert)
 * Date: 2025-11-02
 */

import { SCHEMA } from './schema-contract';

/**
 * Pricing Optimization Tables
 *
 * All pricing tables live in the `core` schema
 */
export const PRICING_TABLES = {
  PRICING_RULES: 'pricing_rule',
  PRICING_RULE_CONDITIONS: `${SCHEMA.CORE}.pricing_rule_conditions`,
  OPTIMIZATION_RUNS: `${SCHEMA.CORE}.optimization_runs`,
  OPTIMIZATION_RECOMMENDATIONS: `${SCHEMA.CORE}.optimization_recommendations`,
  PRICE_CHANGE_LOG: `${SCHEMA.CORE}.price_change_log`,
  COMPETITOR_PRICES: `${SCHEMA.CORE}.competitor_prices`,
  PRICE_ELASTICITY: `${SCHEMA.CORE}.price_elasticity`,
  PRICING_AUTOMATION_CONFIG: 'pricing_automation_config',
  COMPETITOR_PROFILE: `${SCHEMA.CORE}.competitor_profile`,
  COMPETITOR_DATA_SOURCE: `${SCHEMA.CORE}.competitor_data_source`,
  COMPETITOR_PRODUCT_MATCH: `${SCHEMA.CORE}.competitor_product_match`,
  MARKET_INTEL_SCRAPE_JOB: `${SCHEMA.CORE}.market_intel_scrape_job`,
  MARKET_INTEL_SCRAPE_RUN: `${SCHEMA.CORE}.market_intel_scrape_run`,
  MARKET_INTEL_SNAPSHOT: `${SCHEMA.CORE}.market_intel_snapshot`,
  MARKET_INTEL_ALERT: `${SCHEMA.CORE}.market_intel_alert`,
  MARKET_INTEL_WEBHOOK: `${SCHEMA.CORE}.market_intel_webhook_subscription`,
  MARKET_INTEL_DATA_POLICY: `${SCHEMA.CORE}.market_intel_data_policy`,
} as const;

export type PricingTableName = typeof PRICING_TABLES[keyof typeof PRICING_TABLES];

/**
 * Pricing Rule Types
 */
export enum PricingRuleType {
  COST_PLUS = 'cost_plus',
  MARKET_BASED = 'market_based',
  COMPETITIVE = 'competitive',
  DYNAMIC = 'dynamic',
  BUNDLE = 'bundle',
  CLEARANCE = 'clearance',
  PROMOTIONAL = 'promotional',
}

/**
 * Pricing Strategy Enums
 */
export enum PricingStrategy {
  MAXIMIZE_REVENUE = 'maximize_revenue',
  MAXIMIZE_PROFIT = 'maximize_profit',
  MAXIMIZE_VOLUME = 'maximize_volume',
  MATCH_COMPETITION = 'match_competition',
  PREMIUM_POSITIONING = 'premium_positioning',
  VALUE_POSITIONING = 'value_positioning',
}

/**
 * Optimization Status
 */
export enum OptimizationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Recommendation Status
 */
export enum RecommendationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  APPLIED = 'applied',
  EXPIRED = 'expired',
}

/**
 * Pricing Rule Interface
 */
export interface PricingRule {
  rule_id: string;
  name: string;
  description?: string;
  rule_type: PricingRuleType;
  priority: number;
  is_active: boolean;
  strategy: PricingStrategy;

  // Rule configuration (JSON)
  config: {
    margin_percent?: number;
    markup_percent?: number;
    min_price?: number;
    max_price?: number;
    competitor_offset_percent?: number;
    elasticity_factor?: number;
    bundle_discount_percent?: number;
    time_based_rules?: Array<{
      start_time: string;
      end_time: string;
      adjustment_percent: number;
    }>;
    conditions?: Record<string, unknown>;
  };

  // Applicability filters
  applies_to_categories?: string[];
  applies_to_brands?: string[];
  applies_to_suppliers?: string[];
  applies_to_products?: string[];

  // Metadata
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  last_modified_by?: string;
}

/**
 * Pricing Rule Condition Interface
 */
export interface PricingRuleCondition {
  condition_id: string;
  rule_id: string;
  condition_type: 'category' | 'brand' | 'supplier' | 'product' | 'price_range' | 'stock_level' | 'custom';
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'between';
  value: unknown;
  created_at: Date;
}

/**
 * Optimization Run Interface
 */
export interface OptimizationRun {
  run_id: string;
  run_name: string;
  strategy: PricingStrategy;
  status: OptimizationStatus;

  // Configuration
  config: {
    algorithms: string[];
    target_margin_percent?: number;
    competitor_data_source?: string;
    elasticity_model?: string;
    constraints?: {
      min_margin_percent?: number;
      max_price_change_percent?: number;
      preserve_price_endings?: boolean;
    };
  };

  // Scope
  scope: {
    category_ids?: string[];
    brand_ids?: string[];
    supplier_ids?: string[];
    product_ids?: string[];
  };

  // Results
  total_products_analyzed: number;
  recommendations_generated: number;
  estimated_revenue_impact?: number;
  estimated_profit_impact?: number;

  // Execution details
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;

  // Metadata
  created_at: Date;
  created_by?: string;
}

/**
 * Optimization Recommendation Interface
 */
export interface OptimizationRecommendation {
  recommendation_id: string;
  run_id: string;
  product_id: string;
  supplier_product_id?: string;

  // Current state
  current_price: number;
  current_cost?: number;
  current_margin_percent?: number;

  // Recommended changes
  recommended_price: number;
  recommended_margin_percent?: number;
  price_change_percent: number;
  price_change_amount: number;

  // Analysis
  confidence_score: number; // 0-100
  reasoning: string;
  algorithm_used: string;

  // Impact projections
  projected_demand_change_percent?: number;
  projected_revenue_impact?: number;
  projected_profit_impact?: number;

  // Supporting data
  competitor_prices?: Array<{
    competitor: string;
    price: number;
    last_checked: Date;
  }>;
  elasticity_estimate?: number;
  historical_performance?: Record<string, unknown>;

  // Status
  status: RecommendationStatus;
  applied_at?: Date;
  applied_by?: string;
  rejection_reason?: string;

  // Metadata
  created_at: Date;
  expires_at?: Date;
}

/**
 * Price Change Log Interface
 */
export interface PriceChangeLog {
  log_id: string;
  product_id: string;
  supplier_product_id?: string;

  // Price changes
  old_price: number;
  new_price: number;
  price_change_percent: number;
  price_change_amount: number;

  // Context
  change_reason: 'rule_applied' | 'optimization' | 'manual' | 'cost_change' | 'competitor_change' | 'market_adjustment';
  rule_id?: string;
  recommendation_id?: string;

  // Metadata
  changed_at: Date;
  changed_by?: string;
  notes?: string;
}

/**
 * Competitor Price Interface
 */
export interface CompetitorPrice {
  competitor_price_id: string;
  product_id: string;
  competitor_name: string;
  competitor_sku?: string;

  // Price data
  price: number;
  currency: string;
  availability: 'in_stock' | 'out_of_stock' | 'limited' | 'unknown';

  // Source
  source_url?: string;
  last_checked: Date;

  // Metadata
  created_at: Date;
  is_active: boolean;
}

/**
 * Price Elasticity Interface
 */
export interface PriceElasticity {
  elasticity_id: string;
  product_id: string;

  // Elasticity metrics
  elasticity_coefficient: number; // Percentage change in demand / Percentage change in price
  confidence_interval_lower: number;
  confidence_interval_upper: number;

  // Analysis period
  analysis_start_date: Date;
  analysis_end_date: Date;
  data_points_count: number;

  // Optimal pricing
  optimal_price?: number;
  optimal_price_confidence?: number;

  // Historical data used
  price_range_analyzed: {
    min_price: number;
    max_price: number;
  };
  demand_range_observed: {
    min_demand: number;
    max_demand: number;
  };

  // Metadata
  created_at: Date;
  model_version: string;
  is_current: boolean;
}

/**
 * Price Performance Metrics
 */
export interface PricePerformanceMetrics {
  product_id: string;
  time_period: {
    start_date: Date;
    end_date: Date;
  };

  // Sales metrics
  units_sold: number;
  revenue: number;
  profit: number;

  // Price metrics
  average_price: number;
  min_price: number;
  max_price: number;
  price_volatility: number;

  // Competitive position
  market_position: 'premium' | 'mid_market' | 'value' | 'unknown';
  price_vs_market_avg_percent: number;

  // Performance indicators
  margin_percent: number;
  conversion_rate?: number;
  cart_abandonment_rate?: number;
}

/**
 * Competitive Intelligence types
 */

export type RobotsBehavior = 'respect' | 'ignore' | 'custom';

export interface CompetitorProfile {
  competitor_id: string;
  org_id: string;
  company_name: string;
  website_url?: string;
  marketplace_listings: Array<Record<string, unknown>>;
  social_profiles: Array<Record<string, unknown>>;
  custom_data_sources: Array<Record<string, unknown>>;
  default_currency: string;
  proxy_policy: Record<string, unknown>;
  captcha_policy: Record<string, unknown>;
  robots_txt_behavior: RobotsBehavior;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export type DataSourceType = 'website' | 'api' | 'marketplace' | 'custom';

export interface CompetitorDataSource {
  data_source_id: string;
  competitor_id: string;
  org_id: string;
  source_type: DataSourceType;
  label?: string;
  endpoint_url: string;
  auth_config: Record<string, unknown>;
  rate_limit_config: Record<string, unknown>;
  robots_txt_cache?: Record<string, unknown>;
  last_success_at?: Date;
  last_status?: string;
  health_status: string;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export type ProductMatchStatus = 'pending' | 'matched' | 'rejected';
export type ProductMatchMethod = 'manual' | 'upc' | 'fuzzy' | 'ai';

export interface CompetitorProductMatch {
  match_id: string;
  org_id: string;
  competitor_id: string;
  competitor_product_id: string;
  competitor_sku?: string;
  competitor_title?: string;
  competitor_url?: string;
  internal_product_id?: string;
  internal_sku?: string;
  upc?: string;
  ean?: string;
  asin?: string;
  mpn?: string;
  match_confidence: number;
  match_method: ProductMatchMethod;
  status: ProductMatchStatus;
  reviewer_id?: string;
  reviewed_at?: Date;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export type ScrapeScheduleType = 'manual' | 'cron' | 'interval';
export type ScrapeJobStatus = 'active' | 'paused' | 'archived';

export interface MarketIntelScrapeJob {
  job_id: string;
  org_id: string;
  competitor_id?: string;
  job_name: string;
  schedule_type: ScrapeScheduleType;
  schedule_config: Record<string, unknown>;
  status: ScrapeJobStatus;
  priority: number;
  max_concurrency: number;
  rate_limit_per_min: number;
  last_run_at?: Date;
  next_run_at?: Date;
  last_status?: string;
  metadata: Record<string, unknown>;
  created_by?: string;
  updated_by?: string;
  created_at: Date;
  updated_at: Date;
}

export type ScrapeRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface MarketIntelScrapeRun {
  run_id: string;
  job_id: string;
  org_id: string;
  competitor_id?: string;
  triggered_by: 'system' | 'user' | 'api';
  status: ScrapeRunStatus;
  started_at?: Date;
  completed_at?: Date;
  total_sources: number;
  success_sources: number;
  failed_sources: number;
  total_products: number;
  processed_products: number;
  error_details?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface MarketIntelSnapshot {
  snapshot_id: string;
  org_id: string;
  competitor_id: string;
  match_id?: string;
  run_id?: string;
  observed_at: Date;
  identifiers: Record<string, unknown>;
  pricing: Record<string, unknown>;
  availability: Record<string, unknown>;
  product_details: Record<string, unknown>;
  promotions: Array<Record<string, unknown>>;
  shipping: Record<string, unknown>;
  reviews: Record<string, unknown>;
  price_position: Record<string, unknown>;
  market_share_estimate?: number;
  elasticity_signals: Record<string, unknown>;
  raw_payload?: Record<string, unknown>;
  hash: string;
  is_anomaly: boolean;
  created_at: Date;
}

export type MarketIntelAlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface MarketIntelAlert {
  alert_id: string;
  org_id: string;
  competitor_id?: string;
  match_id?: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold_config: Record<string, unknown>;
  detected_at: Date;
  acknowledged_at?: Date;
  acknowledged_by?: string;
  status: MarketIntelAlertStatus;
  details: Record<string, unknown>;
  remediation_status: string;
  created_at: Date;
}

export interface MarketIntelWebhookSubscription {
  webhook_id: string;
  org_id: string;
  event_type: string;
  target_url: string;
  secret?: string;
  enabled: boolean;
  retry_policy: Record<string, unknown>;
  last_failure_at?: Date;
  failure_count: number;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface MarketIntelDataPolicy {
  org_id: string;
  retention_days_snapshots: number;
  retention_days_alerts: number;
  retention_days_jobs: number;
  archival_strategy: string;
  last_archive_run_at?: Date;
  updated_at: Date;
}

/**
 * Pricing Automation Configuration Interface
 */
export interface PricingAutomationConfig {
  org_id: string;
  enable_auto_activation: boolean;
  auto_activation_confidence_threshold: number;
  enable_ai_recommendations: boolean;
  default_margin_percent: number;
  min_margin_percent: number;
  max_price_increase_percent: number;
  require_review_for_high_impact: boolean;
  high_impact_threshold_percent: number;
  enable_batch_processing: boolean;
  batch_size: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Type guards
 */
export function isPricingRule(obj: unknown): obj is PricingRule {
  return obj && typeof obj.rule_id === 'string' && typeof obj.rule_type === 'string';
}

export function isOptimizationRun(obj: unknown): obj is OptimizationRun {
  return obj && typeof obj.run_id === 'string' && typeof obj.strategy === 'string';
}

export function isOptimizationRecommendation(obj: unknown): obj is OptimizationRecommendation {
  return obj && typeof obj.recommendation_id === 'string' && typeof obj.recommended_price === 'number';
}
