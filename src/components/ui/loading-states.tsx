/**
 * Loading State Components
 * Provides consistent loading indicators for async operations
 * Enhanced with new design system colors and animations
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function Spinner({
  size = 'md',
  className = '',
  color = 'primary'
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: 'primary' | 'accent' | 'success' | 'warning'
}) {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8', xl: 'w-12 h-12' };
  const colorClasses = {
    primary: 'text-primary',
    accent: 'text-accent',
    success: 'text-success',
    warning: 'text-warning'
  };
  return <Loader2 className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`} />;
}

export function FullPageSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background animate-fade-in">
      <Spinner size="xl" color="primary" className="mb-4" />
      <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
}

export function CenteredSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
      <Spinner size="lg" color="primary" className="mb-3" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}

export function LoadingOverlay({
  isLoading,
  message = 'Loading...',
  children
}: {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 glass flex items-center justify-center z-50 animate-fade-in">
          <div className="text-center">
            <Spinner size="lg" color="primary" className="mb-3 mx-auto" />
            <p className="text-sm text-foreground">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* Enhanced Skeleton Components with Design System */

export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-scale-in">
          <CardHeader className="space-y-2">
            <div className="skeleton h-4 w-1/2"></div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="skeleton h-8 w-1/3"></div>
            <div className="skeleton h-4 w-full"></div>
            <div className="skeleton h-4 w-3/4"></div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3 animate-fade-in">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="skeleton h-4 flex-1"></div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 py-3">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div key={colIdx} className="skeleton h-4 flex-1"></div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function MetricCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="animate-scale-in" style={{ animationDelay: `${i * 50}ms` }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="skeleton h-4 w-20"></div>
                <div className="skeleton h-8 w-16"></div>
                <div className="skeleton h-3 w-24"></div>
              </div>
              <div className="skeleton h-10 w-10 rounded-full"></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3 animate-fade-in">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <div className="skeleton h-12 w-12 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-1/2"></div>
            <div className="skeleton h-3 w-3/4"></div>
          </div>
          <div className="skeleton h-8 w-20"></div>
        </div>
      ))}
    </div>
  );
}
