"use client";

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Generic skeleton loader component
export interface SkeletonLoaderProps {
  className?: string;
  count?: number;
  height?: number | string;
  width?: number | string;
  rounded?: boolean;
  animate?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  className,
  count = 1,
  height = 20,
  width = '100%',
  rounded = true,
  animate = true,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'bg-muted',
            rounded && 'rounded',
            animate && 'animate-pulse',
            className
          )}
          style={{
            height: typeof height === 'number' ? `${height}px` : height,
            width: typeof width === 'number' ? `${width}px` : width,
          }}
        />
      ))}
    </>
  );
};

// Dashboard metrics loading skeleton
export const DashboardMetricsLoading: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <Card key={i} className="animate-pulse">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-3 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Table loading skeleton
export interface TableLoadingProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export const TableLoading: React.FC<TableLoadingProps> = ({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}) => (
  <div className={cn('space-y-3', className)}>
    {showHeader && (
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-6 w-full" />
        ))}
      </div>
    )}
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="grid gap-4 p-3 border rounded animate-pulse"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

// Activity feed loading skeleton
export const ActivityFeedLoading: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-start gap-3 p-3 rounded-lg border animate-pulse">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Alert panel loading skeleton
export const AlertPanelLoading: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="p-3 border rounded-lg animate-pulse">
        <div className="flex items-start gap-3">
          <Skeleton className="h-4 w-4 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex items-center justify-between mt-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Form loading skeleton
export const FormLoading: React.FC<{ fields?: number }> = ({ fields = 4 }) => (
  <div className="space-y-6">
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    ))}
    <div className="flex justify-end gap-2">
      <Skeleton className="h-10 w-20" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);

// Chart loading skeleton
export const ChartLoading: React.FC<{ height?: number }> = ({ height = 300 }) => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-64" />
    </CardHeader>
    <CardContent>
      <div className="flex items-end gap-2 animate-pulse" style={{ height: `${height}px` }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="bg-muted rounded-t"
            style={{
              height: `${Math.random() * 80 + 20}%`,
              width: `${100 / 12}%`,
            }}
          />
        ))}
      </div>
    </CardContent>
  </Card>
);

// List loading skeleton
export const ListLoading: React.FC<{
  count?: number;
  showImage?: boolean;
  showActions?: boolean;
}> = ({
  count = 6,
  showImage = false,
  showActions = true
}) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 animate-pulse">
            {showImage && <Skeleton className="h-12 w-12 rounded-full" />}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            {showActions && (
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Page loading skeleton
export const PageLoading: React.FC<{ showSidebar?: boolean }> = ({ showSidebar = false }) => (
  <div className={cn('min-h-screen', showSidebar ? 'flex' : '')}>
    {showSidebar && (
      <div className="w-64 border-r bg-muted/20 p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    )}
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Content */}
      <div className="space-y-6">
        <DashboardMetricsLoading />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <ActivityFeedLoading />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <AlertPanelLoading />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Pulse animation for loading states
export const PulseLoader: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={cn('flex justify-center items-center', className)}>
      <div className={cn('animate-pulse bg-muted rounded-full', sizeClasses[size])} />
    </div>
  );
};

// Spinner loader
export const SpinnerLoader: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={cn('flex justify-center items-center', className)}>
      <div className={cn(
        'animate-spin rounded-full border-2 border-muted border-t-primary',
        sizeClasses[size]
      )} />
    </div>
  );
};

// Content placeholder for empty states
export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}> = ({ icon, title, description, action, className }) => (
  <div className={cn(
    'flex flex-col items-center justify-center text-center p-8 space-y-4',
    className
  )}>
    {icon && (
      <div className="text-muted-foreground opacity-50">
        {icon}
      </div>
    )}
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-muted-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-md">{description}</p>
      )}
    </div>
    {action && action}
  </div>
);

export default {
  SkeletonLoader,
  DashboardMetricsLoading,
  TableLoading,
  ActivityFeedLoading,
  AlertPanelLoading,
  FormLoading,
  ChartLoading,
  ListLoading,
  PageLoading,
  PulseLoader,
  SpinnerLoader,
  EmptyState,
};