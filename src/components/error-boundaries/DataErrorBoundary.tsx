/**
 * Enhanced Error Boundary for Data Components
 * Specialized for handling timestamp, API, and data-related errors
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Bug, Database, Clock } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  category?: 'data' | 'ui' | 'api' | 'timestamp';
  retryable?: boolean;
  className?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  retryCount: number;
  lastErrorTime: number;
}

class DataErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private retryDelay = 1000;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastErrorTime: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now()
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log the error
    console.error('❌ DataErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Set error info in state
    this.setState({
      errorInfo
    });

    // Log specific error types for debugging
    this.logErrorDetails(error, errorInfo);
  }

  private logErrorDetails(error: Error, errorInfo: any) {
    const category = this.props.category || 'unknown';

    // Check for common data-related errors
    if (error.message.includes('timestamp') || error.message.includes('getTime')) {
      console.error('🕐 Timestamp Error:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        category: 'timestamp'
      });
    }

    if (error.message.includes('fetch') || error.message.includes('HTTP')) {
      console.error('🌐 API Error:', {
        message: error.message,
        stack: error.stack,
        category: 'api'
      });
    }

    if (error.message.includes('JSON') || error.message.includes('parse')) {
      console.error('📊 Data Parsing Error:', {
        message: error.message,
        stack: error.stack,
        category: 'data'
      });
    }

    // Report to error tracking service (if available)
    if (typeof window !== 'undefined' && (window as any).errorReporter) {
      (window as any).errorReporter.reportError(error, {
        category,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    }
  }

  private handleRetry = () => {
    const { retryCount } = this.state;
    const { retryable = true } = this.props;

    if (!retryable || retryCount >= this.maxRetries) {
      return;
    }

    // Exponential backoff
    const delay = this.retryDelay * Math.pow(2, retryCount);

    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1
      });
    }, delay);
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private getErrorIcon() {
    const { category } = this.props;
    const { error } = this.state;

    if (error?.message.includes('timestamp') || category === 'timestamp') {
      return Clock;
    }
    if (error?.message.includes('fetch') || category === 'api') {
      return Database;
    }
    return AlertTriangle;
  }

  private getErrorTitle() {
    const { category } = this.props;
    const { error } = this.state;

    if (error?.message.includes('timestamp') || category === 'timestamp') {
      return 'Date/Time Error';
    }
    if (error?.message.includes('fetch') || category === 'api') {
      return 'Data Loading Error';
    }
    if (category === 'ui') {
      return 'Display Error';
    }
    return 'Component Error';
  }

  private getErrorDescription() {
    const { error } = this.state;

    if (error?.message.includes('timestamp') || error?.message.includes('getTime')) {
      return 'There was an issue processing date/time information. This usually happens when data from the server is in an unexpected format.';
    }

    if (error?.message.includes('fetch') || error?.message.includes('HTTP')) {
      return 'Unable to load data from the server. Please check your connection and try again.';
    }

    if (error?.message.includes('JSON') || error?.message.includes('parse')) {
      return 'There was an issue processing data from the server. The data may be corrupted or in an unexpected format.';
    }

    return 'An unexpected error occurred while displaying this component.';
  }

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback, retryable = true, className = '' } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      const ErrorIcon = this.getErrorIcon();
      const canRetry = retryable && retryCount < this.maxRetries;

      return (
        <Card className={`border-red-200 ${className}`}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-red-700">
              <ErrorIcon className="w-5 h-5" />
              <span>{this.getErrorTitle()}</span>
            </CardTitle>
            <CardDescription>
              {this.getErrorDescription()}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <Bug className="h-4 w-4" />
              <AlertDescription>
                <div className="font-mono text-xs mt-2 p-2 bg-red-50 rounded border-l-4 border-red-400 overflow-x-auto">
                  {error?.message || 'Unknown error occurred'}
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex items-center space-x-2">
              {canRetry && (
                <Button
                  onClick={this.handleRetry}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry ({this.maxRetries - retryCount} attempts left)
                </Button>
              )}

              <Button
                onClick={this.handleReload}
                variant="destructive"
                size="sm"
              >
                Reload Page
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                  Developer Details
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono whitespace-pre-wrap">
                  <div className="mb-2">
                    <strong>Error Stack:</strong>
                    <div className="mt-1">{error?.stack}</div>
                  </div>

                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <div className="mt-1">{this.state.errorInfo.componentStack}</div>
                    </div>
                  )}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return children;
  }
}

export default DataErrorBoundary;