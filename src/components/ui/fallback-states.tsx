"use client";

import React from 'react';
import { AlertTriangle, Wifi, WifiOff, RefreshCw, Home, Settings, HelpCircle, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  retryLabel = "Try Again",
  showRetry = true,
  level = "section",
  isOnline = false,
  queuedRequests = 0,
}) => {
  const containerClasses = {
    page: "min-h-[60vh] p-8",
    section: "min-h-[300px] p-6",
    component: "min-h-[150px] p-4",
  };

  return (
    <Card className={cn("border-orange-200 bg-orange-50/50", containerClasses[level], className)}>
      <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
        <div className="relative">
          {isOnline ? (
            <Wifi className="h-12 w-12 text-orange-500" />
          ) : (
            <WifiOff className="h-12 w-12 text-orange-500" />
          )}
          {queuedRequests > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-orange-500 text-white">
              {queuedRequests}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-orange-900">
            {isOnline ? "Connection Issues" : "You're Offline"}
          </h3>
          <p className="text-orange-700 max-w-md">
            {isOnline
              ? "We're having trouble reaching our servers. Please check your connection and try again."
              : `You're currently offline. ${queuedRequests > 0 ? `${queuedRequests} requests will be processed when connection is restored.` : "Some features may not be available."}`
            }
          </p>
        </div>

        {showRetry && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {retryLabel}
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
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
  retryLabel = "Retry",
  showRetry = true,
  level = "section",
  error,
  statusCode,
  endpoint,
}) => {
  const containerClasses = {
    page: "min-h-[60vh] p-8",
    section: "min-h-[300px] p-6",
    component: "min-h-[150px] p-4",
  };

  const getErrorMessage = () => {
    if (statusCode) {
      switch (statusCode) {
        case 404:
          return "The requested resource could not be found.";
        case 403:
          return "You don't have permission to access this resource.";
        case 401:
          return "Please log in to continue.";
        case 500:
          return "Our servers are experiencing issues. Please try again later.";
        case 503:
          return "Service is temporarily unavailable. Please try again later.";
        default:
          return error?.toString() || "An unexpected error occurred.";
      }
    }
    return error?.toString() || "An unexpected error occurred.";
  };

  const getSeverityColor = () => {
    if (statusCode && statusCode >= 500) return "red";
    if (statusCode && statusCode >= 400) return "orange";
    return "yellow";
  };

  const colorClasses = {
    red: "border-red-200 bg-red-50/50 text-red-700",
    orange: "border-orange-200 bg-orange-50/50 text-orange-700",
    yellow: "border-yellow-200 bg-yellow-50/50 text-yellow-700",
  };

  const iconColors = {
    red: "text-red-500",
    orange: "text-orange-500",
    yellow: "text-yellow-500",
  };

  const severity = getSeverityColor();

  return (
    <Card className={cn(colorClasses[severity], containerClasses[level], className)}>
      <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
        <AlertTriangle className={cn("h-12 w-12", iconColors[severity])} />

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">
            {statusCode ? `Error ${statusCode}` : "API Error"}
          </h3>
          <p className="max-w-md">
            {getErrorMessage()}
          </p>
          {endpoint && (
            <Badge variant="outline" className="text-xs">
              {endpoint}
            </Badge>
          )}
        </div>

        {showRetry && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className={cn(
                severity === 'red' && "border-red-300 hover:bg-red-100",
                severity === 'orange' && "border-orange-300 hover:bg-orange-100",
                severity === 'yellow' && "border-yellow-300 hover:bg-yellow-100"
              )}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {retryLabel}
            </Button>
            {level === "page" && (
              <Button
                onClick={() => window.location.href = '/'}
                variant="outline"
                size="sm"
                className={cn(
                  severity === 'red' && "border-red-300 hover:bg-red-100",
                  severity === 'orange' && "border-orange-300 hover:bg-orange-100",
                  severity === 'yellow' && "border-yellow-300 hover:bg-yellow-100"
                )}
              >
                <Home className="h-4 w-4 mr-2" />
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
  retryLabel = "Retry Connection",
  showRetry = true,
  level = "section",
}) => {
  const containerClasses = {
    page: "min-h-[60vh] p-8",
    section: "min-h-[300px] p-6",
    component: "min-h-[150px] p-4",
  };

  return (
    <Card className={cn("border-red-200 bg-red-50/50", containerClasses[level], className)}>
      <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
        <Database className="h-12 w-12 text-red-500" />

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-red-900">
            Database Connection Error
          </h3>
          <p className="text-red-700 max-w-md">
            We're unable to connect to the database. This is likely a temporary issue that our team is working to resolve.
          </p>
        </div>

        {showRetry && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {retryLabel}
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              size="sm"
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
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
  retryLabel = "Try Again",
  showRetry = true,
  level = "section",
}) => {
  const containerClasses = {
    page: "min-h-[60vh] p-8",
    section: "min-h-[300px] p-6",
    component: "min-h-[150px] p-4",
  };

  return (
    <Card className={cn("border-yellow-200 bg-yellow-50/50", containerClasses[level], className)}>
      <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-yellow-500" />

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-yellow-900">
            Request Timeout
          </h3>
          <p className="text-yellow-700 max-w-md">
            The request is taking longer than expected. This might be due to high server load or network issues.
          </p>
        </div>

        {showRetry && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
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
  error?: any;
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
  if (!isOnline || (error && (error.code === 'NETWORK_ERROR' || error.message?.includes('network')))) {
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
  level = "page",
}) => {
  const containerClasses = {
    page: "min-h-[60vh] p-8",
    section: "min-h-[300px] p-6",
    component: "min-h-[150px] p-4",
  };

  return (
    <Card className={cn("border-blue-200 bg-blue-50/50", containerClasses[level], className)}>
      <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
        <Settings className="h-12 w-12 text-blue-500" />

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-blue-900">
            Under Maintenance
          </h3>
          <p className="text-blue-700 max-w-md">
            We're currently performing scheduled maintenance to improve your experience. Please check back shortly.
          </p>
        </div>

        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          size="sm"
          className="border-blue-300 text-blue-700 hover:bg-blue-100"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Check Again
        </Button>
      </CardContent>
    </Card>
  );
};

// Help and support fallback
export const HelpFallback: React.FC<FallbackStateProps & { supportUrl?: string }> = ({
  className,
  level = "section",
  supportUrl = "/help",
}) => {
  const containerClasses = {
    page: "min-h-[60vh] p-8",
    section: "min-h-[300px] p-6",
    component: "min-h-[150px] p-4",
  };

  return (
    <Card className={cn("border-gray-200 bg-gray-50/50", containerClasses[level], className)}>
      <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
        <HelpCircle className="h-12 w-12 text-gray-500" />

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Need Help?
          </h3>
          <p className="text-gray-700 max-w-md">
            If you continue to experience issues, please contact our support team for assistance.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => window.location.href = supportUrl}
            variant="outline"
            size="sm"
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Contact Support
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            size="sm"
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            <Home className="h-4 w-4 mr-2" />
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