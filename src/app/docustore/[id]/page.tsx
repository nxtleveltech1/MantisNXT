'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { notFound } from 'next/navigation';

import { DocustoreSidebar } from '@/components/docustore-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { DocumentDetailPage } from '@/components/docustore/DocumentDetailPage';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/auth-context';
import type { DocumentWithRelations } from '@/lib/services/docustore/types';

export default function DocumentPage() {
  const router = useRouter();
  const params = useParams();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [document, setDocument] = useState<DocumentWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const documentId = params.id as string;

  // Auth redirect
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch document
  useEffect(() => {
    async function fetchDocument() {
      if (!documentId || !isAuthenticated) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/v1/docustore/${documentId}?include_relations=true`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Document not found');
            return;
          }
          throw new Error('Failed to fetch document');
        }
        
        const result = await response.json();
        if (result.success && result.data) {
          setDocument(result.data);
        } else {
          setError('Document not found');
        }
      } catch (err) {
        console.error('Error fetching document:', err);
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    }

    fetchDocument();
  }, [documentId, isAuthenticated]);

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
          title={document?.title || 'Document Details'} 
          subtitle="View and manage document" 
        />
        <div className="flex flex-1 flex-col p-6">
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-muted-foreground mb-4">{error}</p>
              <button 
                onClick={() => router.push('/docustore')}
                className="text-primary hover:underline"
              >
                Return to Documents
              </button>
            </div>
          ) : document ? (
            <DocumentDetailPage document={document} />
          ) : null}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
