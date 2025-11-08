"use client"

/**
 * NXT-SPP Main Page - Supplier Portfolio System
 * Complete integration with Neon database backend
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Info, Package, Upload, RefreshCw, Keyboard, LayoutDashboard, Table, FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AppLayout from '@/components/layout/AppLayout';
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
    <AppLayout>
      <div className="space-y-8">
        {/* Enhanced Page Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-blue-50/50 via-white to-purple-50/30 dark:from-blue-950/20 dark:via-background dark:to-purple-950/10 p-8 shadow-sm">
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,transparent,black)] dark:bg-grid-slate-700/25" />

          <div className="relative space-y-6">
            {/* Title Area with Icon */}
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25 ring-4 ring-blue-500/10">
                <Package className="h-7 w-7" />
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-br from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                    Supplier Inventory Portfolio
                  </h1>
                  <Badge variant="secondary" className="px-3 py-1 text-xs font-medium">
                    SIP System
                  </Badge>
                </div>

                <p className="text-base text-muted-foreground max-w-3xl leading-relaxed">
                  Comprehensive supplier portfolio management: Upload pricelists, manage catalog, and optimize inventory workflows with intelligent automation.
                </p>
              </div>
            </div>

            {/* Keyboard Shortcuts Section */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Keyboard className="h-4 w-4" />
                <span>Quick Actions:</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="gap-2 px-3 py-1.5 bg-card/50 hover:bg-card transition-colors">
                  <Upload className="h-3.5 w-3.5 text-primary" />
                  <kbd className="font-mono text-xs font-semibold">Ctrl+U</kbd>
                  <span className="text-xs">Upload</span>
                </Badge>

                <Badge variant="outline" className="gap-2 px-3 py-1.5 bg-card/50 hover:bg-card transition-colors">
                  <RefreshCw className="h-3.5 w-3.5 text-success" />
                  <kbd className="font-mono text-xs font-semibold">Ctrl+R</kbd>
                  <span className="text-xs">Refresh</span>
                </Badge>
              </div>
            </div>
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

        {/* Enhanced Tabbed Navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="border-b border-border">
            <TabsList className="inline-flex h-12 items-center justify-start gap-1 rounded-none bg-transparent p-0 w-full">
              <TabsTrigger
                value="dashboard"
                className="group relative inline-flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-all hover:border-border hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                <LayoutDashboard className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span>Dashboard</span>
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 transition-opacity group-data-[state=active]:opacity-100" />
              </TabsTrigger>

              <TabsTrigger
                value="catalog"
                className="group relative inline-flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-all hover:border-border hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                <Table className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span>Supplier Inventory Portfolio</span>
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 transition-opacity group-data-[state=active]:opacity-100" />
              </TabsTrigger>

              <TabsTrigger
                value="upload"
                className="group relative inline-flex items-center gap-2 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-all hover:border-border hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                <FileUp className="h-4 w-4 transition-transform group-hover:scale-110" />
                <span>Upload</span>
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 transition-opacity group-data-[state=active]:opacity-100" />
              </TabsTrigger>
            </TabsList>
          </div>

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
    </AppLayout>
  );
}

export default function NxtSppPage() {
  return (
    <Suspense fallback={
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AppLayout>
    }>
      <NxtSppContent />
    </Suspense>
  );
}
