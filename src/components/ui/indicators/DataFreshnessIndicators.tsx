// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Activity,
  Radio,
  Sparkles,
} from 'lucide-react';
import { designTokens } from '../design-system';

// Data Freshness Types
export type FreshnessLevel = 'realtime' | 'fresh' | 'stale' | 'outdated' | 'unknown';
export type DataChangeType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'price_changed'
  | 'stock_changed'
  | 'status_changed';

export interface DataFreshnessInfo {
  lastUpdated: Date;
  syncStatus: 'synced' | 'syncing' | 'error' | 'offline';
  freshnessLevel: FreshnessLevel;
  changesSinceLastView?: number;
  recentChanges?: DataChange[];
  nextSyncTime?: Date;
  dataSource?: string;
  confidence?: number; // 0-1 score for data reliability
}

export interface DataChange {
  id: string;
  type: DataChangeType;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  timestamp: Date;
  userId?: string;
  source?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface FreshnessConfig {
  realtimeThreshold: number; // milliseconds
  freshThreshold: number;
  staleThreshold: number;
  showRelativeTime: boolean;
  showConfidence: boolean;
  showChangeCount: boolean;
  showSyncStatus: boolean;
  enableNotifications: boolean;
  refreshInterval?: number;
}

// Freshness Calculation Engine
class FreshnessCalculator {
  static calculateFreshnessLevel(
    lastUpdated: Date,
    config: FreshnessConfig,
    referenceDate: Date = new Date()
  ): FreshnessLevel {
    const timeDiff = referenceDate.getTime() - lastUpdated.getTime();

    if (timeDiff <= config.realtimeThreshold) return 'realtime';
    if (timeDiff <= config.freshThreshold) return 'fresh';
    if (timeDiff <= config.staleThreshold) return 'stale';
    return 'outdated';
  }

  static getRelativeTimeString(date: Date, referenceDate: Date = new Date()): string {
    const diffMs = referenceDate.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 1000) return 'just now';
    if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  static getFreshnessColor(level: FreshnessLevel): string {
    switch (level) {
      case 'realtime':
        return designTokens.colors.success.DEFAULT;
      case 'fresh':
        return designTokens.colors.primary.DEFAULT;
      case 'stale':
        return designTokens.colors.warning.DEFAULT;
      case 'outdated':
        return designTokens.colors.destructive.DEFAULT;
      default:
        return designTokens.colors.muted.foreground;
    }
  }

  static getSyncStatusIcon(status: DataFreshnessInfo['syncStatus']) {
    switch (status) {
      case 'synced':
        return CheckCircle;
      case 'syncing':
        return RefreshCw;
      case 'error':
        return AlertCircle;
      case 'offline':
        return WifiOff;
      default:
        return Clock;
    }
  }
}

// Core Freshness Indicator Component
export interface DataFreshnessIndicatorProps {
  data: DataFreshnessInfo;
  config?: Partial<FreshnessConfig>;
  variant?: 'minimal' | 'standard' | 'detailed' | 'badge';
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  onRefresh?: () => void;
  className?: string;
}

const defaultConfig: FreshnessConfig = {
  realtimeThreshold: 5000, // 5 seconds
  freshThreshold: 300000, // 5 minutes
  staleThreshold: 1800000, // 30 minutes
  showRelativeTime: true,
  showConfidence: true,
  showChangeCount: true,
  showSyncStatus: true,
  enableNotifications: false,
};

export const DataFreshnessIndicator: React.FC<DataFreshnessIndicatorProps> = ({
  data,
  config = {},
  variant = 'standard',
  size = 'md',
  showTooltip = true,
  onRefresh,
  className = '',
}) => {
  const mergedConfig = useMemo(() => ({ ...defaultConfig, ...config }), [config]);
  const [isHovered, setIsHovered] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time for relative time display
  useEffect(() => {
    if (!mergedConfig.showRelativeTime) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, mergedConfig.refreshInterval || 30000);

    return () => clearInterval(interval);
  }, [mergedConfig.showRelativeTime, mergedConfig.refreshInterval]);

  const freshnessLevel = useMemo(
    () => FreshnessCalculator.calculateFreshnessLevel(data.lastUpdated, mergedConfig, currentTime),
    [currentTime, data.lastUpdated, mergedConfig]
  );

  const relativeTime = useMemo(
    () => FreshnessCalculator.getRelativeTimeString(data.lastUpdated, currentTime),
    [currentTime, data.lastUpdated]
  );

  const freshnessColor = FreshnessCalculator.getFreshnessColor(freshnessLevel);
  const SyncIcon = FreshnessCalculator.getSyncStatusIcon(data.syncStatus);

  const baseClasses = `
    data-freshness-indicator
    inline-flex items-center gap-1
    ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}
    ${className}
  `;

  if (variant === 'minimal') {
    return (
      <div className={baseClasses}>
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: freshnessColor }} />
        {mergedConfig.showRelativeTime && (
          <span className="text-muted-foreground">{relativeTime}</span>
        )}
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div
        className={` ${baseClasses} rounded-full border px-2 py-1 ${
          freshnessLevel === 'realtime'
            ? 'bg-success/10 border-success text-success'
            : freshnessLevel === 'fresh'
              ? 'bg-primary/10 border-primary text-primary'
              : freshnessLevel === 'stale'
                ? 'bg-warning/10 border-warning text-warning'
                : 'bg-destructive/10 border-destructive text-destructive'
        } `}
      >
        <motion.div
          animate={data.syncStatus === 'syncing' ? { rotate: 360 } : {}}
          transition={{
            duration: 1,
            repeat: data.syncStatus === 'syncing' ? Infinity : 0,
            ease: 'linear',
          }}
        >
          <SyncIcon className="h-3 w-3" />
        </motion.div>
        <span className="capitalize">{freshnessLevel}</span>
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} relative`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <style jsx>{`
        .freshness-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 8px;
          padding: 12px;
          background: ${designTokens.colors.popover};
          border: 1px solid ${designTokens.colors.border};
          border-radius: ${designTokens.borderRadius.md};
          box-shadow: ${designTokens.shadows.md};
          z-index: 50;
          min-width: 200px;
          font-size: ${designTokens.typography.sizes.sm};
        }

        .freshness-pulse {
          animation: pulse-freshness 2s ease-in-out infinite;
        }

        @keyframes pulse-freshness {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        .freshness-glow {
          box-shadow: 0 0 8px ${freshnessColor}40;
        }
      `}</style>

      {/* Main Indicator */}
      <div className="flex items-center gap-2">
        {/* Status Icon with Animation */}
        <motion.div
          className={` ${freshnessLevel === 'realtime' ? 'freshness-pulse' : ''} ${data.syncStatus === 'syncing' ? 'animate-spin' : ''} `}
          animate={data.syncStatus === 'syncing' ? { rotate: 360 } : {}}
          transition={{
            duration: 1,
            repeat: data.syncStatus === 'syncing' ? Infinity : 0,
            ease: 'linear',
          }}
        >
          <SyncIcon className={`h-4 w-4`} style={{ color: freshnessColor }} />
        </motion.div>

        {/* Freshness Level */}
        <span className="font-medium capitalize" style={{ color: freshnessColor }}>
          {freshnessLevel}
        </span>

        {/* Relative Time */}
        {mergedConfig.showRelativeTime && (
          <span className="text-muted-foreground">{relativeTime}</span>
        )}

        {/* Change Count */}
        {mergedConfig.showChangeCount &&
          data.changesSinceLastView &&
          data.changesSinceLastView > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-primary text-primary-foreground freshness-glow rounded-full px-1.5 py-0.5 text-xs"
            >
              +{data.changesSinceLastView}
            </motion.span>
          )}

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="hover:bg-muted text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Detailed Tooltip */}
      <AnimatePresence>
        {showTooltip && isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="freshness-tooltip"
          >
            <div className="space-y-2">
              {/* Status Row */}
              <div className="flex items-center justify-between">
                <span className="font-medium">Status:</span>
                <div className="flex items-center gap-1">
                  <SyncIcon className="h-3 w-3" style={{ color: freshnessColor }} />
                  <span style={{ color: freshnessColor }} className="capitalize">
                    {data.syncStatus}
                  </span>
                </div>
              </div>

              {/* Last Updated */}
              <div className="flex items-center justify-between">
                <span className="font-medium">Updated:</span>
                <span className="text-muted-foreground">{data.lastUpdated.toLocaleString()}</span>
              </div>

              {/* Data Source */}
              {data.dataSource && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Source:</span>
                  <span className="text-muted-foreground">{data.dataSource}</span>
                </div>
              )}

              {/* Confidence Score */}
              {mergedConfig.showConfidence && data.confidence !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Confidence:</span>
                  <div className="flex items-center gap-1">
                    <div className="bg-muted h-1 w-12 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full transition-all duration-300"
                        style={{ width: `${data.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {Math.round(data.confidence * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Next Sync */}
              {data.nextSyncTime && (
                <div className="flex items-center justify-between">
                  <span className="font-medium">Next sync:</span>
                  <span className="text-muted-foreground">
                    {FreshnessCalculator.getRelativeTimeString(data.nextSyncTime)}
                  </span>
                </div>
              )}

              {/* Recent Changes */}
              {data.recentChanges && data.recentChanges.length > 0 && (
                <div className="border-t pt-2">
                  <div className="mb-1 font-medium">Recent changes:</div>
                  <div className="max-h-20 space-y-1 overflow-y-auto">
                    {data.recentChanges.slice(0, 3).map(change => (
                      <div
                        key={change.id}
                        className="text-muted-foreground flex items-center gap-1 text-xs"
                      >
                        <ChangeTypeIcon type={change.type} />
                        <span>{change.field || change.type}</span>
                        <span>·</span>
                        <span>{FreshnessCalculator.getRelativeTimeString(change.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Change Type Icon Component
const ChangeTypeIcon: React.FC<{ type: DataChangeType }> = ({ type }) => {
  switch (type) {
    case 'created':
      return <Sparkles className="text-success h-3 w-3" />;
    case 'updated':
      return <RefreshCw className="text-primary h-3 w-3" />;
    case 'deleted':
      return <AlertCircle className="text-destructive h-3 w-3" />;
    case 'price_changed':
      return <TrendingUp className="text-warning h-3 w-3" />;
    case 'stock_changed':
      return <Activity className="text-primary h-3 w-3" />;
    case 'status_changed':
      return <Radio className="text-muted-foreground h-3 w-3" />;
    default:
      return <Clock className="text-muted-foreground h-3 w-3" />;
  }
};

// Real-time Connection Status Component
export interface RealTimeStatusProps {
  isConnected: boolean;
  lastHeartbeat?: Date;
  reconnectAttempts?: number;
  onReconnect?: () => void;
  className?: string;
}

export const RealTimeStatus: React.FC<RealTimeStatusProps> = ({
  isConnected,
  lastHeartbeat,
  reconnectAttempts = 0,
  onReconnect,
  className = '',
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <motion.div
          animate={isConnected ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 2, repeat: isConnected ? Infinity : 0 }}
        >
          {isConnected ? (
            <Wifi className="text-success h-4 w-4" />
          ) : (
            <WifiOff className="text-destructive h-4 w-4" />
          )}
        </motion.div>

        <span className={`text-sm ${isConnected ? 'text-success' : 'text-destructive'}`}>
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>

      {!isConnected && reconnectAttempts > 0 && (
        <span className="text-muted-foreground text-xs">({reconnectAttempts} attempts)</span>
      )}

      {lastHeartbeat && (
        <span className="text-muted-foreground text-xs">
          Last: {FreshnessCalculator.getRelativeTimeString(lastHeartbeat)}
        </span>
      )}

      {!isConnected && onReconnect && (
        <button
          onClick={onReconnect}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded px-2 py-1 text-xs transition-colors"
        >
          Reconnect
        </button>
      )}
    </div>
  );
};

// Data Quality Score Component
export interface DataQualityScoreProps {
  score: number; // 0-1
  factors?: {
    completeness: number;
    accuracy: number;
    timeliness: number;
    consistency: number;
  };
  showBreakdown?: boolean;
  className?: string;
}

export const DataQualityScore: React.FC<DataQualityScoreProps> = ({
  score,
  factors,
  showBreakdown = false,
  className = '',
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 0.9) return designTokens.colors.success.DEFAULT;
    if (score >= 0.7) return designTokens.colors.primary.DEFAULT;
    if (score >= 0.5) return designTokens.colors.warning.DEFAULT;
    return designTokens.colors.destructive.DEFAULT;
  };

  const getScoreGrade = (score: number) => {
    if (score >= 0.9) return 'A';
    if (score >= 0.8) return 'B';
    if (score >= 0.7) return 'C';
    if (score >= 0.6) return 'D';
    return 'F';
  };

  return (
    <div className={`data-quality-score ${className}`}>
      <div className="flex items-center gap-2">
        <div className="relative h-8 w-8">
          <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90 transform">
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={designTokens.colors.muted.DEFAULT}
              strokeWidth="2"
            />
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={getScoreColor(score)}
              strokeWidth="2"
              strokeDasharray={`${score * 100}, 100`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold" style={{ color: getScoreColor(score) }}>
              {getScoreGrade(score)}
            </span>
          </div>
        </div>

        <div>
          <div className="text-sm font-medium">Data Quality: {Math.round(score * 100)}%</div>
          {showBreakdown && factors && (
            <div className="text-muted-foreground space-y-1 text-xs">
              <div>Completeness: {Math.round(factors.completeness * 100)}%</div>
              <div>Accuracy: {Math.round(factors.accuracy * 100)}%</div>
              <div>Timeliness: {Math.round(factors.timeliness * 100)}%</div>
              <div>Consistency: {Math.round(factors.consistency * 100)}%</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Change Visualization Component
export interface DataChangeVisualizationProps {
  changes: DataChange[];
  timeWindow?: 'hour' | 'day' | 'week' | 'month';
  className?: string;
}

export const DataChangeVisualization: React.FC<DataChangeVisualizationProps> = ({
  changes,
  timeWindow = 'day',
  className = '',
}) => {
  const groupedChanges = useMemo(() => {
    const now = new Date();
    const groups: { [key: string]: DataChange[] } = {};

    const getTimeKey = (date: Date) => {
      switch (timeWindow) {
        case 'hour':
          return `${date.getHours()}:00`;
        case 'day':
          return date.toLocaleDateString();
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          return weekStart.toLocaleDateString();
        case 'month':
          return `${date.getFullYear()}-${date.getMonth() + 1}`;
        default:
          return date.toLocaleDateString();
      }
    };

    changes.forEach(change => {
      const key = getTimeKey(change.timestamp);
      if (!groups[key]) groups[key] = [];
      groups[key].push(change);
    });

    return groups;
  }, [changes, timeWindow]);

  const maxCount = Math.max(...Object.values(groupedChanges).map(group => group.length), 1);

  return (
    <div className={`data-change-visualization ${className}`}>
      <div className="flex h-16 items-end gap-1">
        {Object.entries(groupedChanges).map(([timeKey, timeChanges]) => (
          <div
            key={timeKey}
            className="flex flex-1 flex-col items-center gap-1"
            title={`${timeChanges.length} changes at ${timeKey}`}
          >
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(timeChanges.length / maxCount) * 100}%` }}
              transition={{ duration: 0.3, delay: Math.random() * 0.1 }}
              className="bg-primary min-h-[2px] w-full rounded-t"
            />
            <span className="text-muted-foreground w-full truncate text-center text-xs">
              {timeKey}
            </span>
          </div>
        ))}
      </div>

      <div className="text-muted-foreground mt-2 text-center text-xs">
        {changes.length} changes in the last {timeWindow}
      </div>
    </div>
  );
};

// Main Export: Comprehensive Data Freshness Dashboard
export interface DataFreshnessDashboardProps {
  items: Array<{
    id: string;
    name: string;
    freshnessInfo: DataFreshnessInfo;
  }>;
  config?: Partial<FreshnessConfig>;
  onRefreshAll?: () => void;
  onRefreshItem?: (id: string) => void;
  className?: string;
}

export const DataFreshnessDashboard: React.FC<DataFreshnessDashboardProps> = ({
  items,
  config = {},
  onRefreshAll,
  onRefreshItem,
  className = '',
}) => {
  const mergedConfig = useMemo(() => ({ ...defaultConfig, ...config }), [config]);

  const freshnessStats = useMemo(() => {
    const stats = { realtime: 0, fresh: 0, stale: 0, outdated: 0 };
    items.forEach(item => {
      const level = FreshnessCalculator.calculateFreshnessLevel(
        item.freshnessInfo.lastUpdated,
        mergedConfig
      );
      stats[level]++;
    });
    return stats;
  }, [items, mergedConfig]);

  const overallScore = useMemo(() => {
    const totalItems = items.length;
    if (totalItems === 0) return 1;

    const score =
      (freshnessStats.realtime * 1.0 +
        freshnessStats.fresh * 0.8 +
        freshnessStats.stale * 0.5 +
        freshnessStats.outdated * 0.2) /
      totalItems;

    return score;
  }, [freshnessStats, items.length]);

  return (
    <div className={`data-freshness-dashboard space-y-4 ${className}`}>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <DataQualityScore score={overallScore} />

          <div className="space-y-1 text-sm">
            <div className="font-medium">Data Freshness Overview</div>
            <div className="text-muted-foreground flex items-center gap-4">
              <span className="flex items-center gap-1">
                <div className="bg-success h-2 w-2 rounded-full" />
                {freshnessStats.realtime} Real-time
              </span>
              <span className="flex items-center gap-1">
                <div className="bg-primary h-2 w-2 rounded-full" />
                {freshnessStats.fresh} Fresh
              </span>
              <span className="flex items-center gap-1">
                <div className="bg-warning h-2 w-2 rounded-full" />
                {freshnessStats.stale} Stale
              </span>
              <span className="flex items-center gap-1">
                <div className="bg-destructive h-2 w-2 rounded-full" />
                {freshnessStats.outdated} Outdated
              </span>
            </div>
          </div>
        </div>

        {onRefreshAll && (
          <button
            onClick={onRefreshAll}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-md px-4 py-2 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh All
          </button>
        )}
      </div>

      {/* Individual Items */}
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.id}
            className="bg-card flex items-center justify-between rounded-md border p-3"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium">{item.name}</span>
              <DataFreshnessIndicator
                data={item.freshnessInfo}
                config={mergedConfig}
                variant="standard"
                onRefresh={onRefreshItem ? () => onRefreshItem(item.id) : undefined}
              />
            </div>

            {item.freshnessInfo.recentChanges && item.freshnessInfo.recentChanges.length > 0 && (
              <DataChangeVisualization
                changes={item.freshnessInfo.recentChanges}
                className="w-32"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
