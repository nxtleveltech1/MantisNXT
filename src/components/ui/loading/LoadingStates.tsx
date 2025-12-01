// @ts-nocheck
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2,
  RefreshCw,
  Clock,
  Database,
  Gauge,
  Upload,
  Download,
  Search,
  Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Loading Animation Variants
const loadingVariants = {
  spin: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
  pulse: {
    scale: [1, 1.1, 1],
    opacity: [1, 0.7, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  bounce: {
    y: [0, -10, 0],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
  wave: {
    scale: [1, 1.05, 1],
    rotate: [0, 2, -2, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Enhanced Loading States
export interface LoadingState {
  type:
    | 'loading'
    | 'processing'
    | 'uploading'
    | 'downloading'
    | 'searching'
    | 'analyzing'
    | 'saving'
    | 'syncing';
  message?: string;
  progress?: number;
  subMessage?: string;
  duration?: number;
  icon?: React.ComponentType<unknown>;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo';
  variant?: 'minimal' | 'detailed' | 'progress' | 'skeleton';
  showProgressBar?: boolean;
  showTimer?: boolean;
  animated?: boolean;
}

// Skeleton Loading Components
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 6,
}) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={`header-${i}`}
          className="h-10 animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"
        />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div
        key={`row-${rowIndex}`}
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }).map((_, colIndex) => (
          <motion.div
            key={`cell-${rowIndex}-${colIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: (rowIndex * columns + colIndex) * 0.05 }}
          >
            <Skeleton className="h-8" />
          </motion.div>
        ))}
      </div>
    ))}
  </div>
);

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: count }).map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.1 }}
      >
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-32 w-full rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <div className="flex space-x-2 pt-2">
              <Skeleton className="h-8 w-20 rounded-full" />
              <Skeleton className="h-8 w-16 rounded-full" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    ))}
  </div>
);

export const ChartSkeleton: React.FC<{ type?: 'bar' | 'line' | 'pie' }> = ({ type = 'bar' }) => (
  <Card className="p-6">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>

      <div className="relative h-64">
        {type === 'bar' && (
          <div className="flex h-full items-end justify-between space-x-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-t-lg bg-gradient-to-t from-blue-200 to-blue-300"
                initial={{ height: 0 }}
                animate={{ height: `${Math.random() * 80 + 20}%` }}
                transition={{ delay: i * 0.1, duration: 0.8 }}
              />
            ))}
          </div>
        )}

        {type === 'line' && (
          <div className="relative h-full">
            {/* Grid lines */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-full border-t border-gray-200"
                style={{ top: `${i * 25}%` }}
              />
            ))}
            {/* Animated line */}
            <motion.div
              className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400 to-purple-500 opacity-30"
              initial={{ clipPath: 'inset(50% 100% 50% 0%)' }}
              animate={{ clipPath: 'inset(20% 0% 30% 0%)' }}
              transition={{ duration: 2, ease: 'easeInOut' }}
            />
          </div>
        )}

        {type === 'pie' && (
          <div className="flex h-full items-center justify-center">
            <motion.div
              className="h-40 w-40 rounded-full bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-center space-x-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  </Card>
);

// Main Loading Component
export const LoadingState: React.FC<LoadingState> = ({
  type = 'loading',
  message,
  progress,
  subMessage,
  icon: IconComponent,
  color = 'blue',
  variant = 'detailed',
  showProgressBar = false,
  showTimer = false,
  animated = true,
}) => {
  const [timer, setTimer] = React.useState(0);

  // Timer effect
  React.useEffect(() => {
    if (!showTimer) return;

    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [showTimer]);

  // Icon mapping
  const iconMap = {
    loading: Loader2,
    processing: Gauge,
    uploading: Upload,
    downloading: Download,
    searching: Search,
    analyzing: Brain,
    saving: Database,
    syncing: RefreshCw,
  };

  const Icon = IconComponent || iconMap[type] || Loader2;

  // Color mapping
  const colorClasses = {
    blue: {
      bg: 'from-blue-500 to-blue-600',
      text: 'text-blue-600',
      ring: 'ring-blue-500/20',
      progress: 'bg-blue-500',
    },
    green: {
      bg: 'from-green-500 to-green-600',
      text: 'text-green-600',
      ring: 'ring-green-500/20',
      progress: 'bg-green-500',
    },
    purple: {
      bg: 'from-purple-500 to-purple-600',
      text: 'text-purple-600',
      ring: 'ring-purple-500/20',
      progress: 'bg-purple-500',
    },
    orange: {
      bg: 'from-orange-500 to-orange-600',
      text: 'text-orange-600',
      ring: 'ring-orange-500/20',
      progress: 'bg-orange-500',
    },
    red: {
      bg: 'from-red-500 to-red-600',
      text: 'text-red-600',
      ring: 'ring-red-500/20',
      progress: 'bg-red-500',
    },
    indigo: {
      bg: 'from-indigo-500 to-indigo-600',
      text: 'text-indigo-600',
      ring: 'ring-indigo-500/20',
      progress: 'bg-indigo-500',
    },
  };

  const colors = colorClasses[color];

  // Format timer
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render different variants
  const renderMinimal = () => (
    <div className="flex items-center justify-center gap-3 py-8">
      <motion.div
        variants={loadingVariants}
        animate={animated ? 'spin' : undefined}
        className={cn('rounded-full bg-gradient-to-r p-2', colors.bg)}
      >
        <Icon className="h-6 w-6 text-white" />
      </motion.div>
      {message && <span className="text-lg font-medium text-gray-700">{message}</span>}
    </div>
  );

  const renderDetailed = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center space-y-6 p-12"
    >
      <motion.div
        variants={loadingVariants}
        animate={animated ? 'pulse' : undefined}
        className={cn(
          'relative rounded-3xl bg-gradient-to-r p-6 shadow-2xl',
          colors.bg,
          `ring-8 ${colors.ring}`
        )}
      >
        <motion.div variants={loadingVariants} animate={animated ? 'spin' : undefined}>
          <Icon className="h-12 w-12 text-white" />
        </motion.div>

        {/* Orbiting dots */}
        {animated && (
          <>
            <motion.div
              className="absolute top-2 right-2 h-3 w-3 rounded-full bg-white"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.7, 1],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: 0,
              }}
            />
            <motion.div
              className="absolute bottom-2 left-2 h-2 w-2 rounded-full bg-white"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [1, 0.6, 1],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: 0.3,
              }}
            />
            <motion.div
              className="absolute top-1/2 right-0 h-2 w-2 -translate-y-1/2 transform rounded-full bg-white"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [1, 0.8, 1],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: 0.6,
              }}
            />
          </>
        )}
      </motion.div>

      <div className="max-w-md space-y-2 text-center">
        <h3 className="text-2xl font-bold text-gray-800">
          {message || `${type.charAt(0).toUpperCase() + type.slice(1)}...`}
        </h3>

        {subMessage && <p className="text-lg text-gray-600">{subMessage}</p>}

        {showTimer && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>Elapsed: {formatTimer(timer)}</span>
          </div>
        )}
      </div>

      {/* Progress indicators */}
      {animated && (
        <div className="flex space-x-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              className="h-2 w-2 rounded-full bg-gray-400"
              animate={{
                scale: [1, 1.5, 1],
                backgroundColor: [colors.progress, '#94a3b8', colors.progress],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );

  const renderProgress = () => (
    <div className="space-y-6 p-8">
      <div className="flex items-center gap-4">
        <motion.div
          variants={loadingVariants}
          animate={animated ? 'spin' : undefined}
          className={cn('rounded-2xl bg-gradient-to-r p-3', colors.bg)}
        >
          <Icon className="h-8 w-8 text-white" />
        </motion.div>

        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-800">
            {message || `${type.charAt(0).toUpperCase() + type.slice(1)}...`}
          </h3>
          {subMessage && <p className="text-gray-600">{subMessage}</p>}
        </div>

        <div className="text-right">
          {progress !== undefined && (
            <div className="text-3xl font-bold text-gray-800">{Math.round(progress)}%</div>
          )}
          {showTimer && <div className="text-sm text-gray-500">{formatTimer(timer)}</div>}
        </div>
      </div>

      {(showProgressBar || progress !== undefined) && (
        <div className="relative">
          <div className="h-4 w-full rounded-full bg-gray-200">
            <motion.div
              className={cn('h-4 rounded-full bg-gradient-to-r', colors.bg)}
              initial={{ width: 0 }}
              animate={{ width: `${progress || 0}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Animated shine effect */}
          {animated && (
            <motion.div
              className="absolute inset-0 h-4 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
        </div>
      )}
    </div>
  );

  const renderSkeleton = () => (
    <div className="space-y-4 p-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      </div>
    </div>
  );

  // Render based on variant
  switch (variant) {
    case 'minimal':
      return renderMinimal();
    case 'progress':
      return renderProgress();
    case 'skeleton':
      return renderSkeleton();
    default:
      return renderDetailed();
  }
};

// Specific Loading Components
export const DataTableLoader: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 10,
  columns = 6,
}) => (
  <Card className="w-full">
    <CardContent className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64" /> {/* Search bar */}
          <Skeleton className="h-10 w-24" /> {/* Filter button */}
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
      <TableSkeleton rows={rows} columns={columns} />
      <div className="mt-6 flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8" />
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

export const DashboardLoader: React.FC = () => (
  <div className="space-y-8">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </Card>
        </motion.div>
      ))}
    </div>

    {/* Charts */}
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <ChartSkeleton type="bar" />
      <ChartSkeleton type="line" />
    </div>

    {/* Data Table */}
    <DataTableLoader rows={8} columns={5} />
  </div>
);

export const ProductCatalogLoader: React.FC = () => (
  <div className="space-y-6">
    {/* Search and filters */}
    <div className="flex items-center gap-4">
      <Skeleton className="h-12 max-w-md flex-1" />
      <Skeleton className="h-12 w-24" />
      <Skeleton className="h-12 w-32" />
    </div>

    {/* Filter chips */}
    <div className="flex gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-20 rounded-full" />
      ))}
    </div>

    {/* Product grid */}
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <Card className="overflow-hidden">
            <div className="relative aspect-square bg-gradient-to-br from-gray-200 to-gray-300">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.1,
                }}
              />
            </div>
            <CardContent className="space-y-3 p-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-12 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-9 w-full rounded-lg" />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>

    {/* Pagination */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-10" />
        ))}
      </div>
    </div>
  </div>
);

// Global Loading Overlay
export const GlobalLoader: React.FC<{
  isLoading: boolean;
  message?: string;
  backdrop?: boolean;
}> = ({ isLoading, message = 'Loading...', backdrop = true }) => (
  <AnimatePresence>
    {isLoading && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center',
          backdrop && 'bg-black/20 backdrop-blur-sm'
        )}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="mx-4 max-w-md rounded-2xl bg-white p-8 shadow-2xl"
        >
          <LoadingState
            type="loading"
            message={message}
            variant="detailed"
            animated={true}
            color="blue"
          />
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default LoadingState;
