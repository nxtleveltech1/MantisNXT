/**
 * Loading State Components
 * Provides consistent loading indicators for async operations
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8', xl: 'w-12 h-12' };
  return <Loader2 className={`animate-spin ${sizeClasses[size]} ${className}`} />;
}

export function FullPageSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <Spinner size="xl" className="text-blue-600 mb-4" />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  );
}

export function CenteredSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Spinner size="lg" className="text-blue-600 mb-3" />
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  );
}

export function LoadingOverlay({ isLoading, message = 'Loading...', children }: { isLoading: boolean; message?: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <Spinner size="lg" className="text-blue-600 mb-3 mx-auto" />
            <p className="text-sm text-gray-700">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
