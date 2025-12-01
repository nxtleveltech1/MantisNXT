/**
 * Error Handling Test Component
 * Validates crash prevention and fallback behavior
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorBoundary } from 'react-error-boundary';

interface TestState {
  thrownErrors: number;
  caughtErrors: number;
  lastError: string;
}

// Component that intentionally throws errors
function CrashableComponent({ shouldCrash }: { shouldCrash: boolean }) {
  if (shouldCrash) {
    throw new Error('Intentional test error for error boundary validation');
  }
  return <div className="text-green-600">✅ Component rendered successfully</div>;
}

// Error fallback component
function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <Alert className="border-red-500">
      <AlertDescription>
        <div className="flex items-center justify-between">
          <span>🚨 Error caught: {error.message}</span>
          <Button variant="outline" size="sm" onClick={resetErrorBoundary}>
            Reset
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export default function ErrorHandlingTest() {
  const [state, setState] = useState<TestState>({
    thrownErrors: 0,
    caughtErrors: 0,
    lastError: '',
  });
  const [shouldCrash, setShouldCrash] = useState(false);

  const triggerError = () => {
    setShouldCrash(true);
    setState(prev => ({
      ...prev,
      thrownErrors: prev.thrownErrors + 1,
    }));
  };

  const triggerAsyncError = async () => {
    try {
      // Simulate async error
      await new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Async operation failed')), 100);
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        caughtErrors: prev.caughtErrors + 1,
        lastError: (error as Error).message,
      }));
    }
  };

  const resetErrors = () => {
    setShouldCrash(false);
    setState({
      thrownErrors: 0,
      caughtErrors: 0,
      lastError: '',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Error Handling Test Suite</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Statistics */}
          <div className="flex gap-4">
            <Badge variant="destructive">Thrown: {state.thrownErrors}</Badge>
            <Badge variant="secondary">Caught: {state.caughtErrors}</Badge>
          </div>

          {/* Last Error Display */}
          {state.lastError && (
            <Alert>
              <AlertDescription>Last async error: {state.lastError}</AlertDescription>
            </Alert>
          )}

          {/* Test Controls */}
          <div className="flex gap-2">
            <Button variant="destructive" onClick={triggerError}>
              Trigger Boundary Error
            </Button>
            <Button variant="outline" onClick={triggerAsyncError}>
              Trigger Async Error
            </Button>
            <Button variant="secondary" onClick={resetErrors}>
              Reset All
            </Button>
          </div>

          {/* Error Boundary Test Area */}
          <div className="rounded border p-4">
            <h4 className="mb-2 font-medium">Error Boundary Test Area:</h4>
            <ErrorBoundary
              FallbackComponent={ErrorFallback}
              onError={error => {
                setState(prev => ({
                  ...prev,
                  caughtErrors: prev.caughtErrors + 1,
                  lastError: error.message,
                }));
              }}
              onReset={() => setShouldCrash(false)}
            >
              <CrashableComponent shouldCrash={shouldCrash} />
            </ErrorBoundary>
          </div>

          {/* Test Results */}
          <div className="text-sm text-gray-600">
            <p>✅ Error boundaries are working if errors are caught gracefully</p>
            <p>✅ Async errors should be handled without crashing the app</p>
            <p>✅ Reset functionality should restore normal operation</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
