/**
 * Enhanced KPI Card Component
 * Displays key performance indicators with trends and drill-down capability
 */

'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  trendLabel?: string;
  icon: LucideIcon;
  href?: string;
  colorScheme?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  loading?: boolean;
}

const colorSchemes = {
  default: {
    bg: 'bg-primary/10',
    iconColor: 'text-primary',
    hoverBg: 'group-hover:bg-primary/20',
  },
  success: {
    bg: 'bg-green-100 dark:bg-green-900/20',
    iconColor: 'text-green-600 dark:text-green-400',
    hoverBg: 'group-hover:bg-green-200 dark:group-hover:bg-green-900/30',
  },
  warning: {
    bg: 'bg-orange-100 dark:bg-orange-900/20',
    iconColor: 'text-orange-600 dark:text-orange-400',
    hoverBg: 'group-hover:bg-orange-200 dark:group-hover:bg-orange-900/30',
  },
  danger: {
    bg: 'bg-red-100 dark:bg-red-900/20',
    iconColor: 'text-red-600 dark:text-red-400',
    hoverBg: 'group-hover:bg-red-200 dark:group-hover:bg-red-900/30',
  },
  info: {
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    hoverBg: 'group-hover:bg-blue-200 dark:group-hover:bg-blue-900/30',
  },
};

export function EnhancedKPICard({
  title,
  value,
  subtitle,
  trend = 'neutral',
  trendValue,
  trendLabel = 'vs last period',
  icon: Icon,
  href,
  colorScheme = 'default',
  loading = false,
}: KPICardProps) {
  const scheme = colorSchemes[colorScheme];

  const content = (
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-muted-foreground truncate text-sm font-medium">{title}</p>
          {subtitle && <p className="text-muted-foreground/70 truncate text-xs">{subtitle}</p>}
          <div className="mt-2 flex items-baseline gap-2">
            <p className="truncate text-3xl font-bold tracking-tight">
              {loading ? (
                <span className="bg-muted inline-block h-8 w-24 animate-pulse rounded" />
              ) : (
                value
              )}
            </p>
          </div>
          {trendValue && !loading && (
            <div className="mt-1 flex items-center gap-1 text-sm">
              {trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : trend === 'down' ? (
                <TrendingDown className="h-4 w-4 text-red-600" />
              ) : (
                <Minus className="text-muted-foreground h-4 w-4" />
              )}
              <span
                className={cn(
                  'font-medium',
                  trend === 'up' && 'text-green-600',
                  trend === 'down' && 'text-red-600',
                  trend === 'neutral' && 'text-muted-foreground'
                )}
              >
                {trendValue}
              </span>
              <span className="text-muted-foreground text-xs">{trendLabel}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors',
            scheme.bg,
            scheme.hoverBg
          )}
        >
          <Icon className={cn('h-6 w-6', scheme.iconColor)} />
        </div>
      </div>
    </CardContent>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        <Card className="bg-card border-border group cursor-pointer rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md">
          {content}
        </Card>
      </Link>
    );
  }

  return <Card className="bg-card border-border rounded-xl border shadow-sm">{content}</Card>;
}
