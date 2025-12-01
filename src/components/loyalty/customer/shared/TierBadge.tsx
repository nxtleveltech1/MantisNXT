/**
 * TierBadge - Consistent tier badges
 *
 * Usage:
 * <TierBadge tier="gold" size="lg" />
 *
 * Tiers: bronze, silver, gold, platinum, diamond
 */

'use client';

import { Crown, Award, Star, Gem, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type TierLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

interface TierBadgeProps {
  tier: TierLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const TIER_CONFIG: Record<
  TierLevel,
  {
    label: string;
    icon: typeof Crown;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  bronze: {
    label: 'Bronze',
    icon: Award,
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
  },
  silver: {
    label: 'Silver',
    icon: Star,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
  },
  gold: {
    label: 'Gold',
    icon: Crown,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-400',
  },
  platinum: {
    label: 'Platinum',
    icon: Trophy,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-400',
  },
  diamond: {
    label: 'Diamond',
    icon: Gem,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-400',
  },
};

const SIZE_CONFIG = {
  sm: {
    badge: 'text-xs px-2 py-1',
    icon: 'h-3 w-3',
  },
  md: {
    badge: 'text-sm px-3 py-1.5',
    icon: 'h-4 w-4',
  },
  lg: {
    badge: 'text-base px-4 py-2',
    icon: 'h-5 w-5',
  },
};

export function TierBadge({ tier, size = 'md', showIcon = true, className }: TierBadgeProps) {
  const config = TIER_CONFIG[tier];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 border-2 font-semibold',
        config.color,
        config.bgColor,
        config.borderColor,
        sizeConfig.badge,
        className
      )}
    >
      {showIcon && <Icon className={cn(sizeConfig.icon)} />}
      <span>{config.label}</span>
    </Badge>
  );
}
