/**
 * Loyalty Analytics Service
 *
 * Provides comprehensive analytics, leaderboards, reports, and metrics for
 * the loyalty and rewards system. Uses database views and functions for
 * optimized performance.
 *
 * Author: Backend System Architect
 * Date: 2025-11-02
 */

import { query } from '@/lib/database';
import {
  LoyaltyLeaderboardEntry,
  RewardAnalytics,
  LoyaltyTier,
  LoyaltyError,
  CustomerRewardsSummary,
} from '@/types/loyalty';

// ============================================================================
// TYPES FOR SERVICE METHODS
// ============================================================================

export interface LeaderboardOptions {
  tier?: LoyaltyTier;
  limit?: number;
  offset?: number;
  period?: 'month' | 'quarter' | 'year' | 'all';
}

export interface RankInfo {
  customerId: string;
  customerName: string;
  currentTier: LoyaltyTier;
  totalPointsEarned: number;
  pointsBalance: number;
  tierRank: number;
  overallRank: number;
  percentile: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ProgramMetrics {
  programId: string;
  programName: string;
  totalMembers: number;
  activeMembers: number;
  tierDistribution: Record<LoyaltyTier, number>;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  totalPointsOutstanding: number;
  totalPointsExpired: number;
  redemptionRate: number;
  avgPointsPerCustomer: number;
  avgLifetimeValue: number;
  topRewards: Array<{
    rewardId: string;
    rewardName: string;
    redemptionCount: number;
  }>;
  recentActivity: {
    transactionsToday: number;
    transactionsThisWeek: number;
    transactionsThisMonth: number;
    redemptionsToday: number;
    redemptionsThisWeek: number;
    redemptionsThisMonth: number;
  };
}

export interface PointsFlowData {
  date: string;
  earned: number;
  redeemed: number;
  expired: number;
  netChange: number;
}

export interface RewardPerformanceData {
  rewardId: string;
  rewardName: string;
  rewardType: string;
  totalRedemptions: number;
  uniqueCustomers: number;
  totalPointsSpent: number;
  conversionRate: number;
  avgFulfillmentHours?: number;
}

export interface TrendData {
  period: string;
  value: number;
  change?: number;
  changePercent?: number;
}

export type TimePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface TierDistribution {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
  diamond: number;
  total: number;
}

export interface EngagementMetrics {
  activeCustomers: number;
  totalCustomers: number;
  engagementRate: number;
  avgTransactionsPerCustomer: number;
  avgPointsPerTransaction: number;
  customersWithRedemptions: number;
  redemptionParticipationRate: number;
}

export type ReportType =
  | 'program_overview'
  | 'customer_engagement'
  | 'reward_performance'
  | 'tier_progression'
  | 'points_expiry';

export interface LoyaltyReport {
  reportType: ReportType;
  generatedAt: Date;
  orgId: string;
  data: Record<string, any>;
}

export interface ExpiryReport {
  programId: string;
  upcomingExpiries: Array<{
    customerId: string;
    customerName: string;
    pointsExpiring: number;
    expiryDate: Date;
  }>;
  totalPointsExpiring: number;
  affectedCustomers: number;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class LoyaltyAnalyticsService {
  /**
   * Get leaderboard using the database view
   */
  static async getLeaderboard(
    orgId: string,
    options: LeaderboardOptions = {}
  ): Promise<LoyaltyLeaderboardEntry[]> {
    try {
      const { tier, limit = 100, offset = 0, period = 'all' } = options;

      const conditions: string[] = ['org_id = $1'];
      const params: any[] = [orgId];
      let paramIndex = 2;

      if (tier) {
        conditions.push(`current_tier = $${paramIndex}`);
        params.push(tier);
        paramIndex++;
      }

      // Add ordering based on period
      let orderByClause = 'total_points_earned DESC';
      if (period === 'month') {
        orderByClause = 'points_this_month DESC';
      } else if (period === 'quarter') {
        orderByClause = 'points_this_quarter DESC';
      }

      params.push(limit, offset);

      const sql = `
        SELECT
          org_id,
          customer_id,
          customer_name,
          company,
          current_tier::text as current_tier,
          total_points_earned,
          points_balance,
          lifetime_value,
          referral_count,
          tier_qualified_date,
          tier_rank,
          overall_rank,
          points_this_month,
          points_this_quarter
        FROM loyalty_leaderboard
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${orderByClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const result = await query<LoyaltyLeaderboardEntry>(sql, params);
      return result.rows;
    } catch (error) {
      console.error('[LoyaltyAnalyticsService] Error fetching leaderboard:', error);
      throw new LoyaltyError(
        'Failed to fetch leaderboard',
        'FETCH_LEADERBOARD_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get customer rank information
   */
  static async getCustomerRank(
    customerId: string,
    orgId: string
  ): Promise<RankInfo> {
    try {
      const sql = `
        SELECT
          customer_id,
          customer_name,
          current_tier::text as current_tier,
          total_points_earned,
          points_balance,
          tier_rank,
          overall_rank
        FROM loyalty_leaderboard
        WHERE customer_id = $1 AND org_id = $2
      `;

      const result = await query<any>(sql, [customerId, orgId]);

      if (result.rows.length === 0) {
        throw new LoyaltyError(
          'Customer not found in leaderboard',
          'CUSTOMER_NOT_FOUND',
          404
        );
      }

      const customer = result.rows[0];

      // Calculate percentile
      const totalCountResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM loyalty_leaderboard WHERE org_id = $1`,
        [orgId]
      );
      const totalCount = parseInt(totalCountResult.rows[0]?.count || '0', 10);
      const percentile =
        totalCount > 0
          ? ((totalCount - customer.overall_rank + 1) / totalCount) * 100
          : 0;

      return {
        customerId: customer.customer_id,
        customerName: customer.customer_name,
        currentTier: customer.current_tier,
        totalPointsEarned: Number(customer.total_points_earned),
        pointsBalance: Number(customer.points_balance),
        tierRank: Number(customer.tier_rank),
        overallRank: Number(customer.overall_rank),
        percentile: Math.round(percentile * 100) / 100,
      };
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error('[LoyaltyAnalyticsService] Error fetching customer rank:', error);
      throw new LoyaltyError(
        'Failed to fetch customer rank',
        'FETCH_RANK_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get comprehensive program metrics
   */
  static async getProgramMetrics(
    programId: string,
    orgId: string,
    dateRange?: DateRange
  ): Promise<ProgramMetrics> {
    try {
      // Get program name
      const programResult = await query<{ name: string }>(
        `SELECT name FROM loyalty_program WHERE id = $1 AND org_id = $2`,
        [programId, orgId]
      );

      if (programResult.rows.length === 0) {
        throw new LoyaltyError('Program not found', 'PROGRAM_NOT_FOUND', 404);
      }

      const programName = programResult.rows[0].name;

      // Get member counts
      const memberStats = await query<any>(
        `SELECT
          COUNT(*) as total_members,
          COUNT(*) FILTER (WHERE points_balance > 0) as active_members,
          SUM(total_points_earned) as total_points_issued,
          SUM(total_points_redeemed) as total_points_redeemed,
          SUM(points_balance) as total_points_outstanding,
          AVG(points_balance) as avg_points_per_customer,
          AVG(lifetime_value) as avg_lifetime_value
         FROM customer_loyalty
         WHERE program_id = $1 AND org_id = $2`,
        [programId, orgId]
      );

      const stats = memberStats.rows[0];

      // Get tier distribution
      const tierDist = await this.getTierDistribution(orgId, programId);

      // Get points expired
      const expiredResult = await query<{ total: string }>(
        `SELECT SUM(ABS(points_amount)) as total
         FROM loyalty_transaction
         WHERE program_id = $1 AND transaction_type = 'expire'`,
        [programId]
      );

      const totalPointsExpired = Number(expiredResult.rows[0]?.total || 0);

      // Calculate redemption rate
      const totalIssued = Number(stats.total_points_issued || 0);
      const totalRedeemed = Number(stats.total_points_redeemed || 0);
      const redemptionRate =
        totalIssued > 0 ? (totalRedeemed / totalIssued) * 100 : 0;

      // Get top rewards
      const topRewardsResult = await query<any>(
        `SELECT rc.id as reward_id, rc.name as reward_name, COUNT(rr.id) as redemption_count
         FROM reward_catalog rc
         LEFT JOIN reward_redemption rr ON rc.id = rr.reward_id
         WHERE rc.program_id = $1 OR rc.program_id IS NULL
         GROUP BY rc.id, rc.name
         ORDER BY redemption_count DESC
         LIMIT 5`,
        [programId]
      );

      const topRewards = topRewardsResult.rows.map((r) => ({
        rewardId: r.reward_id,
        rewardName: r.reward_name,
        redemptionCount: Number(r.redemption_count || 0),
      }));

      // Get recent activity
      const activityResult = await query<any>(
        `SELECT
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as transactions_today,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as transactions_this_week,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as transactions_this_month
         FROM loyalty_transaction
         WHERE program_id = $1`,
        [programId]
      );

      const redemptionActivityResult = await query<any>(
        `SELECT
          COUNT(*) FILTER (WHERE redeemed_at >= CURRENT_DATE) as redemptions_today,
          COUNT(*) FILTER (WHERE redeemed_at >= CURRENT_DATE - INTERVAL '7 days') as redemptions_this_week,
          COUNT(*) FILTER (WHERE redeemed_at >= date_trunc('month', CURRENT_DATE)) as redemptions_this_month
         FROM reward_redemption rr
         JOIN customer_loyalty cl ON rr.customer_id = cl.customer_id
         WHERE cl.program_id = $1`,
        [programId]
      );

      const activity = activityResult.rows[0];
      const redemptionActivity = redemptionActivityResult.rows[0];

      return {
        programId,
        programName,
        totalMembers: parseInt(stats.total_members || '0', 10),
        activeMembers: parseInt(stats.active_members || '0', 10),
        tierDistribution: tierDist,
        totalPointsIssued: Number(stats.total_points_issued || 0),
        totalPointsRedeemed: Number(stats.total_points_redeemed || 0),
        totalPointsOutstanding: Number(stats.total_points_outstanding || 0),
        totalPointsExpired,
        redemptionRate: Math.round(redemptionRate * 100) / 100,
        avgPointsPerCustomer: Math.round(Number(stats.avg_points_per_customer || 0)),
        avgLifetimeValue: Math.round(Number(stats.avg_lifetime_value || 0) * 100) / 100,
        topRewards,
        recentActivity: {
          transactionsToday: parseInt(activity.transactions_today || '0', 10),
          transactionsThisWeek: parseInt(activity.transactions_this_week || '0', 10),
          transactionsThisMonth: parseInt(activity.transactions_this_month || '0', 10),
          redemptionsToday: parseInt(redemptionActivity.redemptions_today || '0', 10),
          redemptionsThisWeek: parseInt(redemptionActivity.redemptions_this_week || '0', 10),
          redemptionsThisMonth: parseInt(redemptionActivity.redemptions_this_month || '0', 10),
        },
      };
    } catch (error) {
      if (error instanceof LoyaltyError) throw error;
      console.error('[LoyaltyAnalyticsService] Error fetching program metrics:', error);
      throw new LoyaltyError(
        'Failed to fetch program metrics',
        'FETCH_METRICS_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get points flow over time
   */
  static async getPointsFlow(
    programId: string,
    orgId: string,
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<PointsFlowData[]> {
    try {
      let truncFunction = 'day';
      let intervalDays = 30;

      if (period === 'week') {
        truncFunction = 'week';
        intervalDays = 90;
      } else if (period === 'month') {
        truncFunction = 'month';
        intervalDays = 365;
      }

      const sql = `
        SELECT
          date_trunc($3, created_at)::date as date,
          SUM(CASE WHEN transaction_type IN ('earn', 'bonus') THEN points_amount ELSE 0 END) as earned,
          SUM(CASE WHEN transaction_type = 'redeem' THEN ABS(points_amount) ELSE 0 END) as redeemed,
          SUM(CASE WHEN transaction_type = 'expire' THEN ABS(points_amount) ELSE 0 END) as expired,
          SUM(points_amount) as net_change
        FROM loyalty_transaction
        WHERE program_id = $1
          AND org_id = $2
          AND created_at >= CURRENT_DATE - INTERVAL '${intervalDays} days'
        GROUP BY date_trunc($3, created_at)
        ORDER BY date
      `;

      const result = await query<any>(sql, [programId, orgId, truncFunction]);

      return result.rows.map((row) => ({
        date: row.date,
        earned: Number(row.earned || 0),
        redeemed: Number(row.redeemed || 0),
        expired: Number(row.expired || 0),
        netChange: Number(row.net_change || 0),
      }));
    } catch (error) {
      console.error('[LoyaltyAnalyticsService] Error fetching points flow:', error);
      throw new LoyaltyError(
        'Failed to fetch points flow',
        'FETCH_POINTS_FLOW_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get reward performance data using the analytics view
   */
  static async getRewardPerformance(
    orgId: string
  ): Promise<RewardPerformanceData[]> {
    try {
      const sql = `
        SELECT
          reward_id,
          reward_name,
          reward_type::text as reward_type,
          total_redemptions,
          unique_customers,
          total_points_spent,
          avg_fulfillment_hours,
          CASE
            WHEN unique_customers > 0
            THEN (fulfilled_redemptions::numeric / total_redemptions * 100)
            ELSE 0
          END as conversion_rate
        FROM reward_analytics
        WHERE org_id = $1
        ORDER BY total_redemptions DESC
      `;

      const result = await query<any>(sql, [orgId]);

      return result.rows.map((row) => ({
        rewardId: row.reward_id,
        rewardName: row.reward_name,
        rewardType: row.reward_type,
        totalRedemptions: Number(row.total_redemptions || 0),
        uniqueCustomers: Number(row.unique_customers || 0),
        totalPointsSpent: Number(row.total_points_spent || 0),
        conversionRate: Math.round(Number(row.conversion_rate || 0) * 100) / 100,
        avgFulfillmentHours: row.avg_fulfillment_hours
          ? Math.round(Number(row.avg_fulfillment_hours) * 100) / 100
          : undefined,
      }));
    } catch (error) {
      console.error('[LoyaltyAnalyticsService] Error fetching reward performance:', error);
      throw new LoyaltyError(
        'Failed to fetch reward performance',
        'FETCH_PERFORMANCE_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get redemption trends over time
   */
  static async getRedemptionTrends(
    orgId: string,
    period: TimePeriod = 'month'
  ): Promise<TrendData[]> {
    try {
      const intervalMap = {
        day: 30,
        week: 90,
        month: 365,
        quarter: 730,
        year: 1825,
      };

      const intervalDays = intervalMap[period];

      const sql = `
        SELECT
          date_trunc($2, redeemed_at)::date as period,
          COUNT(*) as value
        FROM reward_redemption
        WHERE org_id = $1
          AND redeemed_at >= CURRENT_DATE - INTERVAL '${intervalDays} days'
        GROUP BY date_trunc($2, redeemed_at)
        ORDER BY period
      `;

      const result = await query<any>(sql, [orgId, period]);

      return result.rows.map((row, index, arr) => {
        const value = Number(row.value || 0);
        const change = index > 0 ? value - Number(arr[index - 1].value || 0) : undefined;
        const changePercent =
          index > 0 && arr[index - 1].value > 0
            ? ((value - Number(arr[index - 1].value)) / Number(arr[index - 1].value)) * 100
            : undefined;

        return {
          period: row.period,
          value,
          change,
          changePercent: changePercent ? Math.round(changePercent * 100) / 100 : undefined,
        };
      });
    } catch (error) {
      console.error('[LoyaltyAnalyticsService] Error fetching redemption trends:', error);
      throw new LoyaltyError(
        'Failed to fetch redemption trends',
        'FETCH_TRENDS_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get tier distribution
   */
  static async getTierDistribution(
    orgId: string,
    programId?: string
  ): Promise<TierDistribution> {
    try {
      const conditions = ['org_id = $1'];
      const params: any[] = [orgId];

      if (programId) {
        conditions.push('program_id = $2');
        params.push(programId);
      }

      const sql = `
        SELECT
          current_tier::text as tier,
          COUNT(*) as count
        FROM customer_loyalty
        WHERE ${conditions.join(' AND ')}
        GROUP BY current_tier
      `;

      const result = await query<{ tier: string; count: string }>(sql, params);

      const distribution: TierDistribution = {
        bronze: 0,
        silver: 0,
        gold: 0,
        platinum: 0,
        diamond: 0,
        total: 0,
      };

      result.rows.forEach((row) => {
        const tier = row.tier as LoyaltyTier;
        const count = parseInt(row.count, 10);
        distribution[tier] = count;
        distribution.total += count;
      });

      return distribution;
    } catch (error) {
      console.error('[LoyaltyAnalyticsService] Error fetching tier distribution:', error);
      throw new LoyaltyError(
        'Failed to fetch tier distribution',
        'FETCH_TIER_DIST_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Get engagement metrics
   */
  static async getEngagementMetrics(orgId: string): Promise<EngagementMetrics> {
    try {
      const sql = `
        SELECT
          COUNT(*) as total_customers,
          COUNT(*) FILTER (WHERE points_balance > 0) as active_customers,
          COUNT(DISTINCT lt.customer_id) as customers_with_transactions,
          COUNT(DISTINCT rr.customer_id) as customers_with_redemptions,
          AVG(txn_count.count) as avg_transactions_per_customer,
          AVG(txn_points.avg_points) as avg_points_per_transaction
        FROM customer_loyalty cl
        LEFT JOIN loyalty_transaction lt ON cl.customer_id = lt.customer_id
        LEFT JOIN reward_redemption rr ON cl.customer_id = rr.customer_id
        LEFT JOIN LATERAL (
          SELECT COUNT(*) as count
          FROM loyalty_transaction
          WHERE customer_id = cl.customer_id
        ) txn_count ON true
        LEFT JOIN LATERAL (
          SELECT AVG(ABS(points_amount)) as avg_points
          FROM loyalty_transaction
          WHERE customer_id = cl.customer_id
        ) txn_points ON true
        WHERE cl.org_id = $1
      `;

      const result = await query<any>(sql, [orgId]);
      const metrics = result.rows[0];

      const totalCustomers = parseInt(metrics.total_customers || '0', 10);
      const activeCustomers = parseInt(metrics.active_customers || '0', 10);
      const customersWithRedemptions = parseInt(metrics.customers_with_redemptions || '0', 10);

      return {
        activeCustomers,
        totalCustomers,
        engagementRate:
          totalCustomers > 0
            ? Math.round((activeCustomers / totalCustomers) * 100 * 100) / 100
            : 0,
        avgTransactionsPerCustomer: Math.round(Number(metrics.avg_transactions_per_customer || 0)),
        avgPointsPerTransaction: Math.round(Number(metrics.avg_points_per_transaction || 0)),
        customersWithRedemptions,
        redemptionParticipationRate:
          totalCustomers > 0
            ? Math.round((customersWithRedemptions / totalCustomers) * 100 * 100) / 100
            : 0,
      };
    } catch (error) {
      console.error('[LoyaltyAnalyticsService] Error fetching engagement metrics:', error);
      throw new LoyaltyError(
        'Failed to fetch engagement metrics',
        'FETCH_ENGAGEMENT_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Generate comprehensive loyalty report
   */
  static async generateLoyaltyReport(
    orgId: string,
    reportType: ReportType
  ): Promise<LoyaltyReport> {
    try {
      const data: Record<string, any> = {};

      switch (reportType) {
        case 'program_overview':
          // Get all programs and their metrics
          const programs = await query<{ id: string }>(
            `SELECT id FROM loyalty_program WHERE org_id = $1`,
            [orgId]
          );
          data.programs = await Promise.all(
            programs.rows.map((p) => this.getProgramMetrics(p.id, orgId))
          );
          break;

        case 'customer_engagement':
          data.engagement = await this.getEngagementMetrics(orgId);
          data.tierDistribution = await this.getTierDistribution(orgId);
          break;

        case 'reward_performance':
          data.performance = await this.getRewardPerformance(orgId);
          break;

        case 'tier_progression':
          data.tierDistribution = await this.getTierDistribution(orgId);
          data.leaderboard = await this.getLeaderboard(orgId, { limit: 50 });
          break;

        case 'points_expiry':
          // Get upcoming expiries
          const expiryResult = await query<any>(
            `SELECT
              lt.customer_id,
              c.name as customer_name,
              SUM(lt.points_amount) as points_expiring,
              lt.expires_at as expiry_date
             FROM loyalty_transaction lt
             JOIN customer c ON lt.customer_id = c.id
             WHERE lt.org_id = $1
               AND lt.transaction_type = 'earn'
               AND lt.expires_at IS NOT NULL
               AND lt.expires_at > NOW()
               AND lt.expires_at <= NOW() + INTERVAL '30 days'
             GROUP BY lt.customer_id, c.name, lt.expires_at
             ORDER BY lt.expires_at`,
            [orgId]
          );
          data.upcomingExpiries = expiryResult.rows;
          break;
      }

      return {
        reportType,
        generatedAt: new Date(),
        orgId,
        data,
      };
    } catch (error) {
      console.error('[LoyaltyAnalyticsService] Error generating report:', error);
      throw new LoyaltyError(
        'Failed to generate loyalty report',
        'GENERATE_REPORT_ERROR',
        500,
        { error }
      );
    }
  }

  /**
   * Schedule expiry report for upcoming point expirations
   */
  static async scheduleExpiryReport(
    programId: string,
    orgId: string
  ): Promise<ExpiryReport> {
    try {
      const sql = `
        SELECT
          lt.customer_id,
          c.name as customer_name,
          SUM(lt.points_amount) as points_expiring,
          MIN(lt.expires_at) as expiry_date
        FROM loyalty_transaction lt
        JOIN customer c ON lt.customer_id = c.id
        JOIN customer_loyalty cl ON lt.customer_id = cl.customer_id
        WHERE cl.program_id = $1
          AND cl.org_id = $2
          AND lt.transaction_type = 'earn'
          AND lt.expires_at IS NOT NULL
          AND lt.expires_at > NOW()
          AND lt.expires_at <= NOW() + INTERVAL '30 days'
          AND NOT EXISTS (
            SELECT 1 FROM loyalty_transaction lt2
            WHERE lt2.reference_type = 'expiry'
              AND lt2.reference_id = lt.id
          )
        GROUP BY lt.customer_id, c.name
        ORDER BY expiry_date
      `;

      const result = await query<any>(sql, [programId, orgId]);

      const upcomingExpiries = result.rows.map((row) => ({
        customerId: row.customer_id,
        customerName: row.customer_name,
        pointsExpiring: Number(row.points_expiring || 0),
        expiryDate: row.expiry_date,
      }));

      const totalPointsExpiring = upcomingExpiries.reduce(
        (sum, item) => sum + item.pointsExpiring,
        0
      );

      return {
        programId,
        upcomingExpiries,
        totalPointsExpiring,
        affectedCustomers: upcomingExpiries.length,
      };
    } catch (error) {
      console.error('[LoyaltyAnalyticsService] Error scheduling expiry report:', error);
      throw new LoyaltyError(
        'Failed to schedule expiry report',
        'SCHEDULE_EXPIRY_REPORT_ERROR',
        500,
        { error }
      );
    }
  }
}
