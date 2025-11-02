/**
 * TierProgressTracker - Visual tier progression
 *
 * Features:
 * - Large animated progress bar
 * - Current and next tier badges
 * - Points needed display
 * - Benefits comparison
 * - Milestone markers
 * - Motivational messaging
 *
 * API: GET /api/v1/customers/[id]/loyalty/summary
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Check, Lock, Sparkles, Trophy, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TierBadge } from './shared/TierBadge';
import { cn } from '@/lib/utils';

interface TierProgressTrackerProps {
  customerId: string;
}

interface TierData {
  current_tier: string;
  tier_benefits: {
    multiplier: number;
    discount: number;
    free_shipping: boolean;
  };
  next_tier: string;
  points_to_next_tier: number;
  progress_percentage: number;
}

const TIER_PROGRESSION = [
  { name: 'bronze', threshold: 0 },
  { name: 'silver', threshold: 1000 },
  { name: 'gold', threshold: 5000 },
  { name: 'platinum', threshold: 15000 },
  { name: 'diamond', threshold: 50000 },
];

const TIER_BENEFITS_CONFIG: Record<
  string,
  {
    multiplier: number;
    discount: number;
    free_shipping: boolean;
    perks: string[];
  }
> = {
  bronze: {
    multiplier: 1,
    discount: 0,
    free_shipping: false,
    perks: ['Earn points on purchases', 'Birthday bonus'],
  },
  silver: {
    multiplier: 1.25,
    discount: 5,
    free_shipping: false,
    perks: [
      'Earn points on purchases',
      'Birthday bonus',
      '1.25x points multiplier',
      '5% discount',
    ],
  },
  gold: {
    multiplier: 1.5,
    discount: 10,
    free_shipping: true,
    perks: [
      'Earn points on purchases',
      'Birthday bonus',
      '1.5x points multiplier',
      '10% discount',
      'Free shipping',
    ],
  },
  platinum: {
    multiplier: 2,
    discount: 15,
    free_shipping: true,
    perks: [
      'Earn points on purchases',
      'Birthday bonus',
      '2x points multiplier',
      '15% discount',
      'Free shipping',
      'Priority support',
    ],
  },
  diamond: {
    multiplier: 2.5,
    discount: 20,
    free_shipping: true,
    perks: [
      'Earn points on purchases',
      'Birthday bonus',
      '2.5x points multiplier',
      '20% discount',
      'Free shipping',
      'Priority support',
      'Exclusive events',
      'Dedicated account manager',
    ],
  },
};

export function TierProgressTracker({ customerId }: TierProgressTrackerProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['loyalty-summary', customerId],
    queryFn: async () => {
      const response = await fetch(
        `/api/v1/customers/${customerId}/loyalty/summary`
      );
      if (!response.ok) throw new Error('Failed to fetch loyalty summary');
      const json = await response.json();
      return json.data.tier_info as TierData;
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const currentTierIndex = TIER_PROGRESSION.findIndex(
    (t) => t.name === data.current_tier
  );
  const nextTierIndex = currentTierIndex + 1;
  const hasNextTier = nextTierIndex < TIER_PROGRESSION.length;

  const currentBenefits =
    TIER_BENEFITS_CONFIG[data.current_tier] ||
    TIER_BENEFITS_CONFIG['bronze'];
  const nextBenefits = hasNextTier
    ? TIER_BENEFITS_CONFIG[TIER_PROGRESSION[nextTierIndex].name]
    : null;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Tier Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Tier */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Current Tier</p>
              <TierBadge tier={data.current_tier as any} size="lg" />
            </div>
            {hasNextTier && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-2">Next Tier</p>
                <div className="relative">
                  <TierBadge
                    tier={TIER_PROGRESSION[nextTierIndex].name as any}
                    size="lg"
                    className="opacity-50"
                  />
                  <Lock className="absolute -top-1 -right-1 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {hasNextTier ? (
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-medium">
                  {data.progress_percentage.toFixed(1)}% to{' '}
                  {TIER_PROGRESSION[nextTierIndex].name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {data.points_to_next_tier.toLocaleString()} points needed
                </span>
              </div>

              <div className="relative">
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${data.progress_percentage}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-primary via-primary/90 to-primary/80 rounded-full"
                  />
                </div>
              </div>

              {/* Motivational Message */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20"
              >
                <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-primary">
                    {data.progress_percentage > 75
                      ? "You're almost there!"
                      : data.progress_percentage > 50
                        ? 'Keep it up!'
                        : 'Great progress!'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.progress_percentage > 75
                      ? `Just ${data.points_to_next_tier.toLocaleString()} more points to unlock ${TIER_PROGRESSION[nextTierIndex].name} tier benefits!`
                      : `Earn ${data.points_to_next_tier.toLocaleString()} more points to reach ${TIER_PROGRESSION[nextTierIndex].name} tier.`}
                  </p>
                </div>
              </motion.div>
            </div>
          ) : (
            <div className="text-center py-6 space-y-2">
              <Trophy className="h-12 w-12 text-primary mx-auto" />
              <p className="font-semibold text-lg">Maximum Tier Achieved!</p>
              <p className="text-sm text-muted-foreground">
                You're at the highest tier. Enjoy all premium benefits!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            Your Current Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Benefit Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-2xl font-bold text-green-700">
                  {currentBenefits.multiplier}x
                </p>
                <p className="text-xs text-green-600 mt-1">Points Multiplier</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-2xl font-bold text-green-700">
                  {currentBenefits.discount}%
                </p>
                <p className="text-xs text-green-600 mt-1">Discount</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-2xl font-bold text-green-700">
                  {currentBenefits.free_shipping ? 'Yes' : 'No'}
                </p>
                <p className="text-xs text-green-600 mt-1">Free Shipping</p>
              </div>
            </div>

            {/* Perks List */}
            <div className="space-y-2">
              {currentBenefits.perks.map((perk, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm">{perk}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Tier Benefits Preview */}
      {hasNextTier && nextBenefits && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Unlock with {TIER_PROGRESSION[nextTierIndex].name} Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Benefit Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-2xl font-bold text-primary">
                    {nextBenefits.multiplier}x
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Points Multiplier
                  </p>
                </div>
                <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-2xl font-bold text-primary">
                    {nextBenefits.discount}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Discount</p>
                </div>
                <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-2xl font-bold text-primary">
                    {nextBenefits.free_shipping ? 'Yes' : 'No'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Free Shipping
                  </p>
                </div>
              </div>

              {/* New Perks */}
              <div className="space-y-2">
                {nextBenefits.perks.map((perk, index) => {
                  const isNew = !currentBenefits.perks.includes(perk);
                  return (
                    <div
                      key={index}
                      className={cn(
                        'flex items-center gap-2',
                        isNew && 'font-medium text-primary'
                      )}
                    >
                      {isNew ? (
                        <Sparkles className="h-4 w-4 shrink-0" />
                      ) : (
                        <Check className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-sm">{perk}</span>
                      {isNew && (
                        <Badge
                          variant="secondary"
                          className="ml-auto text-xs bg-primary/10 text-primary"
                        >
                          New
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tier Milestones */}
      <Card>
        <CardHeader>
          <CardTitle>All Tiers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {TIER_PROGRESSION.map((tier, index) => {
              const isUnlocked = index <= currentTierIndex;
              const isCurrent = tier.name === data.current_tier;

              return (
                <div
                  key={tier.name}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                    isCurrent
                      ? 'bg-primary/5 border-primary'
                      : isUnlocked
                        ? 'bg-green-50 border-green-200'
                        : 'bg-muted border-muted'
                  )}
                >
                  <div className="shrink-0">
                    {isUnlocked ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <TierBadge
                    tier={tier.name as any}
                    size="md"
                    className={!isUnlocked ? 'opacity-50' : ''}
                  />
                  <span className="text-sm text-muted-foreground ml-auto">
                    {tier.threshold.toLocaleString()} pts
                  </span>
                  {isCurrent && (
                    <Badge variant="default" className="ml-2">
                      Current
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
