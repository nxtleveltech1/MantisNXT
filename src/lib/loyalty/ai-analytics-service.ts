// @ts-nocheck

/**
 * AI-Powered Loyalty Analytics Service
 *
 * Provides comprehensive AI-driven analytics for loyalty programs:
 * - Churn prediction and at-risk customer identification
 * - Engagement scoring with AI-powered metrics
 * - Reward optimization and effectiveness analysis
 * - Tier movement prediction (upgrades/downgrades)
 * - ROI analysis with AI-generated insights
 *
 * Integrates with AIDatabaseService for advanced analytics.
 *
 * @author Claude Code
 * @date 2025-11-04
 */

import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { query } from '@/lib/database/connection';
import { aiDatabase } from '@/lib/ai/database-integration';

// ============================================================================
// SCHEMAS FOR AI-POWERED ANALYTICS
// ============================================================================

const ChurnPredictionSchema = z.object({
  overall_churn_risk: z.number().min(0).max(1).describe('Overall churn risk score (0-1)'),
  at_risk_customers: z.array(z.object({
    customer_id: z.string().uuid(),
    churn_probability: z.number().min(0).max(1),
    risk_level: z.enum(['low', 'medium', 'high', 'critical']),
    primary_risk_factors: z.array(z.string()),
    days_since_last_activity: z.number(),
    recommended_interventions: z.array(z.string()),
    estimated_lifetime_value: z.number(),
  })).describe('List of at-risk customers'),
  churn_factors: z.array(z.object({
    factor: z.string(),
    importance: z.number().min(0).max(1),
    description: z.string(),
  })).describe('Key factors contributing to churn'),
  retention_recommendations: z.array(z.string()).describe('Program-level retention strategies'),
});

const EngagementScoringSchema = z.object({
  overall_engagement_score: z.number().min(0).max(100).describe('Overall program engagement (0-100)'),
  engagement_distribution: z.object({
    highly_engaged: z.number().describe('Percentage highly engaged'),
    moderately_engaged: z.number().describe('Percentage moderately engaged'),
    low_engagement: z.number().describe('Percentage low engagement'),
    dormant: z.number().describe('Percentage dormant'),
  }),
  top_engaged_customers: z.array(z.object({
    customer_id: z.string().uuid(),
    engagement_score: z.number().min(0).max(100),
    key_behaviors: z.array(z.string()),
    lifetime_value: z.number(),
  })),
  engagement_drivers: z.array(z.object({
    driver: z.string(),
    impact: z.number().min(-1).max(1),
    description: z.string(),
  })),
  improvement_opportunities: z.array(z.string()),
});

const RewardOptimizationSchema = z.object({
  catalog_effectiveness_score: z.number().min(0).max(100).describe('Overall catalog effectiveness (0-100)'),
  reward_performance: z.array(z.object({
    reward_id: z.string().uuid(),
    reward_name: z.string(),
    redemption_rate: z.number(),
    popularity_score: z.number().min(0).max(100),
    roi_score: z.number(),
    performance_category: z.enum(['star', 'strong', 'average', 'underperforming', 'dead']),
    recommendations: z.array(z.string()),
  })),
  optimization_suggestions: z.array(z.object({
    category: z.enum(['pricing', 'inventory', 'promotion', 'removal', 'new_reward']),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    suggestion: z.string(),
    expected_impact: z.string(),
  })),
  trending_preferences: z.array(z.object({
    category: z.string(),
    growth_rate: z.number(),
    description: z.string(),
  })),
});

const TierMovementPredictionSchema = z.object({
  tier_health_score: z.number().min(0).max(100).describe('Overall tier system health (0-100)'),
  predicted_movements: z.array(z.object({
    customer_id: z.string().uuid(),
    current_tier: z.string(),
    predicted_tier: z.string(),
    movement_type: z.enum(['upgrade', 'downgrade', 'stable']),
    probability: z.number().min(0).max(1),
    estimated_days_to_change: z.number(),
    key_factors: z.array(z.string()),
    recommended_actions: z.array(z.string()),
  })),
  tier_distribution_forecast: z.object({
    current: z.record(z.number()),
    predicted_30_days: z.record(z.number()),
    predicted_90_days: z.record(z.number()),
  }),
  tier_optimization_recommendations: z.array(z.string()),
});

const ROIAnalysisSchema = z.object({
  program_roi: z.number().describe('Overall program ROI percentage'),
  roi_breakdown: z.object({
    total_revenue_generated: z.number(),
    total_program_costs: z.number(),
    customer_acquisition_cost: z.number(),
    customer_retention_value: z.number(),
    average_order_value_increase: z.number(),
    net_profit_impact: z.number(),
  }),
  roi_by_tier: z.array(z.object({
    tier: z.string(),
    roi: z.number(),
    member_count: z.number(),
    avg_lifetime_value: z.number(),
    cost_per_member: z.number(),
  })),
  cost_efficiency_metrics: z.object({
    cost_per_point_issued: z.number(),
    cost_per_redemption: z.number(),
    cost_per_active_member: z.number(),
    points_liability: z.number(),
  }),
  insights: z.array(z.object({
    category: z.enum(['opportunity', 'risk', 'efficiency', 'growth']),
    title: z.string(),
    description: z.string(),
    financial_impact: z.string(),
  })),
  optimization_recommendations: z.array(z.string()),
});

// ============================================================================
// LOYALTY ANALYTICS SERVICE
// ============================================================================

export class LoyaltyAnalyticsService {
  private model = anthropic('claude-3-5-sonnet-20241022');

  /**
   * Get comprehensive loyalty program metrics with AI insights
   */
  async getMetrics(options: {
    organizationId: string;
    programId?: string;
    period?: number; // days
  }): Promise<{
    overview: {
      total_members: number;
      active_members: number;
      new_members_this_period: number;
      growth_rate: number;
    };
    points: {
      total_points_issued: number;
      total_points_redeemed: number;
      points_balance: number;
      points_pending: number;
      points_expired: number;
    };
    engagement: {
      avg_points_per_member: number;
      avg_transactions_per_member: number;
      redemption_rate: number;
      avg_time_to_first_redemption_days: number;
    };
    redemptions: {
      total_redemptions: number;
      total_value: number;
      pending: number;
      approved: number;
      fulfilled: number;
      cancelled: number;
    };
    value: {
      total_lifetime_value: number;
      avg_lifetime_value_per_member: number;
      top_tier_avg_ltv: number;
    };
    trends: {
      members_by_month: Array<{ month: string; count: number }>;
      points_by_month: Array<{ month: string; earned: number; redeemed: number }>;
      redemptions_by_month: Array<{ month: string; count: number; value: number }>;
    };
  }> {
    const period = options.period || 30;
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - period);

    // Get overview metrics
    const overviewQuery = `
      SELECT
        COUNT(DISTINCT cl.customer_id) as total_members,
        COUNT(DISTINCT CASE
          WHEN lt.created_at >= $2 THEN cl.customer_id
        END) as active_members,
        COUNT(DISTINCT CASE
          WHEN cl.created_at >= $2 THEN cl.customer_id
        END) as new_members
      FROM customer_loyalty cl
      LEFT JOIN loyalty_transaction lt ON cl.customer_id = lt.customer_id
      WHERE cl.org_id = $1
      ${options.programId ? 'AND cl.program_id = $3' : ''}
    `;

    const overviewParams = options.programId
      ? [options.organizationId, periodStart, options.programId]
      : [options.organizationId, periodStart];

    const overviewResult = await query(overviewQuery, overviewParams);
    const overview = overviewResult.rows[0];

    // Calculate growth rate
    const previousPeriodStart = new Date(periodStart);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - period);

    const previousMembersQuery = `
      SELECT COUNT(DISTINCT customer_id) as previous_members
      FROM customer_loyalty
      WHERE org_id = $1 AND created_at < $2
      ${options.programId ? 'AND program_id = $3' : ''}
    `;

    const previousMembersParams = options.programId
      ? [options.organizationId, previousPeriodStart, options.programId]
      : [options.organizationId, previousPeriodStart];

    const previousMembersResult = await query(previousMembersQuery, previousMembersParams);
    const previousMembers = previousMembersResult.rows[0].previous_members || 0;

    const growthRate = previousMembers > 0
      ? ((overview.total_members - previousMembers) / previousMembers * 100)
      : 0;

    // Get points metrics
    const pointsQuery = `
      SELECT
        SUM(CASE WHEN transaction_type = 'earn' THEN points_amount ELSE 0 END) as total_earned,
        SUM(CASE WHEN transaction_type = 'redeem' THEN ABS(points_amount) ELSE 0 END) as total_redeemed,
        SUM(CASE WHEN transaction_type = 'expire' THEN ABS(points_amount) ELSE 0 END) as total_expired,
        SUM(CASE WHEN transaction_type = 'pending' THEN points_amount ELSE 0 END) as total_pending
      FROM loyalty_transaction
      WHERE org_id = $1
      ${options.programId ? 'AND program_id = $2' : ''}
    `;

    const pointsParams = options.programId
      ? [options.organizationId, options.programId]
      : [options.organizationId];

    const pointsResult = await query(pointsQuery, pointsParams);
    const points = pointsResult.rows[0];

    // Get current balance from customer_loyalty
    const balanceQuery = `
      SELECT SUM(points_balance) as current_balance
      FROM customer_loyalty
      WHERE org_id = $1
      ${options.programId ? 'AND program_id = $2' : ''}
    `;

    const balanceResult = await query(balanceQuery, pointsParams);
    const currentBalance = balanceResult.rows[0].current_balance || 0;

    // Get engagement metrics
    const engagementQuery = `
      SELECT
        AVG(cl.points_balance) as avg_points,
        AVG(transaction_count) as avg_transactions,
        AVG(EXTRACT(EPOCH FROM (first_redemption - cl.created_at))/86400) as avg_days_to_first_redemption
      FROM customer_loyalty cl
      LEFT JOIN (
        SELECT customer_id, COUNT(*) as transaction_count
        FROM loyalty_transaction
        GROUP BY customer_id
      ) tc ON cl.customer_id = tc.customer_id
      LEFT JOIN (
        SELECT customer_id, MIN(created_at) as first_redemption
        FROM loyalty_transaction
        WHERE transaction_type = 'redeem'
        GROUP BY customer_id
      ) fr ON cl.customer_id = fr.customer_id
      WHERE cl.org_id = $1
      ${options.programId ? 'AND cl.program_id = $2' : ''}
    `;

    const engagementResult = await query(engagementQuery, pointsParams);
    const engagement = engagementResult.rows[0];

    const redemptionRate = points.total_earned > 0
      ? (points.total_redeemed / points.total_earned * 100)
      : 0;

    // Get redemption status counts
    const redemptionsQuery = `
      SELECT
        COUNT(*) as total,
        SUM(monetary_value_used) as total_value,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'fulfilled' THEN 1 END) as fulfilled,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
      FROM reward_redemption
      WHERE org_id = $1
      ${options.programId ? 'AND reward_id IN (SELECT id FROM reward_catalog WHERE program_id = $2)' : ''}
    `;

    const redemptionsResult = await query(redemptionsQuery, pointsParams);
    const redemptions = redemptionsResult.rows[0];

    // Get lifetime value metrics
    const valueQuery = `
      SELECT
        SUM(lifetime_value) as total_ltv,
        AVG(lifetime_value) as avg_ltv,
        AVG(CASE WHEN current_tier = 'platinum' THEN lifetime_value END) as top_tier_ltv
      FROM customer_loyalty
      WHERE org_id = $1
      ${options.programId ? 'AND program_id = $2' : ''}
    `;

    const valueResult = await query(valueQuery, pointsParams);
    const value = valueResult.rows[0];

    // Get monthly trends
    const trendsQuery = `
      SELECT
        TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') as month,
        COUNT(DISTINCT customer_id) as new_members
      FROM customer_loyalty
      WHERE org_id = $1 AND created_at >= NOW() - INTERVAL '12 months'
      ${options.programId ? 'AND program_id = $2' : ''}
      GROUP BY date_trunc('month', created_at)
      ORDER BY month
    `;

    const trendsResult = await query(trendsQuery, pointsParams);

    const pointsTrendsQuery = `
      SELECT
        TO_CHAR(date_trunc('month', created_at), 'YYYY-MM') as month,
        SUM(CASE WHEN transaction_type = 'earn' THEN points_amount ELSE 0 END) as earned,
        SUM(CASE WHEN transaction_type = 'redeem' THEN ABS(points_amount) ELSE 0 END) as redeemed
      FROM loyalty_transaction
      WHERE org_id = $1 AND created_at >= NOW() - INTERVAL '12 months'
      ${options.programId ? 'AND program_id = $2' : ''}
      GROUP BY date_trunc('month', created_at)
      ORDER BY month
    `;

    const pointsTrendsResult = await query(pointsTrendsQuery, pointsParams);

    const redemptionsTrendsQuery = `
      SELECT
        TO_CHAR(date_trunc('month', redeemed_at), 'YYYY-MM') as month,
        COUNT(*) as count,
        SUM(monetary_value_used) as value
      FROM reward_redemption
      WHERE org_id = $1 AND redeemed_at >= NOW() - INTERVAL '12 months'
      ${options.programId ? 'AND reward_id IN (SELECT id FROM reward_catalog WHERE program_id = $2)' : ''}
      GROUP BY date_trunc('month', redeemed_at)
      ORDER BY month
    `;

    const redemptionsTrendsResult = await query(redemptionsTrendsQuery, pointsParams);

    return {
      overview: {
        total_members: parseInt(overview.total_members) || 0,
        active_members: parseInt(overview.active_members) || 0,
        new_members_this_period: parseInt(overview.new_members) || 0,
        growth_rate: parseFloat(growthRate.toFixed(2)),
      },
      points: {
        total_points_issued: parseInt(points.total_earned) || 0,
        total_points_redeemed: parseInt(points.total_redeemed) || 0,
        points_balance: parseInt(currentBalance) || 0,
        points_pending: parseInt(points.total_pending) || 0,
        points_expired: parseInt(points.total_expired) || 0,
      },
      engagement: {
        avg_points_per_member: parseFloat((engagement.avg_points || 0).toFixed(0)),
        avg_transactions_per_member: parseFloat((engagement.avg_transactions || 0).toFixed(1)),
        redemption_rate: parseFloat(redemptionRate.toFixed(1)),
        avg_time_to_first_redemption_days: parseFloat((engagement.avg_days_to_first_redemption || 0).toFixed(0)),
      },
      redemptions: {
        total_redemptions: parseInt(redemptions.total) || 0,
        total_value: parseFloat(redemptions.total_value) || 0,
        pending: parseInt(redemptions.pending) || 0,
        approved: parseInt(redemptions.approved) || 0,
        fulfilled: parseInt(redemptions.fulfilled) || 0,
        cancelled: parseInt(redemptions.cancelled) || 0,
      },
      value: {
        total_lifetime_value: parseFloat(value.total_ltv) || 0,
        avg_lifetime_value_per_member: parseFloat((value.avg_ltv || 0).toFixed(0)),
        top_tier_avg_ltv: parseFloat((value.top_tier_ltv || 0).toFixed(0)),
      },
      trends: {
        members_by_month: trendsResult.rows.map(row => ({
          month: row.month,
          count: parseInt(row.new_members),
        })),
        points_by_month: pointsTrendsResult.rows.map(row => ({
          month: row.month,
          earned: parseInt(row.earned),
          redeemed: parseInt(row.redeemed),
        })),
        redemptions_by_month: redemptionsTrendsResult.rows.map(row => ({
          month: row.month,
          count: parseInt(row.count),
          value: parseFloat(row.value),
        })),
      },
    };
  }

  /**
   * Predict customer churn using AI analysis
   */
  async predictChurn(options: {
    organizationId: string;
    programId?: string;
  }): Promise<z.infer<typeof ChurnPredictionSchema>> {
    // Fetch customer activity data
    const customerDataQuery = `
      SELECT
        cl.customer_id,
        cl.points_balance,
        cl.total_points_earned,
        cl.total_points_redeemed,
        cl.current_tier,
        cl.lifetime_value,
        cl.created_at as member_since,
        EXTRACT(EPOCH FROM (NOW() - MAX(lt.created_at)))/86400 as days_since_last_activity,
        COUNT(lt.id) as total_transactions,
        COUNT(CASE WHEN lt.transaction_type = 'redeem' THEN 1 END) as redemption_count,
        AVG(CASE WHEN lt.transaction_type = 'earn' THEN lt.points_amount END) as avg_earn_amount
      FROM customer_loyalty cl
      LEFT JOIN loyalty_transaction lt ON cl.customer_id = lt.customer_id
      WHERE cl.org_id = $1
      ${options.programId ? 'AND cl.program_id = $2' : ''}
      GROUP BY cl.customer_id, cl.points_balance, cl.total_points_earned,
               cl.total_points_redeemed, cl.current_tier, cl.lifetime_value, cl.created_at
      LIMIT 100
    `;

    const params = options.programId
      ? [options.organizationId, options.programId]
      : [options.organizationId];

    const customerData = await query(customerDataQuery, params);

    // Use AI to analyze churn patterns
    const churnAnalysis = await generateObject({
      model: this.model,
      schema: ChurnPredictionSchema,
      prompt: `You are a customer retention expert. Analyze this loyalty program data to predict churn.

Customer Data (${customerData.rows.length} members):
${JSON.stringify(customerData.rows, null, 2)}

Analyze:
1. Calculate churn probability for each customer (0-1)
2. Identify primary risk factors (inactivity, low engagement, declining transactions)
3. Categorize risk levels: low (<25%), medium (25-50%), high (50-75%), critical (>75%)
4. Recommend specific interventions for at-risk customers
5. Identify program-level patterns contributing to churn
6. Provide retention strategies

Focus on actionable insights and quantifiable risk scores.`,
    });

    return churnAnalysis.object;
  }

  /**
   * Generate AI-powered engagement scores
   */
  async calculateEngagementScores(options: {
    organizationId: string;
    programId?: string;
  }): Promise<z.infer<typeof EngagementScoringSchema>> {
    // Fetch engagement data
    const engagementQuery = `
      SELECT
        cl.customer_id,
        cl.points_balance,
        cl.total_points_earned,
        cl.total_points_redeemed,
        cl.lifetime_value,
        cl.current_tier,
        COUNT(DISTINCT DATE(lt.created_at)) as active_days,
        COUNT(lt.id) as total_transactions,
        COUNT(CASE WHEN lt.transaction_type = 'redeem' THEN 1 END) as redemptions,
        EXTRACT(EPOCH FROM (NOW() - MAX(lt.created_at)))/86400 as days_since_last_activity,
        EXTRACT(EPOCH FROM (NOW() - cl.created_at))/86400 as days_as_member
      FROM customer_loyalty cl
      LEFT JOIN loyalty_transaction lt ON cl.customer_id = lt.customer_id
      WHERE cl.org_id = $1
      ${options.programId ? 'AND cl.program_id = $2' : ''}
      GROUP BY cl.customer_id, cl.points_balance, cl.total_points_earned,
               cl.total_points_redeemed, cl.lifetime_value, cl.current_tier, cl.created_at
      LIMIT 100
    `;

    const params = options.programId
      ? [options.organizationId, options.programId]
      : [options.organizationId];

    const engagementData = await query(engagementQuery, params);

    // Use AI to score engagement
    const engagementScoring = await generateObject({
      model: this.model,
      schema: EngagementScoringSchema,
      prompt: `You are an engagement analytics expert. Score customer engagement in this loyalty program.

Engagement Data (${engagementData.rows.length} members):
${JSON.stringify(engagementData.rows, null, 2)}

Calculate:
1. Overall program engagement score (0-100)
2. Individual customer engagement scores based on:
   - Transaction frequency
   - Redemption behavior
   - Points accumulation patterns
   - Recency of activity
   - Tenure and loyalty
3. Distribute customers into: highly engaged (80-100), moderately engaged (50-79), low engagement (20-49), dormant (<20)
4. Identify top engaged customers and their key behaviors
5. Determine engagement drivers (what increases engagement)
6. Suggest opportunities to improve overall engagement

Provide quantitative scores and actionable insights.`,
    });

    return engagementScoring.object;
  }

  /**
   * Optimize reward catalog with AI recommendations
   */
  async optimizeRewards(options: {
    organizationId: string;
    programId?: string;
  }): Promise<z.infer<typeof RewardOptimizationSchema>> {
    // Fetch reward performance data
    const rewardQuery = `
      SELECT
        rc.id as reward_id,
        rc.name as reward_name,
        rc.reward_type,
        rc.points_required,
        rc.monetary_value,
        rc.stock_quantity,
        rc.redemption_count,
        rc.is_active,
        rc.created_at,
        COUNT(rr.id) as total_redemptions,
        COUNT(CASE WHEN rr.status = 'fulfilled' THEN 1 END) as fulfilled_redemptions,
        AVG(EXTRACT(EPOCH FROM (rr.fulfilled_at - rr.redeemed_at))/86400) as avg_fulfillment_days,
        SUM(rr.points_spent) as total_points_spent,
        SUM(rr.monetary_value_used) as total_monetary_value
      FROM reward_catalog rc
      LEFT JOIN reward_redemption rr ON rc.id = rr.reward_id
      WHERE rc.org_id = $1
      ${options.programId ? 'AND rc.program_id = $2' : ''}
      GROUP BY rc.id, rc.name, rc.reward_type, rc.points_required, rc.monetary_value,
               rc.stock_quantity, rc.redemption_count, rc.is_active, rc.created_at
      ORDER BY total_redemptions DESC
    `;

    const params = options.programId
      ? [options.organizationId, options.programId]
      : [options.organizationId];

    const rewardData = await query(rewardQuery, params);

    // Use AI to optimize catalog
    const optimization = await generateObject({
      model: this.model,
      schema: RewardOptimizationSchema,
      prompt: `You are a rewards program consultant. Optimize this reward catalog for maximum engagement and ROI.

Reward Catalog Performance (${rewardData.rows.length} rewards):
${JSON.stringify(rewardData.rows, null, 2)}

Analyze:
1. Calculate overall catalog effectiveness score (0-100)
2. Score each reward's performance:
   - Redemption rate (redemptions vs availability)
   - Popularity score (0-100)
   - ROI score (value delivered vs cost)
   - Performance category: star (top 10%), strong, average, underperforming, dead (no redemptions in 90 days)
3. Provide specific recommendations for each reward category:
   - Stars: How to maintain performance
   - Underperforming: Price adjustments, promotion ideas, or removal
   - Dead: Remove or revamp
4. Suggest optimization strategies:
   - Pricing adjustments
   - Inventory management
   - Promotional opportunities
   - New reward ideas
5. Identify trending customer preferences

Focus on maximizing engagement and program ROI.`,
    });

    return optimization.object;
  }

  /**
   * Predict tier movements with AI
   */
  async predictTierMovements(options: {
    organizationId: string;
    programId?: string;
    forecastDays?: number;
  }): Promise<z.infer<typeof TierMovementPredictionSchema>> {
    const forecastDays = options.forecastDays || 30;

    // Fetch tier and activity data
    const tierQuery = `
      SELECT
        cl.customer_id,
        cl.current_tier,
        cl.total_points_earned,
        cl.points_balance,
        cl.tier_qualified_date,
        cl.lifetime_value,
        COUNT(lt.id) as recent_transactions,
        SUM(CASE WHEN lt.transaction_type = 'earn' THEN lt.points_amount ELSE 0 END) as recent_points_earned,
        AVG(CASE WHEN lt.transaction_type = 'earn' THEN lt.points_amount END) as avg_earn_rate,
        EXTRACT(EPOCH FROM (NOW() - MAX(lt.created_at)))/86400 as days_since_last_activity
      FROM customer_loyalty cl
      LEFT JOIN loyalty_transaction lt ON cl.customer_id = lt.customer_id
        AND lt.created_at >= NOW() - INTERVAL '30 days'
      WHERE cl.org_id = $1
      ${options.programId ? 'AND cl.program_id = $2' : ''}
      GROUP BY cl.customer_id, cl.current_tier, cl.total_points_earned,
               cl.points_balance, cl.tier_qualified_date, cl.lifetime_value
      LIMIT 100
    `;

    const params = options.programId
      ? [options.organizationId, options.programId]
      : [options.organizationId];

    const tierData = await query(tierQuery, params);

    // Get tier thresholds from program
    const programQuery = `
      SELECT tier_thresholds
      FROM loyalty_program
      WHERE org_id = $1
      ${options.programId ? 'AND id = $2' : ''}
      LIMIT 1
    `;

    const programResult = await query(programQuery, params);
    const tierThresholds = programResult.rows[0]?.tier_thresholds || {};

    // Use AI to predict movements
    const prediction = await generateObject({
      model: this.model,
      schema: TierMovementPredictionSchema,
      prompt: `You are a loyalty program analyst. Predict tier movements over the next ${forecastDays} days.

Customer Tier Data (${tierData.rows.length} members):
${JSON.stringify(tierData.rows, null, 2)}

Tier Thresholds:
${JSON.stringify(tierThresholds, null, 2)}

Predict:
1. Overall tier system health score (0-100)
2. For each customer, predict:
   - Probability of tier change (0-1)
   - Movement type: upgrade, downgrade, or stable
   - Estimated days to tier change
   - Key factors driving the prediction
   - Recommended actions to encourage upgrades or prevent downgrades
3. Forecast tier distribution:
   - Current distribution
   - Predicted in 30 days
   - Predicted in 90 days
4. Tier optimization recommendations to balance the tier pyramid

Use activity patterns, point velocity, and engagement trends to make accurate predictions.`,
    });

    return prediction.object;
  }

  /**
   * Generate comprehensive ROI analysis with AI insights
   */
  async analyzeROI(options: {
    organizationId: string;
    programId?: string;
  }): Promise<z.infer<typeof ROIAnalysisSchema>> {
    // Fetch financial data
    const roiQuery = `
      SELECT
        COUNT(DISTINCT cl.customer_id) as total_members,
        SUM(cl.lifetime_value) as total_revenue,
        SUM(cl.total_points_redeemed) as total_points_redeemed,
        SUM(cl.points_balance) as total_points_balance,
        AVG(cl.lifetime_value) as avg_ltv,
        COUNT(DISTINCT CASE WHEN cl.created_at >= NOW() - INTERVAL '30 days' THEN cl.customer_id END) as new_members_30d,
        SUM(CASE WHEN rr.status = 'fulfilled' THEN rr.monetary_value_used ELSE 0 END) as total_redemption_value,
        COUNT(DISTINCT CASE
          WHEN lt.created_at >= NOW() - INTERVAL '30 days' THEN cl.customer_id
        END) as active_members_30d
      FROM customer_loyalty cl
      LEFT JOIN loyalty_transaction lt ON cl.customer_id = lt.customer_id
      LEFT JOIN reward_redemption rr ON cl.customer_id = rr.customer_id
      WHERE cl.org_id = $1
      ${options.programId ? 'AND cl.program_id = $2' : ''}
    `;

    const params = options.programId
      ? [options.organizationId, options.programId]
      : [options.organizationId];

    const roiData = await query(roiQuery, params);

    // Get tier-specific ROI
    const tierROIQuery = `
      SELECT
        cl.current_tier,
        COUNT(*) as member_count,
        AVG(cl.lifetime_value) as avg_ltv,
        SUM(cl.total_points_redeemed) as points_redeemed
      FROM customer_loyalty cl
      WHERE cl.org_id = $1
      ${options.programId ? 'AND cl.program_id = $2' : ''}
      GROUP BY cl.current_tier
    `;

    const tierROIData = await query(tierROIQuery, params);

    // Use AI to analyze ROI
    const roiAnalysis = await generateObject({
      model: this.model,
      schema: ROIAnalysisSchema,
      prompt: `You are a financial analyst specializing in loyalty programs. Analyze the ROI of this program.

Program Financial Data:
${JSON.stringify(roiData.rows[0], null, 2)}

Tier-Level Performance:
${JSON.stringify(tierROIData.rows, null, 2)}

Calculate:
1. Overall program ROI percentage
2. Detailed ROI breakdown:
   - Total revenue generated (from lifetime_value)
   - Total program costs (points redeemed value + operational costs estimate)
   - Customer acquisition cost (estimate based on marketing spend per member)
   - Customer retention value (repeat purchase value)
   - Average order value increase from program members
   - Net profit impact
3. ROI by tier:
   - Calculate ROI for each tier
   - Member count and avg LTV per tier
   - Cost per member (points redeemed / member count)
4. Cost efficiency metrics:
   - Cost per point issued
   - Cost per redemption
   - Cost per active member
   - Points liability (unredeemed points value)
5. Strategic insights categorized by:
   - Opportunities (revenue growth areas)
   - Risks (cost concerns, liability)
   - Efficiency (optimization areas)
   - Growth (expansion opportunities)
6. Optimization recommendations to improve ROI

Provide detailed financial analysis with actionable recommendations.`,
    });

    return roiAnalysis.object;
  }

  /**
   * Detect fraud and abuse patterns using AI anomaly detection
   */
  async detectFraudAndAbuse(options: {
    organizationId: string;
    programId?: string;
  }): Promise<unknown> {
    // Fetch transaction patterns
    const transactionQuery = `
      SELECT
        lt.id,
        lt.customer_id,
        lt.transaction_type,
        lt.points_amount,
        lt.reference_type,
        lt.created_at,
        COUNT(*) OVER (PARTITION BY lt.customer_id, DATE(lt.created_at)) as transactions_same_day,
        SUM(lt.points_amount) OVER (PARTITION BY lt.customer_id, DATE(lt.created_at)) as points_same_day,
        cl.total_points_earned,
        cl.lifetime_value
      FROM loyalty_transaction lt
      JOIN customer_loyalty cl ON lt.customer_id = cl.customer_id
      WHERE lt.org_id = $1
      ${options.programId ? 'AND lt.program_id = $2' : ''}
      AND lt.created_at >= NOW() - INTERVAL '30 days'
      ORDER BY lt.created_at DESC
      LIMIT 500
    `;

    const params = options.programId
      ? [options.organizationId, options.programId]
      : [options.organizationId];

    const transactionData = await query(transactionQuery, params);

    // Use AI Database Service for anomaly detection
    return await aiDatabase.detectAnomalies({
      query: transactionQuery,
      checks: ['statistical', 'business_rule', 'security'],
    });
  }
}

// Export singleton instance
export const loyaltyAnalytics = new LoyaltyAnalyticsService();
