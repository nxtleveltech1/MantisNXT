/**
 * Customer Loyalty & Rewards System Types
 *
 * Complete TypeScript type definitions for the loyalty and rewards system
 *
 * Author: Backend System Architect
 * Date: 2025-11-02
 */

// ============================================================================
// ENUMS
// ============================================================================

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export type RewardType = 'points' | 'discount' | 'cashback' | 'free_shipping' | 'upgrade' | 'gift';

export type TransactionType = 'earn' | 'redeem' | 'expire' | 'adjust' | 'bonus';

export type RedemptionStatus = 'pending' | 'approved' | 'fulfilled' | 'cancelled' | 'expired';

export type RuleTriggerType =
  | 'order_placed'
  | 'referral'
  | 'review'
  | 'birthday'
  | 'anniversary'
  | 'signup'
  | 'social_share';

export type ReferenceType =
  | 'order'
  | 'referral'
  | 'review'
  | 'manual'
  | 'birthday'
  | 'anniversary'
  | 'bonus'
  | 'signup'
  | 'redemption'
  | 'expiry'
  | 'tier_change';

// ============================================================================
// TIER CONFIGURATION TYPES
// ============================================================================

export interface TierThresholds {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
  diamond: number;
}

export interface TierBenefit {
  multiplier: number;
  discount?: number;
  free_shipping?: boolean;
  priority_support?: boolean;
  dedicated_rep?: boolean;
  [key: string]: unknown;
}

export interface TierBenefits {
  bronze: TierBenefit;
  silver: TierBenefit;
  gold: TierBenefit;
  platinum: TierBenefit;
  diamond: TierBenefit;
}

// ============================================================================
// LOYALTY PROGRAM
// ============================================================================

export interface LoyaltyProgram {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  earn_rate: number;
  tier_thresholds: TierThresholds;
  tier_benefits: TierBenefits;
  points_expiry_days?: number;
  created_at: Date;
  updated_at: Date;
}

export interface LoyaltyProgramInsert {
  org_id?: string;
  name: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
  earn_rate: number;
  tier_thresholds?: TierThresholds;
  tier_benefits?: TierBenefits;
  points_expiry_days?: number;
}

export interface LoyaltyProgramUpdate {
  name?: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
  earn_rate?: number;
  tier_thresholds?: TierThresholds;
  tier_benefits?: TierBenefits;
  points_expiry_days?: number;
}

// ============================================================================
// CUSTOMER LOYALTY
// ============================================================================

export interface CustomerLoyalty {
  id: string;
  org_id: string;
  customer_id: string;
  program_id: string;
  current_tier: LoyaltyTier;
  tier_qualified_date: Date;
  total_points_earned: number;
  total_points_redeemed: number;
  points_balance: number;
  points_pending: number;
  lifetime_value: number;
  referral_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerLoyaltyInsert {
  org_id?: string;
  customer_id: string;
  program_id: string;
  current_tier?: LoyaltyTier;
  tier_qualified_date?: Date;
  total_points_earned?: number;
  total_points_redeemed?: number;
  points_balance?: number;
  points_pending?: number;
  lifetime_value?: number;
  referral_count?: number;
}

export interface CustomerLoyaltyUpdate {
  program_id?: string;
  current_tier?: LoyaltyTier;
  tier_qualified_date?: Date;
  total_points_earned?: number;
  total_points_redeemed?: number;
  points_balance?: number;
  points_pending?: number;
  lifetime_value?: number;
  referral_count?: number;
}

// ============================================================================
// LOYALTY TRANSACTION
// ============================================================================

export interface LoyaltyTransaction {
  id: string;
  org_id: string;
  customer_id: string;
  program_id: string;
  transaction_type: TransactionType;
  points_amount: number;
  reference_type?: ReferenceType;
  reference_id?: string;
  description: string;
  metadata?: Record<string, unknown>;
  expires_at?: Date;
  created_by?: string;
  created_at: Date;
}

export interface LoyaltyTransactionInsert {
  org_id?: string;
  customer_id: string;
  program_id: string;
  transaction_type: TransactionType;
  points_amount: number;
  reference_type?: ReferenceType;
  reference_id?: string;
  description: string;
  metadata?: Record<string, unknown>;
  expires_at?: Date;
  created_by?: string;
}

// ============================================================================
// REWARD CATALOG
// ============================================================================

export interface RewardCatalog {
  id: string;
  org_id: string;
  program_id?: string;
  name: string;
  description?: string;
  reward_type: RewardType;
  points_required: number;
  monetary_value?: number;
  max_redemptions_per_customer?: number;
  stock_quantity?: number;
  redemption_count: number;
  is_active: boolean;
  is_featured: boolean;
  valid_from: Date;
  valid_until?: Date;
  terms_conditions?: Record<string, unknown>;
  image_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface RewardCatalogInsert {
  org_id?: string;
  program_id?: string;
  name: string;
  description?: string;
  reward_type: RewardType;
  points_required: number;
  monetary_value?: number;
  max_redemptions_per_customer?: number;
  stock_quantity?: number;
  is_active?: boolean;
  is_featured?: boolean;
  valid_from?: Date;
  valid_until?: Date;
  terms_conditions?: Record<string, unknown>;
  image_url?: string;
}

export interface RewardCatalogUpdate {
  program_id?: string;
  name?: string;
  description?: string;
  reward_type?: RewardType;
  points_required?: number;
  monetary_value?: number;
  max_redemptions_per_customer?: number;
  stock_quantity?: number;
  is_active?: boolean;
  is_featured?: boolean;
  valid_from?: Date;
  valid_until?: Date;
  terms_conditions?: Record<string, unknown>;
  image_url?: string;
}

// ============================================================================
// REWARD REDEMPTION
// ============================================================================

export interface RewardRedemption {
  id: string;
  org_id: string;
  customer_id: string;
  reward_id: string;
  points_spent: number;
  monetary_value_used?: number;
  status: RedemptionStatus;
  redemption_code: string;
  redeemed_at: Date;
  expires_at?: Date;
  fulfilled_at?: Date;
  fulfilled_by?: string;
  fulfillment_notes?: string;
  created_at: Date;
}

export interface RewardRedemptionInsert {
  org_id?: string;
  customer_id: string;
  reward_id: string;
  points_spent: number;
  monetary_value_used?: number;
  status?: RedemptionStatus;
  redemption_code?: string;
  redeemed_at?: Date;
  expires_at?: Date;
}

export interface RewardRedemptionUpdate {
  status?: RedemptionStatus;
  fulfilled_at?: Date;
  fulfilled_by?: string;
  fulfillment_notes?: string;
}

// ============================================================================
// LOYALTY RULE
// ============================================================================

export interface LoyaltyRuleConditions {
  min_order_amount?: number;
  max_order_amount?: number;
  product_categories?: string[];
  product_ids?: string[];
  customer_tier?: LoyaltyTier[];
  customer_segment?: string[];
  order_count_min?: number;
  order_count_max?: number;
  [key: string]: unknown;
}

export interface LoyaltyRule {
  id: string;
  org_id: string;
  program_id: string;
  name: string;
  description?: string;
  trigger_type: RuleTriggerType;
  conditions: LoyaltyRuleConditions;
  points_multiplier: number;
  bonus_points: number;
  is_active: boolean;
  priority: number;
  valid_from: Date;
  valid_until?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface LoyaltyRuleInsert {
  org_id?: string;
  program_id: string;
  name: string;
  description?: string;
  trigger_type: RuleTriggerType;
  conditions?: LoyaltyRuleConditions;
  points_multiplier?: number;
  bonus_points?: number;
  is_active?: boolean;
  priority?: number;
  valid_from?: Date;
  valid_until?: Date;
}

export interface LoyaltyRuleUpdate {
  name?: string;
  description?: string;
  trigger_type?: RuleTriggerType;
  conditions?: LoyaltyRuleConditions;
  points_multiplier?: number;
  bonus_points?: number;
  is_active?: boolean;
  priority?: number;
  valid_from?: Date;
  valid_until?: Date;
}

// ============================================================================
// ANALYTICS AND LEADERBOARD TYPES
// ============================================================================

export interface LoyaltyLeaderboardEntry {
  org_id: string;
  customer_id: string;
  customer_name: string;
  company?: string;
  current_tier: LoyaltyTier;
  total_points_earned: number;
  points_balance: number;
  lifetime_value: number;
  referral_count: number;
  tier_qualified_date: Date;
  tier_rank: number;
  overall_rank: number;
  points_this_month: number;
  points_this_quarter: number;
}

export interface RewardAnalytics {
  org_id: string;
  reward_id: string;
  reward_name: string;
  reward_type: RewardType;
  points_required: number;
  monetary_value?: number;
  is_active: boolean;
  is_featured: boolean;
  stock_quantity?: number;
  redemption_count: number;
  total_redemptions: number;
  unique_customers: number;
  fulfilled_redemptions: number;
  pending_redemptions: number;
  cancelled_redemptions: number;
  total_points_spent: number;
  total_monetary_value?: number;
  redemptions_last_30_days: number;
  redemptions_last_90_days: number;
  avg_fulfillment_hours?: number;
  daily_redemption_rate: number;
}

// ============================================================================
// FUNCTION RETURN TYPES
// ============================================================================

export interface CalculatePointsResult {
  points_awarded: number;
  base_points: number;
  tier_bonus: number;
  rule_bonus: number;
  total_multiplier: number;
}

export interface RedeemRewardResult {
  success: boolean;
  redemption_id?: string;
  redemption_code?: string;
  error_message?: string;
}

export interface UpdateTierResult {
  old_tier: LoyaltyTier;
  new_tier: LoyaltyTier;
  tier_changed: boolean;
}

export interface ExpirePointsResult {
  expired_count: number;
  total_points_expired: number;
}

export interface CustomerRewardsSummary {
  customer_id: string;
  current_tier: LoyaltyTier;
  points_balance: number;
  points_pending: number;
  lifetime_value: number;
  tier_benefits: TierBenefit;
  next_tier?: LoyaltyTier;
  points_to_next_tier: number;
  available_rewards_count: number;
  recent_transactions: RecentTransaction[];
  recent_redemptions: RecentRedemption[];
}

export interface RecentTransaction {
  id: string;
  type: TransactionType;
  points: number;
  description: string;
  created_at: Date;
}

export interface RecentRedemption {
  id: string;
  reward_name: string;
  points_spent: number;
  status: RedemptionStatus;
  redemption_code: string;
  redeemed_at: Date;
  expires_at?: Date;
}

// ============================================================================
// REQUEST/RESPONSE TYPES FOR API
// ============================================================================

export interface AwardPointsRequest {
  customer_id: string;
  order_amount: number;
  order_id: string;
  order_metadata?: Record<string, unknown>;
}

export interface RedeemRewardRequest {
  customer_id: string;
  reward_id: string;
  redemption_expiry_days?: number;
}

export interface FulfillRedemptionRequest {
  redemption_id: string;
  fulfillment_notes?: string;
  fulfilled_by?: string;
}

export interface CreateLoyaltyRuleRequest {
  program_id: string;
  name: string;
  description?: string;
  trigger_type: RuleTriggerType;
  conditions?: LoyaltyRuleConditions;
  points_multiplier?: number;
  bonus_points?: number;
  is_active?: boolean;
  priority?: number;
  valid_from?: Date;
  valid_until?: Date;
}

export interface CreateRewardRequest {
  program_id?: string;
  name: string;
  description?: string;
  reward_type: RewardType;
  points_required: number;
  monetary_value?: number;
  max_redemptions_per_customer?: number;
  stock_quantity?: number;
  is_active?: boolean;
  is_featured?: boolean;
  valid_from?: Date;
  valid_until?: Date;
  terms_conditions?: Record<string, unknown>;
  image_url?: string;
}

export interface UpdateStockRequest {
  reward_id: string;
  stock_quantity: number;
  operation: 'set' | 'add' | 'subtract';
}

export interface LeaderboardFilters {
  tier?: LoyaltyTier;
  limit?: number;
  offset?: number;
  period?: 'month' | 'quarter' | 'year' | 'all';
}

export interface LoyaltyProgramMetrics {
  program_id: string;
  program_name: string;
  total_members: number;
  active_members: number;
  tier_distribution: Record<LoyaltyTier, number>;
  total_points_issued: number;
  total_points_redeemed: number;
  total_points_outstanding: number;
  total_points_expired: number;
  redemption_rate: number;
  avg_points_per_customer: number;
  avg_lifetime_value: number;
  top_rewards: Array<{
    reward_id: string;
    reward_name: string;
    redemption_count: number;
  }>;
  recent_activity: {
    transactions_today: number;
    transactions_this_week: number;
    transactions_this_month: number;
    redemptions_today: number;
    redemptions_this_week: number;
    redemptions_this_month: number;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class LoyaltyError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LoyaltyError';
  }
}

export class InsufficientPointsError extends LoyaltyError {
  constructor(required: number, available: number) {
    super(
      `Insufficient points. Required: ${required}, Available: ${available}`,
      'INSUFFICIENT_POINTS',
      400,
      { required, available }
    );
    this.name = 'InsufficientPointsError';
  }
}

export class RewardNotAvailableError extends LoyaltyError {
  constructor(reason: string) {
    super(`Reward not available: ${reason}`, 'REWARD_NOT_AVAILABLE', 400, { reason });
    this.name = 'RewardNotAvailableError';
  }
}

export class RedemptionLimitReachedError extends LoyaltyError {
  constructor(limit: number) {
    super(`Maximum redemption limit reached (${limit})`, 'REDEMPTION_LIMIT_REACHED', 400, {
      limit,
    });
    this.name = 'RedemptionLimitReachedError';
  }
}
