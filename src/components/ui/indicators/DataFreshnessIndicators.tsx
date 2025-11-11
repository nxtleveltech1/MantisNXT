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
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  Radio,
  Gauge,
  Timer,
  Calendar,
  Database,
  Eye,
  Sparkles
} from 'lucide-react';
import { designTokens } from '../design-system';

// Data Freshness Types
export type FreshnessLevel = 'realtime' | 'fresh' | 'stale' | 'outdated' | 'unknown';
export type DataChangeType = 'created' | 'updated' | 'deleted' | 'price_changed' | 'stock_changed' | 'status_changed';

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
  oldValue?: any;
  newValue?: any;
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
  static calculateFreshnessLevel(lastUpdated: Date, config: FreshnessConfig): FreshnessLevel {
    const now = new Date();
    const timeDiff = now.getTime() - lastUpdated.getTime();

    if (timeDiff <= config.realtimeThreshold) return 'realtime';
    if (timeDiff <= config.freshThreshold) return 'fresh';
    if (timeDiff <= config.staleThreshold) return 'stale';
    return 'outdated';
  }

  static getRelativeTimeString(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
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
      case 'realtime': return designTokens.colors.success.DEFAULT;
      case 'fresh': return designTokens.colors.primary.DEFAULT;
      case 'stale': return designTokens.colors.warning.DEFAULT;
      case 'outdated': return designTokens.colors.destructive.DEFAULT;
      default: return designTokens.colors.muted.foreground;
    }
  }

  static getSyncStatusIcon(status: DataFreshnessInfo['syncStatus']) {
    switch (status) {
      case 'synced': return CheckCircle;
      case 'syncing': return RefreshCw;
      case 'error': return AlertCircle;
      case 'offline': return WifiOff;
      default: return Clock;
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
  enableNotifications: false
};

export const DataFreshnessIndicator: React.FC<DataFreshnessIndicatorProps> = ({
  data,
  config = {},
  variant = 'standard',
  size = 'md',
  showTooltip = true,
  onRefresh,
  className = ''
}) => {
  const mergedConfig = { ...defaultConfig, ...config };
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

  const freshnessLevel = useMemo(() =>
    FreshnessCalculator.calculateFreshnessLevel(data.lastUpdated, mergedConfig),
    [data.lastUpdated, mergedConfig, currentTime]
  );

  const relativeTime = useMemo(() =>
    FreshnessCalculator.getRelativeTimeString(data.lastUpdated),
    [data.lastUpdated, currentTime]
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
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: freshnessColor }}
        />
        {mergedConfig.showRelativeTime && (
          <span className="text-muted-foreground">{relativeTime}</span>
        )}
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div
        className={`
          ${baseClasses}
          px-2 py-1 rounded-full border
          ${freshnessLevel === 'realtime' ? 'bg-success/10 border-success text-success' :
            freshnessLevel === 'fresh' ? 'bg-primary/10 border-primary text-primary' :
            freshnessLevel === 'stale' ? 'bg-warning/10 border-warning text-warning' :
            'bg-destructive/10 border-destructive text-destructive'}
        `}
      >
        <motion.div
          animate={data.syncStatus === 'syncing' ? { rotate: 360 } : {}}
          transition={{ duration: 1, repeat: data.syncStatus === 'syncing' ? Infinity : 0, ease: "linear" }}
        >
          <SyncIcon className="w-3 h-3" />
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
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .freshness-glow {
          box-shadow: 0 0 8px ${freshnessColor}40;
        }
      `}</style>

      {/* Main Indicator */}
      <div className="flex items-center gap-2">
        {/* Status Icon with Animation */}
        <motion.div
          className={`
            ${freshnessLevel === 'realtime' ? 'freshness-pulse' : ''}
            ${data.syncStatus === 'syncing' ? 'animate-spin' : ''}
          `}
          animate={data.syncStatus === 'syncing' ? { rotate: 360 } : {}}
          transition={{ duration: 1, repeat: data.syncStatus === 'syncing' ? Infinity : 0, ease: "linear" }}
        >
          <SyncIcon
            className={`w-4 h-4`}
            style={{ color: freshnessColor }}
          />
        </motion.div>

        {/* Freshness Level */}
        <span
          className="font-medium capitalize"
          style={{ color: freshnessColor }}
        >
          {freshnessLevel}
        </span>

        {/* Relative Time */}
        {mergedConfig.showRelativeTime && (
          <span className="text-muted-foreground">
            {relativeTime}
          </span>
        )}

        {/* Change Count */}
        {mergedConfig.showChangeCount && data.changesSinceLastView && data.changesSinceLastView > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="
              px-1.5 py-0.5 text-xs rounded-full
              bg-primary text-primary-foreground
              freshness-glow
            "
          >
            +{data.changesSinceLastView}
          </motion.span>
        )}

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="
              p-1 rounded hover:bg-muted transition-colors
              text-muted-foreground hover:text-foreground
            "
            title="Refresh data"
          >
            <RefreshCw className="w-3 h-3" />
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
              <div className="flex justify-between items-center">
                <span className="font-medium">Status:</span>
                <div className="flex items-center gap-1">
                  <SyncIcon className="w-3 h-3" style={{ color: freshnessColor }} />
                  <span style={{ color: freshnessColor }} className="capitalize">
                    {data.syncStatus}
                  </span>
                </div>
              </div>

              {/* Last Updated */}
              <div className="flex justify-between items-center">
                <span className="font-medium">Updated:</span>
                <span className="text-muted-foreground">
                  {data.lastUpdated.toLocaleString()}
                </span>
              </div>

              {/* Data Source */}
              {data.dataSource && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Source:</span>
                  <span className="text-muted-foreground">{data.dataSource}</span>
                </div>
              )}

              {/* Confidence Score */}
              {mergedConfig.showConfidence && data.confidence !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Confidence:</span>
                  <div className="flex items-center gap-1">
                    <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${data.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(data.confidence * 100)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Next Sync */}
              {data.nextSyncTime && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Next sync:</span>
                  <span className="text-muted-foreground">
                    {FreshnessCalculator.getRelativeTimeString(data.nextSyncTime)}
                  </span>
                </div>
              )}

              {/* Recent Changes */}
              {data.recentChanges && data.recentChanges.length > 0 && (
                <div className="border-t pt-2">
                  <div className="font-medium mb-1">Recent changes:</div>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {data.recentChanges.slice(0, 3).map(change => (
                      <div key={change.id} className="text-xs text-muted-foreground flex items-center gap-1">
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
    case 'created': return <Sparkles className="w-3 h-3 text-success" />;
    case 'updated': return <RefreshCw className="w-3 h-3 text-primary" />;
    case 'deleted': return <AlertCircle className="w-3 h-3 text-destructive" />;
    case 'price_changed': return <TrendingUp className="w-3 h-3 text-warning" />;
    case 'stock_changed': return <Activity className="w-3 h-3 text-primary" />;
    case 'status_changed': return <Radio className="w-3 h-3 text-muted-foreground" />;
    default: return <Clock className="w-3 h-3 text-muted-foreground" />;
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
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1">
        <motion.div
          animate={isConnected ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 2, repeat: isConnected ? Infinity : 0 }}
        >
          {isConnected ? (
            <Wifi className="w-4 h-4 text-success" />
          ) : (
            <WifiOff className="w-4 h-4 text-destructive" />
          )}
        </motion.div>

        <span className={`text-sm ${isConnected ? 'text-success' : 'text-destructive'}`}>
          {isConnected ? 'Live' : 'Offline'}
        </span>
      </div>

      {!isConnected && reconnectAttempts > 0 && (
        <span className="text-xs text-muted-foreground">
          ({reconnectAttempts} attempts)
        </span>
      )}

      {lastHeartbeat && (
        <span className="text-xs text-muted-foreground">
          Last: {FreshnessCalculator.getRelativeTimeString(lastHeartbeat)}
        </span>
      )}

      {!isConnected && onReconnect && (
        <button
          onClick={onReconnect}
          className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
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
  className = ''
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
        <div className="relative w-8 h-8">
          <svg viewBox="0 0 36 36" className="w-8 h-8 transform -rotate-90">
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
          <div className="text-sm font-medium">
            Data Quality: {Math.round(score * 100)}%
          </div>
          {showBreakdown && factors && (
            <div className="text-xs text-muted-foreground space-y-1">
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
  className = ''
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
      <div className="flex items-end gap-1 h-16">
        {Object.entries(groupedChanges).map(([timeKey, timeChanges]) => (
          <div
            key={timeKey}
            className="flex flex-col items-center gap-1 flex-1"
            title={`${timeChanges.length} changes at ${timeKey}`}
          >
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(timeChanges.length / maxCount) * 100}%` }}
              transition={{ duration: 0.3, delay: Math.random() * 0.1 }}
              className="bg-primary rounded-t w-full min-h-[2px]"
            />
            <span className="text-xs text-muted-foreground truncate w-full text-center">
              {timeKey}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 text-xs text-muted-foreground text-center">
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
  className = ''
}) => {
  const mergedConfig = { ...defaultConfig, ...config };

  const freshnessStats = useMemo(() => {
    const stats = { realtime: 0, fresh: 0, stale: 0, outdated: 0 };
    items.forEach(item => {
      const level = FreshnessCalculator.calculateFreshnessLevel(item.freshnessInfo.lastUpdated, mergedConfig);
      stats[level]++;
    });
    return stats;
  }, [items, mergedConfig]);

  const overallScore = useMemo(() => {
    const totalItems = items.length;
    if (totalItems === 0) return 1;

    const score = (
      freshnessStats.realtime * 1.0 +
      freshnessStats.fresh * 0.8 +
      freshnessStats.stale * 0.5 +
      freshnessStats.outdated * 0.2
    ) / totalItems;

    return score;
  }, [freshnessStats, items.length]);

  return (
    <div className={`data-freshness-dashboard space-y-4 ${className}`}>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <DataQualityScore score={overallScore} />

          <div className="text-sm space-y-1">
            <div className="font-medium">Data Freshness Overview</div>
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-success" />
                {freshnessStats.realtime} Real-time
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary" />
                {freshnessStats.fresh} Fresh
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-warning" />
                {freshnessStats.stale} Stale
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                {freshnessStats.outdated} Outdated
              </span>
            </div>
          </div>
        </div>

        {onRefreshAll && (
          <button
            onClick={onRefreshAll}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh All
          </button>
        )}
      </div>

      {/* Individual Items */}
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-md border bg-card"
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