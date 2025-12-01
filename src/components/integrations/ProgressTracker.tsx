'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Loader2, XCircle, Clock, Zap } from 'lucide-react';

interface SyncProgressData {
  jobId: string;
  syncType: 'woocommerce' | 'odoo';
  entityType: string;
  status: 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  processedCount: number;
  totalCount: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  currentItem?: {
    id: string | number;
    name: string;
    status: 'processing' | 'success' | 'error';
  };
  failedItems?: Array<{
    id: string | number;
    name: string;
    error: string;
  }>;
  startTime: number;
  endTime?: number;
  networkSpeed?: number; // Mbps
  dbWriteSpeed?: number; // items/sec
  errorMessage?: string;
}

interface ProgressTrackerProps {
  jobId: string;
  syncType: 'woocommerce' | 'odoo';
  entityType: string;
  isVisible: boolean;
  onComplete?: (status: 'completed' | 'failed') => void;
  onCancel?: () => void;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const variants: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    processing: {
      color: 'default',
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      label: 'Processing',
    },
    completed: {
      color: 'secondary',
      icon: <CheckCircle2 className="h-3 w-3" />,
      label: 'Completed',
    },
    failed: {
      color: 'destructive',
      icon: <XCircle className="h-3 w-3" />,
      label: 'Failed',
    },
    cancelled: {
      color: 'outline',
      icon: <AlertCircle className="h-3 w-3" />,
      label: 'Cancelled',
    },
  };

  const variant = variants[status] || variants.processing;

  return (
    <Badge variant={variant.color as unknown} className="gap-1">
      {variant.icon}
      {variant.label}
    </Badge>
  );
};

// Memoized metrics card component
const MetricCard = React.memo(
  ({
    title,
    value,
    unit,
    icon: Icon,
  }: {
    title: string;
    value: string | number;
    unit?: string;
    icon: React.ReactNode;
  }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-sm">{title}</p>
            <p className="mt-1 text-2xl font-bold">
              {value}
              {unit && <span className="text-muted-foreground ml-1 text-sm">{unit}</span>}
            </p>
          </div>
          <div className="text-muted-foreground">{Icon}</div>
        </div>
      </CardContent>
    </Card>
  )
);

MetricCard.displayName = 'MetricCard';

// Failed items list component (memoized)
const FailedItemsList = React.memo(
  ({
    items,
    isExpanded,
    onToggle,
  }: {
    items: unknown[];
    isExpanded: boolean;
    onToggle: () => void;
  }) => (
    <div className="mt-4 space-y-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="w-full justify-between"
        aria-expanded={isExpanded}
      >
        <span className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Failed Items ({items.length})
        </span>
        <span className="text-xs">{isExpanded ? 'Hide' : 'Show'}</span>
      </Button>

      {isExpanded && items.length > 0 && (
        <div className="bg-muted/30 max-h-48 space-y-2 overflow-y-auto rounded-lg p-3">
          {items.map((item, idx) => (
            <div key={idx} className="border-destructive border-l-2 pl-3 text-sm">
              <p className="font-medium">
                {item.name} (ID: {item.id})
              </p>
              <p className="text-muted-foreground text-xs">{item.error}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
);

FailedItemsList.displayName = 'FailedItemsList';

// Format time from milliseconds to HH:MM:SS
const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

// Calculate ETA based on progress
const calculateETA = (totalCount: number, processedCount: number, elapsedTime: number): string => {
  if (processedCount === 0) return '--:--:--';
  const itemsPerSecond = processedCount / (elapsedTime / 1000);
  const remainingItems = totalCount - processedCount;
  const remainingSeconds = Math.ceil(remainingItems / itemsPerSecond);
  return formatTime(remainingSeconds * 1000);
};

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  jobId,
  syncType,
  entityType,
  isVisible,
  onComplete,
  onCancel,
}) => {
  const [data, setData] = useState<SyncProgressData | null>(null);
  const [failedExpanded, setFailedExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  // Polling interval for progress updates (500ms for smooth updates)
  useEffect(() => {
    if (!isVisible || !jobId) return;

    const pollProgress = async () => {
      try {
        const response = await fetch(`/api/v1/integrations/sync/progress/${jobId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch progress: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.success) {
          setData(result.data);
          setError(null);

          // Check if sync is complete
          if (result.data.status === 'completed' || result.data.status === 'failed') {
            onComplete?.(result.data.status);
          }
        } else {
          setError(result.error || 'Failed to fetch progress');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }

      setPollCount(prev => prev + 1);
    };

    // Initial poll
    pollProgress();

    // Set up polling interval
    const interval = setInterval(pollProgress, 500);
    return () => clearInterval(interval);
  }, [isVisible, jobId, onComplete]);

  if (!isVisible || !data) {
    return null;
  }

  const elapsedTime = (data.endTime || Date.now()) - data.startTime;
  const eta =
    data.status === 'processing'
      ? calculateETA(data.totalCount, data.processedCount, elapsedTime)
      : '--:--:--';

  const progressPercent =
    data.totalCount > 0 ? Math.round((data.processedCount / data.totalCount) * 100) : 0;

  const itemsPerMinute =
    elapsedTime > 0 ? Math.round((data.processedCount / (elapsedTime / 60000)) * 10) / 10 : 0;

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span>Sync Progress</span>
                <Badge variant="secondary" className="capitalize">
                  {syncType === 'woocommerce' ? 'WooCommerce' : 'Odoo'} - {entityType}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                {data.status === 'processing'
                  ? 'Sync is in progress...'
                  : data.status === 'completed'
                    ? 'Sync completed successfully'
                    : 'Sync encountered an error'}
              </CardDescription>
            </div>
            <StatusBadge status={data.status} />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-muted-foreground text-sm">{progressPercent}%</span>
            </div>
            <Progress
              value={progressPercent}
              className="h-2"
              aria-label="Sync progress"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-destructive/10 border-destructive/20 text-destructive rounded-lg border p-3 text-sm">
              <p>{error}</p>
            </div>
          )}

          {/* Current item */}
          {data.currentItem && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground mb-1 text-xs">Currently Processing</p>
              <p className="text-sm font-medium">{data.currentItem.name}</p>
              <p className="text-muted-foreground mt-1 text-xs">ID: {data.currentItem.id}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Items Processed"
          value={`${data.processedCount} / ${data.totalCount}`}
          icon={<Loader2 className="h-5 w-5" />}
        />
        <MetricCard
          title="Speed"
          value={itemsPerMinute}
          unit="items/min"
          icon={<Zap className="h-5 w-5" />}
        />
        <MetricCard title="ETA" value={eta} icon={<Clock className="h-5 w-5" />} />
        <MetricCard
          title="Elapsed"
          value={formatTime(elapsedTime)}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Created</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{data.createdCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Updated</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{data.updatedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Failed</p>
              <p className="text-destructive mt-1 text-2xl font-bold">{data.failedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground text-sm">Success Rate</p>
              <p className="mt-1 text-2xl font-bold">
                {data.totalCount > 0
                  ? Math.round(((data.totalCount - data.failedCount) / data.totalCount) * 100)
                  : 0}
                %
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance indicators */}
      {(data.networkSpeed || data.dbWriteSpeed) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.networkSpeed && (
              <div>
                <p className="text-muted-foreground text-sm">Network Speed</p>
                <p className="mt-1 text-lg font-semibold">{data.networkSpeed} Mbps</p>
              </div>
            )}
            {data.dbWriteSpeed && (
              <div>
                <p className="text-muted-foreground text-sm">DB Write Speed</p>
                <p className="mt-1 text-lg font-semibold">{data.dbWriteSpeed} items/sec</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Failed items section */}
      {data.failedItems && data.failedItems.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <FailedItemsList
              items={data.failedItems}
              isExpanded={failedExpanded}
              onToggle={() => setFailedExpanded(!failedExpanded)}
            />
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      {data.status === 'processing' && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onCancel?.()}
            disabled={data.status !== 'processing'}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Cancel Sync
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;
