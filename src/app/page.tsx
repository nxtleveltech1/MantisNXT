'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth/auth-context';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import MagicDashboard from '@/components/dashboard/MagicDashboard';
import AsyncBoundary from '@/components/ui/AsyncBoundary';

export default function Home() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if we've finished checking auth and user is not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-900"></div>
      </div>
    );
  }

  // Don't render dashboard if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-900"></div>
      </div>
    );
  }

  // User is authenticated, show dashboard
  return (
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <AppHeader title="MantisNXT Dashboard" subtitle="Live Dashboard" />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <AsyncBoundary>
            <MagicDashboard />
          </AsyncBoundary>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
