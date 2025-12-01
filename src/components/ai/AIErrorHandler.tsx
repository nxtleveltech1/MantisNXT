'use client';

import type { ReactNode } from 'react';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Wifi,
  WifiOff,
  Server,
  Shield,
  TrendingDown,
  FileText,
  CloudOff,
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// Error Types and Interfaces
export interface AIError {
  id: string;
  type:
    | 'network'
    | 'api'
    | 'timeout'
    | 'authentication'
    | 'rate_limit'
    | 'service_unavailable'
    | 'parsing'
    | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  service: string;
  message: string;
  details?: string;
  code?: string;
  timestamp: Date;
  resolved: boolean;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  context?: {
    endpoint?: string;
    method?: string;
    payload?: unknown;
    userAction?: string;
  };
}

export interface AIServiceStatus {
  service: string;
  status: 'operational' | 'degraded' | 'outage' | 'maintenance' | 'unknown';
  lastChecked: Date;
  responseTime: number;
  uptime: number;
  errorRate: number;
  features: {
    [key: string]: 'available' | 'limited' | 'unavailable';
  };
}

export interface FallbackStrategy {
  id: string;
  name: string;
  description: string;
  available: boolean;
  performance: 'high' | 'medium' | 'low';
  accuracy: number;
  enabled: boolean;
}

interface AIErrorHandlerProps {
  children: ReactNode;
  onErrorReported?: (error: AIError) => void;
  onRetrySuccess?: (error: AIError) => void;
  onFallbackActivated?: (strategy: FallbackStrategy) => void;
  enableAutoRetry?: boolean;
  enableFallbacks?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  showStatusBar?: boolean;
  compactMode?: boolean;
}

const MOCK_SERVICE_STATUS: AIServiceStatus[] = [
  {
    service: 'AI Analytics',
    status: 'operational',
    lastChecked: new Date(),
    responseTime: 245,
    uptime: 99.8,
    errorRate: 0.2,
    features: {
      predictions: 'available',
      anomaly_detection: 'available',
      recommendations: 'available',
      chat: 'available',
    },
  },
  {
    service: 'Supplier Discovery',
    status: 'degraded',
    lastChecked: new Date(),
    responseTime: 1250,
    uptime: 97.5,
    errorRate: 2.1,
    features: {
      search: 'limited',
      recommendations: 'available',
      market_intelligence: 'unavailable',
    },
  },
  {
    service: 'Predictive Engine',
    status: 'operational',
    lastChecked: new Date(),
    responseTime: 890,
    uptime: 99.9,
    errorRate: 0.1,
    features: {
      forecasting: 'available',
      trend_analysis: 'available',
      risk_assessment: 'available',
    },
  },
];

const MOCK_FALLBACK_STRATEGIES: FallbackStrategy[] = [
  {
    id: 'cached_data',
    name: 'Cached Data',
    description: 'Use recently cached AI results when services are unavailable',
    available: true,
    performance: 'high',
    accuracy: 85,
    enabled: true,
  },
  {
    id: 'simplified_analysis',
    name: 'Simplified Analysis',
    description: 'Provide basic analytics using local algorithms',
    available: true,
    performance: 'medium',
    accuracy: 70,
    enabled: true,
  },
  {
    id: 'manual_mode',
    name: 'Manual Mode',
    description: 'Disable AI features and provide manual controls',
    available: true,
    performance: 'low',
    accuracy: 60,
    enabled: false,
  },
];

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: unknown;
}

const AIErrorHandler: React.FC<AIErrorHandlerProps> = ({
  children,
  onErrorReported,
  onRetrySuccess,
  onFallbackActivated,
  enableAutoRetry = true,
  enableFallbacks = true,
  maxRetries = 3,
  retryDelay = 2000,
  showStatusBar = true,
  compactMode = false,
}) => {
  // State Management
  const [errors, setErrors] = useState<AIError[]>([]);
  const [serviceStatus, setServiceStatus] = useState<AIServiceStatus[]>([]);
  const [fallbackStrategies, setFallbackStrategies] = useState<FallbackStrategy[]>([]);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');
  const [lastStatusCheck, setLastStatusCheck] = useState<Date>(new Date());

  // Initialize mock data
  useEffect(() => {
    setServiceStatus(MOCK_SERVICE_STATUS);
    setFallbackStrategies(MOCK_FALLBACK_STRATEGIES);
  }, []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setNetworkStatus('online');
    const handleOffline = () => setNetworkStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Status checking interval
  useEffect(() => {
    const interval = setInterval(() => {
      setLastStatusCheck(new Date());
      // In real implementation, this would check actual service status
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Auto-retry mechanism
  useEffect(() => {
    if (!enableAutoRetry) return;

    const retryTimer = setInterval(() => {
      const now = new Date();
      const errorsToRetry = errors.filter(
        error =>
          !error.resolved &&
          error.retryCount < error.maxRetries &&
          error.nextRetryAt &&
          error.nextRetryAt <= now
      );

      errorsToRetry.forEach(error => {
        retryOperation(error);
      });
    }, 1000);

    return () => clearInterval(retryTimer);
  }, [errors, enableAutoRetry, retryOperation]);

  // Error reporting function
  const reportError = useCallback(
    (error: Partial<AIError>) => {
      const newError: AIError = {
        id: Date.now().toString(),
        type: error.type || 'unknown',
        severity: error.severity || 'medium',
        service: error.service || 'Unknown Service',
        message: error.message || 'An error occurred',
        details: error.details,
        code: error.code,
        timestamp: new Date(),
        resolved: false,
        retryCount: 0,
        maxRetries: error.maxRetries || maxRetries,
        nextRetryAt: new Date(Date.now() + retryDelay),
        context: error.context,
      };

      setErrors(prev => [newError, ...prev.slice(0, 9)]); // Keep last 10 errors
      onErrorReported?.(newError);

      // Auto-activate fallbacks for critical errors
      if (newError.severity === 'critical' && enableFallbacks) {
        activateFallback();
      }
    },
    [activateFallback, enableFallbacks, maxRetries, onErrorReported, retryDelay]
  );

  // Retry operation
  const retryOperation = useCallback(
    async (error: AIError) => {
      setIsRetrying(error.id);

      try {
        // Simulate retry attempt
        await new Promise(resolve => setTimeout(resolve, 1000));

        // In real implementation, this would actually retry the failed operation
        const success = Math.random() > 0.3; // 70% success rate simulation

        if (success) {
          setErrors(prev => prev.map(e => (e.id === error.id ? { ...e, resolved: true } : e)));
          onRetrySuccess?.(error);
        } else {
          const nextRetry = new Date(Date.now() + retryDelay * (error.retryCount + 1));
          setErrors(prev =>
            prev.map(e =>
              e.id === error.id ? { ...e, retryCount: e.retryCount + 1, nextRetryAt: nextRetry } : e
            )
          );
        }
      } catch (err) {
        console.error('Retry failed:', err);
      } finally {
        setIsRetrying(null);
      }
    },
    [onRetrySuccess, retryDelay]
  );

  // Activate fallback strategy
  const activateFallback = useCallback(() => {
    let activated: FallbackStrategy | null = null;

    setFallbackStrategies(prev => {
      const availableFallback = prev.find(strategy => strategy.available && !strategy.enabled);

      if (!availableFallback) {
        return prev;
      }

      activated = { ...availableFallback, enabled: true };

      return prev.map(strategy =>
        strategy.id === availableFallback.id ? { ...strategy, enabled: true } : strategy
      );
    });

    if (activated) {
      onFallbackActivated?.(activated);
    }
  }, [onFallbackActivated]);

  // Get status color
  const getStatusColor = (status: AIServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'outage':
        return 'text-red-600 bg-red-100';
      case 'maintenance':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Get error severity color
  const getErrorSeverityColor = (severity: AIError['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  // Get error type icon
  const getErrorTypeIcon = (type: AIError['type']) => {
    switch (type) {
      case 'network':
        return <WifiOff className="h-4 w-4" />;
      case 'api':
        return <Server className="h-4 w-4" />;
      case 'timeout':
        return <Clock className="h-4 w-4" />;
      case 'authentication':
        return <Shield className="h-4 w-4" />;
      case 'rate_limit':
        return <TrendingDown className="h-4 w-4" />;
      case 'service_unavailable':
        return <CloudOff className="h-4 w-4" />;
      case 'parsing':
        return <FileText className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  // Simulate some errors for demonstration
  useEffect(() => {
    // Add some mock errors
    setTimeout(() => {
      reportError({
        type: 'api',
        severity: 'medium',
        service: 'AI Analytics',
        message: 'Failed to fetch supplier recommendations',
        details: 'HTTP 503: Service temporarily unavailable',
        code: 'AI_SERVICE_503',
        context: {
          endpoint: '/api/ai/recommendations',
          method: 'GET',
          userAction: 'Searching suppliers',
        },
      });
    }, 2000);

    setTimeout(() => {
      reportError({
        type: 'timeout',
        severity: 'high',
        service: 'Predictive Engine',
        message: 'Request timeout during demand forecasting',
        details: 'Request exceeded 30 second timeout limit',
        code: 'TIMEOUT_30S',
        context: {
          endpoint: '/api/ai/predict',
          method: 'POST',
          userAction: 'Generating forecast',
        },
      });
    }, 5000);
  }, [reportError]);

  const unresolvedErrors = errors.filter(error => !error.resolved);
  const criticalErrors = unresolvedErrors.filter(error => error.severity === 'critical');

  return (
    <TooltipProvider>
      <div className="relative">
        {/* Status Bar */}
        {showStatusBar && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-b border-gray-200 bg-white shadow-sm"
          >
            <div className="px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Network Status */}
                  <div className="flex items-center gap-2">
                    {networkStatus === 'online' ? (
                      <Wifi className="h-4 w-4 text-green-600" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-600" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        networkStatus === 'online' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {networkStatus === 'online' ? 'Connected' : 'Offline'}
                    </span>
                  </div>

                  {/* Service Status Summary */}
                  <div className="flex items-center gap-2">
                    {serviceStatus.map(service => (
                      <Tooltip key={service.service}>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className={`text-xs ${getStatusColor(service.status)}`}
                          >
                            {service.service}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <div className="font-medium">{service.service}</div>
                            <div>Status: {service.status}</div>
                            <div>Uptime: {service.uptime}%</div>
                            <div>Response: {service.responseTime}ms</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>

                  {/* Error Count */}
                  {unresolvedErrors.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {unresolvedErrors.length} Error{unresolvedErrors.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    Updated {lastStatusCheck.toLocaleTimeString()}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setLastStatusCheck(new Date())}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error Notifications */}
        <AnimatePresence>
          {criticalErrors.map(error => (
            <motion.div
              key={error.id}
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-20 right-4 z-50 max-w-md"
            >
              <Alert className={`border-l-4 ${getErrorSeverityColor(error.severity)}`}>
                <div className="flex items-start gap-3">
                  <div className="text-red-600">{getErrorTypeIcon(error.type)}</div>
                  <div className="flex-1">
                    <AlertDescription>
                      <div className="font-semibold text-red-800">
                        {error.service}: {error.message}
                      </div>
                      {error.details && (
                        <div className="mt-1 text-sm text-red-700">{error.details}</div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => retryOperation(error)}
                          disabled={isRetrying === error.id}
                        >
                          {isRetrying === error.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="mr-1 h-3 w-3" />
                          )}
                          Retry
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setErrors(prev =>
                              prev.map(e => (e.id === error.id ? { ...e, resolved: true } : e))
                            )
                          }
                        >
                          Dismiss
                        </Button>
                      </div>
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Fallback Strategies Panel */}
        {enableFallbacks && fallbackStrategies.some(s => s.enabled) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-amber-100 p-2">
                    <Shield className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-amber-800">Fallback Mode Active</div>
                    <div className="text-sm text-amber-700">
                      Using alternative methods due to service issues
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {fallbackStrategies
                    .filter(s => s.enabled)
                    .map(strategy => (
                      <div
                        key={strategy.id}
                        className="rounded-lg border border-amber-200 bg-white p-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-medium text-amber-800">{strategy.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {strategy.accuracy}% accuracy
                          </Badge>
                        </div>
                        <div className="text-sm text-amber-700">{strategy.description}</div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Error Details Panel */}
        <AnimatePresence>
          {unresolvedErrors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      Active Issues ({unresolvedErrors.length})
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetails(showDetails ? null : 'all')}
                    >
                      {showDetails ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {unresolvedErrors.map(error => (
                    <div
                      key={error.id}
                      className={`rounded-lg border-l-4 p-3 ${getErrorSeverityColor(error.severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">{getErrorTypeIcon(error.type)}</div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">
                              {error.service}: {error.message}
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              {error.timestamp.toLocaleString()}
                            </div>

                            {showDetails && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mt-3 space-y-2"
                              >
                                {error.details && (
                                  <div className="text-sm text-gray-700">
                                    <strong>Details:</strong> {error.details}
                                  </div>
                                )}
                                {error.code && (
                                  <div className="text-sm text-gray-700">
                                    <strong>Error Code:</strong> {error.code}
                                  </div>
                                )}
                                {error.context && (
                                  <div className="text-sm text-gray-700">
                                    <strong>Context:</strong> {error.context.userAction} on{' '}
                                    {error.context.endpoint}
                                  </div>
                                )}
                                <div className="text-sm text-gray-600">
                                  Retry {error.retryCount}/{error.maxRetries}
                                  {error.nextRetryAt && (
                                    <span className="ml-2">
                                      Next retry: {error.nextRetryAt.toLocaleTimeString()}
                                    </span>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {error.severity}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => retryOperation(error)}
                            disabled={
                              isRetrying === error.id || error.retryCount >= error.maxRetries
                            }
                          >
                            {isRetrying === error.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div>{children}</div>

        {/* Global Error Boundary would be implemented as a wrapper component */}
      </div>
    </TooltipProvider>
  );
};

// Error Boundary Component
export class AIErrorBoundary extends React.Component<
  { children: ReactNode; onError?: (error: Error, errorInfo: unknown) => void },
  ErrorBoundaryState
> {
  constructor(props: {
    children: ReactNode;
    onError?: (error: Error, errorInfo: unknown) => void;
  }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-64 items-center justify-center">
          <Card className="mx-auto max-w-md border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-red-900">Something went wrong</h3>
              <p className="mb-4 text-red-700">An unexpected error occurred in the AI system</p>
              <div className="space-y-2">
                <Button
                  onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                  className="w-full"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="w-full"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AIErrorHandler;
