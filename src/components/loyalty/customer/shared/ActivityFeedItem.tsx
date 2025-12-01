/**
 * ActivityFeedItem - Activity timeline items
 *
 * Usage:
 * <ActivityFeedItem
 *   type="earn"
 *   points={100}
 *   description="Order #1234"
 *   date="2025-01-15"
 * />
 */

'use client';

import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Gift, AlertCircle, UserPlus, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActivityType = 'earn' | 'redeem' | 'expire' | 'referral' | 'bonus' | 'purchase';

interface ActivityFeedItemProps {
  type: ActivityType;
  points: number;
  description: string;
  date: string;
  className?: string;
}

const ACTIVITY_CONFIG: Record<
  ActivityType,
  {
    icon: typeof TrendingUp;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  earn: {
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'Earned',
  },
  redeem: {
    icon: TrendingDown,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    label: 'Redeemed',
  },
  expire: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label: 'Expired',
  },
  referral: {
    icon: UserPlus,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: 'Referral',
  },
  bonus: {
    icon: Gift,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    label: 'Bonus',
  },
  purchase: {
    icon: ShoppingBag,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    label: 'Purchase',
  },
};

export function ActivityFeedItem({
  type,
  points,
  description,
  date,
  className,
}: ActivityFeedItemProps) {
  const config = ACTIVITY_CONFIG[type];
  const Icon = config.icon;
  const isNegative = type === 'redeem' || type === 'expire';

  return (
    <div className={cn('flex items-start gap-4 py-3', className)}>
      {/* Icon */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
          config.bgColor
        )}
      >
        <Icon className={cn('h-5 w-5', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-foreground text-sm font-medium">{description}</p>
          <span
            className={cn(
              'text-sm font-semibold whitespace-nowrap',
              isNegative ? 'text-red-600' : 'text-green-600'
            )}
          >
            {isNegative ? '-' : '+'}
            {Math.abs(points).toLocaleString()}
          </span>
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <span className={cn('font-medium', config.color)}>{config.label}</span>
          <span>•</span>
          <time dateTime={date}>{format(new Date(date), 'MMM d, yyyy')}</time>
        </div>
      </div>
    </div>
  );
}
