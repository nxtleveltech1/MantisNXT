'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

import { DocustoreSidebar } from '@/components/docustore-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { SigningWorkflowPage } from '@/components/docustore/SigningWorkflowPage';
import { useAuth } from '@/lib/auth/auth-context';

export default function SigningPage() {
  const router = useRouter();
  const params = useParams();
  const { isLoading: authLoading, isAuthenticated } = useAuth();

  const documentId = params.id as string;

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Loading state
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-violet-600"></div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <DocustoreSidebar />
      <SidebarInset>
        <AppHeader 
          title="Signing Workflow" 
          subtitle="Manage document signatures" 
        />
        <div className="flex flex-1 flex-col p-6">
          <SigningWorkflowPage documentId={documentId} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
