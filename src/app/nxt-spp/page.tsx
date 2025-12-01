'use client';

/**
 * NXT-SPP Main Page - Supplier Portfolio System
 * Complete integration with Neon database backend
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Upload, Building2, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import AppLayout from '@/components/layout/AppLayout';
import { PortfolioDashboard } from '@/components/spp/PortfolioDashboard';
import { EnhancedPricelistUpload } from '@/components/supplier-portfolio/EnhancedPricelistUpload';
import { CatalogTable } from '@/components/catalog/CatalogTable';
import { AIPriceExtractionPanel } from '@/components/supplier-portfolio/AIPriceExtractionPanel';
// Selections UI removed from NXT-SPP surface to simplify workflow
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import type { MergeResult } from '@/types/nxt-spp';

function NxtSppContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  // Get active tab from URL or default to dashboard
  const activeTab = searchParams?.get('tab') ?? 'dashboard';

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
    <AppLayout
      title="Supplier Inventory Portfolio"
      breadcrumbs={[{ label: 'Supplier Inventory Portfolio' }]}
      showQuickLinks={false}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 md:gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Supplier Inventory Portfolio</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive supplier portfolio management: Upload pricelists, manage catalog, and
              optimize inventory workflows
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                setUploadOpen(true);
                handleTabChange('upload');
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Pricelist
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const url = `/nxt-spp/rules${currentSupplierId ? `?supplier_id=${currentSupplierId}` : ''}`;
                router.push(url);
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              Rules Engine
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const url = `/nxt-spp/profiles${currentSupplierId ? `?supplier_id=${currentSupplierId}` : ''}`;
                router.push(url);
              }}
            >
              <Building2 className="mr-2 h-4 w-4" />
              Supplier Profiles
            </Button>
          </div>
        </div>

        {/* Success notification */}
        {uploadComplete && (
          <Alert className="border-green-200 bg-green-50">
            <Info className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>Upload Complete!</strong> Your catalog has been updated with new and updated
              products.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabbed Navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="catalog">Supplier Inventory Portfolio</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="ai-price-extraction">AI Price Extraction</TabsTrigger>
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
                <strong>Single Upload System:</strong> This is THE ONLY way to upload supplier
                pricelists. All uploads are validated and merged to the master catalog.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-center py-16">
              <div className="space-y-4 text-center">
                <h3 className="text-lg font-medium">Ready to Upload?</h3>
                <p className="text-muted-foreground max-w-md text-sm">
                  Upload Excel or CSV pricelists. The system will automatically validate data and
                  merge to your catalog.
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

          <TabsContent value="ai-price-extraction" className="space-y-6">
            <AIPriceExtractionPanel />
          </TabsContent>

          {/* Selections and Stock Reports removed from NXT-SPP surface */}
        </Tabs>
      </div>
    </AppLayout>
  );
}

export default function NxtSppPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <p className="text-muted-foreground text-sm">Loading...</p>
            </div>
          </div>
        </AppLayout>
      }
    >
      <NxtSppContent />
    </Suspense>
  );
}
