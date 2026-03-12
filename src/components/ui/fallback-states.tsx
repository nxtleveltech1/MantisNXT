'use client';

import React from 'react';
import {
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  Home,
  Settings,
  HelpCircle,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Base fallback component interface
export interface FallbackStateProps {
  className?: string;
  onRetry?: () => void;
  retryLabel?: string;
  showRetry?: boolean;
  level?: 'page' | 'section' | 'component';
}

// Network connection fallback
export interface NetworkFallbackProps extends FallbackStateProps {
  isOnline?: boolean;
  queuedRequests?: number;
}

export const NetworkFallback: React.FC<NetworkFallbackProps> = ({
  className,
  onRetry,
  retryLabel = 'Try Again',
  showRetry = true,
  level = 'section',
  isOnline = false,
  queuedRequests = 0,
}) => {
  const containerClasses = {
    page: 'min-h-[60vh] p-8',
    section: 'min-h-[300px] p-6',
    component: 'min-h-[150px] p-4',
  };

  return (
    <Card className={cn('border-border bg-muted/50', containerClasses[level], className)}>
      <CardContent className="flex flex-col items-center justify-center space-y-4 text-center">
        <div className="relative">
          {isOnline ? (
            <Wifi className="h-12 w-12 text-warning" />
          ) : (
            <WifiOff className="h-12 w-12 text-warning" />
          )}
          {queuedRequests > 0 && (
            <Badge className="absolute -right-2 -top-2 bg-warning text-warning-foreground">
              {queuedRequests}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            {isOnline ? 'Connection Issues' : "You're Offline"}
          </h3>
          <p className="max-w-md text-muted-foreground">
            {isOnline
              ? "We're having trouble reaching our servers. Please check your connection and try again."
              : `You're currently offline. ${queuedRequests > 0 ? `${queuedRequests} requests will be processed when connection is restored.` : 'Some features may not be available.'}`}
          </p>
        </div>

        {showRetry && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="border-border text-foreground hover:bg-muted"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {retryLabel}
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="border-border text-foreground hover:bg-muted"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Page
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// API error fallback
export interface ApiErrorFallbackProps extends FallbackStateProps {
  error?: string | Error;
  statusCode?: number;
  endpoint?: string;
}

export const ApiErrorFallback: React.FC<ApiErrorFallbackProps> = ({
  className,
  onRetry,
  retryLabel = 'Retry',
  showRetry = true,
  level = 'section',
  error,
  statusCode,
  endpoint,
}) => {
  const containerClasses = {
    page: 'min-h-[60vh] p-8',
    section: 'min-h-[300px] p-6',
    component: 'min-h-[150px] p-4',
  };

  const getErrorMessage = () => {
    if (statusCode) {
      switch (statusCode) {
        case 404:
          return 'The requested resource could not be found.';
        case 403:
          return "You don't have permission to access this resource.";
        case 401:
          return 'Please log in to continue.';
        case 500:
          return 'Our servers are experiencing issues. Please try again later.';
        case 503:
          return 'Service is temporarily unavailable. Please try again later.';
        default:
          return error?.toString() || 'An unexpected error occurred.';
      }
    }
    return error?.toString() || 'An unexpected error occurred.';
  };

  const getSeverityColor = () => {
    if (statusCode && statusCode >= 500) return 'destructive';
    if (statusCode && statusCode >= 400) return 'warning';
    return 'warning';
  };

  const colorClasses = {
    destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
    warning: 'border-warning/30 bg-warning/10 text-warning',
  };

  const iconColors = {
    destructive: 'text-destructive',
    warning: 'text-warning',
  };

  const severity = getSeverityColor();
  const severityKey = severity as keyof typeof colorClasses;

  return (
    <Card className={cn(colorClasses[severityKey], containerClasses[level], className)}>
      <CardContent className="flex flex-col items-center justify-center space-y-4 text-center">
        <AlertTriangle className={cn('h-12 w-12', iconColors[severityKey])} />

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            {statusCode ? `Error ${statusCode}` : 'API Error'}
          </h3>
          <p className="max-w-md">{getErrorMessage()}</p>
          {endpoint && (
            <Badge variant="outline" className="text-xs">
              {endpoint}
            </Badge>
          )}
        </div>

        {showRetry && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="border-border text-foreground hover:bg-muted"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {retryLabel}
            </Button>
            {level === 'page' && (
              <Button
                onClick={() => (window.location.href = '/')}
                variant="outline"
                size="sm"
                className="border-border text-foreground hover:bg-muted"
              >
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Database connection fallback
export const DatabaseErrorFallback: React.FC<FallbackStateProps> = ({
  className,
  onRetry,
  retryLabel = 'Retry Connection',
  showRetry = true,
  level = 'section',
}) => {
  const containerClasses = {
    page: 'min-h-[60vh] p-8',
    section: 'min-h-[300px] p-6',
    component: 'min-h-[150px] p-4',
  };

  return (
    <Card className={cn('border-destructive/30 bg-destructive/10', containerClasses[level], className)}>
      <CardContent className="flex flex-col items-center justify-center space-y-4 text-center">
        <Database className="h-12 w-12 text-destructive" />

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Database Connection Error</h3>
          <p className="max-w-md text-muted-foreground">
            We are unable to connect to the database. This is likely a temporary issue that our team
            is working to resolve.
          </p>
        </div>

        {showRetry && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="border-border text-foreground hover:bg-muted"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {retryLabel}
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="border-border text-foreground hover:bg-muted"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload Page
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Timeout fallback
export const TimeoutFallback: React.FC<FallbackStateProps> = ({
  className,
  onRetry,
  retryLabel = 'Try Again',
  showRetry = true,
  level = 'section',
}) => {
  const containerClasses = {
    page: 'min-h-[60vh] p-8',
    section: 'min-h-[300px] p-6',
    component: 'min-h-[150px] p-4',
  };

  return (
    <Card className={cn('border-warning/30 bg-warning/10', containerClasses[level], className)}>
      <CardContent className="flex flex-col items-center justify-center space-y-4 text-center">
        <AlertTriangle className="h-12 w-12 text-warning" />

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Request Timeout</h3>
          <p className="max-w-md text-muted-foreground">
            The request is taking longer than expected. This might be due to high server load or
            network issues.
          </p>
        </div>

        {showRetry && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="border-border text-foreground hover:bg-muted"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {retryLabel}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Generic fallback that adapts based on error type
export interface AdaptiveFallbackProps extends FallbackStateProps {
  error?: unknown;
  isOnline?: boolean;
  queuedRequests?: number;
}

export const AdaptiveFallback: React.FC<AdaptiveFallbackProps> = ({
  error,
  isOnline = true,
  queuedRequests = 0,
  ...props
}) => {
  // Network issues
  if (
    !isOnline ||
    (error && (error.code === 'NETWORK_ERROR' || error.message?.includes('network')))
  ) {
    return <NetworkFallback isOnline={isOnline} queuedRequests={queuedRequests} {...props} />;
  }

  // Timeout errors
  if (error && (error.code === 'TIMEOUT' || error.message?.includes('timeout'))) {
    return <TimeoutFallback {...props} />;
  }

  // Database errors
  if (error && (error.message?.includes('database') || error.message?.includes('connection'))) {
    return <DatabaseErrorFallback {...props} />;
  }

  // API errors with status codes
  if (error && error.response?.status) {
    return (
      <ApiErrorFallback
        error={error}
        statusCode={error.response.status}
        endpoint={error.config?.url}
        {...props}
      />
    );
  }

  // Generic API error
  return <ApiErrorFallback error={error} {...props} />;
};

// Maintenance mode fallback
export const MaintenanceFallback: React.FC<FallbackStateProps> = ({
  className,
  level = 'page',
}) => {
  const containerClasses = {
    page: 'min-h-[60vh] p-8',
    section: 'min-h-[300px] p-6',
    component: 'min-h-[150px] p-4',
  };

  return (
    <Card className={cn('border-info/30 bg-info/10', containerClasses[level], className)}>
      <CardContent className="flex flex-col items-center justify-center space-y-4 text-center">
        <Settings className="h-12 w-12 text-info" />

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Under Maintenance</h3>
          <p className="max-w-md text-muted-foreground">
            We are currently performing scheduled maintenance to improve your experience. Please
            check back shortly.
          </p>
        </div>

        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
          className="border-border text-foreground hover:bg-muted"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Check Again
        </Button>
      </CardContent>
    </Card>
  );
};

// Help and support fallback
export const HelpFallback: React.FC<FallbackStateProps & { supportUrl?: string }> = ({
  className,
  level = 'section',
  supportUrl = '/help',
}) => {
  const containerClasses = {
    page: 'min-h-[60vh] p-8',
    section: 'min-h-[300px] p-6',
    component: 'min-h-[150px] p-4',
  };

  return (
    <Card className={cn('border-border bg-muted/50', containerClasses[level], className)}>
      <CardContent className="flex flex-col items-center justify-center space-y-4 text-center">
        <HelpCircle className="h-12 w-12 text-muted-foreground" />

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Need Help?</h3>
          <p className="max-w-md text-muted-foreground">
            If you continue to experience issues, please contact our support team for assistance.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            onClick={() => (window.location.href = supportUrl)}
            variant="outline"
            size="sm"
            className="border-border text-foreground hover:bg-muted"
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            Contact Support
          </Button>
          <Button
            onClick={() => (window.location.href = '/')}
            variant="outline"
            size="sm"
            className="border-border text-foreground hover:bg-muted"
          >
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default {
  NetworkFallback,
  ApiErrorFallback,
  DatabaseErrorFallback,
  TimeoutFallback,
  AdaptiveFallback,
  MaintenanceFallback,
  HelpFallback,
};
