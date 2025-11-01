"use client"

/**
 * NXT-SPP Main Page - Supplier Portfolio System
 * Complete integration with Neon database backend
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SelfContainedLayout from '@/components/layout/SelfContainedLayout';
import { PortfolioDashboard } from '@/components/spp/PortfolioDashboard';
import { EnhancedPricelistUpload } from '@/components/supplier-portfolio/EnhancedPricelistUpload';
import { CatalogTable } from '@/components/catalog/CatalogTable';
// Selections UI removed from NXT-SPP surface to simplify workflow
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { triggerConfetti } from '@/components/spp/AnimatedComponents';
import type { MergeResult } from '@/types/nxt-spp';

function NxtSppContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  // Get active tab from URL or default to dashboard
  const activeTab = searchParams.get('tab') || 'dashboard';

  // State for component communication
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [currentSupplierId, setCurrentSupplierId] = useState<string | undefined>();
  // Selections removed from NXT-SPP surface

  // Handle tab change
  const handleTabChange = (tab: string) => {
    router.push(`/nxt-spp?tab=${tab}`);
  };

  // Handle upload modal close
  const handleUploadModalClose = (open: boolean) => {
    setUploadOpen(open);
    // If closing the modal and we're on the upload tab, navigate away
    if (!open && activeTab === 'upload') {
      handleTabChange('dashboard');
    }
  };

  // Handle upload completion
  const handleUploadComplete = async (result: MergeResult) => {
    console.log('Upload complete:', result);
    handleUploadModalClose(false);
    setUploadComplete(true);

    // Show success notification
    toast({
      title: 'Upload Complete',
      description: `Successfully merged ${result.products_created} new products and updated ${result.products_updated} existing products.`,
    });

    // Auto-navigate to catalog after upload
    setTimeout(() => {
      handleTabChange('catalog');
      setUploadComplete(false);
    }, 1500);
  };

  // Selection activation removed from NXT-SPP surface

  // Auto-open upload dialog if tab is upload
  useEffect(() => {
    if (activeTab === 'upload' && !uploadOpen) {
      setUploadOpen(true);
    }
  }, [activeTab, uploadOpen]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onUpload: () => {
      setUploadOpen(true);
      handleTabChange('upload');
    },
    // Selections shortcut removed
    onRefresh: () => {
      // Refresh current tab data
      window.location.reload();
    },
    onEscape: () => {
      if (uploadOpen) {
        handleUploadModalClose(false);
      }
    },
  });

  return (
    <SelfContainedLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Inventory Portfolio (SIP)</h1>
          <p className="text-muted-foreground mt-1">
            Supplier Inventory Portfolio System: Upload → Select → Stock
          </p>
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span>Keyboard shortcuts:</span>
            <kbd className="px-2 py-1 bg-muted rounded">Ctrl+U</kbd>
            <span>Upload</span>
            <kbd className="px-2 py-1 bg-muted rounded">Ctrl+R</kbd>
            <span>Refresh</span>
          </div>
        </div>

        {/* Success notification */}
        {uploadComplete && (
          <Alert className="border-green-200 bg-green-50">
            <Info className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>Upload Complete!</strong> Your catalog has been updated with new and updated products.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabbed Navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="catalog">Supplier Inventory Portfolio</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <PortfolioDashboard onNavigateToTab={handleTabChange} />
          </TabsContent>

          {/* Catalog Tab */}
          <TabsContent value="catalog" className="space-y-6">
            <CatalogTable />
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Single Upload System:</strong> This is THE ONLY way to upload supplier pricelists.
                All uploads are validated and merged to the master catalog.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-medium">Ready to Upload?</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Upload Excel or CSV pricelists. The system will automatically validate data and merge to your catalog.
                </p>
              </div>
            </div>

            {/* Upload Dialog */}
            <EnhancedPricelistUpload
              open={uploadOpen}
              onOpenChange={handleUploadModalClose}
              onComplete={handleUploadComplete}
              autoValidate={true}
            />
          </TabsContent>

          {/* Selections and Stock Reports removed from NXT-SPP surface */}
        </Tabs>
      </div>
    </SelfContainedLayout>
  );
}

export default function NxtSppPage() {
  return (
    <Suspense fallback={
      <SelfContainedLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </SelfContainedLayout>
    }>
      <NxtSppContent />
    </Suspense>
  );
}
