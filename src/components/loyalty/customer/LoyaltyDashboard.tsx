/**
 * LoyaltyDashboard - Main customer loyalty dashboard
 *
 * Features:
 * - Animated points balance display
 * - Current tier badge with benefits
 * - Recent activity feed
 * - Quick stats cards
 * - Progress to next tier
 * - Browse rewards CTA
 *
 * API: GET /api/v1/customers/[id]/loyalty/summary
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Award, Gift, TrendingUp, Users, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PointsDisplay } from './shared/PointsDisplay';
import { TierBadge } from './shared/TierBadge';
import { format } from 'date-fns';

interface LoyaltyDashboardProps {
  customerId: string;
  onBrowseRewards?: () => void;
  onViewTransactions?: () => void;
}

interface LoyaltySummary {
  customer_id: string;
  program: {
    id: string;
    name: string;
    description: string;
    is_active: boolean;
  };
  status: {
    current_tier: string;
    tier_qualified_date: string;
    member_since: string;
  };
  points: {
    balance: number;
    pending: number;
    total_earned: number;
    total_redeemed: number;
    expiring_soon: number;
    next_expiry_date: string;
  };
  tier_info: {
    current_tier: string;
    tier_benefits: {
      multiplier: number;
      discount: number;
      free_shipping: boolean;
    };
    next_tier: string;
    points_to_next_tier: number;
    progress_percentage: number;
  };
  value_metrics: {
    lifetime_value: number;
    avg_order_value: number;
    total_orders: number;
    total_spent: number;
  };
  engagement: {
    referral_count: number;
    successful_referrals: number;
    total_redemptions: number;
    last_transaction_date: string;
    last_redemption_date: string;
  };
  available_rewards: {
    count: number;
    featured_count: number;
    min_points: number;
    max_points: number;
  };
  recent_transactions: unknown[];
  recent_redemptions: unknown[];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function LoyaltyDashboard({
  customerId,
  onBrowseRewards,
  onViewTransactions,
}: LoyaltyDashboardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['loyalty-summary', customerId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/customers/${customerId}/loyalty/summary`);
      if (!response.ok) throw new Error('Failed to fetch loyalty summary');
      const json = await response.json();
      return json.data as LoyaltySummary;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="border-primary mx-auto h-12 w-12 animate-spin rounded-full border-b-2" />
          <p className="text-muted-foreground">Loading your rewards...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Failed to load loyalty dashboard</p>
        </CardContent>
      </Card>
    );
  }

  const { points, tier_info, value_metrics, engagement, available_rewards, status } = data;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Hero Section - Points Balance */}
      <motion.div variants={itemVariants}>
        <Card className="from-primary/5 via-primary/10 to-primary/5 border-primary/20 bg-gradient-to-br">
          <CardContent className="pt-8 pb-6">
            <div className="space-y-6 text-center">
              {/* Points Balance */}
              <div className="space-y-2">
                <h2 className="text-muted-foreground text-lg font-medium">Your Points Balance</h2>
                <PointsDisplay points={points.balance} animated className="justify-center" />
                {points.pending > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {points.pending.toLocaleString()} pending
                  </Badge>
                )}
              </div>

              {/* Tier Badge */}
              <div className="flex justify-center">
                <TierBadge tier={tier_info.current_tier as unknown} size="lg" />
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={onBrowseRewards} size="lg" className="gap-2">
                  <Gift className="h-4 w-4" />
                  Browse Rewards
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button onClick={onViewTransactions} variant="outline" size="lg">
                  View Activity
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Progress to Next Tier */}
      {tier_info.next_tier && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="text-primary h-5 w-5" />
                Next Tier: {tier_info.next_tier}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{tier_info.progress_percentage.toFixed(1)}%</span>
                </div>
                <div className="bg-muted relative h-3 overflow-hidden rounded-full">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${tier_info.progress_percentage}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="from-primary to-primary/80 absolute inset-y-0 left-0 rounded-full bg-gradient-to-r"
                  />
                </div>
                <p className="text-muted-foreground text-sm">
                  {tier_info.points_to_next_tier.toLocaleString()} points to {tier_info.next_tier}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div variants={itemVariants}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Total Earned</span>
                </div>
                <p className="text-2xl font-bold">{points.total_earned.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="text-muted-foreground flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  <span className="text-sm font-medium">Redemptions</span>
                </div>
                <p className="text-2xl font-bold">{engagement.total_redemptions}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">Referrals</span>
                </div>
                <p className="text-2xl font-bold">{engagement.successful_referrals}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="text-muted-foreground flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  <span className="text-sm font-medium">Rewards Available</span>
                </div>
                <p className="text-2xl font-bold">{available_rewards.count}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Tier Benefits */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Your {tier_info.current_tier} Benefits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Points Multiplier</p>
                <p className="text-primary text-2xl font-bold">
                  {tier_info.tier_benefits.multiplier}x
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Discount</p>
                <p className="text-primary text-2xl font-bold">
                  {tier_info.tier_benefits.discount}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-sm">Free Shipping</p>
                <p className="text-primary text-2xl font-bold">
                  {tier_info.tier_benefits.free_shipping ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Expiring Points Warning */}
      {points.expiring_soon > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-orange-600" />
                <div className="space-y-1">
                  <p className="font-medium text-orange-900">
                    {points.expiring_soon.toLocaleString()} points expiring soon
                  </p>
                  <p className="text-sm text-orange-700">
                    Expires on {format(new Date(points.next_expiry_date), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Member Since */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-center text-sm">
              Member since {format(new Date(status.member_since), 'MMMM yyyy')}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
